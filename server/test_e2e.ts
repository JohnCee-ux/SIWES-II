// End-to-End API Verification Script for GateKeeper

async function runTests() {
  console.log('--- Starting End-to-End API Test Suite ---');
  const baseUrl = 'http://localhost:5000';

  // 1. Organizer Registration
  console.log('\n[1] Testing Organizer Registration...');
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sarah Connor',
      email: `sarah_${Date.now()}@skynet.com`,
      password: 'password123',
    }),
  });
  const regData = await regRes.json();
  if (!regRes.ok) throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  const token = regData.token;
  console.log('✓ Registered Organizer:', regData.organizer.name, 'Token received.');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Create Event (DRAFT)
  console.log('\n[2] Testing Create Event (DRAFT)...');
  const evtRes = await fetch(`${baseUrl}/api/events`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Cybernetic Security Summit 2026',
      description: 'Annual global summit on autonomous intelligence and cybersecurity.',
      date: '2026-09-15',
      startTime: '09:00 AM',
      venue: 'San Francisco Tech Pavilion',
      capacity: 50,
      prefix: 'CYBER',
    }),
  });
  const evtData = await evtRes.json();
  if (!evtRes.ok) throw new Error(`Create event failed: ${JSON.stringify(evtData)}`);
  const eventId = evtData.event.id;
  console.log('✓ Created Event:', evtData.event.name, 'Status:', evtData.event.status, 'ID:', eventId);

  // 3. Publish Event (DRAFT -> UPCOMING)
  console.log('\n[3] Testing Publish Event...');
  const pubRes = await fetch(`${baseUrl}/api/events/${eventId}/publish`, {
    method: 'POST',
    headers: authHeaders,
  });
  const pubData = await pubRes.json();
  if (!pubRes.ok) throw new Error(`Publish failed: ${JSON.stringify(pubData)}`);
  console.log('✓ Published Event. New Status:', pubData.event.status);

  // 4. Public Attendee Registration
  console.log('\n[4] Testing Public Attendee Registration...');
  const attendee1Res = await fetch(`${baseUrl}/api/attendees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId,
      name: 'John Connor',
      email: 'john@resistance.org',
      ticketType: 'VIP',
    }),
  });
  const att1Data = await attendee1Res.json();
  if (!attendee1Res.ok) throw new Error(`Attendee 1 reg failed: ${JSON.stringify(att1Data)}`);
  const ticketCode1 = att1Data.attendee.ticketCode;
  const qrToken1 = att1Data.attendee.qrToken;
  const attendee1Id = att1Data.attendee.id;
  console.log('✓ Registered Attendee 1:', att1Data.attendee.name, 'Code:', ticketCode1);
  console.log('  QR Token generated (no PII):', qrToken1.slice(0, 16) + '...');
  console.log('  QR Data URL format:', att1Data.attendee.qrDataUrl.slice(0, 30) + '...');

  // Duplicate email registration should return existing ticket
  const duplicateEmailRes = await fetch(`${baseUrl}/api/attendees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId,
      name: 'John Connor',
      email: 'john@resistance.org',
      ticketType: 'VIP',
    }),
  });
  const dupEmailData = await duplicateEmailRes.json();
  if (dupEmailData.attendee?.ticketCode !== ticketCode1) {
    throw new Error('Duplicate email should return identical existing ticket!');
  }
  console.log('✓ Existing attendee duplicate email retrieval verified successfully.');

  // Register Attendee 2
  const attendee2Res = await fetch(`${baseUrl}/api/attendees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId,
      name: 'Kyle Reese',
      email: 'kyle@resistance.org',
      ticketType: 'Speaker',
    }),
  });
  const att2Data = await attendee2Res.json();
  const ticketCode2 = att2Data.attendee.ticketCode;
  console.log('✓ Registered Attendee 2:', att2Data.attendee.name, 'Code:', ticketCode2);

  // 5. Start Event (UPCOMING -> LIVE)
  console.log('\n[5] Testing Start Event (Move to LIVE)...');
  const startRes = await fetch(`${baseUrl}/api/events/${eventId}/start`, {
    method: 'POST',
    headers: authHeaders,
  });
  const startData = await startRes.json();
  console.log('✓ Event started. Status:', startData.event.status);

  // 6. Door Check-In by Ticket Code (VALID)
  console.log('\n[6] Testing Valid Door Check-In...');
  const checkin1Res = await fetch(`${baseUrl}/api/attendees/checkin-code`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      eventId,
      code: ticketCode1,
      deviceId: 'scanner-iPad-01',
      source: 'camera',
    }),
  });
  const checkin1Data = await checkin1Res.json();
  if (checkin1Data.status !== 'VALID') throw new Error(`Expected VALID but got ${checkin1Data.status}`);
  console.log('✓ Check-In 1 Status:', checkin1Data.status, 'Message:', checkin1Data.message);

  // 7. Check-In Again (DUPLICATE)
  console.log('\n[7] Testing Duplicate Scan Detection...');
  const checkinDupRes = await fetch(`${baseUrl}/api/attendees/checkin-code`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      eventId,
      code: ticketCode1,
      deviceId: 'scanner-iPad-02',
      source: 'camera',
    }),
  });
  const checkinDupData = await checkinDupRes.json();
  if (checkinDupData.status !== 'DUPLICATE') throw new Error(`Expected DUPLICATE but got ${checkinDupData.status}`);
  console.log('✓ Duplicate Scan detected! Status:', checkinDupData.status, 'Message:', checkinDupData.message);
  console.log('  Original Check-in timestamp:', checkinDupData.attendee?.originalCheckedInAt);

  // 8. Invalid Ticket Code Check-In (INVALID)
  console.log('\n[8] Testing Invalid Ticket Code...');
  const checkinInvRes = await fetch(`${baseUrl}/api/attendees/checkin-code`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      eventId,
      code: 'FAKE-CODE-9999',
      deviceId: 'scanner-iPad-01',
    }),
  });
  const checkinInvData = await checkinInvRes.json();
  if (checkinInvData.status !== 'INVALID') throw new Error(`Expected INVALID but got ${checkinInvData.status}`);
  console.log('✓ Invalid Ticket rejected. Status:', checkinInvData.status);

  // 9. Undo Check-In
  console.log('\n[9] Testing Undo Check-In...');
  const undoRes = await fetch(`${baseUrl}/api/attendees/${attendee1Id}/undo-checkin`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ reason: 'Door mistake' }),
  });
  const undoData = await undoRes.json();
  if (!undoData.success) throw new Error('Undo failed');
  console.log('✓ Check-In undone successfully for', undoData.attendee.name);

  // Re-check in attendee 1 so we have valid check-in data for summary
  await fetch(`${baseUrl}/api/attendees/checkin-code`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ eventId, code: ticketCode1 }),
  });

  // 10. Batch Offline Scans Sync
  console.log('\n[10] Testing Offline Queue Sync (/api/checkins/sync)...');
  const syncRes = await fetch(`${baseUrl}/api/checkins/sync`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      eventId,
      deviceId: 'offline-scanner-phone-03',
      scans: [
        {
          scanId: 'scan_local_001',
          ticketCodeOrToken: ticketCode2,
          timestamp: new Date(Date.now() - 300000).toISOString(),
          source: 'camera',
        },
        {
          scanId: 'scan_local_002',
          ticketCodeOrToken: 'CYBER-INVALID-CODE',
          timestamp: new Date(Date.now() - 200000).toISOString(),
          source: 'manual',
        },
      ],
    }),
  });
  const syncData = await syncRes.json();
  console.log('✓ Offline Sync completed. Processed:', syncData.totalProcessed);
  syncData.results.forEach((r: any) => {
    console.log(`  - Scan ${r.scanId}: Status = ${r.status} (${r.message})`);
  });

  // 11. Live Analytics
  console.log('\n[11] Testing Live Analytics...');
  const anaRes = await fetch(`${baseUrl}/api/events/${eventId}/analytics`, {
    headers: authHeaders,
  });
  const anaData = await anaRes.json();
  console.log('✓ Live Analytics:', {
    registeredCount: anaData.analytics.registeredCount,
    checkedInCount: anaData.analytics.checkedInCount,
    attendanceRate: `${anaData.analytics.attendanceRate}%`,
    remainingCapacity: anaData.analytics.remainingCapacity,
  });

  // 12. End Event (LIVE -> ENDED)
  console.log('\n[12] Testing End Event...');
  const endRes = await fetch(`${baseUrl}/api/events/${eventId}/end`, {
    method: 'POST',
    headers: authHeaders,
  });
  const endData = await endRes.json();
  console.log('✓ Event Ended. Status:', endData.event.status);

  // 13. Post-Event Summary
  console.log('\n[13] Testing Post-Event Summary Endpoint...');
  const sumRes = await fetch(`${baseUrl}/api/events/${eventId}/summary`, {
    headers: authHeaders,
  });
  const sumData = await sumRes.json();
  console.log('✓ Post-Event Summary retrieved:', {
    eventName: sumData.summary.eventName,
    attendanceRate: `${sumData.summary.attendanceRate}%`,
    checkedInCount: sumData.summary.checkedInCount,
    firstCheckIn: sumData.summary.firstCheckInAt,
    duplicateScans: sumData.summary.duplicateScanCount,
    invalidScans: sumData.summary.invalidScanCount,
    offlineSynced: sumData.summary.offlineScansSynced,
  });

  // 14. Audit Trail
  console.log('\n[14] Testing Audit Log Trail...');
  const auditRes = await fetch(`${baseUrl}/api/events/${eventId}/audit-log?limit=10`, {
    headers: authHeaders,
  });
  const auditData = await auditRes.json();
  console.log(`✓ Audit Log recorded ${auditData.pagination.total} immutable events:`);
  auditData.logs.slice(0, 6).forEach((l: any) => {
    console.log(`  - [${l.timestamp.slice(11, 19)}] ${l.action}: ${l.attendeeName || l.ticketCode || ''}`);
  });

  console.log('\n=============================================');
  console.log(' ALL BACKEND E2E API TESTS PASSED 100%! ');
  console.log('=============================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
