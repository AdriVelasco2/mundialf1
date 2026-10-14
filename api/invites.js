import { neon } from '@neondatabase/serverless';
import { createHash, randomBytes } from 'node:crypto';
import { requireUser, respond } from '../lib/auth.js';

const tokenHash = token => createHash('sha256').update(token).digest('hex');

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) return respond(res, 503, { error: 'Falta configurar DATABASE_URL.' });
  const user = await requireUser(req, res);
  if (!user) return;
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return respond(res, 405, { error: 'Método no permitido.' });
    }
    if (req.body?.action === 'accept') {
      const token = String(req.body?.token || '');
      const alias = String(req.body?.alias || '').trim().slice(0, 35);
      if (alias.length < 2) return respond(res, 400, { error: 'El alias debe tener al menos 2 caracteres.' });
      const invites = await sql`SELECT id, championship_id, email FROM championship_invites WHERE token_hash = ${tokenHash(token)} AND accepted_at IS NULL AND expires_at > now()`;
      if (!invites.length) return respond(res, 404, { error: 'La invitación no existe, caducó o ya se utilizó.' });
      const invite = invites[0];
      if (invite.email && invite.email.toLowerCase() !== user.email.toLowerCase()) return respond(res, 403, { error: `Esta invitación es para ${invite.email}. Inicia sesión con ese correo.` });
      await sql`INSERT INTO user_profiles (user_id, email, alias) VALUES (${user.id}, ${user.email.toLowerCase()}, ${alias}) ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, alias = EXCLUDED.alias, updated_at = now()`;
      await sql`INSERT INTO championship_members (championship_id, user_id, alias, role) VALUES (${invite.championship_id}, ${user.id}, ${alias}, 'member') ON CONFLICT (championship_id, user_id) DO UPDATE SET alias = EXCLUDED.alias`;
      await sql`UPDATE championship_members SET avatar_data = (SELECT avatar_data FROM user_profiles WHERE user_id = ${user.id}) WHERE championship_id = ${invite.championship_id} AND user_id = ${user.id}`;
      await sql`UPDATE championship_invites SET accepted_at = now(), accepted_by = ${user.id} WHERE id = ${invite.id}`;
      return respond(res, 200, { ok: true, championshipId: invite.championship_id });
    }

    const championshipId = String(req.body?.championshipId || '');
    const email = String(req.body?.email || '').trim().toLowerCase();
    const membership = await sql`SELECT role FROM championship_members WHERE championship_id = ${championshipId} AND user_id = ${user.id}`;
    if (!membership.some(row => row.role === 'owner')) return respond(res, 403, { error: 'Solo quien creó el mundial puede invitar jugadores.' });
    if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) return respond(res, 400, { error: 'Escribe un correo válido.' });
    const token = randomBytes(32).toString('base64url');
    await sql`INSERT INTO championship_invites (championship_id, email, token_hash, invited_by, expires_at) VALUES (${championshipId}, ${email || null}, ${tokenHash(token)}, ${user.id}, now() + interval '14 days')`;
    return respond(res, 201, { token, email: email || null });
  } catch (error) {
    console.error('Invite API error:', error);
    return respond(res, 500, { error: 'No se pudo procesar la invitación.' });
  }
}
