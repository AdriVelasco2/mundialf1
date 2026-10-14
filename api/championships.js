import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'node:crypto';

const response = (res, status, body) => res.status(status).json(body);

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) return response(res, 503, { error: 'Falta configurar DATABASE_URL.' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    const id = typeof req.query.id === 'string' ? req.query.id : null;
    if (req.method === 'GET') {
      if (id) {
        const rows = await sql`SELECT id, name, data FROM championships WHERE id = ${id}`;
        return rows.length ? response(res, 200, rows[0]) : response(res, 404, { error: 'Mundial no encontrado.' });
      }
      const rows = await sql`SELECT id, name, data FROM championships ORDER BY created_at DESC`;
      return response(res, 200, { championships: rows });
    }
    if (req.method === 'POST') {
      const name = String(req.body?.name || '').trim().slice(0, 40);
      if (!name) return response(res, 400, { error: 'El nombre es obligatorio.' });
      const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data : { players: [], races: [] };
      const newId = randomUUID();
      const rows = await sql`INSERT INTO championships (id, name, data) VALUES (${newId}, ${name}, ${JSON.stringify(data)}::jsonb) RETURNING id, name, data`;
      return response(res, 201, rows[0]);
    }
    if (req.method === 'PUT') {
      if (!id) return response(res, 400, { error: 'Falta el id del mundial.' });
      const name = String(req.body?.name || '').trim().slice(0, 40);
      const data = req.body?.data;
      if (!name || !data || typeof data !== 'object') return response(res, 400, { error: 'Datos del mundial no válidos.' });
      const rows = await sql`UPDATE championships SET name = ${name}, data = ${JSON.stringify(data)}::jsonb, updated_at = now() WHERE id = ${id} RETURNING id`;
      return rows.length ? response(res, 200, { ok: true }) : response(res, 404, { error: 'Mundial no encontrado.' });
    }
    if (req.method === 'DELETE') {
      if (!id) return response(res, 400, { error: 'Falta el id del mundial.' });
      const rows = await sql`DELETE FROM championships WHERE id = ${id} RETURNING id`;
      return rows.length ? response(res, 200, { ok: true }) : response(res, 404, { error: 'Mundial no encontrado.' });
    }
    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return response(res, 405, { error: 'Método no permitido.' });
  } catch (error) {
    console.error('Championship API error:', error);
    return response(res, 500, { error: 'Error al acceder a la base de datos.' });
  }
}
