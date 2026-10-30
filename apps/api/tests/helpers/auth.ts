import type { FastifyInstance } from 'fastify';

export async function loginAsOperator(
  app: FastifyInstance,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; user: any }> {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/operator/auth/login',
    payload: { email, password },
  });
  if (res.statusCode !== 200) {
    throw new Error(`Login failed: ${res.statusCode} ${res.body}`);
  }
  return res.json().data;
}

export async function loginAsAdmin(
  app: FastifyInstance,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; user: any }> {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/admin/auth/login',
    payload: { email, password },
  });
  if (res.statusCode !== 200) {
    throw new Error(`Admin login failed: ${res.statusCode} ${res.body}`);
  }
  return res.json().data;
}
/**
 * Creates a real passenger session (session + refresh_token_chain rows) and
 * returns the access token. Uses issueSessionTokens directly so the test
 * doesn't depend on the OTP mock flow's behavior.
 */
export async function loginAsPassenger(userId: string): Promise<string> {
  const { issueSessionTokens } = await import('../../src/modules/identity/jwt.service.js');
  const { newUuid } = await import('../../src/lib/ids.js');
  const { accessToken } = await issueSessionTokens({
    userId,
    role: 'REGISTERED_PASSENGER',
    sessionId: newUuid(),
  });
  return accessToken;
}