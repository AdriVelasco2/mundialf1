import { neon } from '@neondatabase/serverless';
import { timingSafeEqual } from 'node:crypto';

const authRows = ['user', 'session', 'account', 'verification', 'organization', 'member', 'invitation', 'passkey', 'rate_limit'];

export default async function handler(req, res) {
  const secret = process.env.DB_RESET_TOKEN || '';
  const supplied = req.headers['x-db-reset-token'] || '';
  if (!secret || typeof supplied !== 'string' || supplied.length !== secret.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) {
    return res.status(404).json({ error: 'No encontrado.' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Base de datos no configurada.' });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const action = req.body?.action;
    if (action === 'inspect') {
      const tables = await sql`SELECT table_schema, table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema IN ('public','neon_auth') ORDER BY table_schema, table_name`;
      const authUsers = tables.some(row => row.table_schema === 'neon_auth' && row.table_name === 'user');
      let userCount = null;
      if (authUsers) {
        const rows = await sql`SELECT count(*)::int AS count FROM neon_auth."user"`;
        userCount = rows[0]?.count ?? 0;
      }
      const app = await sql`SELECT (SELECT count(*)::int FROM championships) AS championships, (SELECT count(*)::int FROM user_profiles) AS profiles, (SELECT count(*)::int FROM championship_members) AS members, (SELECT count(*)::int FROM championship_invites) AS invites`;
      return res.status(200).json({ tables: tables.filter(row => row.table_schema === 'neon_auth').map(row => row.table_name), authUsers: userCount, app: app[0] });
    }
    if (action !== 'reset') return res.status(400).json({ error: 'Acción no válida.' });

    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'neon_auth' AND table_type = 'BASE TABLE'`;
    const present = new Set(tables.map(row => row.table_name));
    const queries = [sql`TRUNCATE TABLE public.championship_invites, public.championship_members, public.user_profiles, public.championships RESTART IDENTITY CASCADE`];
    for (const table of authRows) {
      if (present.has(table)) queries.push(sql.query(`DELETE FROM neon_auth."${table}"`));
    }
    await sql.transaction(queries);
    return res.status(200).json({ ok: true, publicData: 'cleared', authTablesCleared: authRows.filter(table => present.has(table)) });
  } catch (error) {
    console.error('Database reset error:', error);
    return res.status(500).json({ error: 'No se pudo vaciar la base de datos.' });
  }
}
