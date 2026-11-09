const BASE = 'http://10.169.120.179:4310/v1';

async function diagnostic() {
  console.log('1. Logging in...');
  const phone = '+919876543210';
  await fetch(`${BASE}/passenger/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, intent: 'LOGIN' })
  });
  await new Promise(r => setTimeout(r, 500));
  const auth = await (await fetch(`${BASE}/passenger/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: '123456' })
  })).json();
  if (!auth.data?.accessToken) { console.log('Login failed:', JSON.stringify(auth, null, 2)); return; }
  const token = auth.data.accessToken;
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  console.log('  [OK] Logged in.');

  console.log('2. Finding a schedule...');
  let schedId = null;
  let seat = null;
  let lock = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const cities = (await (await fetch(`${BASE}/public/cities?q=Delhi`)).json()).data || [];
    if (cities.length === 0) { console.log('No cities'); return; }
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      const sr = await (await fetch(`${BASE}/public/search?originCityId=${cities[0].id}&destinationCityId=${cities[0].id}&date=${ds}`)).json();
      if (sr.data && sr.data.length > 0) { schedId = sr.data[0].scheduleId; break; }
    }
    if (!schedId) break;

    console.log('  Schedule:', schedId);
    const avail = (await (await fetch(`${BASE}/passenger/schedules/${schedId}/availability`, { headers: H })).json()).data;
    if (!avail) { console.log('  No availability'); schedId = null; continue; }
    
    seat = avail.seats.find(s => s.state === 'AVAILABLE');
    if (!seat) { console.log('  No available seat'); schedId = null; continue; }

    console.log('  Seat:', JSON.stringify(seat, null, 2));

    const lockRes = await fetch(`${BASE}/passenger/seat-locks`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ scheduleId: schedId, seatId: seat.id })
    });
    const lockData = await lockRes.json();
    if (!lockData.data) { console.log('  Lock failed:', JSON.stringify(lockData, null, 2)); schedId = null; continue; }
    lock = lockData.data;
    console.log('  Lock:', JSON.stringify(lock, null, 2));
    break;
  }

  if (!schedId || !seat || !lock) {
    console.log('\nCould not prepare a booking attempt. Likely no published schedules today. Run the create-schedule script from earlier first.');
    return;
  }

  console.log('\n3. Testing booking payloads...\n');

  // Get a stand ID (use the schedule's route)
  const schedDetail = (await (await fetch(`${BASE}/public/schedules/${schedId}`)).json()).data;
  const boardingStandId = schedDetail?.route?.stands?.[0]?.stand?.id || 'stand_placeholder';

  const seatKey = seat.key || seat.seatKey || seat.label;

  const payloads = [
    { name: 'A — old seatId only', body: { scheduleId: schedId, lockId: lock.lockId, boardingStandId, droppingStandId: boardingStandId, passengers: [{ seatId: seat.id, name: 'Test User', age: 30, gender: 'MALE' }] } },
    { name: 'B — seatKey only',    body: { scheduleId: schedId, lockId: lock.lockId, boardingStandId, droppingStandId: boardingStandId, passengers: [{ seatKey, name: 'Test User', age: 30, gender: 'MALE' }] } },
    { name: 'C — seatId + seatKey',body: { scheduleId: schedId, lockId: lock.lockId, boardingStandId, droppingStandId: boardingStandId, passengers: [{ seatId: seat.id, seatKey, name: 'Test User', age: 30, gender: 'MALE' }] } },
    { name: 'D — v2 shape (locks array)', body: { scheduleId: schedId, boardingStandId, droppingStandId: boardingStandId, locks: [lock.lockId], passengers: [{ seatKey, name: 'Test User', age: 30, gender: 'MALE' }] } },
  ];

  for (const p of payloads) {
    console.log(`\n=== Payload ${p.name} ===`);
    console.log('Request:', JSON.stringify(p.body, null, 2));
    const res = await fetch(`${BASE}/passenger/bookings`, {
      method: 'POST', headers: H, body: JSON.stringify(p.body)
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    if (res.ok) {
      console.log('\n✅ WORKING PAYLOAD FOUND — this is what bookings.api.ts must send.');
      // Release lock so we don't leave it stuck
      await fetch(`${BASE}/passenger/seat-locks/${lock.lockId}`, { method: 'DELETE', headers: H }).catch(() => {});
      return;
    }
  }

  console.log('\n❌ All 4 payload shapes failed. Backend requires something different.');
  await fetch(`${BASE}/passenger/seat-locks/${lock.lockId}`, { method: 'DELETE', headers: H }).catch(() => {});
}

diagnostic();
