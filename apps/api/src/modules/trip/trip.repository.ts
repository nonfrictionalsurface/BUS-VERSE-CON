import { prisma } from '../../lib/prisma.js';
import type { TripStatus } from './trip.types.js';

// IST-anchored day bounds (B1 in tracker)
function istDayBounds(dateStr: string): { from: Date; to: Date } {
  return {
    from: new Date(`${dateStr}T00:00:00.000+05:30`),
    to: new Date(`${dateStr}T23:59:59.999+05:30`),
  };
}

function todayIst(): string {
  const istNow = new Date(Date.now() + 5.5 * 3600 * 1000);
  return istNow.toISOString().slice(0, 10);
}

export interface PassengerCounts { boarded: number; confirmed: number; }

async function getPassengerCountsForSchedules(
  scheduleIds: string[],
): Promise<Map<string, PassengerCounts>> {
  if (scheduleIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<Array<{ scheduleId: string; status: string; cnt: number }>>`
    SELECT bp.schedule_id AS "scheduleId", b.status, COUNT(*)::int AS cnt
    FROM booking_passengers bp
    JOIN bookings b ON b.id = bp.booking_id
    WHERE bp.schedule_id = ANY(${scheduleIds}::uuid[])
      AND bp.deleted_at IS NULL
      AND b.deleted_at IS NULL
      AND b.status IN ('CONFIRMED', 'CHECKED_IN')
    GROUP BY bp.schedule_id, b.status
  `;
  const out = new Map<string, PassengerCounts>();
  for (const id of scheduleIds) out.set(id, { boarded: 0, confirmed: 0 });
  for (const r of rows) {
    const cur = out.get(r.scheduleId) ?? { boarded: 0, confirmed: 0 };
    if (r.status === 'CHECKED_IN') cur.boarded += r.cnt;
    cur.confirmed += r.cnt;
    out.set(r.scheduleId, cur);
  }
  return out;
}

export async function findTripsForDriver(
  userId: string,
  date?: string,
): Promise<Array<{
  id: string;
  scheduleId: string;
  status: string;
  departureTime: Date;
  arrivalTime: Date;
  bus: { id: string; registrationNumber: string; model: string | null };
  route: { originCityName: string; destCityName: string };
  counts: PassengerCounts;
}>> {
  const day = date ?? todayIst();
  const { from, to } = istDayBounds(day);
  const trips = await prisma.trip.findMany({
    where: {
      driver: { userId, deletedAt: null },
      deletedAt: null,
      schedule: { departureTime: { gte: from, lte: to }, deletedAt: null },
    },
    include: {
      schedule: {
        select: {
          id: true,
          departureTime: true,
          arrivalTime: true,
          route: {
            select: {
              originCity: { select: { name: true } },
              destCity: { select: { name: true } },
            },
          },
        },
      },
      bus: { select: { id: true, registrationNumber: true, model: true } },
    },
    orderBy: { schedule: { departureTime: 'asc' } },
  });

  const counts = await getPassengerCountsForSchedules(trips.map((t) => t.schedule.id));
  return trips.map((t) => ({
    id: t.id,
    scheduleId: t.schedule.id,
    status: t.status,
    departureTime: t.schedule.departureTime,
    arrivalTime: t.schedule.arrivalTime,
    bus: t.bus,
    route: {
      originCityName: t.schedule.route.originCity.name,
      destCityName: t.schedule.route.destCity.name,
    },
    counts: counts.get(t.schedule.id) ?? { boarded: 0, confirmed: 0 },
  }));
}
export async function findTripForDriver(userId: string, tripId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, driver: { userId }, deletedAt: null },
    include: {
      schedule: {
        include: {
          route: {
            include: {
              originCity: true,
              destCity: true,
              stands: {
                include: { stand: { select: { id: true, name: true, lat: true, lng: true } } },
                orderBy: { sequence: 'asc' },
              },
            },
          },
        },
      },
      bus: { select: { id: true, registrationNumber: true, model: true } },
      driver: { select: { id: true } },
    },
  });
}

export async function findActiveTripForDriver(userId: string): Promise<{ id: string } | null> {
  return prisma.trip.findFirst({
    where: { driver: { userId, deletedAt: null }, status: 'IN_PROGRESS', deletedAt: null },
    select: { id: true },
  });
}
export async function findDriverContextForStart(userId: string) {
  return prisma.driverProfile.findFirst({
    where: { userId, deletedAt: null },
    include: {
      operator: { select: { id: true, companyName: true, status: true } },
    },
  });
}

export async function findTripForStart(tripId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, deletedAt: null },
    include: {
      schedule: {
        select: {
          id: true,
          status: true,
          departureTime: true,
          arrivalTime: true,
          operatorId: true,
        },
      },
      bus: {
        select: {
          id: true,
          approvalStatus: true,
          layout: { select: { id: true } },
        },
      },
      driver: {
        select: { id: true, userId: true, onDuty: true, deletedAt: true },
      },
    },
  });
}
export async function findManifestRowsForSchedule(scheduleId: string) {
  return prisma.bookingPassenger.findMany({
    where: {
      scheduleId,
      deletedAt: null,
      booking: {
        deletedAt: null,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      },
    },
    select: {
      bookingId: true,
      name: true,
      seat: { select: { seatLabel: true } },
      booking: {
        select: {
          bookingReference: true,
          status: true,
          checkedInAt: true,
          boardingStand: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ booking: { checkedInAt: 'asc' } }, { name: 'asc' }],
  });
}

export async function findBoardingStandsForSchedule(scheduleId: string) {
  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, deletedAt: null },
    select: {
      route: {
        select: {
          stands: {
            select: {
              sequence: true,
              stand: { select: { id: true, name: true } },
            },
            orderBy: { sequence: 'asc' },
          },
        },
      },
    },
  });
  return schedule?.route.stands ?? [];
}
export async function findHistoryForDriver(
  userId: string,
  opts: { from?: string; to?: string; limit: number; cursorCreatedAt?: Date },
) {
  const where: {
    driver: { userId: string; deletedAt: null };
    deletedAt: null;
    status: { in: ['COMPLETED', 'CANCELLED'] };
    schedule?: { departureTime: { gte?: Date; lte?: Date } };
    createdAt?: { lt: Date };
  } = {
    driver: { userId, deletedAt: null },
    deletedAt: null,
    status: { in: ['COMPLETED', 'CANCELLED'] },
  };
  if (opts.from || opts.to) {
    const bounds: { gte?: Date; lte?: Date } = {};
    if (opts.from) bounds.gte = istDayBounds(opts.from).from;
    if (opts.to) bounds.lte = istDayBounds(opts.to).to;
    where.schedule = { departureTime: bounds };
  }
  if (opts.cursorCreatedAt) where.createdAt = { lt: opts.cursorCreatedAt };

  return prisma.trip.findMany({
    where,
    include: {
      schedule: {
        select: {
          id: true,
          departureTime: true,
          arrivalTime: true,
          route: {
            select: {
              originCity: { select: { name: true } },
              destCity: { select: { name: true } },
            },
          },
        },
      },
      bus: { select: { id: true, registrationNumber: true, model: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: opts.limit + 1,
  });
}
export async function findTicketForScan(ticketId: string) {
  return prisma.ticket.findFirst({
    where: { id: ticketId, deletedAt: null },
    include: {
      booking: {
        include: {
          schedule: { select: { id: true, status: true } },
          passengers: {
            where: { deletedAt: null },
            include: { seat: { select: { seatLabel: true } } },
            orderBy: { seat: { seatLabel: 'asc' } },
          },
          boardingStand: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function findBookingByReferenceAndSchedule(
  bookingReference: string,
  scheduleId: string,
) {
  return prisma.booking.findFirst({
    where: { bookingReference, scheduleId, deletedAt: null },
    include: {
      passengers: {
        where: { deletedAt: null },
        include: { seat: { select: { seatLabel: true } } },
        orderBy: { seat: { seatLabel: 'asc' } },
      },
      ticket: { select: { id: true, status: true } },
    },
  });
}

export async function findExistingScanForTicket(ticketId: string, tripId: string) {
  return prisma.boardingScan.findFirst({
    where: { ticketId, tripId, result: 'VALID' },
    select: { id: true, scannedAt: true },
  });
}

export async function findDriverMeForUser(userId: string) {
  return prisma.driverProfile.findFirst({
    where: { userId, deletedAt: null },
    include: {
      user: { select: { id: true, phone: true, name: true } },
      operator: { select: { id: true, companyName: true } },
    },
  });
}
// ---------- Passenger access + occupancy (buscon/04 §8B) ----------

export async function findTripForPassenger(userId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, deletedAt: null },
    include: {
      schedule: {
        include: {
          route: {
            include: {
              originCity: { select: { id: true, name: true } },
              destCity: { select: { id: true, name: true } },
              stands: {
                include: { stand: { select: { id: true, name: true, lat: true, lng: true } } },
                orderBy: { sequence: 'asc' },
              },
            },
          },
        },
      },
    },
  });
  if (!trip) return null;

  const booking = await prisma.booking.findFirst({
    where: {
      userId,
      scheduleId: trip.scheduleId,
      deletedAt: null,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
    },
    select: { id: true },
  });
  if (!booking) return null;
  return trip;
}

export async function findOccupancyForSchedule(scheduleId: string) {
  const [total, occupied] = await Promise.all([
    prisma.bookingPassenger.count({
      where: {
        scheduleId,
        deletedAt: null,
        booking: { deletedAt: null, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
      },
    }),
    prisma.bookingPassenger.count({
      where: {
        scheduleId,
        deletedAt: null,
        booking: { deletedAt: null, status: 'CHECKED_IN' },
      },
    }),
  ]);
  return { occupied, total };
}