import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { errors } from '../../lib/errors.js';
import { success } from '../../lib/response.js';

export interface PassengerMeDTO {
  userId: string;
  phone: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  passengerProfile: { name: string; dob: string | null; gender: string | null } | null;
  createdAt: string;
}

export async function getPassengerMe(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user!.userId;
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { passengerProfile: true },
  });
  if (!user) throw errors.notFound('User not found');
  const dto: PassengerMeDTO = {
    userId: user.id,
    phone: user.phone,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    passengerProfile: user.passengerProfile
      ? {
          name: user.passengerProfile.name,
          dob: user.passengerProfile.dob
            ? user.passengerProfile.dob.toISOString().slice(0, 10)
            : null,
          gender: user.passengerProfile.gender,
        }
      : null,
    createdAt: user.createdAt.toISOString(),
  };
  return reply.status(200).send(success(dto));
}