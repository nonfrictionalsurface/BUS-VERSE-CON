import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { compactLayout, getPreset, parseLayout, relabel, type Layout } from '@busverse/seat-engine';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { networkRouter } from '../../src/modules/network/network.router.js';
import { identityRouter } from '../../src/modules/identity/identity.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createOperator } from '../helpers/factories.js';
import { loginAsOperator } from '../helpers/auth.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { prisma } from '../../src/lib/prisma.js';
import { newUuid } from '../../src/lib/ids.js';

const PASSWORD = 'correct horse battery staple';
let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ trustProxy: true, logger: false });
  await registerMiddleware(app);
  await app.register(identityRouter, { prefix: '/v1' });
  await app.register(networkRouter, { prefix: '/v1' });
  await registerNotFoundHandler(app);
  await registerErrorHandler(app);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await resetIdentityTables();
});

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

async function loginOperator(email = 'op@test.example') {
  await createOperator({ email, password: PASSWORD });
  return loginAsOperator(app, email, PASSWORD);
}

async function createBus(token: string, capacity: number): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/operator/buses',
    headers: auth(token),
    payload: { registrationNumber: `DL0${newUuid().slice(0, 6)}`, capacity, busType: 'SEATER' },
  });
  return res.json().data.id as string;
}

function preset(id: string): Layout {
  const p = getPreset(id);
  if (!p) throw new Error(`unknown preset ${id}`);
  return p.build();
}

const putLayout = (token: string, busId: string, layout: Layout, query = '') =>
  app.inject({ method: 'PUT', url: `/v1/operator/buses/${busId}/layout${query}`, headers: auth(token), payload: compactLayout(layout) });

describe('seat layout v2', () => {
  it('saves a v2 layout and returns spec, rev and stable keys', async () => {
    const { accessToken } = await loginOperator();
    const busId = await createBus(accessToken, 40);
    const res = await putLayout(accessToken, busId, preset('seater-2x2-40'));
    expect(res.statusCode).toBe(200);
    const d = res.json().data;
    expect(d.rev).toBe(1);
    expect(d.seats).toHaveLength(40);
    expect(d.seats.map((s: { seatLabel: string }) => s.seatLabel)).toContain('10D');
    expect(d.seats.every((s: { key: string; seatLabel: string }) => s.key === s.seatLabel)).toBe(true);
    expect(d.rowsCount).toBe(11);
    expect(d.columnsCount).toBe(5);
    expect(parseLayout(d.spec).layout?.seats).toHaveLength(40);
  });

  it('stores double-deckers with unique legacy coordinates', async () => {
    const { accessToken } = await loginOperator();
    const busId = await createBus(accessToken, 72);
    const res = await putLayout(accessToken, busId, preset('double-decker-2x2-72'));
    expect(res.statusCode).toBe(200);
    const seats = res.json().data.seats as Array<{ seatRow: string; seatColumn: number }>;
    expect(new Set(seats.map((s) => `${s.seatRow}${s.seatColumn}`)).size).toBe(72);
  });

  it('rejects a capacity mismatch unless syncCapacity=true', async () => {
    const { accessToken } = await loginOperator();
    const busId = await createBus(accessToken, 30);
    const bad = await putLayout(accessToken, busId, preset('seater-2x2-40'));
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe('INVALID_REQUEST');
    const ok = await putLayout(accessToken, busId, preset('seater-2x2-40'), '?syncCapacity=true');
    expect(ok.statusCode).toBe(200);
    const bus = await prisma.bus.findUniqueOrThrow({ where: { id: busId } });
    expect(bus.capacity).toBe(40);
  });

  it('rejects structurally invalid layouts', async () => {
    const { accessToken } = await loginOperator();
    const busId = await createBus(accessToken, 40);
    const broken = preset('seater-2x2-40');
    const [a, b] = broken.seats;
    if (!a || !b) throw new Error('fixture');
    b.row = a.row;
    b.col = a.col;
    const res = await putLayout(accessToken, busId, broken);
    expect(res.statusCode).toBe(400);
  });

  it('validate is a dry run: reports issues and a summary, writes nothing', async () => {
    const { accessToken } = await loginOperator();
    const busId = await createBus(accessToken, 40);
    const layout = preset('seater-2x2-40');
    const ok = await app.inject({ method: 'POST', url: `/v1/operator/buses/${busId}/layout/validate`, headers: auth(accessToken), payload: compactLayout(layout) });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().data.ok).toBe(true);
    expect(ok.json().data.summary.added).toBe(40);

    const broken = preset('seater-2x2-40');
    const [a, b] = broken.seats;
    if (!a || !b) throw new Error('fixture');
    b.row = a.row;
    b.col = a.col;
    const bad = await app.inject({ method: 'POST', url: `/v1/operator/buses/${busId}/layout/validate`, headers: auth(accessToken), payload: compactLayout(broken) });
    expect(bad.statusCode).toBe(200);
    expect(bad.json().data.ok).toBe(false);
    expect(bad.json().data.issues.some((i: { code: string }) => i.code === 'OVERLAP')).toBe(true);

    const stored = await app.inject({ method: 'GET', url: `/v1/operator/buses/${busId}/layout`, headers: auth(accessToken) });
    expect(stored.statusCode).toBe(404);
  });

  it('editing keeps seat ids and bumps the revision; swapped labels never collide', async () => {
    const { accessToken } = await loginOperator();
    const busId = await createBus(accessToken, 40);
    const layout = preset('seater-2x2-40');
    const first = await putLayout(accessToken, busId, layout);
    const ids = new Map<string, string>(first.json().data.seats.map((s: { key: string; id: string }) => [s.key, s.id]));

    const swapped: Layout = JSON.parse(JSON.stringify(layout));
    const [a, b] = swapped.seats;
    if (!a || !b) throw new Error('fixture');
    [a.label, b.label] = [b.label, a.label];
    const second = await putLayout(accessToken, busId, swapped);
    expect(second.statusCode).toBe(200);
    const d = second.json().data;
    expect(d.rev).toBe(2);
    for (const s of d.seats as Array<{ id: string; key: string; seatLabel: string }>) expect(s.id).toBe(ids.get(s.key));
    expect(d.seats.find((s: { key: string }) => s.key === a.key).seatLabel).toBe(a.label);

    const third = await putLayout(accessToken, busId, relabel(layout, 'SEQUENTIAL'));
    expect(third.statusCode).toBe(200);
    expect(third.json().data.rev).toBe(3);
    for (const s of third.json().data.seats as Array<{ id: string; key: string }>) expect(s.id).toBe(ids.get(s.key));
  });

  it('removing a seat soft-deletes it and frees its label', async () => {
    const { accessToken } = await loginOperator();
    const busId = await createBus(accessToken, 40);
    const layout = preset('seater-2x2-40');
    const first = await putLayout(accessToken, busId, layout);
    const layoutId = first.json().data.id as string;
    const smaller: Layout = { ...layout, seats: layout.seats.slice(1) };
    const res = await putLayout(accessToken, busId, smaller, '?syncCapacity=true');
    expect(res.statusCode).toBe(200);
    expect(res.json().data.seats).toHaveLength(39);
    const gone = await prisma.seat.findFirst({ where: { layoutId, seatKey: '1A' } });
    expect(gone?.deletedAt).not.toBeNull();
    // the label can be reused by a new seat
    const again = await putLayout(accessToken, busId, layout, '?syncCapacity=true');
    expect(again.statusCode).toBe(200);
    expect(again.json().data.seats).toHaveLength(40);
  });

  it('a booking on a future schedule protects its seat; departed schedules do not', async () => {
    const s = await seedBookingScenario({ bookingCount: 1, passengersPerBooking: 2 });
    await prisma.schedule.update({
      where: { id: s.schedule.id },
      data: { departureTime: new Date(Date.now() + 48 * 3600_000), arrivalTime: new Date(Date.now() + 56 * 3600_000) },
    });
    const { accessToken } = await loginAsOperator(app, s.opUser.email as string, PASSWORD);

    // legacy rows are upgraded on the fly
    const got = await app.inject({ method: 'GET', url: `/v1/operator/buses/${s.bus.id}/layout`, headers: auth(accessToken) });
    expect(got.statusCode).toBe(200);
    const spec = parseLayout(got.json().data.spec).layout;
    if (!spec) throw new Error('spec did not parse');
    expect(spec.seats).toHaveLength(20);

    const without = (...labels: string[]): Layout => ({ ...spec, seats: spec.seats.filter((x) => !labels.includes(x.label)) });

    const blocked = await putLayout(accessToken, s.bus.id, without('A1'), '?syncCapacity=true');
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error.code).toBe('LAYOUT_IN_USE');

    const preview = await app.inject({ method: 'POST', url: `/v1/operator/buses/${s.bus.id}/layout/validate?syncCapacity=true`, headers: auth(accessToken), payload: compactLayout(without('A1')) });
    expect(preview.json().data.ok).toBe(false);
    expect(preview.json().data.conflicts[0].seatLabel).toBe('A1');

    const relabelled: Layout = { ...spec, seats: spec.seats.map((x) => (x.label === 'A1' ? { ...x, label: 'ZZ1' } : x)) };
    const relabelBlocked = await putLayout(accessToken, s.bus.id, relabelled);
    expect(relabelBlocked.statusCode).toBe(409);

    const free = await putLayout(accessToken, s.bus.id, without('B10'), '?syncCapacity=true');
    expect(free.statusCode).toBe(200);

    await prisma.schedule.update({ where: { id: s.schedule.id }, data: { departureTime: new Date(Date.now() - 3600_000) } });
    const later = await putLayout(accessToken, s.bus.id, without('A1', 'B10'), '?syncCapacity=true');
    expect(later.statusCode).toBe(200);
  });
});
