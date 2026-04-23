Write-Host "Starting individual commits for Patient Portal features..." -ForegroundColor Blue

# 1. Navigation & Routing
git add frontend/src/App.jsx frontend/src/components/layout/Sidebar.jsx
git commit -m "feat: update navigation and routing for Patient Portal"

# 2. Patient Profile
git add frontend/src/pages/PatientProfile.jsx
git commit -m "feat: add comprehensive Patient Profile page"

# 3. Appointments
git add frontend/src/pages/Appointments.jsx
git commit -m "feat: customize Appointments view for patients"

# 4. Orders
git add frontend/src/pages/Orders.jsx
git commit -m "feat: customize Orders view for patients"

# 5. Medications & Instructions
git add frontend/src/pages/Medications.jsx
git commit -m "feat: customize Medications view and add Instructions tab for patients"

# 6. Dashboard
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat: implement dynamic data-driven Patient Dashboard"

Write-Host "Pushing to aayush-made-features branch..." -ForegroundColor Blue
git push origin aayush-made-features

Write-Host "Switching to main branch..." -ForegroundColor Blue
git checkout main

Write-Host "Merging changes into main..." -ForegroundColor Blue
git merge aayush-made-features -m "Merge branch 'aayush-made-features' into main: Patient Portal Customizations"

Write-Host "Pushing to main branch..." -ForegroundColor Blue
git push origin main

Write-Host "Returning to your working branch..." -ForegroundColor Blue
git checkout aayush-made-features

Write-Host "Repository synchronisation complete!" -ForegroundColor Green
