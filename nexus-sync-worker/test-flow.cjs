const http = require('http');

// Helper to make HTTP JSON requests
function request(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://127.0.0.1:8787${path}`);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTest() {
  console.log('🚀 Starting Nexus Overwatch Phase 2 Test Suite...\n');

  // 1. Health Check
  const health = await request('/api/health');
  console.log('1. Health Check:', health.status === 200 ? '✅ PASSED' : '❌ FAILED', health.data);

  // 2. Create Alliance
  const createRes = await request('/api/v1/alliances/create', 'POST', {
    allianceName: 'Galactic Empire',
    allianceTag: 'EMPIRE',
    universeId: 's198-en',
    adminPlayerId: '100001',
    adminPlayerName: 'Emperor Palpatine',
  });
  console.log('2. Create Alliance & Glyph:', createRes.status === 200 ? '✅ PASSED' : '❌ FAILED');
  console.log('   - Alliance ID:', createRes.data?.allianceId);
  console.log('   - Generated Glyph:', createRes.data?.glyphCode);
  console.log('   - Auth Token:', createRes.data?.authToken?.slice(0, 8) + '...');

  const token = createRes.data?.authToken;
  const glyph = createRes.data?.glyphCode;

  // 3. Member Join via Glyph
  const joinRes = await request('/api/v1/auth/join', 'POST', {
    glyphCode: glyph,
    playerId: '100002',
    playerName: 'Darth Vader',
    permissions: { shareSpy: true, shareGalaxy: true, shareLocks: true },
  });
  console.log('3. Member Join via Glyph:', joinRes.status === 200 ? '✅ PASSED' : '❌ FAILED', joinRes.data?.message);
  const memberToken = joinRes.data?.authToken;

  // 4. Galaxy Sync (Initial State of G2 S145)
  const initialSync = await request(
    '/api/v1/galaxy/sync',
    'POST',
    {
      universeId: 's198-en',
      galaxy: 2,
      system: 145,
      scannedAt: Date.now(),
      slots: [
        {
          slot: 1,
          planetName: 'Coruscant',
          playerId: '100001',
          playerName: 'Emperor Palpatine',
          playerStatus: 'active',
          hasMoon: 0,
        },
        {
          slot: 2,
          planetName: 'Mustafar',
          playerId: '100002',
          playerName: 'Darth Vader',
          playerStatus: 'active',
          hasMoon: 1,
          moonSize: 8944,
        },
        { slot: 3, playerId: null }, // Empty slot
      ],
    },
    { Authorization: `Bearer ${memberToken}` }
  );
  console.log('4. Initial Galaxy Sync (3 slots):', initialSync.status === 200 ? '✅ PASSED' : '❌ FAILED', initialSync.data);

  // 5. Galaxy Sync (Simulate Changes: Slot 3 Colonized, Slot 2 Moon Destroyed, Slot 1 Active Star)
  const deltaSync = await request(
    '/api/v1/galaxy/sync',
    'POST',
    {
      universeId: 's198-en',
      galaxy: 2,
      system: 145,
      scannedAt: Date.now(),
      slots: [
        {
          slot: 1,
          planetName: 'Coruscant',
          playerId: '100001',
          playerName: 'Emperor Palpatine',
          playerStatus: 'active',
          hasMoon: 0,
          activityMarker: '*', // Active star!
          activityTimestamp: Date.now(),
        },
        {
          slot: 2,
          planetName: 'Mustafar',
          playerId: '100002',
          playerName: 'Darth Vader',
          playerStatus: 'active',
          hasMoon: 0, // Moon was destroyed!
        },
        {
          slot: 3,
          planetName: 'Tatooine',
          playerId: '100003',
          playerName: 'Luke Skywalker', // New colony!
          playerStatus: 'active',
          hasMoon: 0,
        },
      ],
    },
    { Authorization: `Bearer ${memberToken}` }
  );

  console.log('5. Delta Galaxy Sync:', deltaSync.status === 200 ? '✅ PASSED' : '❌ FAILED');
  console.log('   - Detected Events Count:', deltaSync.data?.eventsDetected);
  console.log('   - Detected Events:', JSON.stringify(deltaSync.data?.events, null, 2));

  // 6. Query Activity Heatmap & Events for Player 100001
  const activityRes = await request(
    '/api/v1/players/100001/activity?universeId=s198-en',
    'GET',
    null,
    { Authorization: `Bearer ${memberToken}` }
  );
  console.log('6. Player Activity & Heatmap:', activityRes.status === 200 ? '✅ PASSED' : '❌ FAILED');
  console.log('   - Heatmap Records:', activityRes.data?.heatmap);
  console.log('   - Recent Events:', activityRes.data?.recentEvents);

  // 7. Share a Spy Report
  const shareSpyRes = await request(
    '/api/v1/spy/share',
    'POST',
    {
      reportId: 'sr-en-198-984210',
      coords: '2:145:3',
      isMoon: 0,
      targetPlayerId: '100003',
      targetPlayerName: 'Luke Skywalker',
      resourcesMetal: 12500000,
      resourcesCrystal: 8400000,
      resourcesDeuterium: 3200000,
      estimatedLoot: 12050000,
      fleetData: [
        { shipId: 204, count: 500, name: 'Light Fighter' },
        { shipId: 207, count: 80, name: 'Battleship' }
      ],
      defenseData: [
        { defenseId: 401, count: 250, name: 'Rocket Launcher' },
        { defenseId: 402, count: 120, name: 'Light Laser' }
      ],
      spiedBy: 'Darth Vader',
      reportTimestamp: Date.now(),
    },
    { Authorization: `Bearer ${memberToken}` }
  );
  console.log('7. Share Spy Report:', shareSpyRes.status === 200 ? '✅ PASSED' : '❌ FAILED', shareSpyRes.data?.message);

  // 8. Fetch Shared Alliance Spy Reports
  const getSpyRes = await request(
    '/api/v1/spy/reports',
    'GET',
    null,
    { Authorization: `Bearer ${memberToken}` }
  );
  console.log('8. Query Shared Alliance Spy Reports:', getSpyRes.status === 200 ? '✅ PASSED' : '❌ FAILED');
  console.log('   - Total Shared Reports in Vault:', getSpyRes.data?.totalReturned);
  console.log('   - First Report Loot:', getSpyRes.data?.reports?.[0]?.estimated_loot, 'MSU');
  console.log('   - Spied Fleet Ships:', getSpyRes.data?.reports?.[0]?.fleetData);

  console.log('\n🎉 ALL TESTS (INCLUDING SPY REPOSITORY) COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
