import { createAuthClient } from '@neondatabase/auth';

const authUrl = import.meta.env.VITE_NEON_AUTH_URL || import.meta.env.NEON_AUTH_BASE_URL || '';
export const authClient = authUrl ? createAuthClient(authUrl) : null;

export async function accessToken() {
  if (!authClient) return null;
  try {
    if (typeof authClient.getJWTToken === 'function') return await authClient.getJWTToken();
    const { data } = await authClient.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}
