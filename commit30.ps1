Write-Host "Starting individual commits for Admin & Catalog Management features..." -ForegroundColor Blue

# 1. Medications UI (Admin Catalog & Page Rendering Fixes)
git add frontend/src/pages/Medications.jsx
git commit -m "feat(admin): implement drug catalog management and fix page rendering"

# 2. Medications Logic (Thunks & State Restoration)
git add frontend/src/store/slices/medicationsSlice.js
git commit -m "feat(meds): add createMedication thunk and restore catalog fetching"

# 3. Appointments (Pagination & Badge Styling)
git add frontend/src/pages/Appointments.jsx
git commit -m "feat(appt): add pagination and customize type badge colors"

# 4. Documentation (Pagination)
git add frontend/src/pages/Documentation.jsx
git commit -m "feat(doc): implement pagination for encounters and progress notes"

# 5. UI Core (Input Component Enhancement)
git add frontend/src/components/ui/index.jsx
git commit -m "feat(ui): enhance Input component with rightElement support"

# 6. Staff Management (Password Visibility)
git add frontend/src/pages/Doctors.jsx
git commit -m "feat(staff): add password visibility toggle for doctor login creation"

# 7. Patient Management (Password Visibility)
git add frontend/src/pages/PatientsList.jsx
git commit -m "feat(patient): add password visibility toggle for patient portal creation"

# 8. Auth UI (Universal Sign-in Refinement)
git add frontend/src/pages/Login.jsx
git commit -m "style(login): refine welcome message for universal sign-in"

Write-Host "Pushing to aayush-made-features branch..." -ForegroundColor Blue
git push origin aayush-made-features

Write-Host "Switching to main branch..." -ForegroundColor Blue
git checkout main

Write-Host "Merging changes into main..." -ForegroundColor Blue
git merge aayush-made-features -m "Merge branch 'aayush-made-features' into main: Admin Catalog & UI Enhancements"

Write-Host "Pushing to main branch..." -ForegroundColor Blue
git push origin main

Write-Host "Returning to your working branch..." -ForegroundColor Blue
git checkout aayush-made-features

Write-Host "Repository synchronisation complete!" -ForegroundColor Green
