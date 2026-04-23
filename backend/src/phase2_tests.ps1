$BASE = "http://localhost:5000/api"
$pass = 0
$fail = 0
$TS   = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

function Hdr($T) {
    if ($T) { return @{ "Content-Type"="application/json"; "Authorization"="Bearer $T" } }
    return @{ "Content-Type"="application/json" }
}

function Test-API {
    param($Label, $Method, $Url, $Body, $Expect, $Token)
    try {
        $p = @{ Uri=$Url; Method=$Method; Headers=(Hdr $Token); ErrorAction="Stop" }
        if ($Body) { $p["Body"] = ($Body | ConvertTo-Json -Compress -Depth 5) }
        $r = Invoke-WebRequest @p; $got = [int]$r.StatusCode
    } catch { $got = [int]$_.Exception.Response.StatusCode.value__ }
    if ($got -eq $Expect) { Write-Host "  PASS  [$got] $Label"; $script:pass++ }
    else                  { Write-Host "  FAIL  [got:$got exp:$Expect] $Label"; $script:fail++ }
}

Write-Host "`n=== AUTH ==="
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"testadmin","password":"admin123"}'
$T = $login.data.token
Write-Host "  Logged in as Admin OK"

Write-Host "`n=== PREREQUISITES ==="
$h = Hdr $T
$pat = Invoke-RestMethod -Uri "$BASE/patients" -Method POST -Headers $h -Body ((@{firstName="P2";lastName="Test$TS";dateOfBirth="1990-01-01";gender="Female";contactInformation=@{phone="1234567890";email="p2$TS@test.com"}}) | ConvertTo-Json -Depth 3)
$PATId = $pat.data.id; Write-Host "  Patient ID=$PATId"

$doc = Invoke-RestMethod -Uri "$BASE/doctors" -Method POST -Headers $h -Body ((@{firstName="DocP2";lastName="Test$TS";specialization="General";email="doc2$TS@hosp.com";phone="9999999999";licenseNumber="LIC-P2-$TS"}) | ConvertTo-Json)
$DOCId = $doc.data.id; Write-Host "  Doctor ID=$DOCId"

$appt = Invoke-RestMethod -Uri "$BASE/appointments" -Method POST -Headers $h -Body ((@{patientId=$PATId;doctorId=$DOCId;appointmentDate="2026-04-10T10:00:00Z";appointmentType="Consultation";status="Scheduled"}) | ConvertTo-Json)
$APTId = $appt.data.id; Write-Host "  Appointment ID=$APTId"

$lo = Invoke-RestMethod -Uri "$BASE/lab-orders" -Method POST -Headers $h -Body ((@{patientId=$PATId;doctorId=$DOCId;testType="Blood Test";priority="Routine"}) | ConvertTo-Json)
$LOId = $lo.data.id; Write-Host "  LabOrder ID=$LOId"

# ════════════════════════════════════════════════════════════════════════════════
Write-Host "`n=== [1] JOI VALIDATION (req.body strip Unknown & constraints) ==="

Test-API "POST EncNote — Missing required field (400)" "POST" "$BASE/encounters" @{patientId=$PATId;doctorId=$DOCId;appointmentId=$APTId} 400 $T
Test-API "POST EncNote — chiefComplaint < 5 chars (400)" "POST" "$BASE/encounters" @{patientId=$PATId;doctorId=$DOCId;appointmentId=$APTId;encounterDate="2026-04-10";chiefComplaint="Bad";diagnosis="X";treatmentPlan="Rest"} 400 $T

# ════════════════════════════════════════════════════════════════════════════════
Write-Host "`n=== [2] DATABASE TRANSACTIONS (EncounterNote) ==="

# We send 'hackerField' to test Joi stripUnknown, and valid data for creation
$encBody = @{patientId=$PATId;doctorId=$DOCId;appointmentId=$APTId;encounterDate="2026-04-10T11:00:00Z";chiefComplaint="Valid illness";diagnosis="Flu";treatmentPlan="Rest 1 week";hackerField="dropped!"}
Test-API "POST EncNote — valid creation + stripUnknown (201)" "POST" "$BASE/encounters" $encBody 201 $T

# Verify appointment status was updated to 'Completed' atomically
$aptCheck = Invoke-RestMethod -Uri "$BASE/appointments/$APTId" -Method GET -Headers $h
if ($aptCheck.data.status -eq "Completed") { Write-Host "  PASS  [Txn] Appointment status auto-completed!" -ForegroundColor Green; $pass++ }
else { Write-Host "  FAIL  [Txn] Appointment status NOT completed" -ForegroundColor Red; $fail++ }

# Try creating a duplicate encounter note for same appointment (should trigger rollback)
Test-API "POST EncNote — Duplicate on same appt triggers rollback (409)" "POST" "$BASE/encounters" $encBody 409 $T

# ════════════════════════════════════════════════════════════════════════════════
Write-Host "`n=== [3] DATABASE TRANSACTIONS (LabResult) ==="

$lrBody = @{labOrderId=$LOId;resultValue="120";resultDate="2026-04-10T12:00:00Z";unit="mg/dL";status="Normal"}
$lr = Invoke-RestMethod -Uri "$BASE/lab-results" -Method POST -Headers $h -Body ($lrBody | ConvertTo-Json)
$LRId = $lr.data.id; Write-Host "  Seeded LabResult ID=$LRId"

# Verify lab order was set to Completed
$loCheck = Invoke-RestMethod -Uri "$BASE/lab-orders/$LOId" -Method GET -Headers $h
if ($loCheck.data.status -eq "Completed") { Write-Host "  PASS  [Txn] LabOrder auto-completed!" -ForegroundColor Green; $pass++ }
else { Write-Host "  FAIL  [Txn] LabOrder NOT completed" -ForegroundColor Red; $fail++ }

# Test DELETE rollback logic
Test-API "DELETE LabResult — successful delete (200)" "DELETE" "$BASE/lab-results/$LRId" $null 200 $T

# Verify lab order reverted to In Progress
$loCheck2 = Invoke-RestMethod -Uri "$BASE/lab-orders/$LOId" -Method GET -Headers $h
if ($loCheck2.data.status -eq "In Progress") { Write-Host "  PASS  [Txn] LabOrder reverted to In Progress!" -ForegroundColor Green; $pass++ }
else { Write-Host "  FAIL  [Txn] LabOrder did NOT revert" -ForegroundColor Red; $fail++ }

# ────────────────────────────────────────────────────────────────────────────────
Write-Host "`n=========================================="
Write-Host "  PHASE 2 TEST RESULTS"
Write-Host "  PASSED: $pass"
Write-Host "  FAILED: $fail"
Write-Host "=========================================="
if ($fail -eq 0) { Write-Host "  LEVEL 3 COMPLETE - Phase 2 API tests passed!" }
else             { Write-Host "  LEVEL 3 INCOMPLETE - $fail test(s) failed" }
Write-Host ""
