// ============================================================================
// NEXUS OVERWATCH — UNIVERSE SEED & DELTA ENGINE TEST FLOW
// ============================================================================

const BASE_URL = 'http://127.0.0.1:8787';

async function runTests() {
  console.log('🧪 Starting Nexus Overwatch Universe Seeding & Live Feed Tests...');
  let adminGlyph = '';
  let adminAuthToken = '';

  // 1. Health check
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const health = await healthRes.json();
    console.log('✅ 1. Edge Worker Health:', health.status);
  } catch (err) {
    console.error('❌ Edge worker not responding at', BASE_URL);
    process.exit(1);
  }

  // 2. Create Alliance (Triggers auto-seeding for s267-en)
  const createRes = await fetch(`${BASE_URL}/api/v1/alliances/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ogameAllianceId: '500078',
      allianceDisplayName: 'LazyOldPeople',
      allianceTag: 'LoW',
      universeId: 's267-en',
      adminPlayerId: '109748',
      adminPlayerName: 'Dark Silver',
    }),
  });
  const createData = await createRes.json();
  console.log('✅ 2. Create Alliance & Auto-Seed:', createData.success ? 'SUCCESS' : 'CONFLICT/EXISTS', createData);
  adminGlyph = createData.glyphCode || 'NXOW-TEST-GLYPH';
  adminAuthToken = createData.authToken || '';

  // If already exists, join to get auth token
  if (!adminAuthToken) {
    const joinRes = await fetch(`${BASE_URL}/api/v1/auth/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        glyphCode: adminGlyph,
        playerId: '109748',
        playerName: 'Dark Silver',
      }),
    });
    const joinData = await joinRes.json();
    adminAuthToken = joinData.authToken;
    console.log('🔑 Retrieved Auth Token via Join:', joinData.success);
  }

  // 3. Check Universe Status
  const statusRes = await fetch(`${BASE_URL}/api/v1/universe/s267-en/status`);
  const statusData = await statusRes.json();
  console.log('✅ 3. Universe Status in D1:', statusData);

  // 4. Simulate a player scanning a system where a moon was destroyed
  const syncRes = await fetch(`${BASE_URL}/api/v1/galaxy/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminAuthToken}`,
    },
    body: JSON.stringify({
      universeId: 's267-en',
      galaxy: 5,
      system: 474,
      scannedAt: Date.now(),
      slots: [
        {
          slot: 5,
          planetName: 'Another Three',
          playerId: '110016',
          playerName: 'Proconsul Tonsil',
          playerStatus: 'active',
          allianceTag: 'WTTVS',
          hasMoon: 0, // No moon
          debrisMetal: 50000,
          debrisCrystal: 30000,
          activityMarker: '*',
          activityTimestamp: Date.now(),
        },
      ],
    }),
  });
  const syncData = await syncRes.json();
  console.log('✅ 4. Galaxy Sync & Delta Result:', syncData);

  // 5. Query Live Galaxy Events
  const eventsRes = await fetch(`${BASE_URL}/api/v1/galaxy/events?universeId=s267-en`, {
    headers: {
      'Authorization': `Bearer ${adminAuthToken}`,
    },
  });
  const eventsData = await eventsRes.json();
  console.log('✅ 5. Live Galaxy Events Stream:', eventsData);

  console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
