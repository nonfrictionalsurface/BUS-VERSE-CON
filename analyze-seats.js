const BASE = 'http://10.169.120.179:4310/v1';

async function analyze() {
  try {
    console.log('1. Logging in as Operator...');
    const opRes = await fetch(`${BASE}/operator/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sharma@busverse.app', password: 'Demo1234!@Abc' })
    });
    const opData = await opRes.json();
    const opToken = opData.data.accessToken;

    console.log('2. Fetching buses...');
    const busesRes = await fetch(`${BASE}/operator/buses`, { headers: { Authorization: `Bearer ${opToken}` } });
    const bus = (await busesRes.json()).data[0];
    console.log(`   Using Bus: ${bus.registrationNumber} (${bus.id})`);

    console.log('3. Uploading a standard 2+2 layout (Rows A-E, 4 columns)...');
    // Create 5 rows (A to E) with 4 columns. Aisle at column 3.
    const seats = [];
    const rows = ['A', 'B', 'C', 'D', 'E'];
    for (const row of rows) {
      for (let col = 1; col <= 4; col++) {
        seats.push({
          seatRow: row,
          seatColumn: col,
          seatType: "SEATER",
          isFemaleOnly: false
        });
      }
    }

    const layoutPayload = {
      rowsCount: 5,
      columnsCount: 4,
      seats: seats
    };

    const createLayoutRes = await fetch(`${BASE}/operator/buses/${bus.id}/layout`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opToken}` },
      body: JSON.stringify(layoutPayload)
    });
    
    const createLayoutData = await createLayoutRes.json();
    if (!createLayoutRes.ok) throw new Error('Layout upload failed: ' + JSON.stringify(createLayoutData));

    console.log('   [OK] Layout created!');

    console.log('\n4. Fetching the layout to see the EXACT format...\n');
    const getLayoutRes = await fetch(`${BASE}/operator/buses/${bus.id}/layout`, { headers: { Authorization: `Bearer ${opToken}` } });
    const layoutData = await getLayoutRes.json();

    console.log('=========================================');
    console.log('   RAW API RESPONSE: BUS LAYOUT');
    console.log('=========================================');
    console.log(JSON.stringify(layoutData.data, null, 2));
    console.log('=========================================\n');

  } catch (err) {
    console.error('\n❌ SCRIPT ERROR:', err.message);
  }
}
analyze();
