import type { FastifyReply, FastifyRequest } from 'fastify';
import { success } from '../../lib/response.js';
import { handleRazorpayWebhook } from './webhooks.service.js';

type RawBodyRequest = FastifyRequest & { rawBody?: Buffer };

export async function postRazorpayWebhook(request: FastifyRequest, reply: FastifyReply) {
  const rawBody = (request as RawBodyRequest).rawBody;
  if (!rawBody || rawBody.length === 0) {
    return reply.status(400).send({
      error: { code: 'INVALID_REQUEST', message: 'Missing raw body', requestId: request.id },
    });
  }
  const signature = (request.headers['x-razorpay-signature'] as string | undefined) ?? '';
  const result = await handleRazorpayWebhook(rawBody, signature);
  return reply.status(200).send(success(result));
}