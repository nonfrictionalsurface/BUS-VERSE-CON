import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

export async function registerOpenApi(server: FastifyInstance): Promise<void> {
  await server.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'BusVerse + BusCon API',
        version: '1.0.0',
        description: 'Bus booking platform backend',
      },
      servers: [
        { url: 'http://localhost:4310', description: 'Local dev' },
      ],
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/v1/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}