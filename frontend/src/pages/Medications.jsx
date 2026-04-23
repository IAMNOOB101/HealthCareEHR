import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllMedications, fetchAllPrescriptions, createPrescription, updatePrescription, createMedication } from '../store/slices/medicationsSlice';
import { fetchPatients } from '../store/slices/patientSlice';
import { fetchDoctors } from '../store/slices/doctorSlice';
import { fetchAppointments } from '../store/slices/appointmentSlice';
import { Pill, Plus, Search, X, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import {
  PageHeader, Button, Card, CardHeader, CardBody,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Spinner, EmptyState, Alert,
  Tabs, TabList, Tab, TabPanel, statusVariant,
} from '../components/ui';
import { format } from 'date-fns';

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'As needed (PRN)', 'Weekly', 'Monthly'];
const DURATIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days', '60 days', '90 days', 'Ongoing'];
const DOSAGES = ['5mg', '10mg', '20mg', '25mg', '50mg', '100mg', '200mg', '250mg', '500mg', '750mg', '1000mg', '1g', '2g', '5ml', '10ml'];
const PAGE_SIZE = 12;

const DRUG_FORM = {
  medicationName: '',
  category: '',
  dosage: '',
  instructions: '',
};

const RX_FORM = {
  patientId: '', doctorId: '', medicationId: '',
  prescriptionDate: new Date().toISOString().split('T')[0],
  dosage: '', frequency: '', duration: '', refills: 0, notes: '',
};

const F = "flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400";
const FTA = "flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none";
const LBL = "text-xs font-semibold text-slate-700";

const Medications = () => {
  const dispatch = useDispatch();
  const authUser = useSelector((s) => s.auth?.user);
  const { catalog, prescriptions, loading, saving, error } = useSelector((s) => s.medications);
  const { list: patients } = useSelector((s) => s.patients);
  const { list: doctors } = useSelector((s) => s.doctors);
  const { list: appointments } = useSelector((s) => s.appointments);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rxOpen, setRxOpen] = useState(false);
  const [rxForm, setRxForm] = useState(RX_FORM);
  const [formErr, setFormErr] = useState('');
  const [success, setSuccess] = useState('');
  const [adminErr, setAdminErr] = useState('');

  const [editRxOpen, setEditRxOpen] = useState(false);
  const [editRxForm, setEditRxForm] = useState(null);

  const [drugOpen, setDrugOpen] = useState(false);
  const [drugForm, setDrugForm] = useState(DRUG_FORM);

  useEffect(() => {
    dispatch(fetchAllMedications());
    dispatch(fetchPatients());
    dispatch(fetchDoctors());
    dispatch(fetchAllPrescriptions());
    dispatch(fetchAppointments());
  }, [dispatch]);

  const getPatientName = (pid) => { const p = patients.find((pt) => String(pt.id) === String(pid)); return p ? `${p.firstName} ${p.lastName}` : `Patient #${pid}`; };
  const getDoctorName = (did) => { const d = doctors.find((doc) => String(doc.id) === String(did)); return d ? `Dr. ${d.firstName} ${d.lastName}` : '—'; };

  const isAdmin = authUser?.roleName?.toLowerCase() === 'admin';
  const isPatient = authUser?.roleName?.toLowerCase() === 'patient';
  const activeDoctor = doctors.find(
    (d) => `dr.${d.firstName?.toLowerCase()}${d.lastName?.toLowerCase()}` === authUser?.username?.toLowerCase()
  );

  // Find the patient record for the logged-in patient user
  const myPatientRecord = isPatient
    ? patients.find((p) => `${p.firstName?.toLowerCase()}${p.lastName?.toLowerCase()}` === authUser?.username?.toLowerCase())
    : null;

  let displayedPrescriptions = prescriptions;
  let eligiblePatients = patients;

  if (isPatient) {
    displayedPrescriptions = myPatientRecord
      ? prescriptions.filter((rx) => String(rx.patientId) === String(myPatientRecord.id))
      : [];
    eligiblePatients = [];
  } else if (!isAdmin && activeDoctor) {
    // Filter prescriptions
    displayedPrescriptions = prescriptions.filter(rx => String(rx.doctorId) === String(activeDoctor.id));
    // Filter eligible patients based on appointments
    const eligiblePatientIds = new Set(
      appointments
        .filter(a => String(a.doctorId) === String(activeDoctor.id) && ['scheduled', 'completed'].includes((a.status || '').toLowerCase()))
        .map(a => String(a.patientId))
    );
    eligiblePatients = patients.filter(p => eligiblePatientIds.has(String(p.id)));
  } else if (!isAdmin && !activeDoctor && doctors.length > 0) {
    displayedPrescriptions = [];
    eligiblePatients = [];
  }

  const filterCatalog = catalog.filter((m) => !search || (m.medicationName || m.name || '').toLowerCase().includes(search.toLowerCase()));
  const filterRx = displayedPrescriptions.filter((rx) => {
    const patName = getPatientName(rx.patientId).toLowerCase();
    const medName = (rx.Medication?.medicationName || rx.medicationName || '').toLowerCase();
    return !search || patName.includes(search.toLowerCase()) || medName.includes(search.toLowerCase());
  });

  const totalPagesRx = Math.max(1, Math.ceil(filterRx.length / PAGE_SIZE));
  const paginatedRx = filterRx.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleRxSubmit = async (e) => {
    e.preventDefault(); setFormErr('');
    if (!rxForm.patientId) { setFormErr('Patient is required.'); return; }
    if (!rxForm.doctorId) { setFormErr('Prescribing doctor is required.'); return; }
    if (!rxForm.medicationId) { setFormErr('Medication from catalog is required.'); return; }
    if (!rxForm.prescriptionDate) { setFormErr('Prescription date is required.'); return; }
    if (!rxForm.dosage) { setFormErr('Dosage is required.'); return; }
    if (!rxForm.frequency) { setFormErr('Frequency is required.'); return; }
    if (!rxForm.duration) { setFormErr('Duration is required.'); return; }

    const result = await dispatch(createPrescription({
      patientId: rxForm.patientId, doctorId: rxForm.doctorId, medicationId: rxForm.medicationId,
      prescriptionDate: rxForm.prescriptionDate, dosage: rxForm.dosage,
      frequency: rxForm.frequency, duration: rxForm.duration,
      refills: Number(rxForm.refills) || 0, notes: rxForm.notes,
    }));

    if (createPrescription.fulfilled.match(result)) {
      setSuccess('Prescription created successfully.'); setRxOpen(false); setRxForm(RX_FORM);
      setTimeout(() => setSuccess(''), 4000);
    } else { setFormErr(result.payload || 'Failed to create prescription.'); }
  };

  const handleDrugSubmit = async (e) => {
    e.preventDefault(); setFormErr('');
    if (!drugForm.medicationName) { setFormErr('Drug name is required.'); return; }
    if (!drugForm.category) { setFormErr('Category is required.'); return; }
    if (!drugForm.dosage) { setFormErr('Dosage is required.'); return; }
    if (!drugForm.instructions) { setFormErr('Instructions are required.'); return; }

    const result = await dispatch(createMedication(drugForm));

    if (createMedication.fulfilled.match(result)) {
      setSuccess('Medication added to catalog successfully.'); setDrugOpen(false); setDrugForm(DRUG_FORM);
      setTimeout(() => setSuccess(''), 4000);
    } else { setFormErr(result.payload || 'Failed to add drug.'); }
  };

  const openRx = () => { 
    if (isAdmin) {
      setAdminErr('Admin cannot prescribe medicine !!');
      setTimeout(() => setAdminErr(''), 5000);
      return;
    }
    setRxForm({ ...RX_FORM, doctorId: !isAdmin && activeDoctor ? String(activeDoctor.id) : '' }); 
    setFormErr(''); 
    setRxOpen(true); 
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={isPatient ? 'Your Medications' : 'Medications'}
        subtitle={isPatient ? undefined : 'Prescriptions, drug catalog, and administration records'}
        action={!isPatient && <Button onClick={openRx}><Plus className="h-4 w-4" /> New Prescription</Button>}
      />

      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert variant="error">{typeof error === 'string' ? error : 'Failed to load medications.'}</Alert>}
      {adminErr && <Alert variant="error" className="animate-shake !bg-white !text-red-600 !border-red-600 font-bold" onClose={() => setAdminErr('')}>{adminErr}</Alert>}

      {/* Relative wrapper */}
      <div className="relative">

        {/* Search bar — hidden for patients */}
        {!isPatient && (
          <Card>
            <CardBody className="py-3">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search medications, patients…"
                  className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
            </CardBody>
          </Card>
        )}

        {/* Click-away dimmer */}
        {(rxOpen || editRxOpen || drugOpen) && <div className="absolute inset-0 z-20" style={{ top: '56px' }} onClick={() => { setRxOpen(false); setEditRxOpen(false); setDrugOpen(false); }} />}

        {/* New Prescription Floating Panel */}
        {rxOpen && (
          <div id="rx-panel"
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-2xl z-30 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            style={{ top: '64px', animation: 'slideDown 0.18s ease-out' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3.5" style={{ backgroundColor: '#3b82f6' }}>
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-white" />
                <h2 className="text-sm font-semibold text-white tracking-wide">New Prescription</h2>
              </div>
              <button onClick={() => setRxOpen(false)} className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 bg-white">
              <form onSubmit={handleRxSubmit} className="space-y-3">
                {formErr && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs"><span className="font-semibold">Error:</span> {formErr}</div>}

                {/* Patient + Doctor */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={LBL}>Patient <span className="text-red-500">*</span></label>
                    <select value={rxForm.patientId} onChange={(e) => setRxForm((f) => ({ ...f, patientId: e.target.value }))} className={F}>
                      <option value="">Select patient…</option>
                      {eligiblePatients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={LBL}>Prescribing Doctor <span className="text-red-500">*</span></label>
                    {isAdmin ? (
                      <select value={rxForm.doctorId} onChange={(e) => setRxForm((f) => ({ ...f, doctorId: e.target.value }))} className={F}>
                        <option value="">Select doctor…</option>
                        {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
                      </select>
                    ) : (
                      <input type="text" className={`${F} bg-slate-50 text-slate-500`} disabled value={activeDoctor ? `Dr. ${activeDoctor.firstName} ${activeDoctor.lastName}` : '—'} />
                    )}
                  </div>
                </div>

                {/* Medication */}
                <div className="space-y-1">
                  <label className={LBL}>Medication (from catalog) <span className="text-red-500">*</span></label>
                  <select
                    value={rxForm.medicationId}
                    onChange={(e) => {
                      const mid = e.target.value;
                      const drug = catalog.find(m => String(m.id) === String(mid));
                      setRxForm((f) => ({
                        ...f,
                        medicationId: mid,
                        dosage: drug?.dosage || f.dosage,
                        notes: drug?.instructions || f.notes
                      }));
                    }}
                    className={F}
                  >
                    <option value="">Select medication…</option>
                    {catalog.map((m) => <option key={m.id} value={m.id}>{m.medicationName || m.name} {m.dosage ? `(${m.dosage})` : ''}</option>)}
                  </select>
                </div>

                {/* Dosage + Frequency */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={LBL}>Dosage <span className="text-red-500">*</span></label>
                    <input value={rxForm.dosage} onChange={(e) => setRxForm((f) => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 500mg" className={F} />
                  </div>
                  <div className="space-y-1">
                    <label className={LBL}>Frequency <span className="text-red-500">*</span></label>
                    <select value={rxForm.frequency} onChange={(e) => setRxForm((f) => ({ ...f, frequency: e.target.value }))} className={F}>
                      <option value="">Select frequency…</option>
                      {FREQUENCIES.map((freq) => <option key={freq}>{freq}</option>)}
                    </select>
                  </div>
                </div>

                {/* Duration + Date + Refills */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className={LBL}>Duration <span className="text-red-500">*</span></label>
                    <select value={rxForm.duration} onChange={(e) => setRxForm((f) => ({ ...f, duration: e.target.value }))} className={F}>
                      <option value="">Select…</option>
                      {DURATIONS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={LBL}>Prescription Date <span className="text-red-500">*</span></label>
                    <input type="date" value={rxForm.prescriptionDate} onChange={(e) => setRxForm((f) => ({ ...f, prescriptionDate: e.target.value }))} className={F} />
                  </div>
                  <div className="space-y-1">
                    <label className={LBL}>Refills</label>
                    <input type="number" min="0" max="10" value={rxForm.refills} onChange={(e) => setRxForm((f) => ({ ...f, refills: e.target.value }))} className={F} />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className={LBL}>Notes / Instructions</label>
                  <textarea rows={2} value={rxForm.notes} onChange={(e) => setRxForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. Take with food, avoid alcohol" className={FTA} />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400"><span className="text-red-500">*</span> Required</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setRxOpen(false)} className="h-8 px-4 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" disabled={saving}
                      className="h-8 px-5 rounded-md text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-60 disabled:pointer-events-none"
                      style={{ backgroundColor: '#3b82f6' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}>
                      {saving ? 'Saving…' : 'Create Prescription'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Prescription Status Panel */}
        {editRxOpen && editRxForm && (
          <div id="edit-rx-panel"
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-xs z-30 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            style={{ top: '150px', animation: 'slideDown 0.18s ease-out' }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: '#3b82f6' }}>
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-white" />
                <h2 className="text-sm font-semibold text-white">Update Status</h2>
              </div>
              <button onClick={() => setEditRxOpen(false)} className="text-white/80 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-5 py-4 bg-white space-y-4">
              {formErr && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs"><span className="font-semibold">Error:</span> {formErr}</div>}
              <div className="space-y-1">
                <label className={LBL}>Current Status</label>
                <select value={editRxForm.status} onChange={(e) => setEditRxForm(f => ({ ...f, status: e.target.value }))} className={F}>
                  <option value="Active">Active</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditRxOpen(false)} className="h-8 px-4 rounded-md border border-slate-300 text-xs text-slate-700">Cancel</button>
                <button onClick={async () => {
                  setFormErr('');
                  const res = await dispatch(updatePrescription({ id: editRxForm.id, data: { status: editRxForm.status } }));
                  if (updatePrescription.fulfilled.match(res)) {
                    setSuccess('Prescription status updated.');
                    setEditRxOpen(false);
                    setTimeout(() => setSuccess(''), 4000);
                  } else {
                    setFormErr(res.payload || 'Failed to update status.');
                  }
                }} disabled={saving} className="h-8 px-5 rounded-md text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Drug Floating Panel — Admin only */}
        {drugOpen && isAdmin && (
          <div id="drug-panel"
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-xl z-30 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            style={{ top: '64px', animation: 'slideDown 0.18s ease-out' }}>
            <div className="flex items-center justify-between px-6 py-3.5 bg-emerald-600">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-white" />
                <h2 className="text-sm font-semibold text-white tracking-wide">Add New Drug to Catalog</h2>
              </div>
              <button onClick={() => setDrugOpen(false)} className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
            </div>

            <div className="px-6 py-4 bg-white">
              <form onSubmit={handleDrugSubmit} className="space-y-4">
                {formErr && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs"><span className="font-semibold">Error:</span> {formErr}</div>}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className={LBL}>Name of Drug <span className="text-red-500">*</span></label>
                    <input value={drugForm.medicationName} onChange={(e) => setDrugForm(f => ({ ...f, medicationName: e.target.value }))} placeholder="e.g. Amoxicillin" className={F} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LBL}>Category <span className="text-red-500">*</span></label>
                    <input value={drugForm.category} onChange={(e) => setDrugForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Antibiotic" className={F} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={LBL}>Dosage <span className="text-red-500">*</span></label>
                  <select value={drugForm.dosage} onChange={(e) => setDrugForm(f => ({ ...f, dosage: e.target.value }))} className={F}>
                    <option value="">Select dosage…</option>
                    {DOSAGES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={LBL}>Instructions <span className="text-red-500">*</span></label>
                  <textarea rows={3} value={drugForm.instructions} onChange={(e) => setDrugForm(f => ({ ...f, instructions: e.target.value }))} placeholder="General instructions for this drug…" className={FTA} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400"><span className="text-red-500">*</span> Strictly required</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setDrugOpen(false)} className="h-8 px-4 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" disabled={saving} className="h-8 px-5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-60">
                      {saving ? 'Adding…' : 'Add Drug'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tabs + Tables */}
        <div className="mt-4">
          <Tabs defaultTab="prescriptions">
            <TabList>
              <Tab id="prescriptions">Prescriptions ({filterRx.length})</Tab>
              {isPatient && <Tab id="instructions">Instructions ({filterRx.filter((rx) => rx.notes && rx.notes.trim()).length})</Tab>}
              {!isPatient && <Tab id="catalog">Drug Catalog ({filterCatalog.length})</Tab>}
            </TabList>

            <TabPanel id="prescriptions">
              <Card>
                {loading ? <CardBody><div className="flex justify-center py-12"><Spinner size="lg" /></div></CardBody>
                  : filterRx.length === 0
                    ? (
                      <CardBody>
                        {isAdmin ? (
                          <EmptyState icon={Pill} title="No prescriptions" description="Issue the first prescription." action={<Button onClick={openRx}><Plus className="h-4 w-4" /> New Prescription</Button>} />
                        ) : (
                          <p className="text-center py-10 text-muted-foreground font-medium text-sm">
                            No Prescription is prescribed
                          </p>
                        )}
                      </CardBody>
                    )
                    : <>
                      <Table>
                        <Thead><Tr>
                          {!isPatient && <Th>Patient</Th>}
                          <Th>Medication</Th><Th>Dosage</Th><Th>Frequency</Th><Th>Duration</Th>
                          <Th>Prescribed By</Th><Th>Status</Th>
                          {!isPatient && <Th>Action</Th>}
                        </Tr></Thead>
                        <Tbody>
                          {paginatedRx.map((rx) => (
                            <Tr key={rx.id}>
                              {!isPatient && <Td><span className="font-medium">{getPatientName(rx.patientId)}</span></Td>}
                              <Td>{rx.Medication?.medicationName || rx.medicationName || '—'}</Td>
                              <Td className="font-mono text-sm">{rx.dosage || '—'}</Td>
                              <Td className="text-muted-foreground">{rx.frequency || '—'}</Td>
                              <Td className="text-muted-foreground">{rx.duration || '—'}</Td>
                              <Td className="text-muted-foreground">{getDoctorName(rx.doctorId)}</Td>
                              <Td><Badge variant={statusVariant(rx.status)} className="!bg-white shadow-sm">{rx.status || 'Active'}</Badge></Td>
                              {!isPatient && (
                                <Td>
                                  {['active', 'upcoming', 'completed'].includes((rx.status || 'Active').toLowerCase()) ? (
                                    <button
                                      onClick={() => { setFormErr(''); setEditRxForm({ id: rx.id, status: rx.status || 'Active' }); setEditRxOpen(true); }}
                                      className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 font-medium text-xs">
                                      <Edit className="h-3.5 w-3.5" /> Edit
                                    </button>
                                  ) : <span className="text-muted-foreground">—</span>}
                                </Td>
                              )}
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                      {totalPagesRx > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                          <p className="text-sm text-muted-foreground">
                            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filterRx.length)} of {filterRx.length}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                              disabled={page === 1}
                              className="h-8 w-8 rounded-md border border-input flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm text-foreground px-2">{page} / {totalPagesRx}</span>
                            <button
                              onClick={() => setPage((p) => Math.min(totalPagesRx, p + 1))}
                              disabled={page === totalPagesRx}
                              className="h-8 w-8 rounded-md border border-input flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                }
              </Card>
            </TabPanel>

            {/* Instructions Tab — Patient only */}
            {isPatient && (
              <TabPanel id="instructions">
                {filterRx.filter((rx) => rx.notes && rx.notes.trim()).length === 0 ? (
                  <Card>
                    <CardBody>
                      <p className="text-center py-10 text-sm text-muted-foreground">No instructions have been added to your prescriptions yet.</p>
                    </CardBody>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    {filterRx
                      .filter((rx) => rx.notes && rx.notes.trim())
                      .map((rx) => (
                        <div
                          key={rx.id}
                          className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Pill className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">
                                {rx.Medication?.medicationName || rx.medicationName || '—'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{getDoctorName(rx.doctorId)}</p>
                            </div>
                            <Badge variant={statusVariant(rx.status)} className="!bg-white shadow-sm flex-shrink-0">
                              {rx.status || 'Active'}
                            </Badge>
                          </div>
                          <div className="border-t border-border/50 pt-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Instructions</p>
                            <p className="text-sm text-foreground leading-relaxed">{rx.notes}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </TabPanel>
            )}

            <TabPanel id="catalog">
              <Card>
                <CardHeader
                  action={
                    isAdmin && (
                      <Button onClick={() => { setFormErr(''); setDrugForm(DRUG_FORM); setDrugOpen(true); }} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Drug
                      </Button>
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold text-foreground">Drug Catalogue</span>
                  </div>
                </CardHeader>
                {loading ? <CardBody><div className="flex justify-center py-12"><Spinner size="lg" /></div></CardBody>
                  : filterCatalog.length === 0
                    ? <CardBody><EmptyState icon={Pill} title="No medications in catalog" description="The drug catalog is empty." action={isAdmin && <Button onClick={() => setDrugOpen(true)} className="bg-emerald-600 border-none">Add First Drug</Button>} /></CardBody>
                    : <Table>
                      <Thead><Tr><Th>Name</Th><Th>Category</Th><Th>Dosage</Th><Th>Instructions</Th></Tr></Thead>
                      <Tbody>
                        {filterCatalog.map((m) => (
                          <Tr key={m.id}>
                            <Td><span className="font-medium">{m.medicationName || m.name}</span></Td>
                            <Td><Badge variant="info" className="!bg-white shadow-sm">{m.category || '—'}</Badge></Td>
                            <Td className="font-mono text-xs">{m.dosage || '—'}</Td>
                            <Td className="text-muted-foreground text-xs max-w-[260px] truncate">{m.instructions || '—'}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>}
              </Card>
            </TabPanel>
          </Tabs>
        </div>

      </div> {/* end relative wrapper */}

      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>

    </div>
  );
};

export default Medications;
