import { prisma } from '../../src/lib/prisma.js';
import { hashPassword } from '../../src/lib/password.js';
import { computePhoneHash } from '../../src/lib/phone.js';
import { newUuid } from '../../src/lib/ids.js';

// Unique E.164 phone per call — 91 + prefix (1 digit) + 9 hex digits = 10 digits total after +91.
// Different prefixes per actor type keep debugging readable and prevent cross-type collision.
function uniquePhone(prefix: '7' | '6' | '5' | '4'): string {
  const id = newUuid().replace(/-/g, '');
  const tail = id.split('').map((c) => (parseInt(c, 16) % 10).toString()).join('').slice(0, 9);
  return `+91${prefix}${tail}`;
}

export async function createPassenger(overrides?: { phone?: string; email?: string }) {
  const phone = overrides?.phone ?? uniquePhone('7');
  return prisma.user.create({
    data: {
      phone,
      phoneHash: computePhoneHash(phone),
      email: overrides?.email ?? null,
      emailVerified: false,
      passengerProfile: { create: { name: 'Test Passenger' } },
    },
    include: { passengerProfile: true },
  });
}

export async function createOperator(overrides?: {
  email?: string;
  phone?: string;
  role?: 'OWNER' | 'MANAGER';
  password?: string;
  gstin?: string;
  pan?: string;
}) {
  const phone = overrides?.phone ?? uniquePhone('6');
  const email = overrides?.email ?? `op-${newUuid().slice(0, 8)}@test.example`;
  const gstin = overrides?.gstin ?? `22${newUuid().replace(/-/g, '').slice(0, 11).toUpperCase()}Z5`;
  const pan = overrides?.pan ?? gstin.slice(2, 12);
  const passwordHash = await hashPassword(overrides?.password ?? 'correct horse battery staple');
  const userId = newUuid();

  return prisma.user.create({
    data: {
      id: userId,
      phone,
      phoneHash: computePhoneHash(phone),
      email,
      emailVerified: true,
      name: 'Operator Owner',
      operatorUsers: {
        create: {
          operator: {
            create: {
              companyName: 'Test Travels',
              gstin,
              pan,
              status: 'APPROVED',
            },
          },
          role: overrides?.role ?? 'OWNER',
          passwordHash,
        },
      },
    },
    include: { operatorUsers: { include: { operator: true } } },
  });
}

// NOTE: `adminUser` is SINGULAR — one-to-one relation with unique user_id FK.
export async function createAdmin(overrides?: { email?: string; password?: string }) {
  const email = overrides?.email ?? `admin-${newUuid().slice(0, 8)}@test.example`;
  const phone = uniquePhone('5');
  const passwordHash = await hashPassword(overrides?.password ?? 'correct horse battery staple!!!');

  return prisma.user.create({
    data: {
      phone,
      phoneHash: computePhoneHash(phone),
      email,
      emailVerified: true,
      name: 'Super Admin',
      adminUser: { create: { role: 'SUPER_ADMIN', passwordHash } },
    },
    include: { adminUser: true },
  });
}

export async function createDriver(overrides?: {
  phone?: string;
  kycStatus?: 'INVITED' | 'VERIFIED' | 'REJECTED';
  operatorId?: string;
}) {
  const phone = overrides?.phone ?? uniquePhone('4');
  const licenseNumber = `DL-${newUuid().replace(/-/g, '').slice(0, 15).toUpperCase()}`;
  let operatorId = overrides?.operatorId;
  if (!operatorId) {
    const opUser = await createOperator();
    operatorId = opUser.operatorUsers[0]!.operatorId;
  }

  return prisma.user.create({
    data: {
      phone,
      phoneHash: computePhoneHash(phone),
      driverProfile: {
        create: {
          operatorId,
          licenseNumber,
          kycStatus: overrides?.kycStatus ?? 'VERIFIED',
        },
      },
    },
    include: { driverProfile: true },
  });
}