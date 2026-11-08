import type { Bus, City, DriverProfile, Operator, Route, Schedule, Seat, SeatLayout, Stand, User } from '@prisma/client';
import type {
  BusApprovalStatus, BusDTO, BusType, BookingDetailDTO, BookingStatus, BookingSummaryDTO, CityDTO,
  DriverDTO, DriverKycStatus, ManagerDTO, MoneyDTO, OperatorMeResponse, OperatorStatus, PassengerSummaryDTO,
  RouteApprovalStatus, RouteDTO, RouteStandDTO,
  ScheduleDetailDTO, ScheduleOperatorDTO, ScheduleSearchResultDTO, ScheduleStatus,
  SeatDTO, SeatLayoutDTO, SeatType, StandDTO, StandType,
} from './network.types.js';
import { specOfRows } from './seat-layout.shared.js';

export function toIso(d: Date | null | undefined): string | null { return d ? d.toISOString() : null; }
export function toIsoDate(d: Date | null | undefined): string | null { return d ? d.toISOString().slice(0, 10) : null; }
export function toMoney(amount: bigint | number, currency: string): MoneyDTO { return { amountPaise: Number(amount), currency }; }
export function toCityDTO(c: City): CityDTO { return { id: c.id, name: c.name, state: c.state, isActive: c.isActive }; }
export function toStandDTO(s: Stand): StandDTO { return { id: s.id, cityId: s.cityId, name: s.name, type: s.type as StandType, lat: Number(s.lat), lng: Number(s.lng) }; }
export function toOperatorSummary(o: Operator): { id: string; companyName: string; gstin: string; pan: string; status: OperatorStatus } {
  return { id: o.id, companyName: o.companyName, gstin: o.gstin, pan: o.pan, status: o.status as OperatorStatus };
}
export function toOperatorMeResponse(p: { operator: Operator; user: { id: string; phone: string; email: string | null; name: string | null }; role: 'OPERATOR_OWNER' | 'OPERATOR_MANAGER'; }): OperatorMeResponse {
  return { operator: toOperatorSummary(p.operator), user: p.user, role: p.role };
}
function parseAmenities(json: unknown): string[] {
  if (!json || typeof json !== 'object') return [];
  const o = json as { items?: unknown };
  return Array.isArray(o.items) && o.items.every((v) => typeof v === 'string') ? (o.items as string[]) : [];
}
export function toBusDTO(b: Bus): BusDTO {
  return {
    id: b.id, operatorId: b.operatorId, registrationNumber: b.registrationNumber, model: b.model,
    capacity: b.capacity, busType: b.busType as BusType, amenities: parseAmenities(b.amenitiesJson),
    approvalStatus: b.approvalStatus as BusApprovalStatus,
    insuranceDocRef: b.insuranceDocRef, insuranceExpiresAt: toIsoDate(b.insuranceExpiresAt), createdAt: b.createdAt.toISOString(),
  };
}
function parseAisleCells(json: unknown): Array<{ row: string; column: number }> {
  if (!json || typeof json !== 'object') return [];
  const o = json as { aisle_cells?: unknown };
  if (!Array.isArray(o.aisle_cells)) return [];
  return o.aisle_cells.filter((c): c is { row: string; column: number } =>
    !!c && typeof c === 'object' && typeof (c as { row?: unknown }).row === 'string' && typeof (c as { column?: unknown }).column === 'number');
}
export function toSeatDTO(s: Seat): SeatDTO {
  return { id: s.id, key: s.seatKey ?? s.seatLabel, seatRow: s.seatRow, seatColumn: s.seatColumn, seatLabel: s.seatLabel, seatType: s.seatType as SeatType, isFemaleOnly: s.isFemaleOnly };
}
export function toSeatLayoutDTO(layout: SeatLayout, seats: Seat[]): SeatLayoutDTO {
  return { id: layout.id, busId: layout.busId, rowsCount: layout.rowsCount, columnsCount: layout.columnsCount, aisleCells: parseAisleCells(layout.aisleMapJson), seats: seats.map(toSeatDTO), rev: layout.layoutRev, spec: specOfRows(layout, seats) };
}

type RouteWithRelations = { id: string; operatorId: string; approvalStatus: string; createdAt: Date; originCity: City; destCity: City; stands: Array<{ sequence: number; distanceFromPrevKm: unknown; durationFromPrevMin: number; stand: Stand }>; };
export function toRouteDTO(r: RouteWithRelations): RouteDTO {
  const stands: RouteStandDTO[] = [...r.stands].sort((a, b) => a.sequence - b.sequence).map((rs) => ({
    stand: toStandDTO(rs.stand), sequence: rs.sequence, distanceFromPrevKm: Number(rs.distanceFromPrevKm), durationFromPrevMin: rs.durationFromPrevMin,
  }));
  return { id: r.id, operatorId: r.operatorId, originCity: toCityDTO(r.originCity), destinationCity: toCityDTO(r.destCity), approvalStatus: r.approvalStatus as RouteApprovalStatus, stands, createdAt: r.createdAt.toISOString() };
}

type ScheduleWithBusRoute = Schedule & { bus: Bus; route: Route & { originCity: City; destCity: City } };
export function toScheduleOperatorDTO(s: ScheduleWithBusRoute): ScheduleOperatorDTO {
  return {
    id: s.id, operatorId: s.operatorId, busId: s.busId, routeId: s.routeId,
    departureTime: s.departureTime.toISOString(), arrivalTime: s.arrivalTime.toISOString(),
    fare: toMoney(s.fareAmountPaise, s.fareCurrency), status: s.status as ScheduleStatus,
    bus: { id: s.bus.id, registrationNumber: s.bus.registrationNumber, model: s.bus.model, capacity: s.bus.capacity, busType: s.bus.busType as BusType, approvalStatus: s.bus.approvalStatus as BusApprovalStatus },
    route: { id: s.route.id, originCity: toCityDTO(s.route.originCity), destinationCity: toCityDTO(s.route.destCity), approvalStatus: s.route.approvalStatus as RouteApprovalStatus },
    createdAt: s.createdAt.toISOString(),
  };
}

export function durationMinutes(departure: Date, arrival: Date): number {
  return Math.max(0, Math.round((arrival.getTime() - departure.getTime()) / 60000));
}

type ScheduleWithRelations = Schedule & { bus: Bus; operator: Operator; route: { id: string; originCity: City; destCity: City } };
export function toScheduleSearchResult(s: ScheduleWithRelations, availableSeats: number): ScheduleSearchResultDTO {
  return {
    scheduleId: s.id, busType: s.bus.busType as BusType, operatorName: s.operator.companyName,
    departureTime: s.departureTime.toISOString(), arrivalTime: s.arrivalTime.toISOString(),
    durationMinutes: durationMinutes(s.departureTime, s.arrivalTime), fare: toMoney(s.fareAmountPaise, s.fareCurrency), availableSeats,
  };
}
export function toScheduleDetail(s: ScheduleWithRelations & { route: ScheduleWithRelations['route'] & { stands: Array<{ sequence: number; distanceFromPrevKm: unknown; durationFromPrevMin: number; stand: Stand }> } }, availableSeats: number): ScheduleDetailDTO {
  return {
    ...toScheduleSearchResult(s, availableSeats),
    status: s.status as ScheduleStatus,
    bus: { id: s.bus.id, registrationNumber: s.bus.registrationNumber, model: s.bus.model, capacity: s.bus.capacity, busType: s.bus.busType as BusType, amenities: parseAmenities(s.bus.amenitiesJson) },
    route: {
      id: s.route.id, originCity: toCityDTO(s.route.originCity), destinationCity: toCityDTO(s.route.destCity),
      stands: [...s.route.stands].sort((a, b) => a.sequence - b.sequence).map((rs) => ({ stand: toStandDTO(rs.stand), sequence: rs.sequence, distanceFromPrevKm: Number(rs.distanceFromPrevKm), durationFromPrevMin: rs.durationFromPrevMin })),
    },
  };
}

// ---------- Phase 3c mappers ----------
type DriverWithUser = DriverProfile & { user: User };
export function toDriverDTO(d: DriverWithUser): DriverDTO {
  return {
    id: d.id, userId: d.userId, name: d.user.name ?? '', phone: d.user.phone,
    licenseNumber: d.licenseNumber, kycStatus: d.kycStatus as DriverKycStatus,
    onDuty: d.onDuty, verifiedAt: toIso(d.verifiedAt), createdAt: d.createdAt.toISOString(),
  };
}

function toPassengerSummary(
  p: { id: string; seatId: string; name: string; age: number | null; gender: string | null },
  seatLabelMap: Map<string, string>,
): PassengerSummaryDTO {
  return { name: p.name, seatLabel: seatLabelMap.get(p.seatId) ?? 'UNKNOWN', age: p.age, gender: p.gender };
}

export function toBookingSummaryDTO(
  b: {
    id: string; bookingReference: string; status: string;
    scheduleId: string; totalFareAmount: bigint; confirmedAt: Date | null; createdAt: Date;
    passengers: Array<{ id: string; seatId: string; name: string; age: number | null; gender: string | null }>;
    schedule: { departureTime: Date; route: { originCity: City; destCity: City } };
  },
  seatLabelMap: Map<string, string>,
): BookingSummaryDTO {
  return {
    bookingId: b.id, bookingReference: b.bookingReference, status: b.status as BookingStatus,
    scheduleId: b.scheduleId, departureTime: b.schedule.departureTime.toISOString(),
    routeSummary: { originCity: b.schedule.route.originCity.name, destinationCity: b.schedule.route.destCity.name },
    passengerCount: b.passengers.length,
    passengers: b.passengers.map((p) => toPassengerSummary(p, seatLabelMap)),
    totalFarePaise: Number(b.totalFareAmount),
    confirmedAt: toIso(b.confirmedAt), createdAt: b.createdAt.toISOString(),
  };
}

export function toBookingDetailDTO(
  b: {
    id: string; bookingReference: string; status: string;
    scheduleId: string; totalFareAmount: bigint; confirmedAt: Date | null; createdAt: Date;
    fareBreakdownJson: unknown;
    passengers: Array<{ id: string; seatId: string; name: string; age: number | null; gender: string | null }>;
    schedule: {
      busId: string; departureTime: Date; arrivalTime: Date;
      route: { originCity: City; destCity: City };
    };
    boardingStand: Stand; droppingStand: Stand;
    payments: Array<{ status: string; amountPaise: bigint; currency: string; succeededAt: Date | null }>;
  },
  seatLabelMap: Map<string, string>,
): BookingDetailDTO {
  const bd = (b.fareBreakdownJson as { base_fare_paise?: number; tax_paise?: number; convenience_fee_paise?: number }) ?? {};
  const payment = b.payments.find((p) => p.status === 'SUCCEEDED') ?? b.payments[0] ?? null;
  return {
    ...toBookingSummaryDTO(b as any, seatLabelMap),
    schedule: {
      busId: b.schedule.busId,
      departureTime: b.schedule.departureTime.toISOString(),
      arrivalTime: b.schedule.arrivalTime.toISOString(),
      routeSummary: { originCity: b.schedule.route.originCity.name, destinationCity: b.schedule.route.destCity.name },
    },
    boardingStand: { id: b.boardingStand.id, name: b.boardingStand.name, type: b.boardingStand.type as StandType },
    droppingStand: { id: b.droppingStand.id, name: b.droppingStand.name, type: b.droppingStand.type as StandType },
    fareBreakdown: {
      baseFarePaise: Number(bd.base_fare_paise ?? 0),
      taxPaise: Number(bd.tax_paise ?? 0),
      convenienceFeePaise: Number(bd.convenience_fee_paise ?? 0),
    },
    payment: payment
      ? { status: payment.status, amountPaise: Number(payment.amountPaise), currency: payment.currency }
      : null,
    boardingScans: [],
  };
}

export function toManagerDTO(opUser: { id: string; userId: string; role: string; invitedAt: Date; acceptedAt: Date | null; user: { name: string | null; email: string | null; phone: string } }): ManagerDTO {
  return {
    operatorUserId: opUser.id, userId: opUser.userId, name: opUser.user.name,
    email: opUser.user.email, phone: opUser.user.phone,
    role: opUser.role as 'OWNER' | 'MANAGER',
    invitedAt: opUser.invitedAt.toISOString(), acceptedAt: toIso(opUser.acceptedAt),
  };
}