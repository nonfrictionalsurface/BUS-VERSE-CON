// apps/api/scripts/seed-demo-trip.ts
// Run from apps/api: npx tsx scripts/seed-demo-trip.ts
// Creates one SCHEDULED trip for Ravi Kumar (+919876540011) on a PUBLISHED schedule.
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const DEMO_DRIVER_PHONE = '+919876540011';
async function main() {
  const user = await prisma.user.findFirst({
    where: { phone: DEMO_DRIVER_PHONE },
    include: { driverProfile: true },
  });
  if (!user?.driverProfile) throw new Error('Demo driver not found — run the API seed first');
  const schedule = await prisma.schedule.findFirst({
    where: { status: 'PUBLISHED' },
    orderBy: { departureTime: 'asc' },
  });
  if (!schedule) throw new Error('No PUBLISHED schedule — run the API seed first');
  const existing = await prisma.trip.findFirst({
    where: { scheduleId: schedule.id, driverId: user.driverProfile.id },
  });
  if (existing) { console.log('Trip exists:', existing.id, '→', existing.status); return; }
  const trip = await prisma.trip.create({
    data: { scheduleId: schedule.id, busId: schedule.busId, driverId: user.driverProfile.id, status: 'SCHEDULED' },
  });
  console.log('Created SCHEDULED trip:', trip.id, '→ Ravi Kumar');
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });