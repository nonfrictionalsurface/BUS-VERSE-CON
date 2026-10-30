// Phase 10 post-seed verifier — 61 assertions per shared/01 §13.2
// Run: pnpm db:seed:assert   (from apps/api)
// Exits 0 on success, 1 on failure.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) { passed++; }
  else { failed++; failures.push(`${label}${detail ? ` — ${detail}` : ''}`); console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`); }
}

function istDay(d: Date): { start: Date; end: Date } {
  const k = new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  return {
    start: new Date(`${k}T00:00:00.000+05:30`),
    end: new Date(`${k}T23:59:59.999+05:30`),
  };
}

async function main(): Promise<void> {
  console.log('Phase 10 seed-assert — ' + new Date().toISOString());
  console.log('');

  // ── COUNTS (31) ──
  assert('cities = 3', (await prisma.city.count()) === 3);
  assert('stands = 11', (await prisma.stand.count()) === 11);
  assert('operators = 3', (await prisma.operator.count()) === 3);
  assert('operator_users = 5', (await prisma.operatorUser.count()) === 5);
  assert('operator_users OWNER = 3', (await prisma.operatorUser.count({ where: { role: 'OWNER' } })) === 3);
  assert('operator_users MANAGER = 2', (await prisma.operatorUser.count({ where: { role: 'MANAGER' } })) === 2);
  assert('users = 16', (await prisma.user.count()) === 16);
  assert('passenger_profiles = 5', (await prisma.passengerProfile.count()) === 5);
  assert('driver_profiles = 5', (await prisma.driverProfile.count()) === 5);
  assert('admin_users = 1', (await prisma.adminUser.count()) === 1);
  assert('buses = 7', (await prisma.bus.count()) === 7);

  const sharma = await prisma.operator.findFirst({ where: { companyName: 'Sharma Travels' } });
  const rajdhani = await prisma.operator.findFirst({ where: { companyName: 'Rajdhani Express' } });
  const northern = await prisma.operator.findFirst({ where: { companyName: 'Northern Deluxe Coaches' } });
  assert('buses Sharma = 2', sharma ? (await prisma.bus.count({ where: { operatorId: sharma.id } })) === 2 : false);
  assert('buses Rajdhani = 3', rajdhani ? (await prisma.bus.count({ where: { operatorId: rajdhani.id } })) === 3 : false);
  assert('buses Northern = 2', northern ? (await prisma.bus.count({ where: { operatorId: northern.id } })) === 2 : false);

  assert('seat_layouts = 7', (await prisma.seatLayout.count()) === 7);
  assert('seats = 250', (await prisma.seat.count()) === 250);
  assert('seats SEATER = 160', (await prisma.seat.count({ where: { seatType: 'SEATER' } })) === 160);
  assert('seats SLEEPER = 90', (await prisma.seat.count({ where: { seatType: 'SLEEPER' } })) === 90);

  assert('routes = 5', (await prisma.route.count()) === 5);
  assert('route_stands = 15', (await prisma.routeStand.count()) === 15);
  assert('schedules = 15', (await prisma.schedule.count()) === 15);

  const allSchedules = await prisma.schedule.findMany({ select: { id: true, departureTime: true, routeId: true } });
  const istDayKey = (d: Date): string => new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const today = new Date();
  const d1 = istDayKey(new Date(today.getTime() + 1 * 24 * 3600 * 1000));
  const d3 = istDayKey(new Date(today.getTime() + 3 * 24 * 3600 * 1000));
  const d5 = istDayKey(new Date(today.getTime() + 5 * 24 * 3600 * 1000));

  assert('schedules day 1 = 9', allSchedules.filter((s) => istDayKey(s.departureTime) === d1).length === 9);
  assert('schedules day 3 = 3', allSchedules.filter((s) => istDayKey(s.departureTime) === d3).length === 3);
  assert('schedules day 5 = 3', allSchedules.filter((s) => istDayKey(s.departureTime) === d5).length === 3);

  const delhi = await prisma.city.findFirst({ where: { name: 'Delhi' } });
  const lucknow = await prisma.city.findFirst({ where: { name: 'Lucknow' } });
  const kanpur = await prisma.city.findFirst({ where: { name: 'Kanpur' } });
  const dl = delhi && lucknow ? await prisma.route.findMany({ where: { originCityId: delhi.id, destinationCityId: lucknow.id } }) : [];
  const dlIds = new Set(dl.map((r) => r.id));
  assert('day 1 Delhi→Lucknow = 6', allSchedules.filter((s) => istDayKey(s.departureTime) === d1 && dlIds.has(s.routeId)).length === 6);
  assert('day 3 Delhi→Lucknow = 3', allSchedules.filter((s) => istDayKey(s.departureTime) === d3 && dlIds.has(s.routeId)).length === 3);
  assert('day 5 Delhi→Lucknow = 3', allSchedules.filter((s) => istDayKey(s.departureTime) === d5 && dlIds.has(s.routeId)).length === 3);

  assert('driver_profiles Sharma = 2', sharma ? (await prisma.driverProfile.count({ where: { operatorId: sharma.id } })) === 2 : false);
  assert('driver_profiles Rajdhani = 2', rajdhani ? (await prisma.driverProfile.count({ where: { operatorId: rajdhani.id } })) === 2 : false);
  assert('driver_profiles Northern = 1', northern ? (await prisma.driverProfile.count({ where: { operatorId: northern.id } })) === 1 : false);

  assert('consent_records = 32', (await prisma.consentRecord.count()) === 32);

  // ── DEMO-READY STATES (9) ──
  const ops = await prisma.operator.findMany({ select: { status: true } });
  assert('all operators ACTIVE', ops.every((o) => o.status === 'ACTIVE'));

  const opUsers = await prisma.operatorUser.findMany({ select: { userId: true } });
  const opUserIds = new Set(opUsers.map((o) => o.userId));
  const opUserRecords = await prisma.user.findMany({ where: { id: { in: Array.from(opUserIds) } }, select: { emailVerified: true } });
  assert('all operator_users email_verified', opUserRecords.every((u) => u.emailVerified));

  const buses = await prisma.bus.findMany({ select: { approvalStatus: true, insuranceExpiresAt: true } });
  assert('all buses APPROVED', buses.every((b) => b.approvalStatus === 'APPROVED'));
  assert('all buses insurance future', buses.every((b) => b.insuranceExpiresAt !== null && b.insuranceExpiresAt > new Date()));

  const routes = await prisma.route.findMany({ select: { approvalStatus: true } });
  assert('all routes APPROVED', routes.every((r) => r.approvalStatus === 'APPROVED'));

  const scheds = await prisma.schedule.findMany({ select: { status: true } });
  assert('all schedules PUBLISHED', scheds.every((s) => s.status === 'PUBLISHED'));

  const drivers = await prisma.driverProfile.findMany({ select: { kycStatus: true, onDuty: true } });
  assert('all drivers ACTIVE', drivers.every((d) => d.kycStatus === 'ACTIVE'));
  assert('all drivers off duty', drivers.every((d) => d.onDuty === false));

  const admins = await prisma.adminUser.findMany({ select: { role: true } });
  assert('1 admin SUPER_ADMIN', admins.length === 1 && admins[0]!.role === 'SUPER_ADMIN');

  // ── RELATIONSHIP INTEGRITY (8) ──
  const busesWithLayout = await prisma.bus.findMany({ include: { layout: { include: { seats: true } } } });
  assert('every bus has 1 layout', busesWithLayout.every((b) => b.layout !== null));
  assert('every layout seat count == bus capacity', busesWithLayout.every((b) => b.layout !== null && b.layout.seats.length === b.capacity));

  const routesWithStands = await prisma.route.findMany({ include: { stands: { include: { stand: true }, orderBy: { sequence: 'asc' } } } });
  assert('every route ≥2 route_stands', routesWithStands.every((r) => r.stands.length >= 2));
  assert('route first stand is origin', routesWithStands.every((r) => r.stands.length > 0 && r.stands[0]!.stand.cityId === r.originCityId));
  assert('route last stand is destination', routesWithStands.every((r) => r.stands.length > 0 && r.stands[r.stands.length - 1]!.stand.cityId === r.destinationCityId));

  const schedulesWithRel = await prisma.schedule.findMany({ include: { bus: true, route: true } });
  assert('schedule bus.operator == route.operator', schedulesWithRel.every((s) => s.bus.operatorId === s.route.operatorId));

  const driversWithUser = await prisma.driverProfile.findMany({ include: { user: true } });
  assert('every driver user exists', driversWithUser.every((d) => d.user !== null));

  const opUsersWithRel = await prisma.operatorUser.findMany({ include: { operator: true } });
  assert('every operator_user operator exists', opUsersWithRel.every((o) => o.operator !== null));

  // ── FILTER COVERAGE (5) ──
  if (delhi && lucknow && kanpur) {
    const dlRoute = await prisma.route.findMany({ where: { originCityId: delhi.id, destinationCityId: lucknow.id } });
    const dlRouteIds = dlRoute.map((r) => r.id);
    const day1 = istDay(new Date(today.getTime() + 1 * 24 * 3600 * 1000));
    const d1Schedules = await prisma.schedule.findMany({
      where: { routeId: { in: dlRouteIds }, departureTime: { gte: day1.start, lt: day1.end } },
      include: { bus: true },
    });
    assert('day 1 DL≥1 AC_SEATER', d1Schedules.some((s) => s.bus.busType === 'AC_SEATER'));
    assert('day 1 DL≥1 AC_SLEEPER', d1Schedules.some((s) => s.bus.busType === 'AC_SLEEPER'));
    assert('day 1 DL≥1 CCTV bus', d1Schedules.some((s) => {
      const a = s.bus.amenitiesJson as { items?: string[] };
      return (a.items ?? []).includes('CCTV');
    }));
    assert('day 1 DL≥1 WIFI bus', d1Schedules.some((s) => {
      const a = s.bus.amenitiesJson as { items?: string[] };
      return (a.items ?? []).includes('WIFI');
    }));
    const kdRoutes = await prisma.route.findMany({ where: { originCityId: kanpur.id, destinationCityId: delhi.id } });
    const kdCount = kdRoutes.length > 0 ? await prisma.schedule.count({ where: { routeId: { in: kdRoutes.map((r) => r.id) } } }) : 0;
    assert('Kanpur→Delhi 0 schedules', kdCount === 0);
  } else {
    for (let i = 0; i < 5; i++) assert('filter check (city missing)', false);
  }

  // ── ZERO STATES (8) ──
  assert('seat_locks = 0', (await prisma.seatLock.count()) === 0);
  assert('bookings = 0', (await prisma.booking.count()) === 0);
  assert('payments = 0', (await prisma.payment.count()) === 0);
  assert('tickets = 0', (await prisma.ticket.count()) === 0);
  assert('trips = 0', (await prisma.trip.count()) === 0);
  assert('gps_samples = 0', (await prisma.gpsSample.count()) === 0);
  assert('boarding_scans = 0', (await prisma.boardingScan.count()) === 0);
  assert('sessions = 0', (await prisma.session.count()) === 0);
}

main()
  .then(async () => {
    console.log('');
    console.log(`  PASSED: ${passed}`);
    console.log(`  FAILED: ${failed}`);
    if (failed > 0) {
      console.log('\nFailures:');
      for (const f of failures) console.log(`  - ${f}`);
      await prisma.$disconnect();
      process.exit(1);
    }
    console.log('✓ All 61 assertions passed');
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('Assertion run failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });