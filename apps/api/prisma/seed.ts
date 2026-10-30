// Phase 10 seed script — BusVerse + BusCon
// Spec: docs/shared/01-DEMO-TRANSIT-NETWORK.md v1.0
// Creates ~380 reference + config rows, 0 transactional rows.
// Idempotent via deterministic UUIDs.

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';
import { computePhoneHash } from '../src/lib/phone.js';
import { deterministicUuid } from '../src/lib/ids.js';
import { encrypt } from '../src/lib/crypto.js';
import { env } from '../src/config/env.js';
import {
  IDS, CITIES, STANDS, OPERATORS, OPERATOR_USERS, ADMIN_USER,
  DRIVERS, PASSENGERS, BUSES, LAYOUTS, ROUTES, ROUTE_STANDS, SCHEDULES,
  DEMO_PASSWORD, ADMIN_PASSWORD, CONSENT_PURPOSES, CONSENT_POLICY_VERSION,
  ALL_USER_IDS,
} from './seed-data.js';

const prisma = new PrismaClient();

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function istAt(daysFromToday: number, hh: number, mm: number): Date {
  const now = new Date();
  const istOffsetMs = 5.5 * 3600 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  const istMidnightMs = Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate() + daysFromToday,
  );
  const utcMs = istMidnightMs + hh * 3600 * 1000 + mm * 60 * 1000 - istOffsetMs;
  return new Date(utcMs);
}

function daysAgo(n: number): Date { return new Date(Date.now() - n * 24 * 3600 * 1000); }
function daysAhead(n: number): Date { return new Date(Date.now() + n * 24 * 3600 * 1000); }

async function allowedValues(constraintName: string): Promise<string[]> {
  try {
    const rows = await prisma.$queryRaw<Array<{ def: string | null }>>`
      SELECT pg_get_constraintdef(oid) AS def
      FROM pg_constraint WHERE conname = ${constraintName} LIMIT 1
    `;
    const def = rows[0]?.def;
    if (!def) return [];
    return [...def.matchAll(/'([A-Za-z_]+)'/g)].map((m) => m[1]!).filter(Boolean);
  } catch {
    return [];
  }
}

function pick(pref: string, avail: string[], fallback: string): string {
  if (avail.length === 0) return fallback;
  return avail.includes(pref) ? pref : fallback;
}

// ────────────────────────────────────────────────────────────
// Seed functions
// ────────────────────────────────────────────────────────────
async function seedCities() {
  for (const c of CITIES) {
    await prisma.city.upsert({
      where: { id: c.id },
      update: { name: c.name, state: c.state, isActive: c.isActive },
      create: { id: c.id, name: c.name, state: c.state, isActive: c.isActive },
    });
  }
  console.log(`  cities: ${CITIES.length}`);
}

async function seedStands(standTypesAllowed: string[]) {
  for (const s of STANDS) {
    const type = standTypesAllowed.length === 0 || standTypesAllowed.includes(s.type)
      ? s.type
      : s.typeFallback;
    await prisma.stand.upsert({
      where: { id: s.id },
      update: { cityId: s.cityId, name: s.name, type, lat: s.lat, lng: s.lng },
      create: { id: s.id, cityId: s.cityId, name: s.name, type, lat: s.lat, lng: s.lng },
    });
  }
  console.log(`  stands: ${STANDS.length}`);
}

async function seedOperators(operatorStatusesAllowed: string[]) {
  const encKey = env.PII_ENCRYPTION_KEY;
  for (const o of OPERATORS) {
    const status = operatorStatusesAllowed.length === 0 || operatorStatusesAllowed.includes(o.status)
      ? o.status
      : o.statusFallback;
    const bankRefEnc = encrypt(o.bankRef, encKey);
    await prisma.operator.upsert({
      where: { id: o.id },
      update: { companyName: o.companyName, gstin: o.gstin, pan: o.pan, bankAccountRef: bankRefEnc, status, isTest: true },
      create: { id: o.id, companyName: o.companyName, gstin: o.gstin, pan: o.pan, bankAccountRef: bankRefEnc, status, isTest: true },
    });
  }
  console.log(`  operators: ${OPERATORS.length}`);
}

async function upsertUserBase(args: {
  id: string; phone: string; email: string | null; emailVerified: boolean; name: string;
}): Promise<void> {
  const phoneHash = computePhoneHash(args.phone);
  await prisma.user.upsert({
    where: { id: args.id },
    update: { phone: args.phone, phoneHash, email: args.email, emailVerified: args.emailVerified, name: args.name, isTest: true },
    create: { id: args.id, phone: args.phone, phoneHash, email: args.email, emailVerified: args.emailVerified, name: args.name, isTest: true },
  });
}

async function seedUsersAndOperatorUsers() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const invitedAt = daysAgo(35);
  const acceptedAt = daysAgo(30);

  for (const ou of OPERATOR_USERS) {
    await upsertUserBase({
      id: ou.userId, phone: ou.phone, email: ou.email, emailVerified: true, name: ou.name,
    });
    await prisma.operatorUser.upsert({
      where: { id: ou.id },
      update: {
        userId: ou.userId, operatorId: ou.operatorId, role: ou.role,
        passwordHash, invitedBy: ou.invitedBy, invitedAt, acceptedAt, isTest: true,
      },
      create: {
        id: ou.id, userId: ou.userId, operatorId: ou.operatorId, role: ou.role,
        passwordHash, invitedBy: ou.invitedBy, invitedAt, acceptedAt, isTest: true,
      },
    });
  }
  console.log(`  operator_users: ${OPERATOR_USERS.length}`);
}

async function seedAdminUser() {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await upsertUserBase({
    id: ADMIN_USER.userId, phone: ADMIN_USER.phone, email: ADMIN_USER.email, emailVerified: true, name: ADMIN_USER.name,
  });
  await prisma.adminUser.upsert({
    where: { id: ADMIN_USER.id },
    update: { userId: ADMIN_USER.userId, role: 'SUPER_ADMIN', passwordHash, isTest: true },
    create: { id: ADMIN_USER.id, userId: ADMIN_USER.userId, role: 'SUPER_ADMIN', passwordHash, isTest: true },
  });
  console.log(`  admin_users: 1`);
}

async function seedDrivers(driverKycAllowed: string[]) {
  for (const d of DRIVERS) {
    await upsertUserBase({
      id: d.userId, phone: d.phone, email: null, emailVerified: false, name: d.name,
    });
    const kyc = driverKycAllowed.length === 0 || driverKycAllowed.includes('ACTIVE')
      ? 'ACTIVE'
      : 'VERIFIED';
    await prisma.driverProfile.upsert({
      where: { id: d.profileId },
      update: {
        userId: d.userId, operatorId: d.operatorId, licenseNumber: d.license,
        kycStatus: kyc, onDuty: false, verifiedAt: daysAgo(5), isTest: true,
      },
      create: {
        id: d.profileId, userId: d.userId, operatorId: d.operatorId, licenseNumber: d.license,
        kycStatus: kyc, onDuty: false, verifiedAt: daysAgo(5), isTest: true,
      },
    });
  }
  console.log(`  driver_profiles: ${DRIVERS.length}`);
}

async function seedPassengers() {
  for (const p of PASSENGERS) {
    await upsertUserBase({
      id: p.userId, phone: p.phone, email: p.email, emailVerified: true, name: p.name,
    });
    await prisma.passengerProfile.upsert({
      where: { id: p.profileId },
      update: { userId: p.userId, name: p.name, isTest: true },
      create: { id: p.profileId, userId: p.userId, name: p.name, isTest: true },
    });
  }
  console.log(`  passenger_profiles: ${PASSENGERS.length}`);
}

async function seedBuses(busTypesAllowed: string[]) {
  for (const b of BUSES) {
    const busType = busTypesAllowed.length === 0 || busTypesAllowed.includes(b.busType)
      ? b.busType
      : b.busTypeFallback;
    await prisma.bus.upsert({
      where: { id: b.id },
      update: {
        operatorId: b.operatorId, registrationNumber: b.registrationNumber, model: b.model,
        capacity: b.capacity, busType, amenitiesJson: { _v: 1, items: b.amenities },
        approvalStatus: 'APPROVED', insuranceExpiresAt: daysAhead(365), isTest: true,
      },
      create: {
        id: b.id, operatorId: b.operatorId, registrationNumber: b.registrationNumber, model: b.model,
        capacity: b.capacity, busType, amenitiesJson: { _v: 1, items: b.amenities },
        approvalStatus: 'APPROVED', insuranceExpiresAt: daysAhead(365), isTest: true,
      },
    });
  }
  console.log(`  buses: ${BUSES.length}`);
}

function buildAisleMap(): { _v: 1; aisle_cells: Array<{ row: number; column: number }> } {
  return {
    _v: 1,
    aisle_cells: Array.from({ length: 10 }, (_, i) => ({ row: i + 1, column: 2 })),
  };
}

async function seedLayoutsAndSeats() {
  let totalSeats = 0;
  const ROWS = 'ABCDEFGHIJ'.split('');
  for (const l of LAYOUTS) {
    const aisleMap = buildAisleMap();
    await prisma.seatLayout.upsert({
      where: { id: l.id },
      update: { busId: l.busId, rowsCount: l.rowsCount, columnsCount: l.columnsCount, aisleMapJson: aisleMap, isTest: true },
      create: { id: l.id, busId: l.busId, rowsCount: l.rowsCount, columnsCount: l.columnsCount, aisleMapJson: aisleMap, isTest: true },
    });
    for (const r of ROWS) {
      for (let c = 1; c <= l.columnsCount; c++) {
        const seatLabel = `${r}${c}`;
        const seatId = deterministicUuid(`seed:seat:${l.id}:${seatLabel}`);
        const isFemaleOnly = c === l.femaleColumn && l.femaleRows.includes(r);
        await prisma.seat.upsert({
          where: { id: seatId },
          update: {
            layoutId: l.id, seatRow: r, seatColumn: c, seatLabel,
            seatType: l.seatType, isFemaleOnly, isTest: true,
          },
          create: {
            id: seatId, layoutId: l.id, seatRow: r, seatColumn: c, seatLabel,
            seatType: l.seatType, isFemaleOnly, isTest: true,
          },
        });
        totalSeats++;
      }
    }
  }
  console.log(`  seat_layouts: ${LAYOUTS.length}`);
  console.log(`  seats: ${totalSeats}`);
}

async function seedRoutes() {
  for (const r of ROUTES) {
    await prisma.route.upsert({
      where: { id: r.id },
      update: { operatorId: r.operatorId, originCityId: r.originCityId, destinationCityId: r.destinationCityId, approvalStatus: r.approvalStatus, isTest: true },
      create: { id: r.id, operatorId: r.operatorId, originCityId: r.originCityId, destinationCityId: r.destinationCityId, approvalStatus: r.approvalStatus, isTest: true },
    });
  }
  console.log(`  routes: ${ROUTES.length}`);
}

async function seedRouteStands() {
  for (const rs of ROUTE_STANDS) {
    const id = deterministicUuid(`seed:rs:${rs.routeId}:${rs.sequence}`);
    await prisma.routeStand.upsert({
      where: { id },
      update: { routeId: rs.routeId, standId: rs.standId, sequence: rs.sequence, distanceFromPrevKm: rs.distanceFromPrevKm, durationFromPrevMin: rs.durationFromPrevMin, isTest: true },
      create: { id, routeId: rs.routeId, standId: rs.standId, sequence: rs.sequence, distanceFromPrevKm: rs.distanceFromPrevKm, durationFromPrevMin: rs.durationFromPrevMin, isTest: true },
    });
  }
  console.log(`  route_stands: ${ROUTE_STANDS.length}`);
}

async function seedSchedules() {
  for (const s of SCHEDULES) {
    const departureTime = istAt(s.dayOffset, s.departureH, s.departureM);
    const arrivalTime = istAt(s.dayOffset + s.arrivalDayOffset, s.arrivalH, s.arrivalM);
    const route = ROUTES.find((r) => r.id === s.routeId)!;
    const operatorId = route.operatorId;
    await prisma.schedule.upsert({
      where: { id: s.id },
      update: { operatorId, busId: s.busId, routeId: s.routeId, departureTime, arrivalTime, fareAmountPaise: s.farePaise, fareCurrency: 'INR', status: 'PUBLISHED', isTest: true },
      create: { id: s.id, operatorId, busId: s.busId, routeId: s.routeId, departureTime, arrivalTime, fareAmountPaise: s.farePaise, fareCurrency: 'INR', status: 'PUBLISHED', isTest: true },
    });
  }
  console.log(`  schedules: ${SCHEDULES.length}`);
}

async function seedConsentRecords() {
  let count = 0;
  const grantedAt = daysAgo(30);
  for (const userId of ALL_USER_IDS) {
    for (const purpose of CONSENT_PURPOSES) {
      const id = deterministicUuid(`seed:consent:${userId}:${purpose}`);
      await prisma.consentRecord.upsert({
        where: { id },
        update: { userId, purpose, policyVersion: CONSENT_POLICY_VERSION, grantedAt, ipAddress: '127.0.0.1', isTest: true },
        create: { id, userId, purpose, policyVersion: CONSENT_POLICY_VERSION, grantedAt, ipAddress: '127.0.0.1', isTest: true },
      });
      count++;
    }
  }
  console.log(`  consent_records: ${count}`);
}

async function seedSequences() {
  const year = new Date().getUTCFullYear();
  const nextYear = year + 1;
  await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS booking_reference_seq_${year}`);
  await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS booking_reference_seq_${nextYear}`);

  const now = new Date();
  const month = now.getMonth() + 1;
  const fyStart = month >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const fyEndShort = (fyStart + 1) % 100;
  await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq_${fyStart}_${String(fyEndShort).padStart(2, '0')}`);
  console.log(`  sequences: 3 (booking_reference_seq_${year}, booking_reference_seq_${nextYear}, invoice_number_seq_${fyStart}_${String(fyEndShort).padStart(2, '0')})`);
}

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────
async function main() {
  if (env.NODE_ENV === 'production') {
    console.error('✗ Seed not allowed in production. NODE_ENV=' + env.NODE_ENV);
    process.exit(1);
  }

  console.log(`Phase 10 seed — ${new Date().toISOString()}`);
  console.log('Introspecting constraint values...');
  const standTypesAllowed = await allowedValues('chk_stands_type');
  const busTypesAllowed = await allowedValues('chk_buses_bus_type');
  const driverKycAllowed = await allowedValues('chk_driver_kyc_status');
  const operatorStatusesAllowed = await allowedValues('chk_operators_status');
  console.log(`  chk_stands_type          : [${standTypesAllowed.join(',') || '(unknown)'}]`);
  console.log(`  chk_buses_bus_type       : [${busTypesAllowed.join(',') || '(unknown)'}]`);
  console.log(`  chk_driver_kyc_status    : [${driverKycAllowed.join(',') || '(unknown)'}]`);
  console.log(`  chk_operators_status     : [${operatorStatusesAllowed.join(',') || '(unknown)'}]`);
  console.log('');

  await seedCities();
  await seedStands(standTypesAllowed);
  await seedOperators(operatorStatusesAllowed);
  await seedUsersAndOperatorUsers();
  await seedAdminUser();
  await seedDrivers(driverKycAllowed);
  await seedPassengers();
  await seedBuses(busTypesAllowed);
  await seedLayoutsAndSeats();
  await seedRoutes();
  await seedRouteStands();
  await seedSchedules();
  await seedConsentRecords();
  await seedSequences();

  console.log('\n✓ Seed complete. Run `pnpm db:seed:assert` to verify.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('✗ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });