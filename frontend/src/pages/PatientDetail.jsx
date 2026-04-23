import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPatientById, clearCurrentPatient, updatePatient } from '../store/slices/patientSlice';
import { fetchEncountersByPatient, fetchProgressNotesByPatient, clearClinicalData } from '../store/slices/clinicalSlice';
import { fetchLabOrdersByPatient, fetchImagingOrdersByPatient } from '../store/slices/ordersSlice';
import { fetchPrescriptionsByPatient, clearMedicationData } from '../store/slices/medicationsSlice';
import { fetchAppointmentsByPatient } from '../store/slices/appointmentSlice';
import { ArrowLeft, Edit, User, FileText, Activity, Pill, CalendarDays, X } from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import {
  Card, CardHeader, CardBody, Tabs, TabList, Tab, TabPanel,
  Badge, Spinner, EmptyState, Button, Modal, Input, Select,
  statusVariant, Alert,
} from '../components/ui';

const InfoRow = ({ label, value }) => (
  <div className="flex gap-4 py-2 border-b border-border/50 last:border-0">
    <dt className="text-sm text-muted-foreground w-36 flex-shrink-0">{label}</dt>
    <dd className="text-sm font-medium text-foreground flex-1">{value || '—'}</dd>
  </div>
);

const LBL = "text-xs font-semibold text-slate-700";
const F = "flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400";


const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { currentPatient, loading, error } = useSelector((s) => s.patients);
  const { user } = useSelector((s) => s.auth);
  const {
    encounters = [],
    progressNotes = [],
    loading: cLoading,
  } = useSelector((s) => s.clinical);
  const isAdmin = user?.roleName?.toLowerCase() === 'admin';
  const {
    labOrders = [],
    imagingOrders = [],
    loading: oLoading,
  } = useSelector((s) => s.orders);
  const {
    patientPrescriptions: prescriptions = [],
    loading: mLoading,
  } = useSelector((s) => s.medications);
  const { patientList: appts = [], loading: aLoading } = useSelector((s) => s.appointments);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editErr, setEditErr] = useState('');

  useEffect(() => {
    if (!id) return;
    dispatch(fetchPatientById(id));
    dispatch(fetchEncountersByPatient(id));
    dispatch(fetchProgressNotesByPatient(id));
    dispatch(fetchLabOrdersByPatient(id));
    dispatch(fetchImagingOrdersByPatient(id));
    dispatch(fetchPrescriptionsByPatient(id));
    dispatch(fetchAppointmentsByPatient(id));
    return () => {
      dispatch(clearCurrentPatient());
      dispatch(clearClinicalData());
      dispatch(clearMedicationData());
    };
  }, [dispatch, id]);

  const calcAge = (dob) => {
    if (!dob) return null;
    return differenceInYears(new Date(), new Date(dob));
  };

  const openEdit = () => {
    setEditErr('');
    setEditForm({
      firstName: currentPatient?.firstName || '',
      lastName: currentPatient?.lastName || '',
      gender: currentPatient?.gender || '',
      bloodType: currentPatient?.bloodType || '',
      emergencyContact: currentPatient?.emergencyContact || '',
      contactInformation: { ...currentPatient?.contactInformation },
      insuranceDetails: { ...currentPatient?.insuranceDetails },
    });
    setEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editForm.firstName || !editForm.lastName) {
      setEditErr('First and last name are required.');
      return;
    }
    const result = await dispatch(updatePatient({ id, data: editForm }));
    if (updatePatient.fulfilled.match(result)) setEditOpen(false);
    else setEditErr(result.payload || 'Update failed.');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-60 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground">Loading patient profile…</p>
    </div>
  );

  if (error || !currentPatient) return (
    <div className="flex flex-col items-center justify-center h-60 gap-4">
      <p className="text-destructive font-medium">{error || 'Patient not found'}</p>
      <Button variant="outline" onClick={() => navigate('/patients')}>
        <ArrowLeft className="h-4 w-4" /> Back to Patients
      </Button>
    </div>
  );

  const p = currentPatient;
  const age = calcAge(p.dateOfBirth);

  return (
    <div className="space-y-6 animate-fade-in relative">

      {/* Back */}
      <button onClick={() => navigate('/patients')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Patients
      </button>

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold flex-shrink-0">
            {p.firstName?.[0]}{p.lastName?.[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{p.firstName} {p.lastName}</h1>
            <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
              <span>MRN: <span className="font-mono text-foreground">{String(p.id).padStart(8, '0')}</span></span>
              {age !== null && <span>Age: <span className="font-medium text-foreground">{age} yrs</span></span>}
              <span>Gender: <span className="font-medium text-foreground">{p.gender || '—'}</span></span>
              {p.bloodType && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-white border border-slate-200 text-[#3b82f6] shadow-sm ml-1">
                  {p.bloodType}
                </span>
              )}
            </div>
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={openEdit}>
            <Edit className="h-4 w-4" /> Edit Profile
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultTab="overview">
        <TabList>
          <Tab id="overview">Overview</Tab>
          <Tab id="encounters">Encounters</Tab>
          <Tab id="notes">Progress Notes</Tab>
          <Tab id="orders">Orders</Tab>
          <Tab id="medications">Medications</Tab>
          <Tab id="appointments">Appointments</Tab>
        </TabList>

        {/* Overview */}
        <TabPanel id="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><p className="font-semibold text-sm">Contact Information</p></CardHeader>
              <CardBody>
                <dl>
                  <InfoRow label="Phone" value={p.contactInformation?.phone} />
                  <InfoRow label="Email" value={p.contactInformation?.email} />
                  <InfoRow label="Address" value={p.contactInformation?.address} />
                </dl>
              </CardBody>
            </Card>
            <Card>
              <CardHeader><p className="font-semibold text-sm">Clinical Details</p></CardHeader>
              <CardBody>
                <dl>
                  <InfoRow label="Date of Birth" value={p.dateOfBirth ? format(new Date(p.dateOfBirth), 'MMMM dd, yyyy') : null} />
                  <InfoRow label="Blood Type" value={p.bloodType ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-white border border-slate-200 text-[#3b82f6] shadow-sm">
                      {p.bloodType}
                    </span>
                  ) : null} />
                  <InfoRow label="Emergency Contact" value={p.emergencyContact} />
                  <div className="py-2 mt-2 border-t border-border/50">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Insurance Information</p>
                    <div className="space-y-1">
                      <InfoRow label="Provider" value={p.insuranceDetails?.provider} />
                      <InfoRow label="Policy No" value={p.insuranceDetails?.policyNumber} />
                      <InfoRow label="Group No" value={p.insuranceDetails?.groupNumber} />
                    </div>
                  </div>
                </dl>
              </CardBody>
            </Card>
          </div>
        </TabPanel>

        {/* Encounters */}
        <TabPanel id="encounters">
          {cLoading ? <div className="flex justify-center py-10"><Spinner /></div>
            : encounters.length === 0
              ? <EmptyState icon={FileText} title="No encounters" description="No clinical encounters documented for this patient." />
              : (
                <div className="space-y-3">
                  {encounters.map((enc) => (
                    <Card key={enc.id}>
                      <CardBody>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-foreground">{enc.chiefComplaint || enc.type || 'Encounter'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {enc.createdAt ? format(new Date(enc.createdAt), 'MMM dd, yyyy HH:mm') : '—'}
                            </p>
                            {enc.diagnosis && <p className="text-sm mt-2 text-muted-foreground">{enc.diagnosis}</p>}
                          </div>
                          <Badge variant={statusVariant(enc.status)} className="!bg-white shadow-sm text-emerald-600">{enc.status || 'Completed'}</Badge>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
        </TabPanel>

        {/* Progress Notes */}
        <TabPanel id="notes">
          {cLoading ? <div className="flex justify-center py-10"><Spinner /></div>
            : progressNotes.length === 0
              ? <EmptyState icon={FileText} title="No progress notes" description="No progress notes found for this patient." />
              : (
                <div className="space-y-3">
                  {progressNotes.map((note) => (
                    <Card key={note.id}>
                      <CardBody>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground">{note.noteType || 'Progress Note'}</span>
                              <Badge variant="info" className="!bg-white shadow-sm">{note.noteType || 'SOAP'}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{note.createdAt ? format(new Date(note.createdAt), 'MMM dd, yyyy') : '—'}</p>
                            {note.subjective && <p className="text-sm mt-2">{note.subjective}</p>}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
        </TabPanel>

        {/* Orders */}
        <TabPanel id="orders">
          {oLoading ? <div className="flex justify-center py-10"><Spinner /></div> : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Lab Orders ({labOrders.length})</h3>
                {labOrders.length === 0
                  ? <p className="text-sm text-muted-foreground">No lab orders.</p>
                  : labOrders.map((o) => (
                    <div key={o.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{o.testName || o.panelName || 'Lab Test'}</p>
                        <p className="text-xs text-muted-foreground">{o.createdAt ? format(new Date(o.createdAt), 'MMM dd, yyyy') : '—'}</p>
                      </div>
                      <Badge variant={statusVariant(o.status)} className="!bg-white shadow-sm">{o.status}</Badge>
                    </div>
                  ))}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Imaging Orders ({imagingOrders.length})</h3>
                {imagingOrders.length === 0
                  ? <p className="text-sm text-muted-foreground">No imaging orders.</p>
                  : imagingOrders.map((o) => (
                    <div key={o.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{o.imagingType || 'Imaging'}</p>
                        <p className="text-xs text-muted-foreground">{o.bodyPart} — {o.createdAt ? format(new Date(o.createdAt), 'MMM dd, yyyy') : '—'}</p>
                      </div>
                      <Badge variant={statusVariant(o.status)} className="!bg-white shadow-sm">{o.status}</Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </TabPanel>

        {/* Medications */}
        <TabPanel id="medications">
          {mLoading ? <div className="flex justify-center py-10"><Spinner /></div>
            : prescriptions.length === 0
              ? <EmptyState icon={Pill} title="No prescriptions" description="No medications prescribed for this patient." />
              : (
                <div className="space-y-2">
                  {prescriptions.map((rx) => (
                    <div key={rx.id} className="flex items-center gap-4 p-4 border border-border rounded-lg bg-card">
                      <Pill className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rx.medicationName || rx.medication?.name || 'Medication'}</p>
                        <p className="text-xs text-muted-foreground">{rx.dosage} · {rx.frequency} · {rx.route}</p>
                      </div>
                      <Badge variant={statusVariant(rx.status)} className="!bg-white shadow-sm">{rx.status || 'Active'}</Badge>
                    </div>
                  ))}
                </div>
              )}
        </TabPanel>

        {/* Appointments */}
        <TabPanel id="appointments">
          {aLoading ? <div className="flex justify-center py-10"><Spinner /></div>
            : appts.length === 0
              ? <EmptyState icon={CalendarDays} title="No appointments" description="No appointments found for this patient." />
              : (
                <div className="space-y-2">
                  {appts.map((a) => (
                    <div key={a.id} className="flex items-center gap-4 p-4 border border-border rounded-lg bg-card">
                      <CalendarDays className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.reason || a.type || 'Appointment'}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.appointmentDate ? format(new Date(a.appointmentDate), 'MMM dd, yyyy') : '—'}
                          {a.appointmentTime ? ` at ${a.appointmentTime}` : ''}
                        </p>
                      </div>
                      <Badge variant={statusVariant(a.status)} className="!bg-white shadow-sm">{a.status || 'Scheduled'}</Badge>
                    </div>
                  ))}
                </div>
              )}
        </TabPanel>
      </Tabs>

      {/* Click-away dimmer */}
      {editOpen && (
        <div className="absolute inset-0 z-20" onClick={() => setEditOpen(false)} />
      )}

      {/* Floating Edit Panel */}
      {editOpen && (
        <div id="edit-patient-panel"
          className="absolute left-1/2 -translate-x-1/2 w-full max-w-2xl z-30 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
          style={{ top: '64px', animation: 'slideDown 0.18s ease-out' }}>
          <div className="flex items-center justify-between px-6 py-3.5" style={{ backgroundColor: '#3b82f6' }}>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-white" />
              <h2 className="text-sm font-semibold text-white tracking-wide">Edit Patient Profile</h2>
            </div>
            <button onClick={() => setEditOpen(false)} className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-4 bg-white">
            <form onSubmit={handleEdit} className="space-y-4">
              {editErr && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
                  <span className="font-semibold">Error:</span> {editErr}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={LBL}>First Name <span className="text-red-500">*</span></label>
                  <input required value={editForm.firstName || ''} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} className={F} />
                </div>
                <div className="space-y-1">
                  <label className={LBL}>Last Name <span className="text-red-500">*</span></label>
                  <input required value={editForm.lastName || ''} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} className={F} />
                </div>
              </div>

              <div className="space-y-1">
                <label className={LBL}>Gender</label>
                <select value={editForm.gender || ''} onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))} className={F}>
                  <option value="">Select gender</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className={LBL}>Phone</label>
                <input value={editForm.contactInformation?.phone || ''} onChange={(e) => setEditForm((f) => ({ ...f, contactInformation: { ...f.contactInformation, phone: e.target.value } }))} className={F} />
              </div>

              <div className="space-y-1">
                <label className={LBL}>Email</label>
                <input type="email" value={editForm.contactInformation?.email || ''} onChange={(e) => setEditForm((f) => ({ ...f, contactInformation: { ...f.contactInformation, email: e.target.value } }))} className={F} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={LBL}>Blood Type</label>
                  <select value={editForm.bloodType || ''} onChange={(e) => setEditForm((f) => ({ ...f, bloodType: e.target.value }))} className={F}>
                    <option value="">Unknown</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={LBL}>Emergency Contact</label>
                  <input type="tel" placeholder="Name / Phone" value={editForm.emergencyContact || ''} onChange={(e) => setEditForm((f) => ({ ...f, emergencyContact: e.target.value }))} className={F} />
                </div>
              </div>

              <div className="space-y-1">
                <label className={LBL}>Insurance Provider (Optional)</label>
                <input placeholder="e.g. Blue Cross Blue Shield" value={editForm.insuranceDetails?.provider || ''} onChange={(e) => setEditForm((f) => ({ ...f, insuranceDetails: { ...f.insuranceDetails, provider: e.target.value } }))} className={F} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={LBL}>Policy Number</label>
                  <input placeholder="Policy ID" value={editForm.insuranceDetails?.policyNumber || ''} onChange={(e) => setEditForm((f) => ({ ...f, insuranceDetails: { ...f.insuranceDetails, policyNumber: e.target.value } }))} className={F} />
                </div>
                <div className="space-y-1">
                  <label className={LBL}>Group Number</label>
                  <input placeholder="Group ID" value={editForm.insuranceDetails?.groupNumber || ''} onChange={(e) => setEditForm((f) => ({ ...f, insuranceDetails: { ...f.insuranceDetails, groupNumber: e.target.value } }))} className={F} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none' }}>Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>

  );
};

export default PatientDetail;
