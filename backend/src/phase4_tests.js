// Native node fetch will be used

const B = 'http://localhost:5000';
const ts = Date.now();

(async () => {
    try {
        console.log("=== PHASE 4: PATIENT PORTAL VERIFICATION START ===");
        
        // 1. Staff Setup
        const login = await (await fetch(B+'/api/auth/login', {method:'POST', body:JSON.stringify({username:'testadmin',password:'admin123'}), headers:{'Content-Type':'application/json'}})).json();
        const staffToken = login.data?.token;
        const sh = { 'Content-Type':'application/json', 'Authorization':'Bearer ' + staffToken };

        const pat = await (await fetch(B+'/api/patients', {method:'POST', headers:sh, body:JSON.stringify({firstName:'Portal',lastName:'Patient',dateOfBirth:'1990-01-01',gender:'Female',contactInformation:{email:`portal${ts}@x.com`, phone:"123"}})})).json();
        if(!pat.success) throw new Error("Could not create patient: " + JSON.stringify(pat));
        const PID = pat.data.id;
        console.log(`✅ [Staff] Registered Patient ID: ${PID}`);

        // 2. Patient Register (Portal)
        const portalReg = await (await fetch(B+'/portal/auth/register', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({patientId: PID, email: `portal${ts}@x.com`, password: 'PatientPasswordV2'})})).json();
        console.log(`✅ [Portal] Patient Registration:`, portalReg.success ? 'Success' : 'Failed');
        if(!portalReg.success) throw new Error("Portal Reg failed");

        // 3. Patient Login (Portal)
        const portalLog = await (await fetch(B+'/portal/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email: `portal${ts}@x.com`, password: 'PatientPasswordV2'})})).json();
        console.log(`✅ [Portal] Patient Login:`, portalLog.success ? 'Success' : 'Failed');
        if(!portalLog.success) throw new Error("Portal Login failed");
        
        const ptToken = portalLog.data.token;
        const ph = { 'Content-Type':'application/json', 'Authorization':'Bearer ' + ptToken };

        // 4. Test Scoping & Isolation
        const myPrefs = await (await fetch(B+'/portal/preferences', {headers: ph})).json();
        console.log(`✅ [Portal] Patient fetched preferences:`, myPrefs.success ? 'Success' : 'Failed');

        const tryStaff = await (await fetch(B+'/api/patients', {headers: ph})).json();
        console.log(`🛡️  [Security] Patient attempted to fetch Staff route (/api/patients). Result:`, tryStaff.message);
        if(tryStaff.success) throw new Error("Security Breach! Patient accessed staff route");

        const staffTryPortal = await (await fetch(B+'/portal/records/summary', {headers: sh})).json();
        console.log(`🛡️  [Security] Staff attempted to fetch Patient route (/portal/records/summary). Result:`, staffTryPortal.message);
        if(staffTryPortal.success) throw new Error("Security Breach! Staff accessed patient route using wrong token scope");

        console.log("\n🎉 Phase 4 Verification Complete! Portal Auth logic and Isolation is heavily secured!");

    } catch (e) {
        console.error("Test Failed:", e.message || e);
    }
})();
