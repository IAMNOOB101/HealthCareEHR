$BASE = "http://localhost:5000/api"
$pass = 0
$fail = 0
$TS   = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()   # unique suffix per run

function Hdr($T) {
    $h = @{ "Content-Type" = "application/json" }
    if ($T) { $h["Authorization"] = "Bearer $T" }
    return $h
}
function Test-API {
    param($Label, $Method, $Url, $Body, $Expect, $Token)
    try {
        $p = @{ Uri=$Url; Method=$Method; Headers=(Hdr $Token); ErrorAction="Stop" }
        if ($Body) { $p["Body"] = ($Body | ConvertTo-Json -Compress -Depth 5) }
        $r = Invoke-WebRequest @p
        $got = [int]$r.StatusCode
    } catch { $got = [int]$_.Exception.Response.StatusCode.value__ }
    if ($got -eq $Expect) { Write-Host "  PASS  [$got] $Label"; $script:pass++ }
    else                  { Write-Host "  FAIL  [got:$got exp:$Expect] $Label"; $script:fail++ }
}

# ── AUTH ────────────────────────────────────────────────────────────────────────
Write-Host "`n=== AUTH ==="
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"testadmin","password":"admin123"}'
$T = $login.data.token
Write-Host "  Logged in as Admin - OK"

# ── UNIQUE PREREQUISITES  ────────────────────────────────────────────────────────
Write-Host "`n=== PREREQUISITES (unique per run: ts=$TS) ==="
$h = Hdr $T

$pat = Invoke-RestMethod -Uri "$BASE/patients" -Method POST -Headers $h `
       -Body ((@{firstName="PhaseOne";lastName="Test$TS";dateOfBirth="1990-01-01";gender="Female";contactInformation=@{phone="1234567890";email="p$TS@test.com"}}) | ConvertTo-Json -Depth 3)
$PAT_ID = $pat.data.id;  Write-Host "  Patient   ID=$PAT_ID"

$doc = Invoke-RestMethod -Uri "$BASE/doctors"  -Method POST -Headers $h `
       -Body ((@{firstName="Phase1";lastName="Doctor$TS";specialization="Radiology";email="doc$TS@hosp.com";phone="9999999999";licenseNumber="LIC-$TS"}) | ConvertTo-Json)
$DOC_ID = $doc.data.id;  Write-Host "  Doctor    ID=$DOC_ID"

$med = Invoke-RestMethod -Uri "$BASE/medications" -Method POST -Headers $h `
       -Body ((@{medicationName="Amox$TS";dosage="500mg";instructions="With food";category="Antibiotic";contraindications=@("Ibuprofen")}) | ConvertTo-Json)
$MED_ID = $med.data.id;  Write-Host "  Medication ID=$MED_ID"

$rx = Invoke-RestMethod -Uri "$BASE/prescriptions" -Method POST -Headers $h `
      -Body ((@{patientId=$PAT_ID;doctorId=$DOC_ID;medicationId=$MED_ID;prescriptionDate="2026-04-10";dosage="500mg";frequency="Twice daily";duration="7 days"}) | ConvertTo-Json)
$RX_ID = $rx.data.id;  Write-Host "  Prescription ID=$RX_ID"

if (-not ($PAT_ID -and $DOC_ID -and $MED_ID -and $RX_ID)) {
    Write-Host "  FATAL: Prerequisites failed - cannot continue"; exit 1
}

# ════════════════════════════════════════════════════════════════════════════════
Write-Host "`n=== [1 of 3] IMAGING ORDERS ==="

$io = Invoke-RestMethod -Uri "$BASE/imaging-orders" -Method POST -Headers $h `
      -Body ((@{patientId=$PAT_ID;doctorId=$DOC_ID;imagingType="X-Ray";bodyPart="Chest";priority="Urgent";clinicalReason="Test"}) | ConvertTo-Json)
$IO_ID = $io.data.id;  Write-Host "  Seeded imaging order ID=$IO_ID"

Test-API "POST  create valid MRI (201)"              "POST"   "$BASE/imaging-orders" @{patientId=$PAT_ID;doctorId=$DOC_ID;imagingType="MRI";bodyPart="Brain";priority="STAT"} 201 $T
Test-API "POST  missing bodyPart (400)"              "POST"   "$BASE/imaging-orders" @{patientId=$PAT_ID;doctorId=$DOC_ID;imagingType="X-Ray"} 400 $T
Test-API "POST  bad imagingType 'Blood Test' (400)"  "POST"   "$BASE/imaging-orders" @{patientId=$PAT_ID;doctorId=$DOC_ID;imagingType="Blood Test";bodyPart="Arm"} 400 $T
Test-API "POST  bad priority 'Low' (400)"            "POST"   "$BASE/imaging-orders" @{patientId=$PAT_ID;doctorId=$DOC_ID;imagingType="MRI";bodyPart="Knee";priority="Low"} 400 $T
Test-API "POST  non-existent patient (404)"          "POST"   "$BASE/imaging-orders" @{patientId=99999;doctorId=$DOC_ID;imagingType="CT Scan";bodyPart="Chest"} 404 $T
Test-API "GET   list all (200)"                      "GET"    "$BASE/imaging-orders" $null 200 $T
Test-API "GET   by patient (200)"                    "GET"    "$BASE/imaging-orders/patient/$PAT_ID" $null 200 $T
Test-API "GET   by doctor (200)"                     "GET"    "$BASE/imaging-orders/doctor/$DOC_ID"  $null 200 $T
Test-API "GET   by ID (200)"                         "GET"    "$BASE/imaging-orders/$IO_ID" $null 200 $T
Test-API "GET   not found (404)"                     "GET"    "$BASE/imaging-orders/99999" $null 404 $T
Test-API "PUT   update to In Progress (200)"         "PUT"    "$BASE/imaging-orders/$IO_ID" @{status="In Progress"} 200 $T
Test-API "DELETE soft cancel (200)"                  "DELETE" "$BASE/imaging-orders/$IO_ID" $null 200 $T
Test-API "DELETE already cancelled (400)"            "DELETE" "$BASE/imaging-orders/$IO_ID" $null 400 $T
Test-API "GET   no token (401)"                      "GET"    "$BASE/imaging-orders" $null 401 $null

# ════════════════════════════════════════════════════════════════════════════════
Write-Host "`n=== [2 of 3] MAR ==="

$mar = Invoke-RestMethod -Uri "$BASE/mar" -Method POST -Headers $h `
       -Body ((@{patientId=$PAT_ID;prescriptionId=$RX_ID;medicationId=$MED_ID;scheduledAt="2026-04-10T08:00:00Z";administeredAt="2026-04-10T08:05:00Z";dose="500mg";route="Oral";status="Given"}) | ConvertTo-Json)
$MAR_ID = $mar.data.id;  Write-Host "  Seeded MAR entry ID=$MAR_ID"

Test-API "POST  valid Given dose (201)"              "POST"   "$BASE/mar" @{patientId=$PAT_ID;prescriptionId=$RX_ID;medicationId=$MED_ID;scheduledAt="2026-04-10T10:00:00Z";dose="500mg";route="Oral";status="Given"} 201 $T
Test-API "POST  Missed WITH notes (201)"             "POST"   "$BASE/mar" @{patientId=$PAT_ID;prescriptionId=$RX_ID;medicationId=$MED_ID;scheduledAt="2026-04-10T20:00:00Z";dose="500mg";route="Oral";status="Missed";notes="Patient asleep"} 201 $T
Test-API "POST  Missed WITHOUT notes (400)"          "POST"   "$BASE/mar" @{patientId=$PAT_ID;prescriptionId=$RX_ID;medicationId=$MED_ID;scheduledAt="2026-04-10T22:00:00Z";dose="500mg";route="Oral";status="Missed"} 400 $T
Test-API "POST  invalid route 'Smoke' (400)"         "POST"   "$BASE/mar" @{patientId=$PAT_ID;prescriptionId=$RX_ID;medicationId=$MED_ID;scheduledAt="2026-04-10T12:00:00Z";dose="500mg";route="Smoke";status="Given"} 400 $T
Test-API "POST  missing dose field (400)"            "POST"   "$BASE/mar" @{patientId=$PAT_ID;prescriptionId=$RX_ID;medicationId=$MED_ID;scheduledAt="2026-04-10T12:00:00Z";route="Oral"} 400 $T
Test-API "GET   list all (200)"                      "GET"    "$BASE/mar" $null 200 $T
Test-API "GET   missed doses view (200)"             "GET"    "$BASE/mar/missed" $null 200 $T
Test-API "GET   by patient (200)"                    "GET"    "$BASE/mar/patient/$PAT_ID" $null 200 $T
Test-API "GET   by prescription (200)"               "GET"    "$BASE/mar/prescription/$RX_ID" $null 200 $T
Test-API "GET   by ID (200)"                         "GET"    "$BASE/mar/$MAR_ID" $null 200 $T
Test-API "GET   not found (404)"                     "GET"    "$BASE/mar/99999" $null 404 $T
Test-API "PUT   update notes (200)"                  "PUT"    "$BASE/mar/$MAR_ID" @{notes="Updated in test"} 200 $T
Test-API "GET   no token (401)"                      "GET"    "$BASE/mar" $null 401 $null

# ════════════════════════════════════════════════════════════════════════════════
Write-Host "`n=== [3 of 3] MEDICATION RECONCILIATION ==="

$mBefore = @(@{medicationName="Amox$TS";dosage="500mg";frequency="Once daily";source="self-reported"},@{medicationName="Ibuprofen";dosage="400mg";frequency="As needed";source="self-reported"})
$rec = Invoke-RestMethod -Uri "$BASE/medication-reconciliation" -Method POST -Headers $h `
       -Body ((@{patientId=$PAT_ID;reconciledAt="2026-04-10T09:00:00Z";medicationsBefore=$mBefore}) | ConvertTo-Json -Depth 5)
$REC_ID = $rec.data.id
Write-Host "  Reconciliation ID=$REC_ID  Discrepancies=$($rec.summary.totalDiscrepancies)"

Test-API "POST  valid new list (201)"                "POST" "$BASE/medication-reconciliation" @{patientId=$PAT_ID;reconciledAt="2026-04-10T10:00:00Z";medicationsBefore=@(@{medicationName="Lisinopril";dosage="10mg";frequency="Daily";source="self-reported"})} 201 $T
Test-API "POST  missing reconciledAt (400)"          "POST" "$BASE/medication-reconciliation" @{patientId=$PAT_ID;medicationsBefore=@()} 400 $T
Test-API "POST  medicationsBefore not array (400)"   "POST" "$BASE/medication-reconciliation" @{patientId=$PAT_ID;reconciledAt="2026-04-10T10:00:00Z";medicationsBefore="bad"} 400 $T
Test-API "POST  non-existent patient (404)"          "POST" "$BASE/medication-reconciliation" @{patientId=99999;reconciledAt="2026-04-10T10:00:00Z";medicationsBefore=@()} 404 $T
Test-API "GET   list all (200)"                      "GET"  "$BASE/medication-reconciliation" $null 200 $T
Test-API "GET   by patient (200)"                    "GET"  "$BASE/medication-reconciliation/patient/$PAT_ID" $null 200 $T
Test-API "GET   by ID (200)"                         "GET"  "$BASE/medication-reconciliation/$REC_ID" $null 200 $T
Test-API "GET   not found (404)"                     "GET"  "$BASE/medication-reconciliation/99999" $null 404 $T
Test-API "PUT   mark Reviewed (200)"                 "PUT"  "$BASE/medication-reconciliation/$REC_ID" @{status="Reviewed";notes="All issues reviewed"} 200 $T
Test-API "PUT   mark Completed (200)"                "PUT"  "$BASE/medication-reconciliation/$REC_ID" @{status="Completed"} 200 $T
Test-API "PUT   edit after Completed (400)"          "PUT"  "$BASE/medication-reconciliation/$REC_ID" @{notes="Editing completed record"} 400 $T
Test-API "GET   no token (401)"                      "GET"  "$BASE/medication-reconciliation" $null 401 $null

# ── RESULTS ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=========================================="
Write-Host "  PHASE 1 TEST RESULTS"
Write-Host "  PASSED: $pass"
Write-Host "  FAILED: $fail"
Write-Host "=========================================="
if ($fail -eq 0) { Write-Host "  ALL PHASE 1 TESTS PASSED - ready to commit!" }
else             { Write-Host "  $fail test(s) FAILED - check output above" }
Write-Host ""
