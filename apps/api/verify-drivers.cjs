const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const invited = await p.driverProfile.findMany({
    where: { kycStatus: 'INVITED', deletedAt: null },
    include: { user: { select: { name: true, phone: true } } },
  });

  if (invited.length === 0) {
    console.log('No INVITED drivers found. Did Step 1 (invite via UI) succeed?');
    await p.$disconnect();
    return;
  }

  console.log('Found ' + invited.length + ' INVITED driver(s):');
  invited.forEach((d) => console.log('  - ' + d.user.name + ' (' + d.user.phone + ')'));

  const result = await p.driverProfile.updateMany({
    where: { kycStatus: 'INVITED', deletedAt: null },
    data: { kycStatus: 'VERIFIED', verifiedAt: new Date() },
  });

  console.log('');
  console.log('OK Verified ' + result.count + ' driver(s)');
  console.log('  They now appear in the Assign Driver modal.');

  await p.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
