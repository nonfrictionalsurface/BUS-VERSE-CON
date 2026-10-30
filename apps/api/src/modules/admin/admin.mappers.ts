import type { AdminBookingDTO, AdminBookingPassengerDTO, AdminDashboardDTO, BusAdminDTO, OperatorAdminDTO, RouteAdminDTO, ScheduleAdminDTO } from './admin.types.js';
import type { CityDTO, MoneyDTO } from '../network/network.types.js';

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}
function toIsoDate(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}
function parseAmenities(json: unknown): string[] {
  if (!json || typeof json !== 'object') return [];
  const o = json as { items?: unknown };
  return Array.isArray(o.items) && o.items.every((v) => typeof v === 'string') ? (o.items as string[]) : [];
}
function toCityDTO(c: { id: string; name: string; state: string; isActive: boolean }): CityDTO {
  return { id: c.id, name: c.name, state: c.state, isActive: c.isActive };
}

export function toOperatorAdminDTO(
  op: { id: string; companyName: string; gstin: string; pan: string; status: string; bankAccountRef: string | null; createdAt: Date; updatedAt: Date },
  counts: { busCount: number; driverCount: number; operatorUserCount: number },
): OperatorAdminDTO {
  return {
    id: op.id,
    companyName: op.companyName,
    gstin: op.gstin,
    pan: op.pan,
    status: op.status as OperatorAdminDTO['status'],
    bankAccountRef: op.bankAccountRef,
    busCount: counts.busCount,
    driverCount: counts.driverCount,
    operatorUserCount: counts.operatorUserCount,
    createdAt: op.createdAt.toISOString(),
    updatedAt: op.updatedAt.toISOString(),
  };
}

export function toBusAdminDTO(b: {
  id: string; registrationNumber: string; model: string | null; capacity: number; busType: string;
  amenitiesJson: unknown; approvalStatus: string; insuranceDocRef: string | null; insuranceExpiresAt: Date | null;
  createdAt: Date; operator: { id: string; companyName: string; status: string };
}): BusAdminDTO {
  return {
    id: b.id,
    registrationNumber: b.registrationNumber,
    model: b.model,
    capacity: b.capacity,
    busType: b.busType as BusAdminDTO['busType'],
    amenities: parseAmenities(b.amenitiesJson),
    approvalStatus: b.approvalStatus as BusAdminDTO['approvalStatus'],
    operator: { id: b.operator.id, companyName: b.operator.companyName, status: b.operator.status },
    insuranceDocRef: b.insuranceDocRef,
    insuranceExpiresAt: toIsoDate(b.insuranceExpiresAt),
    createdAt: b.createdAt.toISOString(),
  };
}

export function toRouteAdminDTO(r: {
  id: string; approvalStatus: string; createdAt: Date;
  operator: { id: string; companyName: string };
  originCity: { id: string; name: string; state: string; isActive: boolean };
  destCity: { id: string; name: string; state: string; isActive: boolean };
  _count: { stands: number };
}): RouteAdminDTO {
  return {
    id: r.id,
    operator: { id: r.operator.id, companyName: r.operator.companyName },
    originCity: toCityDTO(r.originCity),
    destinationCity: toCityDTO(r.destCity),
    approvalStatus: r.approvalStatus as RouteAdminDTO['approvalStatus'],
    standCount: r._count.stands,
    createdAt: r.createdAt.toISOString(),
  };
}

export function toScheduleAdminDTO(s: {
  id: string; departureTime: Date; arrivalTime: Date; fareAmountPaise: bigint; fareCurrency: string;
  status: string; createdAt: Date;
  operator: { id: string; companyName: string };
  bus: { id: string; registrationNumber: string; approvalStatus: string };
  route: {
    id: string; approvalStatus: string;
    originCity: { id: string; name: string; state: string; isActive: boolean };
    destCity: { id: string; name: string; state: string; isActive: boolean };
  };
}): ScheduleAdminDTO {
  const fare: MoneyDTO = { amountPaise: Number(s.fareAmountPaise), currency: s.fareCurrency };
  return {
    id: s.id,
    operator: { id: s.operator.id, companyName: s.operator.companyName },
    bus: { id: s.bus.id, registrationNumber: s.bus.registrationNumber, approvalStatus: s.bus.approvalStatus },
    route: {
      id: s.route.id,
      originCity: toCityDTO(s.route.originCity),
      destinationCity: toCityDTO(s.route.destCity),
      approvalStatus: s.route.approvalStatus,
    },
    departureTime: s.departureTime.toISOString(),
    arrivalTime: s.arrivalTime.toISOString(),
    fare,
    status: s.status as ScheduleAdminDTO['status'],
    createdAt: s.createdAt.toISOString(),
  };
}

export function toAdminBookingPassenger(
  p: { name: string; age: number | null; gender: string | null; idNumber: string | null },
  seatLabel: string,
  includePii: boolean,
): AdminBookingPassengerDTO {
  const base: AdminBookingPassengerDTO = { name: p.name, seatLabel, age: p.age, gender: p.gender };
  if (includePii) {
    if (p.idNumber !== null) base.idNumber = p.idNumber;
  }
  return base;
}

export function toAdminBookingDTO(b: {
  id: string; bookingReference: string; status: string; userId: string; scheduleId: string;
  totalFareAmount: bigint; confirmedAt: Date | null; createdAt: Date;
  passengers: Array<{ name: string; age: number | null; gender: string | null; idNumber: string | null; seatId: string }>;
  schedule: { departureTime: Date; operator: { id: string; companyName: string }; route: { originCity: { name: string }; destCity: { name: string } } };
}, seatLabelMap: Map<string, string>, includePii: boolean): AdminBookingDTO {
  const passengers = b.passengers.map((p) =>
    toAdminBookingPassenger(p, seatLabelMap.get(p.seatId) ?? 'UNKNOWN', includePii),
  );
  return {
    bookingId: b.id,
    bookingReference: b.bookingReference,
    status: b.status,
    userId: b.userId,
    scheduleId: b.scheduleId,
    departureTime: b.schedule.departureTime.toISOString(),
    operator: b.schedule.operator,
    routeSummary: {
      originCity: b.schedule.route.originCity.name,
      destinationCity: b.schedule.route.destCity.name,
    },
    passengerCount: passengers.length,
    passengers,
    totalFarePaise: Number(b.totalFareAmount),
    confirmedAt: toIso(b.confirmedAt),
    createdAt: b.createdAt.toISOString(),
  };
}

export function toAdminDashboardDTO(input: {
  operatorCounts: Record<string, number>;
  busTotal: number; busPending: number; busApproved: number;
  routeTotal: number; routePending: number;
  scheduleTotal: number; schedulePublished: number; scheduleDraft: number;
  bookingTotal: number; bookingToday: number; bookingConfirmed: number; bookingCancelled: number;
  revenueTodayPaise: number; revenue7dPaise: number; revenueTotalPaise: number;
  driverTotal: number; driverOnDuty: number;
}): AdminDashboardDTO {
  const operatorsTotal = Object.values(input.operatorCounts).reduce((s, n) => s + n, 0);
  return {
    asOf: new Date().toISOString(),
    timezone: 'Asia/Kolkata',
    operators: { total: operatorsTotal, byStatus: input.operatorCounts },
    buses: { total: input.busTotal, pending: input.busPending, approved: input.busApproved },
    routes: { total: input.routeTotal, pending: input.routePending },
    schedules: { total: input.scheduleTotal, published: input.schedulePublished, draft: input.scheduleDraft },
    bookings: {
      total: input.bookingTotal, today: input.bookingToday,
      confirmed: input.bookingConfirmed, cancelled: input.bookingCancelled,
    },
    revenue: {
      todayPaise: input.revenueTodayPaise,
      last7DaysPaise: input.revenue7dPaise,
      totalPaise: input.revenueTotalPaise,
    },
    drivers: { total: input.driverTotal, onDuty: input.driverOnDuty },
  };
}