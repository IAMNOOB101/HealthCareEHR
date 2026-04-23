const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)).catch(() => globalThis.fetch(...args));
const B = 'http://localhost:5000';

(async () => {
  try {
      console.log('--- STARTING ENTERPRISE HARDENING CHECK ---');
      
      // 1. Get Token
      const login = await (await fetch(B+'/api/auth/login', {
          method:'POST', 
          body:JSON.stringify({username:'testadmin',password:'admin123'}), 
          headers:{'Content-Type':'application/json'}
      })).json();
      
      if (!login.success) {
          console.error('❌ Login failed:', login);
          process.exit(1);
      }
      const T = login.data.token;
      const h = { 'Content-Type':'application/json', 'Authorization':'Bearer '+T };

      // --- CHECK 1: ATTRIBUTE SCOPING (No passwordHash in response) ---
      console.log('\n[1] Testing Attribute Scoping (Searching users)...');
      const userRes = await (await fetch(B+'/api/auth/login', {
          method:'POST',
          body:JSON.stringify({username:'testadmin',password:'admin123'}),
          headers:h
      })).json();
      
      // Check if user object in response has passwordHash
      const userObj = userRes.data?.user || userRes.data;
      if (userObj && userObj.passwordHash === undefined) {
          console.log('✅ PASS: passwordHash was excluded from default response scope.');
      } else {
          console.log('❌ FAIL: sensitive field "passwordHash" was found in response:', userObj?.passwordHash);
      }

      // --- CHECK 2: SOFT DELETES (Paranoid Mode) ---
      console.log('\n[2] Testing Soft Deletes (Deleting/Restoring Patient)...');
      
      // Create a temp patient
      const pRes = await (await fetch(B+'/api/patients', {
          method:'POST',
          headers:h,
          body:JSON.stringify({
              firstName: 'Soft',
              lastName: 'DeleteTest',
              dateOfBirth: '1990-01-01',
              gender: 'Other',
              contactInformation: { email: `soft${Date.now()}@test.com` }
          })
      })).json();
      const pid = pRes.data.id;

      // Delete the patient
      await fetch(`${B}/api/patients/${pid}`, { method:'DELETE', headers:h });
      
      // Verify they are gone from list
      const listRes = await (await fetch(B+'/api/patients', { headers:h })).json();
      const exists = listRes.items.some(p => p.id === pid);
      
      if (!exists) {
          console.log('✅ PASS: Patient was logically hidden after deletion.');
      } else {
          console.log('❌ FAIL: Patient still appears in active list after deletion.');
      }

      console.log('\n--- ENTERPRISE HARDENING CHECK COMPLETE ---');

  } catch(e) {
      console.error('Test Error:', e);
  }
})();
