import { prisma } from '../../src/lib/prisma.js';
import { newUuid } from '../../src/lib/ids.js';
import { createOperator, createPassenger } from './factories.js';

export async function createCity(overrides?: { name?: string; state?: string }) {
  return prisma.city.create({
    data: {
      id: newUuid(),
      name: overrides?.name ?? `City-${newUuid().slice(0, 6)}`,
      state: overrides?.state ?? 'State',
      isActive: true,
    },
  });
}

export async function createStand(params: { cityId: string; name?: string; type?: 'BUS_STAND' | 'PICKUP_POINT' | 'DROP_POINT'; }) {
  return prisma.stand.create({
    data: {
      id: newUuid(),
      cityId: params.cityId,
      name: params.name ?? `Stand-${newUuid().slice(0, 6)}`,
      type: params.type ?? 'BUS_STAND',
      lat: 26.8467,
      lng: 80.9462,
    },
  });
}

export async function createBus(params: { operatorId: string; registrationNumber?: string; capacity?: number; busType?: string; approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'; }) {
  return prisma.bus.create({
    data: {
      id: newUuid(),
      operatorId: params.operatorId,
      registrationNumber: params.registrationNumber ?? `MH-${newUuid().slice(0, 8)}`,
      capacity: params.capacity ?? 40,
      busType: params.busType ?? 'AC_SEATER',
      amenitiesJson: { _v: 1, items: ['WiFi', 'AC'] },
      approvalStatus: params.approvalStatus ?? 'PENDING',
    },
  });
}

export async function createRoute(params: {
  operatorId: string;
  originCityId: string;
  destinationCityId: string;
  stands: Array<{ standId: string; sequence: number; distanceFromPrevKm: number; durationFromPrevMin: number }>;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}) {
  return prisma.route.create({
    data: {
      id: newUuid(),
      operatorId: params.operatorId,
      originCityId: params.originCityId,
      destinationCityId: params.destinationCityId,
      approvalStatus: params.approvalStatus ?? 'PENDING',
      stands: {
        create: params.stands.map((s) => ({
          standId: s.standId,
          sequence: s.sequence,
          distanceFromPrevKm: s.distanceFromPrevKm,
          durationFromPrevMin: s.durationFromPrevMin,
        })),
      },
    },
    include: {
      originCity: true,
      destCity: true,
      stands: { include: { stand: true }, orderBy: { sequence: 'asc' } },
    },
  });
}

export async function seedBookingScenario(opts?: {
  bookingCount?: number;
  passengersPerBooking?: number;
  status?: string;
  phoneStart?: number;
}) {
  const opUser = await createOperator({ email: `seed-op-${newUuid().slice(0,6)}@test.example` });
  const operatorId = opUser.operatorUsers[0]!.operatorId;

  const delhi = await prisma.city.create({ data: { id: newUuid(), name: `Delhi-${newUuid().slice(0,6)}`, state: 'Delhi', isActive: true } });
  const lucknow = await prisma.city.create({ data: { id: newUuid(), name: `Lucknow-${newUuid().slice(0,6)}`, state: 'UP', isActive: true } });
  const stand1 = await prisma.stand.create({ data: { id: newUuid(), cityId: delhi.id, name: `ISBT-${newUuid().slice(0,6)}`, type: 'BUS_STAND', lat: 28.6675, lng: 77.2284 } });
  const stand2 = await prisma.stand.create({ data: { id: newUuid(), cityId: lucknow.id, name: `Alambagh-${newUuid().slice(0,6)}`, type: 'DROP_POINT', lat: 26.8467, lng: 80.9462 } });

  const bus = await prisma.bus.create({
    data: { id: newUuid(), operatorId, registrationNumber: `MH-${newUuid().slice(0,8)}`, capacity: 20, busType: 'AC_SEATER', amenitiesJson: { _v: 1, items: ['WiFi'] }, approvalStatus: 'APPROVED' },
  });
  const layout = await prisma.seatLayout.create({ data: { id: newUuid(), busId: bus.id, rowsCount: 2, columnsCount: 10, aisleMapJson: { _v: 1, aisle_cells: [] } } });
  const seats: Array<{ id: string }> = [];
  for (let c = 1; c <= 10; c++) {
    seats.push(await prisma.seat.create({ data: { id: newUuid(), layoutId: layout.id, seatRow: 'A', seatColumn: c, seatLabel: `A${c}`, seatType: 'SEATER', isFemaleOnly: false } }));
  }
  for (let c = 1; c <= 10; c++) {
    seats.push(await prisma.seat.create({ data: { id: newUuid(), layoutId: layout.id, seatRow: 'B', seatColumn: c, seatLabel: `B${c}`, seatType: 'SEATER', isFemaleOnly: false } }));
  }

  const route = await prisma.route.create({
    data: {
      id: newUuid(), operatorId, originCityId: delhi.id, destinationCityId: lucknow.id, approvalStatus: 'APPROVED',
      stands: { create: [
        { standId: stand1.id, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
        { standId: stand2.id, sequence: 2, distanceFromPrevKm: 500, durationFromPrevMin: 480 },
      ] },
    },
  });

  const todayIst = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const departureUtc = new Date(`${todayIst}T08:00:00.000+05:30`);
  const arrivalUtc = new Date(`${todayIst}T16:00:00.000+05:30`);
  const schedule = await prisma.schedule.create({
    data: { id: newUuid(), operatorId, busId: bus.id, routeId: route.id, departureTime: departureUtc, arrivalTime: arrivalUtc, fareAmountPaise: 45000n, fareCurrency: 'INR', status: 'PUBLISHED' },
  });

  const bookingCount = opts?.bookingCount ?? 1;
  const passengersPerBooking = opts?.passengersPerBooking ?? 2;
  const status = opts?.status ?? 'CONFIRMED';
  const phoneStart = opts?.phoneStart ?? 1000;
  const bookings: Array<{ id: string; userId: string }> = [];
  let seatIdx = 0;

  for (let i = 0; i < bookingCount; i++) {
    const user = await createPassenger({ phone: `+9198${String(phoneStart + i).padStart(8, '0')}` });
    const booking = await prisma.booking.create({
      data: {
        id: newUuid(), bookingReference: `BKG-${newUuid().slice(0,10)}`,
        userId: user.id, scheduleId: schedule.id,
        boardingStandId: stand1.id, droppingStandId: stand2.id,
        totalFareAmount: BigInt(45000 * passengersPerBooking), totalFareCurrency: 'INR',
        fareBreakdownJson: { _v: 1, base_fare_paise: 45000 * passengersPerBooking, tax_paise: 0, convenience_fee_paise: 0, total_paise: 45000 * passengersPerBooking },
        status, confirmedAt: status === 'CONFIRMED' ? new Date() : null,
      },
    });
    for (let j = 0; j < passengersPerBooking; j++) {
      await prisma.bookingPassenger.create({
        data: { id: newUuid(), bookingId: booking.id, seatId: seats[seatIdx++]!.id, scheduleId: schedule.id, name: `Passenger ${i}-${j}`, age: 28, gender: 'MALE' },
      });
    }
    if (status === 'CONFIRMED' || status === 'CHECKED_IN' || status === 'COMPLETED') {
      await prisma.payment.create({
        data: { id: newUuid(), bookingId: booking.id, idempotencyKey: newUuid(), gateway: 'RAZORPAY', amountPaise: BigInt(45000 * passengersPerBooking), currency: 'INR', status: 'SUCCEEDED', succeededAt: new Date() },
      });
    }
    bookings.push({ id: booking.id, userId: user.id });
  }

  return { opUser, operatorId, delhi, lucknow, stand1, stand2, bus, route, schedule, seats, bookings };
}