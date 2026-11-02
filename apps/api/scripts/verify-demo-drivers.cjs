// Verify all demo drivers - flips any non-VERIFIED status to VERIFIED.
// Run:  node apps/api/scripts/verify-demo-drivers.cjs
const fs = require('fs');
const path = require('path');

// Load apps/api/.env manually (Prisma Client does not auto-load dotenv)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([^=#\s][^=]*)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[m[1].trim()] = val;
    }
  });
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in apps/api/.env');
  process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n=== BEFORE ===');
  const before = await prisma.driverProfile.groupBy({ by: ['kycStatus'], _count: { _all: true } });
  before.forEach((g) => console.log(`  ${g.kycStatus.padEnd(15)} ${g._count._all}`));

  const result = await prisma.driverProfile.updateMany({
    where: { kycStatus: { in: ['INVITED', 'SIGNED_UP', 'KYC_PENDING'] } },
    data: { kycStatus: 'VERIFIED', verifiedAt: new Date() },
  });
  console.log(`\nUpdated ${result.count} driver(s) to VERIFIED`);

  console.log('\n=== AFTER ===');
  const after = await prisma.driverProfile.groupBy({ by: ['kycStatus'], _count: { _all: true } });
  after.forEach((g) => console.log(`  ${g.kycStatus.padEnd(15)} ${g._count._all}`));

  const drivers = await prisma.driverProfile.findMany({
    include: { user: { select: { phone: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  console.log('\n=== DRIVERS ===');
  if (drivers.length === 0) {
    console.log('  (none — run `pnpm seed` in apps/api first)');
  } else {
    drivers.forEach((d) => {
      console.log(`  ${d.user.phone.padEnd(18)} ${(d.user.name || '(no name)').padEnd(35)} ${d.kycStatus.padEnd(12)} onDuty=${d.onDuty}`);
    });
  }

  await prisma.$disconnect();
})().catch((e) => { console.error('ERROR:', e); process.exit(1); });
