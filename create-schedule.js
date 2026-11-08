const BASE = 'http://10.169.120.179:4310/v1';

async function seedSchedule() {
  try {
    console.log('1. Logging in as Operator...');
    const loginRes = await fetch(`${BASE}/operator/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sharma@busverse.app', password: 'Demo1234!@Abc' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(JSON.stringify(loginData));
    const token = loginData.data.accessToken;

    // 1. Get a Bus
    const busesRes = await fetch(`${BASE}/operator/buses`, { headers: { Authorization: `Bearer ${token}` } });
    const busesData = await busesRes.json();
    const bus = busesData.data[0];
    if (!bus) throw new Error('No buses found in DB.');

    // 2. Get a Route
    const routesRes = await fetch(`${BASE}/operator/routes`, { headers: { Authorization: `Bearer ${token}` } });
    const routesData = await routesRes.json();
    const route = routesData.data[0];
    if (!route) throw new Error('No routes found in DB.');

    console.log(`Using Bus: ${bus.registrationNumber}, Route: ${route.id}`);

    console.log('2. Creating Schedule for today...');
    const today = new Date();
    const depTime = new Date(today.setHours(14, 0, 0, 0)).toISOString();
    const arrTime = new Date(today.setHours(22, 0, 0, 0)).toISOString();

    const createRes = await fetch(`${BASE}/operator/schedules`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        busId: bus.id,
        routeId: route.id,
        departureTime: depTime,
        arrivalTime: arrTime,
        fareAmountPaise: 45000
      })
    });
    const createData = await createRes.json();
    if (!createRes.ok) throw new Error(JSON.stringify(createData));

    const scheduleId = createData.data.id;
    console.log(`[OK] Schedule created: ${scheduleId}`);

    console.log('3. Publishing Schedule...');
    const pubRes = await fetch(`${BASE}/operator/schedules/${scheduleId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!pubRes.ok) {
      const err = await pubRes.json();
      throw new Error('Publish failed: ' + JSON.stringify(err));
    }

    console.log(`\n✅ SUCCESS! You can now search for buses today and test the seat map.`);
    console.log(`Schedule ID: ${scheduleId}`);

  } catch (err) {
    console.error('\n[ERROR]', err.message);
  }
}

seedSchedule();
