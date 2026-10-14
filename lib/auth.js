import { createRemoteJWKSet, jwtVerify } from 'jose';

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const jwksUrl = process.env.NEON_AUTH_JWKS_URL || (baseUrl ? new URL('/.well-known/jwks.json', baseUrl) : null);
const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;

export async function requireUser(req, res) {
  if (!jwks || !baseUrl) {
    res.status(503).json({ error: 'La autenticación de Neon no está configurada en este despliegue.' });
    return null;
  }
  const header = req.headers.authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) {
    res.status(401).json({ error: 'Inicia sesión para continuar.' });
    return null;
  }
  try {
    const authUrl = new URL(baseUrl);
    const issuers = [...new Set([baseUrl.replace(/\/$/, ''), authUrl.origin])];
    const { payload } = await jwtVerify(header.slice(7), jwks, { issuer: issuers });
    if (!payload.sub) throw new Error('Missing subject');
    return { id: String(payload.sub), email: String(payload.email || ''), name: String(payload.name || '') };
  } catch {
    res.status(401).json({ error: 'La sesión ha caducado. Vuelve a iniciar sesión.' });
    return null;
  }
}

export const respond = (res, status, body) => res.status(status).json(body);
