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
import { saveSeatLayout, previewSeatLayout, type LayoutPreview, type SeatLayoutBody } from './seat-layout.service.js';
import type {
  BookingDetailDTO, BookingSummaryDTO, BusDTO, CityDTO, DashboardDTO, DriverDTO, ManagerDTO,
  OperatorMeResponse, RevenueDTO, RevenueDailyDTO, RouteDTO,
  ScheduleDetailDTO, ScheduleOperatorDTO, ScheduleSearchResultDTO, SeatLayoutDTO, SettlementDTO, StandDTO,
  OperatorTripDTO,
} from './network.types.js';

// ---------- helpers ----------
function istDayToUtcRange(dateStr: string): { start: Date; end: Date } {
  const startIst = new Date(`${dateStr}T00:00:00.000+05:30`);
  return { start: startIst, end: new Date(startIst.getTime() + 24 * 60 * 60 * 1000) };
}
function istDayBoundsUtc(dateStr: string): { from: Date; to: Date } {
  const from = new Date(`${dateStr}T00:00:00.000+05:30`);
  const to = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { from, to };
}
function todayIstDate(): string {
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return istNow.toISOString().slice(0, 10);
}

// ---------- cities ----------
export async function listCities(p: { q?: string | undefined; limit: number }): Promise<CityDTO[]> {
  return (await repo.listCities(p.q, p.limit)).map(toCityDTO);
}
export async function listCityStands(cityId: string): Promise<StandDTO[]> {
  const city = await repo.findCityById(cityId);
  if (!city) throw networkErrors.cityNotFound();
  const stands = await repo.listStandsByCityId(cityId);
  return stands.map((s) => ({ id: s.id, cityId: s.cityId, name: s.name, type: s.type as 'BUS_STAND' | 'PICKUP_POINT' | 'DROP_POINT', lat: Number(s.lat), lng: Number(s.lng) }));
}

// ---------- operator me ----------
export async function getOperatorMe(userId: string): Promise<OperatorMeResponse> {
  const opUser = await repo.findOperatorUserWithRelations(userId);
  if (!opUser) throw errors.forbidden('Not an operator');
  return toOperatorMeResponse({
    operator: opUser.operator,
    user: { id: opUser.user.id, phone: opUser.user.phone, email: opUser.user.email, name: opUser.user.name },
    role: opUser.role === 'OWNER' ? 'OPERATOR_OWNER' : 'OPERATOR_MANAGER',
  });
}
export async function patchOperatorMe(p: { userId: string; companyName?: string | undefined }): Promise<OperatorMeResponse> {
  const opUser = await repo.findOperatorUserWithRelations(p.userId);
  if (!opUser) throw errors.forbidden('Not an operator');
  if (opUser.role !== 'OWNER') throw errors.forbidden('Only the owner can update operator details');
  if (p.companyName) {
    try { await repo.updateOperatorCompanyName(opUser.operatorId, p.companyName); }
    catch (err) { rethrowPrismaError(err); }
  }
  return getOperatorMe(p.userId);
}

async function requireOperator(userId: string) {
  const opUser = await repo.findOperatorUserWithRelations(userId);
  if (!opUser) throw errors.forbidden('Not an operator');
  return opUser;
}

// ---------- buses ----------
export async function listBuses(p: { userId: string; status?: string | undefined }): Promise<BusDTO[]> {
  const opUser = await requireOperator(p.userId);
  return (await repo.listBusesByOperator(opUser.operatorId, p.status)).map(toBusDTO);
}
export async function createBus(p: {
  userId: string; registrationNumber: string; model?: string | undefined; capacity: number;
  busType: string; amenities: string[]; insuranceDocRef?: string | undefined; insuranceExpiresAt?: string | undefined;
}): Promise<BusDTO> {
  const opUser = await requireOperator(p.userId);
  try {
    const bus = await repo.createBus({
      operatorId: opUser.operatorId,
      registrationNumber: p.registrationNumber.toUpperCase(),
      model: p.model ?? null, capacity: p.capacity, busType: p.busType,
      amenitiesJson: { _v: 1, items: p.amenities },
      insuranceDocRef: p.insuranceDocRef ?? null,
      insuranceExpiresAt: p.insuranceExpiresAt ? new Date(`${p.insuranceExpiresAt}T00:00:00.000Z`) : null,
    });
    return toBusDTO(bus);
  } catch (err) { rethrowPrismaError(err); }
}
export async function getBus(p: { userId: string; busId: string }): Promise<BusDTO> {
  const opUser = await requireOperator(p.userId);
  const bus = await repo.findBusByIdForOperator(p.busId, opUser.operatorId);
  if (!bus) throw networkErrors.busNotFound();
  return toBusDTO(bus);
}
export async function patchBus(p: {
  userId: string; busId: string; model?: string | undefined; amenities?: string[] | undefined;
  insuranceDocRef?: string | undefined; insuranceExpiresAt?: string | undefined;
}): Promise<BusDTO> {
  const opUser = await requireOperator(p.userId);
  const ex = await repo.findBusByIdForOperator(p.busId, opUser.operatorId);
  if (!ex) throw networkErrors.busNotFound();
  try {
    const updated = await repo.updateBus(p.busId, {
      ...(p.model !== undefined ? { model: p.model } : {}),
      ...(p.amenities !== undefined ? { amenitiesJson: { _v: 1, items: p.amenities } } : {}),
      ...(p.insuranceDocRef !== undefined ? { insuranceDocRef: p.insuranceDocRef } : {}),
      ...(p.insuranceExpiresAt !== undefined ? { insuranceExpiresAt: new Date(`${p.insuranceExpiresAt}T00:00:00.000Z`) } : {}),
    });
    return toBusDTO(updated);
  } catch (err) { rethrowPrismaError(err); }
}
export async function deleteBus(p: { userId: string; busId: string }): Promise<void> {
  const opUser = await requireOperator(p.userId);
  const ex = await repo.findBusByIdForOperator(p.busId, opUser.operatorId);
  if (!ex) throw networkErrors.busNotFound();
  await repo.softDeleteBus(p.busId);
}

// ---------- seat layout ----------
export async function getSeatLayout(p: { userId: string; busId: string }): Promise<SeatLayoutDTO> {
  const opUser = await requireOperator(p.userId);
  const bus = await repo.findBusByIdForOperator(p.busId, opUser.operatorId);
  if (!bus) throw networkErrors.busNotFound();
  const layout = await repo.findSeatLayoutByBusId(p.busId);
  if (!layout) throw networkErrors.layoutNotFound();
  const seats = await repo.findSeatsByLayoutId(layout.id);
  return toSeatLayoutDTO(layout, seats);
}
export async function putSeatLayout(p: { userId: string; busId: string; body: SeatLayoutBody }): Promise<SeatLayoutDTO> {
  const opUser = await requireOperator(p.userId);
  const bus = await repo.findBusByIdForOperator(p.busId, opUser.operatorId);
  if (!bus) throw networkErrors.busNotFound();
  try {
    const { layout, seats } = await saveSeatLayout({ busId: p.busId, busCapacity: bus.capacity, body: p.body });
    return toSeatLayoutDTO(layout, seats);
  } catch (err) { rethrowPrismaError(err); }
}
/** Dry run: validate + diff + conflicts. Writes nothing. */
export async function validateSeatLayout(p: { userId: string; busId: string; body: SeatLayoutBody }): Promise<LayoutPreview> {
  const opUser = await requireOperator(p.userId);
  const bus = await repo.findBusByIdForOperator(p.busId, opUser.operatorId);
  if (!bus) throw networkErrors.busNotFound();
  return previewSeatLayout({ busId: p.busId, busCapacity: bus.capacity, body: p.body });
}

// ---------- routes ----------
interface RouteStandInput {
  standId: string; sequence: number; distanceFromPrevKm: number; durationFromPrevMin: number;
}
async function validateRouteStands(params: { originCityId: string; destinationCityId: string; stands: RouteStandInput[] }): Promise<void> {
  const { originCityId, destinationCityId, stands } = params;
  if (originCityId === destinationCityId) throw networkErrors.routeSameCity();
  if (stands.length < 2) throw networkErrors.routeStandsInsufficient();
  const sorted = [...stands].sort((a, b) => a.sequence - b.sequence);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i]!.sequence !== i + 1) throw networkErrors.routeStandSequenceInvalid(`expected ${i + 1}, got ${sorted[i]!.sequence}`);
  }
  const seen = new Set<string>();
  for (const s of stands) {
    if (seen.has(s.standId)) throw networkErrors.routeStandDuplicate();
    seen.add(s.standId);
  }
  const first = await repo.findStandById(sorted[0]!.standId);
  const last = await repo.findStandById(sorted[sorted.length - 1]!.standId);
  if (!first) throw networkErrors.standNotFound();
  if (!last) throw networkErrors.standNotFound();
  if (first.cityId !== originCityId) throw networkErrors.routeStandCityMismatch('first stand must be in origin city');
  if (last.cityId !== destinationCityId) throw networkErrors.routeStandCityMismatch('last stand must be in destination city');
  for (const s of stands) {
    const st = await repo.findStandById(s.standId);
    if (!st) throw networkErrors.standNotFound();
  }
}
export async function listRoutes(p: { userId: string; status?: string | undefined }): Promise<RouteDTO[]> {
  const opUser = await requireOperator(p.userId);
  return (await repo.listRoutesByOperator(opUser.operatorId, p.status)).map(toRouteDTO);
}
export async function createRoute(p: {
  userId: string; originCityId: string; destinationCityId: string; stands: RouteStandInput[];
}): Promise<RouteDTO> {
  const opUser = await requireOperator(p.userId);
  await validateRouteStands({ originCityId: p.originCityId, destinationCityId: p.destinationCityId, stands: p.stands });
  try {
    const route = await repo.createRouteWithStands({
      operatorId: opUser.operatorId, originCityId: p.originCityId,
      destinationCityId: p.destinationCityId, stands: p.stands,
    });
    return toRouteDTO(route);
  } catch (err) { rethrowPrismaError(err); }
}
export async function getRoute(p: { userId: string; routeId: string }): Promise<RouteDTO> {
  const opUser = await requireOperator(p.userId);
  const route = await repo.findRouteByIdForOperator(p.routeId, opUser.operatorId);
  if (!route) throw networkErrors.routeNotFound();
  return toRouteDTO(route);
}
export async function patchRoute(p: { userId: string; routeId: string; stands: RouteStandInput[] }): Promise<RouteDTO> {
  const opUser = await requireOperator(p.userId);
  const existing = await repo.findRouteByIdForOperator(p.routeId, opUser.operatorId);
  if (!existing) throw networkErrors.routeNotFound();
  await validateRouteStands({ originCityId: existing.originCityId, destinationCityId: existing.destinationCityId, stands: p.stands });
  try {
    const updated = await repo.replaceRouteStands({ routeId: p.routeId, stands: p.stands });
    return toRouteDTO(updated);
  } catch (err) { rethrowPrismaError(err); }
}
export async function appendRouteStand(p: {
  userId: string; routeId: string; standId: string; distanceFromPrevKm: number; durationFromPrevMin: number;
}): Promise<RouteDTO> {
  const opUser = await requireOperator(p.userId);
  const existing = await repo.findRouteByIdForOperator(p.routeId, opUser.operatorId);
  if (!existing) throw networkErrors.routeNotFound();
  const stand = await repo.findStandById(p.standId);
  if (!stand) throw networkErrors.standNotFound();
  if (stand.cityId !== existing.destinationCityId) {
    throw networkErrors.routeStandCityMismatch('appended stand must be in destination city');
  }
  const nextSeq = (await repo.maxRouteStandSequence(p.routeId)) + 1;
  try {
    const updated = await repo.appendRouteStand({
      routeId: p.routeId, standId: p.standId, sequence: nextSeq,
      distanceFromPrevKm: p.distanceFromPrevKm, durationFromPrevMin: p.durationFromPrevMin,
    });
    return toRouteDTO(updated);
  } catch (err) { rethrowPrismaError(err); }
}
export async function deleteRoute(p: { userId: string; routeId: string }): Promise<void> {
  const opUser = await requireOperator(p.userId);
  const existing = await repo.findRouteByIdForOperator(p.routeId, opUser.operatorId);
  if (!existing) throw networkErrors.routeNotFound();
  const scheduleCount = await repo.countSchedulesByRouteId(p.routeId);
  if (scheduleCount > 0) throw networkErrors.routeHasSchedules(scheduleCount);
  await repo.softDeleteRoute(p.routeId);
}

// ---------- schedules ----------
export async function listSchedules(p: {
  userId: string; status?: string | undefined; busId?: string | undefined; routeId?: string | undefined;
}): Promise<ScheduleOperatorDTO[]> {
  const opUser = await requireOperator(p.userId);
  const rows = await repo.listSchedulesByOperator({
    operatorId: opUser.operatorId, status: p.status, busId: p.busId, routeId: p.routeId,
  });
  return rows.map(toScheduleOperatorDTO);
}
export async function createSchedule(p: {
  userId: string; busId: string; routeId: string;
  departureTime: string; arrivalTime: string;
  fareAmountPaise: number; fareCurrency: string;
}): Promise<ScheduleOperatorDTO> {
  const opUser = await requireOperator(p.userId);
  const bus = await repo.findBusByIdForOperator(p.busId, opUser.operatorId);
  if (!bus) throw networkErrors.busNotFound();
  const route = await repo.findRouteByIdForOperator(p.routeId, opUser.operatorId);
  if (!route) throw networkErrors.routeNotFound();
  const departure = new Date(p.departureTime);
  const arrival = new Date(p.arrivalTime);
  if (arrival.getTime() <= departure.getTime()) throw networkErrors.scheduleTimeInvalid();
  try {
    const created = await repo.createSchedule({
      operatorId: opUser.operatorId, busId: p.busId, routeId: p.routeId,
      departureTime: departure, arrivalTime: arrival,
      fareAmountPaise: BigInt(p.fareAmountPaise), fareCurrency: p.fareCurrency,
    });
    return toScheduleOperatorDTO(created);
  } catch (err) { rethrowPrismaError(err); }
}
export async function getSchedule(p: { userId: string; scheduleId: string }): Promise<ScheduleOperatorDTO> {
  const opUser = await requireOperator(p.userId);
  const schedule = await repo.findScheduleByIdForOperator(p.scheduleId, opUser.operatorId);
  if (!schedule) throw networkErrors.scheduleNotFound();
  return toScheduleOperatorDTO(schedule);
}
export async function patchSchedule(p: {
  userId: string; scheduleId: string;
  departureTime?: string | undefined; arrivalTime?: string | undefined; fareAmountPaise?: number | undefined;
}): Promise<ScheduleOperatorDTO> {
  const opUser = await requireOperator(p.userId);
  const existing = await repo.findScheduleByIdForOperator(p.scheduleId, opUser.operatorId);
  if (!existing) throw networkErrors.scheduleNotFound();
  if (existing.status !== 'DRAFT') throw networkErrors.scheduleNotDraft();
  const newDeparture = p.departureTime ? new Date(p.departureTime) : existing.departureTime;
  const newArrival = p.arrivalTime ? new Date(p.arrivalTime) : existing.arrivalTime;
  if (newArrival.getTime() <= newDeparture.getTime()) throw networkErrors.scheduleTimeInvalid();
  try {
    const updated = await repo.updateSchedule(p.scheduleId, {
      ...(p.departureTime !== undefined ? { departureTime: newDeparture } : {}),
      ...(p.arrivalTime !== undefined ? { arrivalTime: newArrival } : {}),
      ...(p.fareAmountPaise !== undefined ? { fareAmountPaise: BigInt(p.fareAmountPaise) } : {}),
    });
    return toScheduleOperatorDTO(updated);
  } catch (err) { rethrowPrismaError(err); }
}
export async function publishSchedule(p: { userId: string; scheduleId: string }): Promise<ScheduleOperatorDTO> {
  const opUser = await requireOperator(p.userId);
  const existing = await repo.findScheduleByIdForOperator(p.scheduleId, opUser.operatorId);
  if (!existing) throw networkErrors.scheduleNotFound();
  if (existing.status !== 'DRAFT') throw networkErrors.scheduleAlreadyPublished();
  if (existing.bus.approvalStatus !== 'APPROVED') throw networkErrors.scheduleBusNotApproved();
  if (existing.route.approvalStatus !== 'APPROVED') throw networkErrors.scheduleRouteNotApproved();
  const conflict = await repo.findBusConflict({
    busId: existing.busId, departureTime: existing.departureTime, arrivalTime: existing.arrivalTime, excludeScheduleId: existing.id,
  });
  if (conflict) {
    throw networkErrors.scheduleBusConflict(conflict.id, conflict.departureTime.toISOString(), conflict.arrivalTime.toISOString());
  }
  try {
    const published = await repo.publishScheduleById(p.scheduleId);
    return toScheduleOperatorDTO(published);
  } catch (err) { rethrowPrismaError(err); }
}

// ---------- public ----------
export async function searchPublic(p: {
  originCityId: string; destinationCityId: string; date: string; sortBy: 'departureTime' | 'fare';
}): Promise<ScheduleSearchResultDTO[]> {
  const { start, end } = istDayToUtcRange(p.date);
  const schedules = await repo.searchSchedules({
    originCityId: p.originCityId, destinationCityId: p.destinationCityId, dateStart: start, dateEnd: end,
  });
  const scheduleIds = schedules.map((s) => s.id);
  const [bookedCounts, lockCounts] = await Promise.all([
    repo.bookedSeatCountsForSchedules(scheduleIds),
    repo.activeSeatLockCountsForSchedules(scheduleIds),
  ]);
  const results = schedules.map((s) => {
    const booked = bookedCounts.get(s.id) ?? 0;
    const locked = lockCounts.get(s.id) ?? 0;
    return toScheduleSearchResult(s, Math.max(0, s.bus.capacity - booked - locked));
  });
  if (p.sortBy === 'fare') results.sort((a, b) => a.fare.amountPaise - b.fare.amountPaise);
  return results;
}
export async function getScheduleDetail(scheduleId: string): Promise<ScheduleDetailDTO> {
  const schedule = await repo.findScheduleById(scheduleId);
  if (!schedule) throw networkErrors.scheduleNotFound();
  if (schedule.status !== 'PUBLISHED') throw networkErrors.scheduleNotFound();
  const [bookedCounts, lockCounts] = await Promise.all([
    repo.bookedSeatCountsForSchedules([schedule.id]),
    repo.activeSeatLockCountsForSchedules([schedule.id]),
  ]);
  const booked = bookedCounts.get(schedule.id) ?? 0;
  const locked = lockCounts.get(schedule.id) ?? 0;
  return toScheduleDetail(schedule, Math.max(0, schedule.bus.capacity - booked - locked));
}

// ---------- Phase 3c: Drivers ----------
export async function listDriversForOperator(p: { userId: string; status?: string | undefined; limit: number }): Promise<DriverDTO[]> {
  const opUser = await requireOperator(p.userId);
  const rows = await repo.listDriversByOperator(opUser.operatorId, p.status);
  return rows.slice(0, p.limit).map(toDriverDTO);
}
export async function inviteDriver(p: { userId: string; phone: string; licenseNumber: string; name: string; }): Promise<DriverDTO> {
  const opUser = await requireOperator(p.userId);
  const normalizedPhone = normalizePhone(p.phone);
  const existingLicense = await repo.findDriverByLicense(p.licenseNumber);
  if (existingLicense) throw errors.licenseAlreadyRegistered();
  let user = await repo.findUserByPhone(normalizedPhone);
  if (user) {
    const existingDriver = await repo.findDriverByUserId(user.id);
    if (existingDriver) {
      if (existingDriver.operatorId === opUser.operatorId) throw networkErrors.driverAlreadyInvited();
      throw networkErrors.driverBelongsToOtherOperator();
    }
  } else {
    const phoneHash = computePhoneHash(normalizedPhone);
    user = await repo.createUserForDriver({ phone: normalizedPhone, phoneHash, name: p.name });
  }
  try {
    const driver = await repo.createDriverProfile({ userId: user.id, operatorId: opUser.operatorId, licenseNumber: p.licenseNumber });
    return toDriverDTO(driver);
  } catch (err) { rethrowPrismaError(err); }
}
export async function getDriverForOperator(p: { userId: string; driverId: string }): Promise<DriverDTO> {
  const opUser = await requireOperator(p.userId);
  const driver = await repo.findDriverByIdForOperator(p.driverId, opUser.operatorId);
  if (!driver) throw networkErrors.driverNotFound();
  return toDriverDTO(driver);
}
export async function deleteDriverForOperator(p: { userId: string; driverId: string }): Promise<void> {
  const opUser = await requireOperator(p.userId);
  const driver = await repo.findDriverByIdForOperator(p.driverId, opUser.operatorId);
  if (!driver) throw networkErrors.driverNotFound();
  if (driver.onDuty) throw networkErrors.driverOnDuty();
  await repo.softDeleteDriver(p.driverId);
}

// ---------- Phase 3c: Bookings view ----------
export async function listBookingsForOperator(p: {
  userId: string; limit: number; cursor?: string | undefined;
  status?: string | undefined; scheduleId?: string | undefined;
  from?: string | undefined; to?: string | undefined;
}): Promise<{ data: BookingSummaryDTO[]; nextCursor: string | null }> {
  const opUser = await requireOperator(p.userId);
  let cursorCreatedAt: Date | undefined = undefined;
  if (p.cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(p.cursor, 'base64').toString('utf8'));
      cursorCreatedAt = new Date(decoded.createdAt);
    } catch { throw errors.invalidRequest('Invalid cursor'); }
  }
  const fromDate = p.from ? istDayBoundsUtc(p.from).from : undefined;
  const toDate = p.to ? istDayBoundsUtc(p.to).to : undefined;
  const rows = await repo.listBookingsByOperator({
    operatorId: opUser.operatorId, limit: p.limit,
    cursorCreatedAt, status: p.status, scheduleId: p.scheduleId, fromDate, toDate,
  });
  const hasMore = rows.length > p.limit;
  const data = hasMore ? rows.slice(0, p.limit) : rows;
  const allSeatIds = data.flatMap((b) => b.passengers.map((pp) => pp.seatId));
  const seatLabelMap = await repo.fetchSeatLabels(allSeatIds);
  const nextCursor = hasMore
    ? Buffer.from(JSON.stringify({ createdAt: data[data.length - 1]!.createdAt.toISOString() })).toString('base64')
    : null;
  return { data: data.map((b) => toBookingSummaryDTO(b, seatLabelMap)), nextCursor };
}
export async function getBookingForOperator(p: { userId: string; bookingId: string }): Promise<BookingDetailDTO> {
  const opUser = await requireOperator(p.userId);
  const booking = await repo.findBookingByIdForOperator(p.bookingId, opUser.operatorId);
  if (!booking) throw networkErrors.bookingNotFound();
  const allSeatIds = booking.passengers.map((pp) => pp.seatId);
  const seatLabelMap = await repo.fetchSeatLabels(allSeatIds);
  return toBookingDetailDTO(booking, seatLabelMap);
}

// ---------- Phase 3c: Dashboard ----------
export async function getDashboard(p: { userId: string }): Promise<DashboardDTO> {
  const opUser = await requireOperator(p.userId);
  const today = todayIstDate();
  const { from, to } = istDayBoundsUtc(today);
  const activeStatuses = ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'];
  const [bookingsCount, passengerCount, revenuePaise, cancelledCount, refundedPaise, activeTrips, upcomingTripsToday, pendingApprovals, drivers] = await Promise.all([
    repo.countBookingsInRange({ operatorId: opUser.operatorId, from, to, statuses: activeStatuses }),
    repo.sumPassengersInRange({ operatorId: opUser.operatorId, from, to, statuses: activeStatuses }),
    repo.sumPaymentsInRange({ operatorId: opUser.operatorId, from, to }),
    repo.countCancelledBookingsInRange({ operatorId: opUser.operatorId, from, to }),
    repo.sumRefundsInRange({ operatorId: opUser.operatorId, from, to }),
    repo.countActiveTrips(opUser.operatorId),
    repo.countUpcomingTripsToday(opUser.operatorId, from, to),
    repo.countPendingApprovals(opUser.operatorId),
    repo.countDrivers(opUser.operatorId),
  ]);
  return {
    asOf: new Date().toISOString(),
    today: { date: today, timezone: 'Asia/Kolkata', bookingsCount, passengerCount, revenuePaise, cancelledCount, refundedPaise },
    activeTrips, upcomingTripsToday, pendingApprovals, drivers,
  };
}

// ---------- Phase 3c: Revenue ----------
export async function getRevenue(p: { userId: string; from: string; to: string; groupBy: 'day' | 'week' | 'month'; }): Promise<RevenueDTO> {
  const opUser = await requireOperator(p.userId);
  const fromDate = istDayBoundsUtc(p.from).from;
  const toDate = istDayBoundsUtc(p.to).to;
  const payments = await repo.sumPaymentsForRevenue({ operatorId: opUser.operatorId, from: fromDate, to: toDate });
  const refunds = await repo.sumRefundsForRevenue({ operatorId: opUser.operatorId, from: fromDate, to: toDate });
  function istDayKey(d: Date): string {
    return new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  }
  const bucketMap = new Map<string, { revenuePaise: number; refundsPaise: number; bookings: Set<string> }>();
  for (const r of payments) {
    if (!r.succeededAt) continue;
    const k = istDayKey(r.succeededAt);
    if (!bucketMap.has(k)) bucketMap.set(k, { revenuePaise: 0, refundsPaise: 0, bookings: new Set() });
    const b = bucketMap.get(k)!;
    b.revenuePaise += Number(r.amountPaise);
    b.bookings.add(r.bookingId);
  }
  for (const r of refunds) {
    const k = istDayKey(r.createdAt);
    if (!bucketMap.has(k)) bucketMap.set(k, { revenuePaise: 0, refundsPaise: 0, bookings: new Set() });
    bucketMap.get(k)!.refundsPaise += Number(r.amountPaise);
  }
  const buckets = [...bucketMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({
    date, revenuePaise: v.revenuePaise, refundsPaise: v.refundsPaise, bookingCount: v.bookings.size,
  }));
  const totalRevenuePaise = buckets.reduce((s, b) => s + b.revenuePaise, 0);
  const totalRefundsPaise = buckets.reduce((s, b) => s + b.refundsPaise, 0);
  return { from: p.from, to: p.to, groupBy: p.groupBy, totalRevenuePaise, totalRefundsPaise, netRevenuePaise: totalRevenuePaise - totalRefundsPaise, buckets };
}
export async function getRevenueDaily(p: { userId: string }): Promise<RevenueDailyDTO> {
  const opUser = await requireOperator(p.userId);
  const days: Array<{ date: string; revenuePaise: number; bookingCount: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000 + 5.5 * 3600 * 1000);
    const dayStr = d.toISOString().slice(0, 10);
    const { from, to } = istDayBoundsUtc(dayStr);
    const payments = await repo.sumPaymentsForRevenue({ operatorId: opUser.operatorId, from, to });
    const revenuePaise = payments.reduce((s, p) => s + Number(p.amountPaise), 0);
    const bookingCount = new Set(payments.map((p) => p.bookingId)).size;
    days.push({ date: dayStr, revenuePaise, bookingCount });
  }
  return { days, timezone: 'Asia/Kolkata' };
}

// ---------- Phase 3c: Settlements (stub) ----------
export async function listSettlements(p: { userId: string }): Promise<{ data: SettlementDTO[]; note: string }> {
  await requireOperator(p.userId);
  return { data: [], note: 'Settlements are processed in Phase 5 (Payments). This endpoint returns an empty array until then.' };
}

// ---------- Phase 3c: Managers ----------
export async function listManagers(p: { userId: string }): Promise<ManagerDTO[]> {
  const opUser = await requireOperator(p.userId);
  if (opUser.role !== 'OWNER') throw networkErrors.notOwnerOnly();
  const rows = await repo.listManagersForOperator(opUser.operatorId);
  return rows.map(toManagerDTO);
}

// ---------- Phase 13: Operator trip assignment ----------
type TripRow = NonNullable<Awaited<ReturnType<typeof repo.findTripForOperator>>>;

function toOperatorTripDTO(t: TripRow): OperatorTripDTO {
  return {
    tripId: t.id,
    scheduleId: t.scheduleId,
    busId: t.busId,
    driverId: t.driverId,
    driverName: t.driver.user.name,
    driverPhone: t.driver.user.phone,
    busRegistrationNumber: t.bus.registrationNumber,
    routeSummary: {
      originCity: t.schedule.route.originCity.name,
      destinationCity: t.schedule.route.destCity.name,
    },
    departureTime: t.schedule.departureTime.toISOString(),
    arrivalTime: t.schedule.arrivalTime.toISOString(),
    status: t.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    startedAt: t.startedAt?.toISOString() ?? null,
    endedAt: t.endedAt?.toISOString() ?? null,
    cancelledAt: t.cancelledAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

export async function assignTrip(p: {
  userId: string;
  scheduleId: string;
  driverId: string;
}): Promise<OperatorTripDTO> {
  const opUser = await requireOperator(p.userId);

  // 1. Schedule ownership + status + future departure
  const schedule = await repo.findScheduleForTripAssignment(p.scheduleId, opUser.operatorId);
  if (!schedule) throw networkErrors.scheduleNotFound();
  if (schedule.status !== 'PUBLISHED') {
    throw errors.invalidSchedule();
  }
  if (schedule.departureTime.getTime() <= Date.now()) {
    throw errors.invalidSchedule();
  }

  // 2. Driver ownership + KYC + status
  const driver = await repo.findDriverForTripAssignment(p.driverId, opUser.operatorId);
  if (!driver) throw networkErrors.driverNotFound();
  if (driver.kycStatus === 'BLOCKED' || driver.kycStatus === 'DEACTIVATED') {
    throw errors.driverBlocked();
  }
  if (driver.kycStatus !== 'VERIFIED' && driver.kycStatus !== 'ACTIVE') {
    throw networkErrors.driverKycNotVerified();
  }

  // 3. No duplicate active trip for this schedule
  const existingTrip = await repo.findActiveTripForSchedule(p.scheduleId);
  if (existingTrip) {
    throw errors.invalidTransition('A trip is already assigned to this schedule');
  }

  // 4. No overlapping driver trip
  const driverConflict = await repo.findOverlappingDriverTrip({
    driverId: p.driverId,
    departureTime: schedule.departureTime,
    arrivalTime: schedule.arrivalTime,
  });
  if (driverConflict) {
    throw errors.activeTripExists(driverConflict.id);
  }

  // 5. Create
  try {
    const trip = await repo.createOperatorTrip({
      scheduleId: p.scheduleId,
      busId: schedule.busId,
      driverId: p.driverId,
    });
    return toOperatorTripDTO(trip);
  } catch (err) {
    rethrowPrismaError(err);
  }
}
export async function listOperatorTrips(p: {
  userId: string;
  limit: number;
  cursor?: string | undefined;
  status?: string | undefined;
  driverId?: string | undefined;
  busId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}): Promise<{ data: OperatorTripDTO[]; nextCursor: string | null }> {
  const opUser = await requireOperator(p.userId);
  let cursorCreatedAt: Date | undefined = undefined;
  if (p.cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(p.cursor, 'base64').toString('utf8'));
      cursorCreatedAt = new Date(decoded.createdAt);
    } catch {
      throw errors.invalidRequest('Invalid cursor');
    }
  }
  const fromDate = p.from ? istDayBoundsUtc(p.from).from : undefined;
  const toDate = p.to ? istDayBoundsUtc(p.to).to : undefined;
  const rows = await repo.listTripsByOperator({
    operatorId: opUser.operatorId,
    limit: p.limit,
    cursorCreatedAt,
    status: p.status,
    driverId: p.driverId,
    busId: p.busId,
    fromDate,
    toDate,
  });
  const hasMore = rows.length > p.limit;
  const data = hasMore ? rows.slice(0, p.limit) : rows;
  const nextCursor = hasMore
    ? Buffer.from(JSON.stringify({ createdAt: data[data.length - 1]!.createdAt.toISOString() })).toString('base64')
    : null;
  return { data: data.map(toOperatorTripDTO), nextCursor };
}

export async function getOperatorTrip(p: {
  userId: string;
  tripId: string;
}): Promise<OperatorTripDTO> {
  const opUser = await requireOperator(p.userId);
  const trip = await repo.findTripForOperator(p.tripId, opUser.operatorId);
  if (!trip) throw errors.notFound('Trip not found');
  return toOperatorTripDTO(trip);
}

export async function reassignTrip(p: {
  userId: string;
  tripId: string;
  driverId: string;
}): Promise<OperatorTripDTO> {
  const opUser = await requireOperator(p.userId);
  const trip = await repo.findTripForOperator(p.tripId, opUser.operatorId);
  if (!trip) throw errors.notFound('Trip not found');
  if (trip.status !== 'SCHEDULED') {
    throw errors.invalidTransition('Only SCHEDULED trips can be reassigned');
  }
  if (trip.driverId === p.driverId) return toOperatorTripDTO(trip);

  const driver = await repo.findDriverForTripAssignment(p.driverId, opUser.operatorId);
  if (!driver) throw networkErrors.driverNotFound();
  if (driver.kycStatus === 'BLOCKED' || driver.kycStatus === 'DEACTIVATED') {
    throw errors.driverBlocked();
  }
  if (driver.kycStatus !== 'VERIFIED' && driver.kycStatus !== 'ACTIVE') {
    throw networkErrors.driverKycNotVerified();
  }

  const driverConflict = await repo.findOverlappingDriverTrip({
    driverId: p.driverId,
    departureTime: trip.schedule.departureTime,
    arrivalTime: trip.schedule.arrivalTime,
    excludeTripId: trip.id,
  });
  if (driverConflict) throw errors.activeTripExists(driverConflict.id);

  try {
    const updated = await repo.reassignTripDriver(p.tripId, p.driverId);
    return toOperatorTripDTO(updated);
  } catch (err) {
    rethrowPrismaError(err);
  }
}

export async function unassignTrip(p: { userId: string; tripId: string }): Promise<void> {
  const opUser = await requireOperator(p.userId);
  const trip = await repo.findTripForOperator(p.tripId, opUser.operatorId);
  if (!trip) throw errors.notFound('Trip not found');
  if (trip.status === 'IN_PROGRESS') {
    throw errors.invalidTransition('Cannot unassign an IN_PROGRESS trip; cancel it first');
  }
  if (trip.status !== 'SCHEDULED') {
    throw errors.invalidTransition('Only SCHEDULED trips can be unassigned');
  }
  await repo.softDeleteOperatorTrip(p.tripId);
}