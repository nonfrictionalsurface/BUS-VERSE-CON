import type { Bus, City, Operator, Schedule, Seat, SeatLayout, Stand } from '@prisma/client';
import type {
  BusDTO, BusType, CityDTO, MoneyDTO, OperatorMeResponse, OperatorStatus,
  ScheduleDetailDTO, ScheduleSearchResultDTO, ScheduleStatus, SeatDTO,
  SeatLayoutDTO, SeatType, StandDTO, StandType,
} from './network.types.js';

export function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}
export function toIsoDate(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}
export function toMoney(amount: bigint | number, currency: string): MoneyDTO {
  return { amountPaise: Number(amount), currency };
}
export function toCityDTO(c: City): CityDTO {
  return { id: c.id, name: c.name, state: c.state, isActive: c.isActive };
}
export function toStandDTO(s: Stand): StandDTO {
  return { id: s.id, cityId: s.cityId, name: s.name, type: s.type as StandType, lat: Number(s.lat), lng: Number(s.lng) };
}
export function toOperatorSummary(o: Operator): { id: string; companyName: string; gstin: string; pan: string; status: OperatorStatus } {
  return { id: o.id, companyName: o.companyName, gstin: o.gstin, pan: o.pan, status: o.status as OperatorStatus };
}
export function toOperatorMeResponse(params: {
  operator: Operator;
  user: { id: string; phone: string; email: string | null; name: string | null };
  role: 'OPERATOR_OWNER' | 'OPERATOR_MANAGER';
}): OperatorMeResponse {
  return { operator: toOperatorSummary(params.operator), user: params.user, role: params.role };
}
function parseAmenities(json: unknown): string[] {
  if (!json || typeof json !== 'object') return [];
  const obj = json as { items?: unknown };
  if (Array.isArray(obj.items) && obj.items.every((v) => typeof v === 'string')) return obj.items as string[];
  return [];
}
export function toBusDTO(b: Bus): BusDTO {
  return {
    id: b.id,
    operatorId: b.operatorId,
    registrationNumber: b.registrationNumber,
    model: b.model,
    capacity: b.capacity,
    busType: b.busType as BusType,
    amenities: parseAmenities(b.amenitiesJson),
    approvalStatus: b.approvalStatus as 'PENDING' | 'APPROVED' | 'REJECTED',
    insuranceDocRef: b.insuranceDocRef,
    insuranceExpiresAt: toIsoDate(b.insuranceExpiresAt),
    createdAt: b.createdAt.toISOString(),
  };
}
function parseAisleCells(json: unknown): Array<{ row: string; column: number }> {
  if (!json || typeof json !== 'object') return [];
  const obj = json as { aisle_cells?: unknown };
  if (!Array.isArray(obj.aisle_cells)) return [];
  return obj.aisle_cells.filter(
    (c): c is { row: string; column: number } =>
      !!c && typeof c === 'object' &&
      typeof (c as { row?: unknown }).row === 'string' &&
      typeof (c as { column?: unknown }).column === 'number',
  );
}
export function toSeatDTO(s: Seat): SeatDTO {
  return {
    id: s.id,
    seatRow: s.seatRow,
    seatColumn: s.seatColumn,
    seatLabel: s.seatLabel,
    seatType: s.seatType as SeatType,
    isFemaleOnly: s.isFemaleOnly,
  };
}
export function toSeatLayoutDTO(layout: SeatLayout, seats: Seat[]): SeatLayoutDTO {
  return {
    id: layout.id,
    busId: layout.busId,
    rowsCount: layout.rowsCount,
    columnsCount: layout.columnsCount,
    aisleCells: parseAisleCells(layout.aisleMapJson),
    seats: seats.map(toSeatDTO),
  };
}
export function durationMinutes(departure: Date, arrival: Date): number {
  return Math.max(0, Math.round((arrival.getTime() - departure.getTime()) / 60000));
}
// Prisma relation is destCity (not destinationCity); DTO field remains destinationCity per contract 07.
type ScheduleWithRelations = Schedule & {
  bus: Bus;
  operator: Operator;
  route: { id: string; originCity: City; destCity: City };
};
export function toScheduleSearchResult(s: ScheduleWithRelations, availableSeats: number): ScheduleSearchResultDTO {
  return {
    scheduleId: s.id,
    busType: s.bus.busType as BusType,
    operatorName: s.operator.companyName,
    departureTime: s.departureTime.toISOString(),
    arrivalTime: s.arrivalTime.toISOString(),
    durationMinutes: durationMinutes(s.departureTime, s.arrivalTime),
    fare: toMoney(s.fareAmountPaise, s.fareCurrency),
    availableSeats,
  };
}
export function toScheduleDetail(
  s: ScheduleWithRelations & {
    route: ScheduleWithRelations['route'] & {
      stands: Array<{ sequence: number; distanceFromPrevKm: unknown; durationFromPrevMin: number; stand: Stand }>;
    };
  },
  availableSeats: number,
): ScheduleDetailDTO {
  return {
    ...toScheduleSearchResult(s, availableSeats),
    status: s.status as ScheduleStatus,
    bus: {
      id: s.bus.id,
      registrationNumber: s.bus.registrationNumber,
      model: s.bus.model,
      capacity: s.bus.capacity,
      busType: s.bus.busType as BusType,
      amenities: parseAmenities(s.bus.amenitiesJson),
    },
    route: {
      id: s.route.id,
      originCity: toCityDTO(s.route.originCity),
      destinationCity: toCityDTO(s.route.destCity),
      stands: [...s.route.stands].sort((a, b) => a.sequence - b.sequence).map((rs) => ({
        stand: toStandDTO(rs.stand),
        sequence: rs.sequence,
        distanceFromPrevKm: Number(rs.distanceFromPrevKm),
        durationFromPrevMin: rs.durationFromPrevMin,
      })),
    },
  };
}