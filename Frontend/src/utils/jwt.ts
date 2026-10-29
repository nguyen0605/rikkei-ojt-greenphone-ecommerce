/**
 * Decodes a JWT payload without verification.
 * Returns null if the token is malformed or expired.
 */

interface JwtPayload {
  sub: string;
  userId: number;
  fullName: string;
  exp: number;
  iat: number;
}

function decodePayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Decode base64url payload (second segment)
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(payload);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Returns true if the token is present, well-formed, and NOT expired.
 */
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  const payload = decodePayload(token);
  if (!payload || !payload.exp) return false;
  // exp is in seconds, add 60s buffer to prevent edge-case races
  return payload.exp * 1000 > Date.now() + 60_000;
}
