import { prisma } from '../../lib/prisma.js';
import { rethrowPrismaError } from '../../lib/prisma-errors.js';
import { computePhoneHash } from '../../lib/phone.js';

export async function findUserByPhone(phone: string) {
  return prisma.user.findFirst({
    where: { OR: [{ phone }, { phoneHash: computePhoneHash(phone) }], deletedAt: null },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email, deletedAt: null } });
}

export async function findOperatorByEmail(email: string) {
  return prisma.operatorUser.findFirst({
    where: { userId: (await prisma.user.findFirstOrThrow({ where: { email, deletedAt: null }, select: { id: true } })).id, deletedAt: null },
    include: { user: true },
  });
}

export async function findAdminByEmail(email: string) {
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null }, select: { id: true } });
  if (!user) return null;
  return prisma.adminUser.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { user: true },
  });
}

export async function findDriverProfileByUser(userId: string) {
  return prisma.driverProfile.findUnique({
    where: { userId },
    include: { user: true },
  });
}

export async function findOperatorUserByPhone(phone: string) {
  return prisma.operatorUser.findFirst({
    where: { user: { phone }, deletedAt: null },
    include: { user: true, operator: true },
  });
}

export async function createPassengerUser(params: {
  phone: string;
  email?: string | null | undefined;
  ip?: string | null | undefined;
}) {
  const phoneHash = computePhoneHash(params.phone);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: params.phone,
          phoneHash,
          email: params.email ?? null,
          emailVerified: false,
        },
      });

      await tx.passengerProfile.create({
        data: { userId: user.id, name: params.phone },
      });

      await tx.consentRecord.createMany({
        data: ['terms_of_service', 'privacy_policy'].map((purpose) => ({
          userId: user.id,
          purpose,
          policyVersion: 'v1.0',
          ipAddress: params.ip ?? null,
        })),
      });

      return user;
    });
  } catch (err) {
    rethrowPrismaError(err);
  }
}

export async function findOperatorUserByUserId(userId: string) {
  return prisma.operatorUser.findFirst({
    where: { userId, deletedAt: null },
    include: { user: true, operator: true },
  });
}

export async function findAdminUserByUserId(userId: string) {
  return prisma.adminUser.findFirst({
    where: { userId, deletedAt: null },
    include: { user: true },
  });
}
export async function findOperatorByGstin(gstin: string) {
  return prisma.operator.findFirst({ where: { gstin, deletedAt: null } });
}

export async function createOperatorSignup(params: {
  companyName: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  passwordHash: string;
  ip?: string | null | undefined;
}) {
  const phoneHash = computePhoneHash(params.phone);
  const normalizedEmail = params.email.trim().toLowerCase();

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: params.phone,
          phoneHash,
          email: normalizedEmail,
          emailVerified: false,
        },
      });

      const operator = await tx.operator.create({
        data: {
          companyName: params.companyName,
          gstin: params.gstin,
          pan: params.pan,
          status: 'APPLIED',
        },
      });

      await tx.operatorUser.create({
        data: {
          userId: user.id,
          operatorId: operator.id,
          role: 'OWNER',
          passwordHash: params.passwordHash,
          acceptedAt: new Date(),
        },
      });

      await tx.consentRecord.createMany({
        data: ['terms_of_service', 'privacy_policy'].map((purpose) => ({
          userId: user.id,
          purpose,
          policyVersion: 'v1.0',
          ipAddress: params.ip ?? null,
        })),
      });

      return { user, operator };
    });
  } catch (err) {
    rethrowPrismaError(err);
  }
}