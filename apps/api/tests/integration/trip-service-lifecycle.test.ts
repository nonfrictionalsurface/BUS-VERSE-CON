import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { newUuid } from '../../src/lib/ids.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { createDriver, createPassenger } from '../helpers/factories.js';
import * as tripService from '../../src/modules/trip/trip.service.js';

beforeEach(async () => {
  await resetIdentityTables();
});

async function setupScenario(opts: {
  bookingCount?: number;
  bookingStatus?: string;
  tripStatus?: string;
  kycStatus?: 'INVITED' | 'VERIFIED' | 'REJECTED';
} = {}) {
  const seed = await seedBookingScenario({
    bookingCount: opts.bookingCount ?? 1,
    passengersPerBooking: 1,
    status: opts.bookingStatus ?? 'CONFIRMED',
  });
  const driver = await createDriver({
    operatorId: seed.operatorId,
    kycStatus: opts.kycStatus ?? 'VERIFIED',
  });
  const trip = await prisma.trip.create({
    data: {
      scheduleId: seed.schedule.id,
      busId: seed.bus.id,
      driverId: driver.driverProfile.id,
      status: opts.tripStatus ?? 'SCHEDULED',
    },
  });
  return { seed, driver, trip };
}

describe('trip.service — getManifest', () => {
  it('throws notFound for unknown trip', async () => {
    const { driver } = await setupScenario();
    await expect(tripService.getManifest(driver.id, newUuid())).rejects.toThrow();
  });

  it('returns zero passengers when no bookings', async () => {
    const { driver, trip } = await setupScenario({ bookingCount: 0 });
    const manifest = await tripService.getManifest(driver.id, trip.id);
    expect(manifest.totalPassengers).toBe(0);
    expect(manifest.totalBoarded).toBe(0);
  });

  it('returns confirmed passengers grouped by boarding stand', async () => {
    const { driver, trip } = await setupScenario({ bookingCount: 2 });
    const manifest = await tripService.getManifest(driver.id, trip.id);
    expect(manifest.totalPassengers).toBe(2);
    expect(manifest.totalBoarded).toBe(0);
    expect(manifest.byStand.length).toBeGreaterThan(0);
    const firstPassenger = manifest.byStand[0]!.passengers[0];
    expect(firstPassenger?.boardingStatus).toBe('CONFIRMED');
    expect(Array.isArray(firstPassenger?.seatLabels)).toBe(true);
  });

  it('counts CHECKED_IN bookings as boarded', async () => {
    const { driver, trip } = await setupScenario({ bookingCount: 1, bookingStatus: 'CHECKED_IN' });
    const manifest = await tripService.getManifest(driver.id, trip.id);
    expect(manifest.totalBoarded).toBeGreaterThan(0);
    expect(manifest.byStand[0]!.passengers[0]!.boardingStatus).toBe('BOARDED');
  });

  it('returns correct totalBoarded when mixed statuses', async () => {
    const seed = await seedBookingScenario({ bookingCount: 2, passengersPerBooking: 1, status: 'CONFIRMED' });
    const driver = await createDriver({ operatorId: seed.operatorId, kycStatus: 'VERIFIED' });
    const trip = await prisma.trip.create({
      data: { scheduleId: seed.schedule.id, busId: seed.bus.id, driverId: driver.driverProfile.id, status: 'SCHEDULED' },
    });
    await prisma.booking.update({ where: { id: seed.bookings[1]!.id }, data: { status: 'CHECKED_IN', checkedInAt: new Date() } });
    const manifest = await tripService.getManifest(driver.id, trip.id);
    expect(manifest.totalPassengers).toBe(2);
    expect(manifest.totalBoarded).toBeGreaterThan(0);
  });
});

describe('trip.service — listHistory', () => {
  it('returns empty when no past trips', async () => {
    const { driver } = await setupScenario();
    const r = await tripService.listHistory(driver.id, { limit: 10 });
    expect(r.data.length).toBe(0);
    expect(r.nextCursor).toBeNull();
  });

  it('filters by to-date without crashing', async () => {
    const { driver } = await setupScenario();
    const to = new Date().toISOString().slice(0, 10);
    const r = await tripService.listHistory(driver.id, { limit: 10, to });
    expect(Array.isArray(r.data)).toBe(true);
  });

  it('filters by from-date without crashing', async () => {
    const { driver } = await setupScenario();
    const from = new Date().toISOString().slice(0, 10);
    const r = await tripService.listHistory(driver.id, { limit: 10, from });
    expect(Array.isArray(r.data)).toBe(true);
  });

  it('throws notFound on invalid cursor', async () => {
    const { driver } = await setupScenario();
    await expect(tripService.listHistory(driver.id, { limit: 10, cursor: 'not-base64' }))
      .rejects.toThrow();
  });
});
describe('trip.service — createDriverUploadUrl', () => {
  it('throws notFound for non-driver user', async () => {
    const passenger = await createPassenger();
    await expect(tripService.createDriverUploadUrl(passenger.id, {
      filename: 'a.pdf', contentType: 'application/pdf', purpose: 'KYC',
    })).rejects.toThrow();
  });

  it('returns upload URL for driver', async () => {
    const { driver } = await setupScenario();
    const r = await tripService.createDriverUploadUrl(driver.id, {
      filename: 'a.pdf', contentType: 'application/pdf', purpose: 'KYC',
    });
    expect(typeof r.uploadId).toBe('string');
    expect(typeof r.uploadUrl).toBe('string');
    expect(typeof r.expiresAt).toBe('string');
  });
});

describe('trip.service — attachDriverDocuments', () => {
  it('throws notFound for non-driver user', async () => {
    const passenger = await createPassenger();
    await expect(tripService.attachDriverDocuments(passenger.id, { uploadIds: ['u1'] }))
      .rejects.toThrow();
  });

  it('transitions INVITED -> KYC_PENDING', async () => {
    const { driver } = await setupScenario({ kycStatus: 'INVITED' });
    const r = await tripService.attachDriverDocuments(driver.id, { uploadIds: ['u1', 'u2'] });
    expect(r.attached).toBe(2);
    const updated = await prisma.driverProfile.findUnique({ where: { id: driver.driverProfile.id } });
    expect(updated?.kycStatus).toBe('KYC_PENDING');
  });

  it('preserves VERIFIED status', async () => {
    const { driver } = await setupScenario({ kycStatus: 'VERIFIED' });
    const r = await tripService.attachDriverDocuments(driver.id, { uploadIds: ['u1'] });
    expect(r.attached).toBe(1);
    const updated = await prisma.driverProfile.findUnique({ where: { id: driver.driverProfile.id } });
    expect(updated?.kycStatus).toBe('VERIFIED');
  });

  it('merges multiple uploadIds into kycDocumentsJson', async () => {
    const { driver } = await setupScenario();
    await tripService.attachDriverDocuments(driver.id, { uploadIds: ['a', 'b'] });
    await tripService.attachDriverDocuments(driver.id, { uploadIds: ['c'] });
    const updated = await prisma.driverProfile.findUnique({ where: { id: driver.driverProfile.id } });
    const docs = updated?.kycDocumentsJson as Record<string, unknown>;
    expect(docs).toHaveProperty('a');
    expect(docs).toHaveProperty('b');
    expect(docs).toHaveProperty('c');
  });
});