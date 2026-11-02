// scripts/bootstrap-schedule.ts
// Creates ONE real operator + bus + route + 3 PUBLISHED schedules.
// Uses Prisma directly — same writes the operator panel makes.
// Idempotent: running twice won't create duplicates.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Grab two existing cities
  const cities = await prisma.city.findMany({ where: { isActive: true }, take: 2 });
  if (cities.length < 2) throw new Error('Need at least 2 cities — run any city-seed first');
  const [origin, dest] = cities;
  console.log(`Route: ${origin.name} -> ${dest.name}`);

  // 2. Get or create operator
  let operator = await prisma.operator.findFirst({ where: { status: 'APPROVED' } });
  if (!operator) {
    operator = await prisma.operator.create({
      data: {
        companyName: 'BusVerse Line',
        gstin: '09AAACH7409R1ZZ',
        pan: 'AAACH7409R',
        status: 'APPROVED',
      },
    });
    console.log('Created operator');
  }

  // 3. Get or create bus
  let bus = await prisma.bus.findFirst({ where: { operatorId: operator.id, deletedAt: null } });
  if (!bus) {
    bus = await prisma.bus.create({
      data: {
        operatorId: operator.id,
        registrationNumber: 'DL01AB1234',
        model: 'Volvo 9400',
        capacity: 40,
        busType: 'AC_SEATER',
        approvalStatus: 'APPROVED',
        amenitiesJson: { _v: 1, items: ['WiFi', 'AC', 'Charging'] },
      },
    });
    console.log('Created bus');
  }

  // 4. Seat layout + seats
  let layout = await prisma.seatLayout.findFirst({ where: { busId: bus.id, deletedAt: null } });
  if (!layout) {
    layout = await prisma.seatLayout.create({
      data: {
        busId: bus.id,
        rowsCount: 10,
        columnsCount: 4,
        aisleMapJson: {
          _v: 1,
          aisle_cells: Array.from({ length: 10 }, (_, r) => ({
            row: String.fromCharCode(65 + r),
            column: 3,
          })),
        },
      },
    });
    const seats: any[] = [];
    for (let r = 0; r < 10; r++) {
      const rowChar = String.fromCharCode(65 + r);
      for (let c = 1; c <= 4; c++) {
        if (c === 3) continue;
        seats.push({
          layoutId: layout.id,
          seatRow: rowChar,
          seatColumn: c,
          seatLabel: `${rowChar}${c}`,
          seatType: 'SEATER',
          isFemaleOnly: false,
        });
      }
    }
    await prisma.seat.createMany({ data: seats });
    console.log(`Created layout + ${seats.length} seats`);
  }

  // 5. Stands
  const originStand = await prisma.stand.findFirst({ where: { cityId: origin.id } });
  const destStand = await prisma.stand.findFirst({ where: { cityId: dest.id } });
  if (!originStand || !destStand) throw new Error('Need stands on both cities');

  // 6. Route
  let route = await prisma.route.findFirst({
    where: { operatorId: operator.id, originCityId: origin.id, destinationCityId: dest.id, deletedAt: null },
  });
  if (!route) {
    route = await prisma.route.create({
      data: {
        operatorId: operator.id,
        originCityId: origin.id,
        destinationCityId: dest.id,
        approvalStatus: 'APPROVED',
        stands: {
          create: [
            { standId: originStand.id, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
            { standId: destStand.id, sequence: 2, distanceFromPrevKm: 500, durationFromPrevMin: 480 },
          ],
        },
      },
    });
    console.log('Created route');
  }

  // 7. Three schedules for tomorrow (8 AM, 2:30 PM, 9 PM IST)
  const tomorrow = new Date();
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const slots = [
    { depH: 8,  depM: 0,  arrH: 16, arrM: 0,  fare: 45000n },
    { depH: 14, depM: 30, arrH: 22, arrM: 30, fare: 55000n },
    { depH: 21, depM: 0,  arrH: 5,  arrM: 0,  fare: 65000n },
  ];

  let created = 0;
  for (const s of slots) {
    const dep = new Date(tomorrow);
    dep.setUTCHours(s.depH - 5, s.depM - 30, 0, 0); // IST -> UTC
    const arr = new Date(dep);
    arr.setUTCHours(dep.getUTCHours() + 8, dep.getUTCMinutes(), 0, 0);

    const exists = await prisma.schedule.findFirst({
      where: { operatorId: operator.id, busId: bus.id, routeId: route.id, departureTime: dep },
    });
    if (!exists) {
      await prisma.schedule.create({
        data: {
          operatorId: operator.id,
          busId: bus.id,
          routeId: route.id,
          departureTime: dep,
          arrivalTime: arr,
          fareAmountPaise: s.fare,
          fareCurrency: 'INR',
          status: 'PUBLISHED',
        },
      });
      created++;
    }
  }
  console.log(`Created ${created} PUBLISHED schedules for tomorrow`);

  console.log(`\nReady: search ${origin.name} -> ${dest.name} on ${tomorrow.toISOString().slice(0, 10)}`);
}

main()
  .catch((e) => { console.error('FAILED:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());