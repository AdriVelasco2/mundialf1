import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'node:crypto';
import { requireUser, respond } from '../lib/auth.js';

const emptyData = { players: [], races: [] };
const withMembers = async (sql, row) => {
  if (!row) return null;
  const members = await sql`SELECT user_id AS id, alias AS name, avatar_data AS avatar FROM championship_members WHERE championship_id = ${row.id} ORDER BY joined_at`;
  const legacy = Array.isArray(row.data?.players) ? row.data.players : [];
  const ids = new Set(members.map(member => member.id));
  const legacyById = new Map(legacy.map(player => [player.id, player]));
  const currentMembers = members.map(member => ({ ...member, carDesign: legacyById.get(member.id)?.carDesign || 'rosso' }));
  return { ...row, data: { ...emptyData, ...(row.data || {}), players: [...legacy.filter(player => !ids.has(player.id)), ...currentMembers] } };
};
const isMember = async (sql, championshipId, userId) => {
  const rows = await sql`SELECT role FROM championship_members WHERE championship_id = ${championshipId} AND user_id = ${userId}`;
  return rows[0] || null;
};

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) return respond(res, 503, { error: 'Falta configurar DATABASE_URL.' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    const id = typeof req.query.id === 'string' ? req.query.id : null;
    if (req.method === 'GET') {
      if (id) {
        const rows = await sql`SELECT id, name, data, owner_id AS "ownerId" FROM championships WHERE id = ${id}`;
        if (!rows.length) return respond(res, 404, { error: 'Mundial no encontrado.' });
        return respond(res, 200, await withMembers(sql, rows[0]));
      }
      const rows = await sql`SELECT id, name, data, owner_id AS "ownerId" FROM championships ORDER BY created_at DESC`;
      const championships = await Promise.all(rows.map(row => withMembers(sql, row)));
      return respond(res, 200, { championships });
    }

    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'POST' && req.query.action === 'claim') {
      if (!id) return respond(res, 400, { error: 'Falta el id del mundial.' });
      const claimed = await sql`UPDATE championships SET owner_id = ${user.id}, updated_at = now() WHERE id = ${id} AND owner_id IS NULL RETURNING id`;
      if (!claimed.length) return respond(res, 409, { error: 'Este mundial ya tiene propietario o no existe.' });
      const alias = String(req.body?.alias || user.name || user.email.split('@')[0] || 'Piloto').trim().slice(0, 35);
      await sql`INSERT INTO user_profiles (user_id, email, alias) VALUES (${user.id}, ${user.email.toLowerCase()}, ${alias}) ON CONFLICT (user_id) DO NOTHING`;
      await sql`INSERT INTO championship_members (championship_id, user_id, alias, role) VALUES (${id}, ${user.id}, ${alias}, 'owner') ON CONFLICT (championship_id, user_id) DO NOTHING`;
      return respond(res, 200, { ok: true });
    }

    if (req.method === 'POST') {
      const name = String(req.body?.name || '').trim().slice(0, 40);
      if (!name) return respond(res, 400, { error: 'El nombre es obligatorio.' });
      const alias = String(req.body?.alias || user.name || user.email.split('@')[0] || 'Piloto').trim().slice(0, 35);
      const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data : emptyData;
      const newId = randomUUID();
      await sql`INSERT INTO user_profiles (user_id, email, alias) VALUES (${user.id}, ${user.email.toLowerCase()}, ${alias}) ON CONFLICT (user_id) DO NOTHING`;
      const rows = await sql`INSERT INTO championships (id, name, owner_id, data) VALUES (${newId}, ${name}, ${user.id}, ${JSON.stringify({ players: [], races: data.races || [] })}::jsonb) RETURNING id, name, data, owner_id AS "ownerId"`;
      await sql`INSERT INTO championship_members (championship_id, user_id, alias, role) VALUES (${newId}, ${user.id}, ${alias}, 'owner')`;
      return respond(res, 201, await withMembers(sql, rows[0]));
    }

    if (req.method === 'PUT') {
      if (!id) return respond(res, 400, { error: 'Falta el id del mundial.' });
      const membership = await isMember(sql, id, user.id);
      if (!membership) return respond(res, 403, { error: 'Solo los participantes pueden editar este mundial.' });
      const name = String(req.body?.name || '').trim().slice(0, 40);
      const data = req.body?.data;
      if (!name || !data || typeof data !== 'object') return respond(res, 400, { error: 'Datos del mundial no válidos.' });
      const payload = { players: data.players || [], races: data.races || [], finishedAt: data.finishedAt || null, finalStandings: data.finalStandings || null };
      const rows = await sql`UPDATE championships SET name = ${name}, data = ${JSON.stringify(payload)}::jsonb, updated_at = now() WHERE id = ${id} RETURNING id`;
      return rows.length ? respond(res, 200, { ok: true }) : respond(res, 404, { error: 'Mundial no encontrado.' });
    }

    if (req.method === 'DELETE') {
      if (!id) return respond(res, 400, { error: 'Falta el id del mundial.' });
      const rows = await sql`DELETE FROM championships WHERE id = ${id} AND owner_id = ${user.id} RETURNING id`;
      return rows.length ? respond(res, 200, { ok: true }) : respond(res, 403, { error: 'Solo quien creó el mundial puede eliminarlo.' });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return respond(res, 405, { error: 'Método no permitido.' });
  } catch (error) {
    console.error('Championship API error:', error);
    return respond(res, 500, { error: 'Error al acceder a la base de datos.' });
  }
}
