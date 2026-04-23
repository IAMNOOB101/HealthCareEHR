
const B = 'http://localhost:5000';

async function verify() {
    console.log("--- CLINICAL RELIABILITY VERIFICATION ---");

    // 0. Login as Admin
    console.log("[0] Logging in as Admin...");
    const loginRes = await fetch(`${B}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'adminpassword' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) {
        throw new Error("Login failed: " + loginData.message);
    }
    const token = loginData.data.token;
    const h = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // 1. Test Appointment Overlap
    console.log("\n[1] Testing Appointment Overlap (+/- 15 mins)...");
    const date = new Date();
    date.setHours(date.getHours() + 3); // 3 hours from now
    const targetDate = date.toISOString();

    console.log(`Booking 1 at ${targetDate}...`);
    const res1 = await fetch(`${B}/api/appointments`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
            patientId: 1,
            doctorId: 1,
            appointmentDate: targetDate,
            appointmentType: 'Consultation'
        })
    });
    console.log("Response 1 Status:", res1.status);

    date.setMinutes(date.getMinutes() + 5);
    const overlapDate = date.toISOString();
    console.log(`Booking 2 (Overlap) at ${overlapDate}...`);
    const res2 = await fetch(`${B}/api/appointments`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
            patientId: 1,
            doctorId: 1,
            appointmentDate: overlapDate,
            appointmentType: 'Follow-up'
        })
    });
    if (res2.status === 409) {
        console.log("✅ PASS: Overlap rejected with 409 Conflict");
    } else {
        console.log("❌ FAIL: Overlap check failed. Status:", res2.status);
    }

    // 2. Test MAR Duplicate Prevention
    console.log("\n[2] Testing MAR Duplicate Administration Prevention...");
    const marPayload = {
        patientId: 1,
        prescriptionId: 1,
        medicationId: 1,
        scheduledAt: '2026-04-11T12:00:00.000Z',
        dose: '10mg',
        route: 'Oral',
        status: 'Given'
    };
    
    console.log("Recording Dose 1...");
    const marRes1 = await fetch(`${B}/api/mar`, { method: 'POST', headers: h, body: JSON.stringify(marPayload) });
    console.log("MAR 1 Response Status:", marRes1.status);

    console.log("Recording Dose 2 (Duplicate)...");
    const marRes2 = await fetch(`${B}/api/mar`, { method: 'POST', headers: h, body: JSON.stringify(marPayload) });
    if (marRes2.status === 409) {
        const d2 = await marRes2.json();
        console.log("✅ PASS: Duplicate administration blocked with 409 Conflict. Message:", d2.message);
    } else {
        console.log("❌ FAIL: MAR duplicate allowed. Status:", marRes2.status);
    }

    // 3. Test Audit Payload
    console.log("\n[3] Testing Audit Log Payload Capture...");
    const auditRes = await fetch(`${B}/api/audit-logs`, { headers: h });
    const auditData = await auditRes.json();
    const lastLog = auditData.items[0];
    if (lastLog && lastLog.details && lastLog.details.payload) {
         console.log("✅ PASS: Audit log contains payload capture.");
    } else {
         console.log("❌ FAIL: Audit log details missing payload data.");
    }
}

verify().catch(console.error);
