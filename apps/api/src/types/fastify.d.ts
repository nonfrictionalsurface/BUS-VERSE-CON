import 'fastify';

export interface UserContext {
  userId: string;
  role: string;
  sessionId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: UserContext | null;
  }
}