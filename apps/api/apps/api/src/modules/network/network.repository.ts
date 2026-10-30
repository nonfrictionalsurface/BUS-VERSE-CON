import { prisma } from '../../lib/prisma.js';
import type { ScheduleStatus } from './network.types.js';

// ---------- Cities ----------
export async function listCities(q: string | undefined, limit: number) {
  return prisma.city.findMany({
    where: {
      isActive: true, deletedAt: null,
      ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { name: 'asc' },
    take: limit,
  });
}
export async function findCityById(id: string) {
  return prisma.city.findFirst({ where: { id, deletedAt: null } });
}
export async function listStandsByCityId(cityId: string) {
  return prisma.stand.findMany({ where: { cityId, deletedAt: null }, orderBy: { name: 'asc' } });
}
export async function findStandById(id: string) {
  return prisma.stand.findFirst({ where: { id, deletedAt: null } });
}

// ---------- Operator context ----------
export async function findOperatorUserWithRelations(userId: string) {
  return prisma.operatorUser.findFirst({
    where: { userId, deletedAt: null },
    include: { user: true, operator: true },
  });
}
export async function updateOperatorCompanyName(operatorId: string, companyName: string) {
  return prisma.operator.update({ where: { id: operatorId }, data: { companyName } });
}

// ---------- Buses ----------
export async function listBusesByOperator(operatorId: string, status?: string) {
  return prisma.bus.findMany({
    where: { operatorId, deletedAt: null, ...(status ? { approvalStatus: status } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}
export async function findBusByIdForOperator(busId: string, operatorId: string) {
  return prisma.bus.findFirst({ where: { id: busId, operatorId, deletedAt: null } });
}
export async function createBus(data: {
  operatorId: string; registrationNumber: string; model?: string | null; capacity: number;
  busType: string; amenitiesJson: object; insuranceDocRef?: string | null; insuranceExpiresAt?: Date | null;
}) {
  return prisma.bus.create({
    data: {
      operatorId: data.operatorId,
      registrationNumber: data.registrationNumber,
      model: data.model ?? null,
      capacity: data.capacity,
      busType: data.busType,
      amenitiesJson: data.amenitiesJson,
      insuranceDocRef: data.insuranceDocRef ?? null,
      insuranceExpiresAt: data.insuranceExpiresAt ?? null,
    },
  });
}
export async function updateBus(busId: string, data: {
  model?: string | null; amenitiesJson?: object; insuranceDocRef?: string | null; insuranceExpiresAt?: Date | null;
}) {
  return prisma.bus.update({ where: { id: busId }, data });
}
export async function softDeleteBus(busId: string) {
  return prisma.bus.update({ where: { id: busId }, data: { deletedAt: new Date() } });
}

// ---------- Seat layouts ----------
export async function findSeatLayoutByBusId(busId: string) {
  return prisma.seatLayout.findFirst({ where: { busId, deletedAt: null } });
}
export async function findSeatsByLayoutId(layoutId: string) {
  return prisma.seat.findMany({
    where: { layoutId, deletedAt: null },
    orderBy: [{ seatRow: 'asc' }, { seatColumn: 'asc' }],
  });
}
export async function busLayoutHasBookings(busId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM booking_passengers bp
    JOIN seats s ON s.id = bp.seat_id
    JOIN seat_layouts sl ON sl.id = s.layout_id
    WHERE sl.bus_id = ${busId}::uuid AND bp.deleted_at IS NULL
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

// ---------- Routes ----------
const ROUTE_INCLUDE = {
  originCity: true,
  destCity: true,
  stands: { include: { stand: true }, orderBy: { sequence: 'asc' as const } },
};

export async function listRoutesByOperator(operatorId: string, status?: string) {
  return prisma.route.findMany({
    where: { operatorId, deletedAt: null, ...(status ? { approvalStatus: status } : {}) },
    include: ROUTE_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}
export async function findRouteByIdForOperator(routeId: string, operatorId: string) {
  return prisma.route.findFirst({
    where: { id: routeId, operatorId, deletedAt: null },
    include: ROUTE_INCLUDE,
  });
}
export async function createRouteWithStands(params: {
  operatorId: string; originCityId: string; destinationCityId: string;
  stands: Array<{ standId: string; sequence: number; distanceFromPrevKm: number; durationFromPrevMin: number }>;
}) {
  return prisma.route.create({
    data: {
      operatorId: params.operatorId,
      originCityId: params.originCityId,
      destinationCityId: params.destinationCityId,
      approvalStatus: 'PENDING',
      stands: {
        create: params.stands.map((s) => ({
          standId: s.standId,
          sequence: s.sequence,
          distanceFromPrevKm: s.distanceFromPrevKm,
          durationFromPrevMin: s.durationFromPrevMin,
        })),
      },
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
    await tx.routeStand.createMany({
      data: params.stands.map((s) => ({
        routeId: params.routeId,
        standId: s.standId,
        sequence: s.sequence,
        distanceFromPrevKm: s.distanceFromPrevKm,
        durationFromPrevMin: s.durationFromPrevMin,
      })),
    });
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
  await prisma.routeStand.create({
    data: {
      routeId: params.routeId,
      standId: params.standId,
      sequence: params.sequence,
      distanceFromPrevKm: params.distanceFromPrevKm,
      durationFromPrevMin: params.durationFromPrevMin,
    },
  });
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
      operatorId: data.operatorId,
      busId: data.busId,
      routeId: data.routeId,
      departureTime: data.departureTime,
      arrivalTime: data.arrivalTime,
      fareAmountPaise: data.fareAmountPaise,
      fareCurrency: data.fareCurrency,
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

// ---------- Public search ----------
export async function searchSchedules(params: {
  originCityId: string; destinationCityId: string; dateStart: Date; dateEnd: Date;
}) {
  return prisma.schedule.findMany({
    where: {
      route: {
        originCityId: params.originCityId,
        destinationCityId: params.destinationCityId,
        deletedAt: null,
      },
      departureTime: { gte: params.dateStart, lt: params.dateEnd },
      status: 'PUBLISHED',
      deletedAt: null,
      bus: { deletedAt: null },
    },
    include: { bus: true, operator: true, route: { include: { originCity: true, destCity: true } } },
    orderBy: { departureTime: 'asc' },
  });
}
export async function bookedSeatCountsForSchedules(scheduleIds: string[]): Promise<Map<string, number>> {
  if (scheduleIds.length === 0) return new Map();
  const rows = await prisma.bookingPassenger.groupBy({
    by: ['scheduleId'],
    where: { scheduleId: { in: scheduleIds }, deletedAt: null },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.scheduleId, r._count._all]));
}
export async function findScheduleById(scheduleId: string) {
  return prisma.schedule.findFirst({
    where: { id: scheduleId, deletedAt: null },
    include: {
      bus: true,
      operator: true,
      route: {
        include: {
          originCity: true,
          destCity: true,
          stands: { include: { stand: true }, orderBy: { sequence: 'asc' } },
        },
      },
    },
  });
}
export type { ScheduleStatus };