import { prisma } from '../../lib/prisma.js';
import type { ScheduleStatus } from './network.types.js';
import type { Prisma } from '@prisma/client';

export async function listCities(q: string | undefined, limit: number) {
  return prisma.city.findMany({
    where: { isActive: true, deletedAt: null, ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}) },
    orderBy: { name: 'asc' }, take: limit,
  });
}
export async function findCityById(id: string) { return prisma.city.findFirst({ where: { id, deletedAt: null } }); }
export async function listStandsByCityId(cityId: string) {
  return prisma.stand.findMany({ where: { cityId, deletedAt: null }, orderBy: { name: 'asc' } });
}
export async function findStandById(id: string) { return prisma.stand.findFirst({ where: { id, deletedAt: null } }); }
export async function findOperatorUserWithRelations(userId: string) {
  return prisma.operatorUser.findFirst({ where: { userId, deletedAt: null }, include: { user: true, operator: true } });
}
export async function updateOperatorCompanyName(operatorId: string, companyName: string) {
  return prisma.operator.update({ where: { id: operatorId }, data: { companyName } });
}
export async function listBusesByOperator(operatorId: string, status?: string) {
  return prisma.bus.findMany({ where: { operatorId, deletedAt: null, ...(status ? { approvalStatus: status } : {}) }, orderBy: { createdAt: 'desc' } });
}
export async function findBusByIdForOperator(busId: string, operatorId: string) {
  return prisma.bus.findFirst({ where: { id: busId, operatorId, deletedAt: null } });
}
export async function createBus(data: {
  operatorId: string; registrationNumber: string; model?: string | null; capacity: number;
  busType: string; amenitiesJson: object; insuranceDocRef?: string | null; insuranceExpiresAt?: Date | null;
}) {
  return prisma.bus.create({ data: {
    operatorId: data.operatorId, registrationNumber: data.registrationNumber,
    model: data.model ?? null, capacity: data.capacity, busType: data.busType,
    amenitiesJson: data.amenitiesJson, insuranceDocRef: data.insuranceDocRef ?? null,
    insuranceExpiresAt: data.insuranceExpiresAt ?? null,
  }});
}
export async function updateBus(busId: string, data: {
  model?: string | null; amenitiesJson?: object; insuranceDocRef?: string | null; insuranceExpiresAt?: Date | null;
}) { return prisma.bus.update({ where: { id: busId }, data }); }
export async function softDeleteBus(busId: string) {
  return prisma.bus.update({ where: { id: busId }, data: { deletedAt: new Date() } });
}
export async function findSeatLayoutByBusId(busId: string) {
  return prisma.seatLayout.findFirst({ where: { busId, deletedAt: null } });
}
export async function findSeatsByLayoutId(layoutId: string) {
  return prisma.seat.findMany({ where: { layoutId, deletedAt: null }, orderBy: [{ seatRow: 'asc' }, { seatColumn: 'asc' }] });
}
export async function busLayoutHasBookings(busId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM booking_passengers bp
    JOIN seats s ON s.id = bp.seat_id
    JOIN seat_layouts sl ON sl.id = s.layout_id
    WHERE sl.bus_id = ${busId}::uuid AND bp.deleted_at IS NULL
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

const ROUTE_INCLUDE = {
  originCity: true, destCity: true,
  stands: { include: { stand: true }, orderBy: { sequence: 'asc' as const } },
};
export async function listRoutesByOperator(operatorId: string, status?: string) {
  return prisma.route.findMany({ where: { operatorId, deletedAt: null, ...(status ? { approvalStatus: status } : {}) }, include: ROUTE_INCLUDE, orderBy: { createdAt: 'desc' } });
}
export async function findRouteByIdForOperator(routeId: string, operatorId: string) {
  return prisma.route.findFirst({ where: { id: routeId, operatorId, deletedAt: null }, include: ROUTE_INCLUDE });
}
export async function createRouteWithStands(params: {
  operatorId: string; originCityId: string; destinationCityId: string;
  stands: Array<{ standId: string; sequence: number; distanceFromPrevKm: number; durationFromPrevMin: number }>;
}) {
  return prisma.route.create({
    data: {
      operatorId: params.operatorId, originCityId: params.originCityId, destinationCityId: params.destinationCityId,
      approvalStatus: 'PENDING',
      stands: { create: params.stands.map((s) => ({
        standId: s.standId, sequence: s.sequence,
        distanceFromPrevKm: s.distanceFromPrevKm, durationFromPrevMin: s.durationFromPrevMin,
      })) },
    },
    include: ROUTE_INCLUDE,
  });
}
export async function replaceRouteStands(params: {
  routeId: string;
  stands: Array<{ standId: string; sequence: number; distanceFromPrevKm: number; durationFromPrevMin: number }>;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.routeStand.deleteMany({ where: { routeId: params.routeId } });
    await tx.routeStand.createMany({ data: params.stands.map((s) => ({
      routeId: params.routeId, standId: s.standId, sequence: s.sequence,
      distanceFromPrevKm: s.distanceFromPrevKm, durationFromPrevMin: s.durationFromPrevMin,
    })) });
    return tx.route.findUniqueOrThrow({ where: { id: params.routeId }, include: ROUTE_INCLUDE });
  });
}
export async function maxRouteStandSequence(routeId: string): Promise<number> {
  const row = await prisma.routeStand.aggregate({ where: { routeId }, _max: { sequence: true } });
  return row._max.sequence ?? 0;
}
export async function appendRouteStand(params: {
  routeId: string; standId: string; sequence: number; distanceFromPrevKm: number; durationFromPrevMin: number;
}) {
  await prisma.routeStand.create({ data: {
    routeId: params.routeId, standId: params.standId, sequence: params.sequence,
    distanceFromPrevKm: params.distanceFromPrevKm, durationFromPrevMin: params.durationFromPrevMin,
  }});
  return prisma.route.findUniqueOrThrow({ where: { id: params.routeId }, include: ROUTE_INCLUDE });
}
export async function countSchedulesByRouteId(routeId: string): Promise<number> {
  return prisma.schedule.count({ where: { routeId, deletedAt: null } });
}
export async function softDeleteRoute(routeId: string) {
  return prisma.route.update({ where: { id: routeId }, data: { deletedAt: new Date() } });
}

// ---------- Schedules ----------
const SCHEDULE_INCLUDE = {
  bus: true,
  route: { include: { originCity: true, destCity: true } },
};

export async function listSchedulesByOperator(params: {
  operatorId: string;
  status?: string | undefined;
  busId?: string | undefined;
  routeId?: string | undefined;
}) {
  return prisma.schedule.findMany({
    where: {
      operatorId: params.operatorId,
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.busId ? { busId: params.busId } : {}),
      ...(params.routeId ? { routeId: params.routeId } : {}),
    },
    include: SCHEDULE_INCLUDE,
    orderBy: { departureTime: 'asc' },
  });
}
export async function findScheduleByIdForOperator(scheduleId: string, operatorId: string) {
  return prisma.schedule.findFirst({
    where: { id: scheduleId, operatorId, deletedAt: null },
    include: SCHEDULE_INCLUDE,
  });
}
export async function createSchedule(data: {
  operatorId: string; busId: string; routeId: string;
  departureTime: Date; arrivalTime: Date;
  fareAmountPaise: bigint; fareCurrency: string;
}) {
  return prisma.schedule.create({
    data: {
      operatorId: data.operatorId, busId: data.busId, routeId: data.routeId,
      departureTime: data.departureTime, arrivalTime: data.arrivalTime,
      fareAmountPaise: data.fareAmountPaise, fareCurrency: data.fareCurrency,
      status: 'DRAFT',
    },
    include: SCHEDULE_INCLUDE,
  });
}
export async function updateSchedule(scheduleId: string, data: {
  departureTime?: Date; arrivalTime?: Date; fareAmountPaise?: bigint;
}) {
  return prisma.schedule.update({ where: { id: scheduleId }, data, include: SCHEDULE_INCLUDE });
}
export async function publishScheduleById(scheduleId: string) {
  return prisma.schedule.update({
    where: { id: scheduleId },
    data: { status: 'PUBLISHED' },
    include: SCHEDULE_INCLUDE,
  });
}

/**
 * Find any PUBLISHED schedule for the given bus that overlaps the time range.
 * Range overlap test: (existing.departure < new.end AND existing.arrival > new.start).
 * Excludes the schedule being published (excludeId) if provided.
 */
export async function findBusConflict(params: {
  busId: string;
  departureTime: Date;
  arrivalTime: Date;
  excludeScheduleId?: string;
}): Promise<{ id: string; departureTime: Date; arrivalTime: Date } | null> {
  const rows = await prisma.schedule.findMany({
    where: {
      busId: params.busId,
      status: 'PUBLISHED',
      deletedAt: null,
      ...(params.excludeScheduleId ? { id: { not: params.excludeScheduleId } } : {}),
      departureTime: { lt: params.arrivalTime },
      arrivalTime: { gt: params.departureTime },
    },
    select: { id: true, departureTime: true, arrivalTime: true },
    take: 1,
  });
  return rows[0] ?? null;
}

export async function searchSchedules(params: {
  originCityId: string; destinationCityId: string; dateStart: Date; dateEnd: Date;
}) {
  return prisma.schedule.findMany({
    where: {
      route: { originCityId: params.originCityId, destinationCityId: params.destinationCityId, deletedAt: null },
      departureTime: { gte: params.dateStart, lt: params.dateEnd },
      status: 'PUBLISHED', deletedAt: null, bus: { deletedAt: null },
    },
    include: { bus: true, operator: true, route: { include: { originCity: true, destCity: true } } },
    orderBy: { departureTime: 'asc' },
  });
}
export async function bookedSeatCountsForSchedules(scheduleIds: string[]): Promise<Map<string, number>> {
  if (scheduleIds.length === 0) return new Map();
  const rows = await prisma.bookingPassenger.groupBy({
    by: ['scheduleId'], where: { scheduleId: { in: scheduleIds }, deletedAt: null }, _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.scheduleId, r._count._all]));
}
export async function findScheduleById(scheduleId: string) {
  return prisma.schedule.findFirst({
    where: { id: scheduleId, deletedAt: null },
    include: {
      bus: true, operator: true,
      route: {
        include: {
          originCity: true, destCity: true,
          stands: { include: { stand: true }, orderBy: { sequence: 'asc' } },
        },
      },
    },
  });
}
export type { ScheduleStatus };
// ============================================================
//  Phase 3c additions
// ============================================================

// ---------- Drivers ----------
export async function listDriversByOperator(operatorId: string, status?: string | undefined) {
  return prisma.driverProfile.findMany({
    where: { operatorId, deletedAt: null, ...(status ? { kycStatus: status } : {}) },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });
}
export async function findDriverByIdForOperator(driverId: string, operatorId: string) {
  return prisma.driverProfile.findFirst({
    where: { id: driverId, operatorId, deletedAt: null },
    include: { user: true },
  });
}
export async function findDriverByLicense(licenseNumber: string) {
  return prisma.driverProfile.findFirst({ where: { licenseNumber, deletedAt: null } });
}
export async function findDriverByUserId(userId: string) {
  return prisma.driverProfile.findFirst({ where: { userId, deletedAt: null } });
}
export async function findUserByPhone(phone: string) {
  return prisma.user.findFirst({ where: { phone, deletedAt: null } });
}
export async function createUserForDriver(params: { phone: string; phoneHash: string; name: string }) {
  return prisma.user.create({ data: { phone: params.phone, phoneHash: params.phoneHash, name: params.name } });
}
export async function createDriverProfile(params: { userId: string; operatorId: string; licenseNumber: string }) {
  return prisma.driverProfile.create({
    data: { userId: params.userId, operatorId: params.operatorId, licenseNumber: params.licenseNumber, kycStatus: 'INVITED' },
    include: { user: true },
  });
}
export async function softDeleteDriver(driverId: string) {
  return prisma.driverProfile.update({ where: { id: driverId }, data: { deletedAt: new Date() } });
}

// ---------- Bookings ----------
export async function listBookingsByOperator(params: {
  operatorId: string;
  limit: number;
  cursorCreatedAt?: Date | undefined;
  status?: string | undefined;
  scheduleId?: string | undefined;
  fromDate?: Date | undefined;
  toDate?: Date | undefined;
}) {
  const scheduleFilter: Record<string, unknown> = { operatorId: params.operatorId, deletedAt: null };
  if (params.fromDate || params.toDate) {
    scheduleFilter.departureTime = {
      ...(params.fromDate ? { gte: params.fromDate } : {}),
      ...(params.toDate ? { lte: params.toDate } : {}),
    };
  }
  return prisma.booking.findMany({
    where: {
      deletedAt: null,
      schedule: scheduleFilter,
      ...(params.status ? { status: params.status } : {}),
      ...(params.scheduleId ? { scheduleId: params.scheduleId } : {}),
      ...(params.cursorCreatedAt ? { createdAt: { lt: params.cursorCreatedAt } } : {}),
    },
    take: params.limit + 1,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      passengers: { where: { deletedAt: null } },
      schedule: { include: { route: { include: { originCity: true, destCity: true } } } },
    },
  });
}
export async function findBookingByIdForOperator(bookingId: string, operatorId: string) {
  return prisma.booking.findFirst({
    where: { id: bookingId, deletedAt: null, schedule: { operatorId, deletedAt: null } },
    include: {
      passengers: { where: { deletedAt: null } },
      schedule: { include: { route: { include: { originCity: true, destCity: true } } } },
      boardingStand: true,
      droppingStand: true,
      payments: { where: { deletedAt: null } },
    },
  });
}
export async function fetchSeatLabels(seatIds: string[]): Promise<Map<string, string>> {
  if (seatIds.length === 0) return new Map();
  const rows = await prisma.seat.findMany({ where: { id: { in: seatIds } }, select: { id: true, seatLabel: true } });
  return new Map(rows.map((r) => [r.id, r.seatLabel]));
}

// ---------- Dashboard / Revenue ----------
export async function countBookingsInRange(params: { operatorId: string; from: Date; to: Date; statuses: string[] }) {
  return prisma.booking.count({
    where: {
      deletedAt: null,
      status: { in: params.statuses },
      schedule: { operatorId: params.operatorId, deletedAt: null, departureTime: { gte: params.from, lte: params.to } },
    },
  });
}
export async function sumPassengersInRange(params: { operatorId: string; from: Date; to: Date; statuses: string[] }) {
  const rows = await prisma.bookingPassenger.count({
    where: {
      deletedAt: null,
      booking: {
        deletedAt: null,
        status: { in: params.statuses },
        schedule: { operatorId: params.operatorId, deletedAt: null, departureTime: { gte: params.from, lte: params.to } },
      },
    },
  });
  return rows;
}
export async function sumPaymentsInRange(params: { operatorId: string; from: Date; to: Date }) {
  const rows = await prisma.payment.aggregate({
    where: {
      deletedAt: null, status: 'SUCCEEDED',
      succeededAt: { gte: params.from, lte: params.to },
      booking: { deletedAt: null, schedule: { operatorId: params.operatorId, deletedAt: null } },
    },
    _sum: { amountPaise: true },
  });
  return Number(rows._sum.amountPaise ?? 0);
}
export async function sumRefundsInRange(params: { operatorId: string; from: Date; to: Date }) {
  const rows = await prisma.refund.aggregate({
    where: {
      deletedAt: null, status: { in: ['PROCESSED', 'INITIATED', 'PROCESSING'] },
      createdAt: { gte: params.from, lte: params.to },
      payment: { deletedAt: null, booking: { deletedAt: null, schedule: { operatorId: params.operatorId, deletedAt: null } } },
    },
    _sum: { amountPaise: true },
  });
  return Number(rows._sum.amountPaise ?? 0);
}
export async function countActiveTrips(operatorId: string) {
  return prisma.trip.count({ where: { deletedAt: null, status: 'IN_PROGRESS', schedule: { operatorId, deletedAt: null } } });
}
export async function countUpcomingTripsToday(operatorId: string, from: Date, to: Date) {
  return prisma.schedule.count({
    where: { operatorId, deletedAt: null, status: 'PUBLISHED', departureTime: { gte: from, lte: to } },
  });
}
export async function countPendingApprovals(operatorId: string) {
  const [buses, routes, schedules] = await Promise.all([
    prisma.bus.count({ where: { operatorId, deletedAt: null, approvalStatus: 'PENDING' } }),
    prisma.route.count({ where: { operatorId, deletedAt: null, approvalStatus: 'PENDING' } }),
    prisma.schedule.count({ where: { operatorId, deletedAt: null, status: 'DRAFT' } }),
  ]);
  return { buses, routes, schedules };
}
export async function countDrivers(operatorId: string) {
  const [total, onDuty, kycPending] = await Promise.all([
    prisma.driverProfile.count({ where: { operatorId, deletedAt: null } }),
    prisma.driverProfile.count({ where: { operatorId, deletedAt: null, onDuty: true } }),
    prisma.driverProfile.count({ where: { operatorId, deletedAt: null, kycStatus: 'KYC_PENDING' } }),
  ]);
  return { total, onDuty, kycPending };
}
export async function sumPaymentsForRevenue(params: { operatorId: string; from: Date; to: Date }) {
  const rows = await prisma.payment.findMany({
    where: {
      deletedAt: null, status: 'SUCCEEDED',
      succeededAt: { gte: params.from, lte: params.to },
      booking: { deletedAt: null, schedule: { operatorId: params.operatorId, deletedAt: null } },
    },
    select: { amountPaise: true, succeededAt: true, bookingId: true },
  });
  return rows;
}
export async function sumRefundsForRevenue(params: { operatorId: string; from: Date; to: Date }) {
  const rows = await prisma.refund.findMany({
    where: {
      deletedAt: null, status: { in: ['PROCESSED', 'INITIATED', 'PROCESSING'] },
      createdAt: { gte: params.from, lte: params.to },
      payment: { deletedAt: null, booking: { deletedAt: null, schedule: { operatorId: params.operatorId, deletedAt: null } } },
    },
    select: { amountPaise: true, createdAt: true },
  });
  return rows;
}

// ---------- Managers ----------
export async function listManagersForOperator(operatorId: string) {
  return prisma.operatorUser.findMany({
    where: { operatorId, deletedAt: null },
    include: { user: true },
    orderBy: { invitedAt: 'asc' },
  });
}
export async function countCancelledBookingsInRange(params: { operatorId: string; from: Date; to: Date }) {
  return prisma.booking.count({
    where: {
      deletedAt: null, status: { in: ['CANCELLED', 'OPERATOR_CANCELLED', 'REFUNDED'] },
      schedule: { operatorId: params.operatorId, deletedAt: null, departureTime: { gte: params.from, lte: params.to } },
    },
  });
}
export async function activeSeatLockCountsForSchedules(scheduleIds: string[]): Promise<Map<string, number>> {
  if (scheduleIds.length === 0) return new Map();
  const rows = await prisma.seatLock.groupBy({
    by: ['scheduleId'],
    where: {
      scheduleId: { in: scheduleIds },
      expiresAt: { gt: new Date() },
      deletedAt: null,
    },
    _count: { _all: true },
  });
  const out = new Map<string, number>();
  for (const r of rows) out.set(r.scheduleId, r._count._all);
  return out;
}

// ============================================================
//  Phase 13: Operator trip assignment
// ============================================================

export async function findScheduleForTripAssignment(scheduleId: string, operatorId: string) {
  return prisma.schedule.findFirst({
    where: { id: scheduleId, operatorId, deletedAt: null },
    include: { bus: true, route: { include: { originCity: true, destCity: true } } },
  });
}

export async function findDriverForTripAssignment(driverId: string, operatorId: string) {
  return prisma.driverProfile.findFirst({
    where: { id: driverId, operatorId, deletedAt: null },
    include: { user: true },
  });
}

export async function findActiveTripForSchedule(scheduleId: string) {
  return prisma.trip.findFirst({
    where: { scheduleId, deletedAt: null, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
    select: { id: true, status: true },
  });
}

export async function findOverlappingDriverTrip(params: {
  driverId: string;
  departureTime: Date;
  arrivalTime: Date;
  excludeTripId?: string;
}): Promise<{ id: string; scheduleId: string } | null> {
  const rows = await prisma.trip.findMany({
    where: {
      driverId: params.driverId,
      deletedAt: null,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      ...(params.excludeTripId ? { id: { not: params.excludeTripId } } : {}),
      schedule: {
        departureTime: { lt: params.arrivalTime },
        arrivalTime: { gt: params.departureTime },
      },
    },
    select: { id: true, scheduleId: true },
    take: 1,
  });
  return rows[0] ?? null;
}
const TRIP_INCLUDE = {
  schedule: { include: { route: { include: { originCity: true, destCity: true } } } },
  bus: true,
  driver: { include: { user: true } },
} as const;

export async function createOperatorTrip(params: {
  scheduleId: string;
  busId: string;
  driverId: string;
}) {
  return prisma.trip.create({
    data: {
      scheduleId: params.scheduleId,
      busId: params.busId,
      driverId: params.driverId,
      status: 'SCHEDULED',
    },
    include: TRIP_INCLUDE,
  });
}

export async function listTripsByOperator(params: {
  operatorId: string;
  limit: number;
  cursorCreatedAt?: Date | undefined;
  status?: string | undefined;
  driverId?: string | undefined;
  busId?: string | undefined;
  fromDate?: Date | undefined;
  toDate?: Date | undefined;
}) {
  const scheduleFilter: Prisma.ScheduleWhereInput = {
    operatorId: params.operatorId,
    deletedAt: null,
  };
  if (params.fromDate || params.toDate) {
    scheduleFilter.departureTime = {
      ...(params.fromDate ? { gte: params.fromDate } : {}),
      ...(params.toDate ? { lte: params.toDate } : {}),
    };
  }
  return prisma.trip.findMany({
    where: {
      deletedAt: null,
      schedule: scheduleFilter,
      ...(params.status ? { status: params.status } : {}),
      ...(params.driverId ? { driverId: params.driverId } : {}),
      ...(params.busId ? { busId: params.busId } : {}),
      ...(params.cursorCreatedAt ? { createdAt: { lt: params.cursorCreatedAt } } : {}),
    },
    take: params.limit + 1,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: TRIP_INCLUDE,
  });
}

export async function findTripForOperator(tripId: string, operatorId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, deletedAt: null, schedule: { operatorId, deletedAt: null } },
    include: TRIP_INCLUDE,
  });
}

export async function reassignTripDriver(tripId: string, driverId: string) {
  return prisma.trip.update({
    where: { id: tripId },
    data: { driverId },
    include: TRIP_INCLUDE,
  });
}

export async function softDeleteOperatorTrip(tripId: string) {
  return prisma.trip.update({
    where: { id: tripId },
    data: { deletedAt: new Date() },
  });
}