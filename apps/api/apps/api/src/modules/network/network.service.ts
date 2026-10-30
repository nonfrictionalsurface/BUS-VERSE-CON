import { errors } from '../../lib/errors.js';
import { computePhoneHash, normalizePhone } from '../../lib/phone.js';
import { rethrowPrismaError } from '../../lib/prisma-errors.js';
import { networkErrors } from './network.errors.js';
import * as repo from './network.repository.js';
import {
  toBusDTO, toCityDTO, toOperatorMeResponse, toRouteDTO,
  toScheduleDetail, toScheduleOperatorDTO, toScheduleSearchResult, toSeatLayoutDTO,
  toDriverDTO, toBookingSummaryDTO, toBookingDetailDTO, toManagerDTO,
} from './network.mappers.js';
import { replaceSeatLayout, type PutSeatLayoutInput } from './seat-layout.service.js';
import type {
  BookingDetailDTO, BookingSummaryDTO, BusDTO, CityDTO, DashboardDTO, DriverDTO, ManagerDTO,
  OperatorMeResponse, RevenueDTO, RevenueDailyDTO, RouteDTO,
  ScheduleDetailDTO, ScheduleOperatorDTO, ScheduleSearchResultDTO, SeatLayoutDTO, SettlementDTO, StandDTO,
} from './network.types.js';
function istDayToUtcRange(dateStr: string): { start: Date; end: Date } {
  const startIst = new Date(`${dateStr}T00:00:00.000+05:30`);
  return { start: startIst, end: new Date(startIst.getTime() + 24 * 60 * 60 * 1000) };
}

export async function listCities(params: { q?: string | undefined; limit: number }): Promise<CityDTO[]> {
  const rows = await repo.listCities(params.q, params.limit);
  return rows.map(toCityDTO);
}

export async function getOperatorMe(userId: string): Promise<OperatorMeResponse> {
  const opUser = await repo.findOperatorUserWithRelations(userId);
  if (!opUser) throw errors.forbidden('Not an operator');
  return toOperatorMeResponse({
    operator: opUser.operator,
    user: { id: opUser.user.id, phone: opUser.user.phone, email: opUser.user.email, name: opUser.user.name },
    role: opUser.role === 'OWNER' ? 'OPERATOR_OWNER' : 'OPERATOR_MANAGER',
  });
}

export async function patchOperatorMe(params: { userId: string; companyName?: string | undefined }): Promise<OperatorMeResponse> {
  const opUser = await repo.findOperatorUserWithRelations(params.userId);
  if (!opUser) throw errors.forbidden('Not an operator');
  if (opUser.role !== 'OWNER') throw errors.forbidden('Only the owner can update operator details');
  if (params.companyName) {
    try { await repo.updateOperatorCompanyName(opUser.operatorId, params.companyName); }
    catch (err) { rethrowPrismaError(err); }
  }
  return getOperatorMe(params.userId);
}

async function requireOperator(userId: string) {
  const opUser = await repo.findOperatorUserWithRelations(userId);
  if (!opUser) throw errors.forbidden('Not an operator');
  return opUser;
}

export async function listBuses(params: { userId: string; status?: string | undefined }): Promise<BusDTO[]> {
  const opUser = await requireOperator(params.userId);
  const rows = await repo.listBusesByOperator(opUser.operatorId, params.status);
  return rows.map(toBusDTO);
}

export async function createBus(params: {
  userId: string; registrationNumber: string; model?: string | undefined; capacity: number;
  busType: string; amenities: string[]; insuranceDocRef?: string | undefined; insuranceExpiresAt?: string | undefined;
}): Promise<BusDTO> {
  const opUser = await requireOperator(params.userId);
  try {
    const bus = await repo.createBus({
      operatorId: opUser.operatorId,
      registrationNumber: params.registrationNumber.toUpperCase(),
      model: params.model ?? null,
      capacity: params.capacity,
      busType: params.busType,
      amenitiesJson: { _v: 1, items: params.amenities },
      insuranceDocRef: params.insuranceDocRef ?? null,
      insuranceExpiresAt: params.insuranceExpiresAt ? new Date(`${params.insuranceExpiresAt}T00:00:00.000Z`) : null,
    });
    return toBusDTO(bus);
  } catch (err) { rethrowPrismaError(err); }
}

export async function getBus(params: { userId: string; busId: string }): Promise<BusDTO> {
  const opUser = await requireOperator(params.userId);
  const bus = await repo.findBusByIdForOperator(params.busId, opUser.operatorId);
  if (!bus) throw networkErrors.busNotFound();
  return toBusDTO(bus);
}

export async function patchBus(params: {
  userId: string; busId: string; model?: string | undefined; amenities?: string[] | undefined;
  insuranceDocRef?: string | undefined; insuranceExpiresAt?: string | undefined;
}): Promise<BusDTO> {
  const opUser = await requireOperator(params.userId);
  const existing = await repo.findBusByIdForOperator(params.busId, opUser.operatorId);
  if (!existing) throw networkErrors.busNotFound();
  try {
    const updated = await repo.updateBus(params.busId, {
      ...(params.model !== undefined ? { model: params.model } : {}),
      ...(params.amenities !== undefined ? { amenitiesJson: { _v: 1, items: params.amenities } } : {}),
      ...(params.insuranceDocRef !== undefined ? { insuranceDocRef: params.insuranceDocRef } : {}),
      ...(params.insuranceExpiresAt !== undefined ? { insuranceExpiresAt: new Date(`${params.insuranceExpiresAt}T00:00:00.000Z`) } : {}),
    });
    return toBusDTO(updated);
  } catch (err) { rethrowPrismaError(err); }
}

export async function deleteBus(params: { userId: string; busId: string }): Promise<void> {
  const opUser = await requireOperator(params.userId);
  const existing = await repo.findBusByIdForOperator(params.busId, opUser.operatorId);
  if (!existing) throw networkErrors.busNotFound();
  await repo.softDeleteBus(params.busId);
}

export async function getSeatLayout(params: { userId: string; busId: string }): Promise<SeatLayoutDTO> {
  const opUser = await requireOperator(params.userId);
  const bus = await repo.findBusByIdForOperator(params.busId, opUser.operatorId);
  if (!bus) throw networkErrors.busNotFound();
  const layout = await repo.findSeatLayoutByBusId(params.busId);
  if (!layout) throw networkErrors.layoutNotFound();
  const seats = await repo.findSeatsByLayoutId(layout.id);
  return toSeatLayoutDTO(layout, seats);
}

export async function putSeatLayout(params: { userId: string; busId: string; input: PutSeatLayoutInput }): Promise<SeatLayoutDTO> {
  const opUser = await requireOperator(params.userId);
  const bus = await repo.findBusByIdForOperator(params.busId, opUser.operatorId);
  if (!bus) throw networkErrors.busNotFound();
  try {
    const { layout, seats } = await replaceSeatLayout({ busId: params.busId, busCapacity: bus.capacity, input: params.input });
    return toSeatLayoutDTO(layout, seats);
  } catch (err) { rethrowPrismaError(err); }
}

export async function searchPublic(params: {
  originCityId: string; destinationCityId: string; date: string; sortBy: 'departureTime' | 'fare';
}): Promise<ScheduleSearchResultDTO[]> {
  const { start, end } = istDayToUtcRange(params.date);
  const schedules = await repo.searchSchedules({
    originCityId: params.originCityId, destinationCityId: params.destinationCityId, dateStart: start, dateEnd: end,
  });
  const bookedCounts = await repo.bookedSeatCountsForSchedules(schedules.map((s) => s.id));
  const results = schedules.map((s) => {
    const booked = bookedCounts.get(s.id) ?? 0;
    return toScheduleSearchResult(s, Math.max(0, s.bus.capacity - booked));
  });
  if (params.sortBy === 'fare') results.sort((a, b) => a.fare.amountPaise - b.fare.amountPaise);
  return results;
}

export async function getScheduleDetail(scheduleId: string): Promise<ScheduleDetailDTO> {
  const schedule = await repo.findScheduleById(scheduleId);
  if (!schedule) throw networkErrors.scheduleNotFound();
  if (schedule.status !== 'PUBLISHED') throw networkErrors.scheduleNotFound();
  const bookedCounts = await repo.bookedSeatCountsForSchedules([schedule.id]);
  const booked = bookedCounts.get(schedule.id) ?? 0;
  return toScheduleDetail(schedule, Math.max(0, schedule.bus.capacity - booked));
}