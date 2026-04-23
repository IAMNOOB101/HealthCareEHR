
$ErrorActionPreference = "Stop"
git reset HEAD

git add backend/src/validators/appointment.validator.js
git commit -m "fix(backend/validators): relax appointment validator to allow optional fields and notes"

git add backend/src/validators/imagingOrder.validator.js
git commit -m "fix(backend/validators): relax imagingOrder validator for clinical indication aliases"

git add backend/src/validators/labOrder.validator.js
git commit -m "fix(backend/validators): relax labOrder validator for optional fields and test types"

git add frontend/src/components/ui/index.jsx
git commit -m "chore(frontend/ui): adjust Modal inner padding and structural alignments"

git add frontend/src/pages/Appointments.jsx
git commit -m "fix(frontend/appointments): ensure required fields and type-casted IDs are sent"

git add frontend/src/pages/Doctors.jsx
git commit -m "fix(frontend/doctors): implement floating panels and fix specialization rendering"

git add frontend/src/pages/Documentation.jsx
git commit -m "fix(frontend/docs): align progress notes and new encounter fields to schema"

git add frontend/src/pages/Medications.jsx
git commit -m "fix(frontend/medications): fix medication payload fields to match backend"

git add frontend/src/pages/Orders.jsx
git commit -m "fix(frontend/orders): add explicit doctor selection and resolve field aliases"

git add frontend/src/pages/PatientsList.jsx
git commit -m "fix(frontend/patients): refactor add patient form to floating panel architecture"

git push origin aayush-made-features

