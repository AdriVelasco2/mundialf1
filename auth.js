import { createAuthClient } from '@neondatabase/auth';

const authUrl = import.meta.env?.VITE_NEON_AUTH_URL || import.meta.env?.NEON_AUTH_BASE_URL || '';
export const authClient = authUrl ? createAuthClient(authUrl) : null;

export async function getAccessToken(client) {
  if (!client) return null;

  // Neon Auth's direct token helper can briefly return null while a session is
  // being refreshed. In that case, force a fresh session read before giving up.
  try {
    const token = typeof client.getJWTToken === 'function'
      ? await client.getJWTToken()
      : null;
    if (typeof token === 'string' && token.trim()) return token;
  } catch {}

  try {
    const { data, error } = await client.getSession({ forceFetch: true });
    if (error) return null;
    const token = data?.session?.access_token || data?.session?.token || data?.access_token;
    return typeof token === 'string' && token.trim() ? token : null;
  } catch {
    return null;
  }
}

export const accessToken = () => getAccessToken(authClient);
