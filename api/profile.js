import { neon } from '@neondatabase/serverless';
import { requireUser, respond } from '../lib/auth.js';

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) return respond(res, 503, { error: 'Falta configurar DATABASE_URL.' });
  const user = await requireUser(req, res);
  if (!user) return;
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT alias, avatar_data AS avatar, email FROM user_profiles WHERE user_id = ${user.id}`;
      return respond(res, 200, rows[0] || { alias: user.name || user.email.split('@')[0], avatar: null, email: user.email });
    }
    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'GET, PATCH');
      return respond(res, 405, { error: 'Método no permitido.' });
    }
    const alias = String(req.body?.alias || '').trim().slice(0, 35);
    const avatar = req.body?.avatar || null;
    if (alias.length < 2) return respond(res, 400, { error: 'El alias debe tener al menos 2 caracteres.' });
    if (avatar !== null && (typeof avatar !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(avatar) || avatar.length > 500000)) {
      return respond(res, 400, { error: 'La foto debe ser una imagen JPG, PNG o WebP de menos de 350 KB.' });
    }
    await sql`INSERT INTO user_profiles (user_id, email, alias, avatar_data) VALUES (${user.id}, ${user.email.toLowerCase()}, ${alias}, ${avatar}) ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, alias = EXCLUDED.alias, avatar_data = EXCLUDED.avatar_data, updated_at = now()`;
    await sql`UPDATE championship_members SET alias = ${alias}, avatar_data = ${avatar} WHERE user_id = ${user.id}`;
    return respond(res, 200, { alias, avatar, email: user.email });
  } catch (error) {
    console.error('Profile API error:', error);
    return respond(res, 500, { error: 'No se pudo guardar el perfil.' });
  }
}
