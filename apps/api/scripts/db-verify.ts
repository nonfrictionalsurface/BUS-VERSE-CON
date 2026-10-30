// Verifies DB schema matches expected state after migrations + constraints-fill.
// Run: pnpm --filter api db:verify
// Fails with exit 1 if any check misses.

import { prisma } from '../src/lib/prisma.js';

interface Check { name: string; expect: number; query: () => Promise<number>; }

async function count(sql: string, ...params: unknown[]): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(sql, ...params);
  const v = rows[0]?.c ?? 0;
  return typeof v === 'bigint' ? Number(v) : v;
}

const checks: Check[] = [
  { name: 'Sequences (4 expected)', expect: 4, query: () => count(
    `SELECT COUNT(*)::int AS c FROM pg_sequences WHERE schemaname='public' AND sequencename IN ('booking_reference_seq_2026','booking_reference_seq_2027','invoice_number_seq_2026_27','invoice_number_seq_2027_28')`) },
  { name: 'Unique indexes (19+ expected)', expect: 19, query: () => count(
    `SELECT COUNT(*)::int AS c FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'uniq_%'`) },
  { name: 'Triggers (27+ expected)', expect: 27, query: () => count(
    `SELECT COUNT(*)::int AS c FROM information_schema.triggers WHERE trigger_schema='public'`) },
  { name: 'CHECK constraints (27+ expected)', expect: 27, query: () => count(
    `SELECT COUNT(*)::int AS c FROM information_schema.check_constraints WHERE constraint_schema='public' AND constraint_name LIKE 'chk_%'`) },
  { name: 'migrations (4 expected)', expect: 4, query: () => count(
    `SELECT COUNT(*)::int AS c FROM _prisma_migrations WHERE finished_at IS NOT NULL`) },
  { name: 'audit_logs_no_update trigger', expect: 1, query: () => count(
    `SELECT COUNT(*)::int AS c FROM information_schema.triggers WHERE event_object_table='audit_logs' AND trigger_name='audit_logs_no_update'`) },
  { name: 'audit_logs_no_delete trigger', expect: 1, query: () => count(
    `SELECT COUNT(*)::int AS c FROM information_schema.triggers WHERE event_object_table='audit_logs' AND trigger_name='audit_logs_no_delete'`) },
  { name: 'uniq_gateway_webhooks_dedup index', expect: 1, query: () => count(
    `SELECT COUNT(*)::int AS c FROM pg_indexes WHERE indexname='uniq_gateway_webhooks_dedup'`) },
  { name: 'uniq_boarding_scans_ticket_trip index', expect: 1, query: () => count(
    `SELECT COUNT(*)::int AS c FROM pg_indexes WHERE indexname='uniq_boarding_scans_ticket_trip'`) },
  { name: 'gps_samples.client_reported_speed_kmh column', expect: 1, query: () => count(
    `SELECT COUNT(*)::int AS c FROM information_schema.columns WHERE table_name='gps_samples' AND column_name='client_reported_speed_kmh'`) },
  { name: 'driver_profiles.kyc_documents_json column', expect: 1, query: () => count(
    `SELECT COUNT(*)::int AS c FROM information_schema.columns WHERE table_name='driver_profiles' AND column_name='kyc_documents_json'`) },
];
async function main(): Promise<void> {
  let failures = 0;
  let total = 0;
  console.log('\n== db:verify ==\n');
  for (const c of checks) {
    total++;
    const actual = await c.query();
    const pass = actual >= c.expect;
    if (!pass) failures++;
    const mark = pass ? 'OK' : 'FAIL';
    const pad = ' '.repeat(Math.max(0, 45 - c.name.length));
    console.log(`  [${mark}] ${c.name}${pad} actual=${actual} expect>=${c.expect}`);
  }
  console.log(`\n${total - failures}/${total} checks passed\n`);
  if (failures > 0) {
    console.log('HINT: run constraints-fill.sql if any trigger/index/sequence is missing:');
    console.log('  Get-Content apps/api/prisma/constraints-fill.sql -Raw | docker exec -i busverse-postgres psql -U postgres -d busverse -v ON_ERROR_STOP=1\n');
    process.exit(1);
  }
  process.exit(0);
}

main()
  .catch((err) => { console.error('[db:verify] ERROR:', err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });