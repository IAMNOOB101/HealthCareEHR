import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createEncounter, createProgressNote,
  setAllEncounters, setAllProgressNotes,
} from '../store/slices/clinicalSlice';
import { fetchPatients } from '../store/slices/patientSlice';
import { fetchDoctors } from '../store/slices/doctorSlice';
import { fetchAppointments } from '../store/slices/appointmentSlice';
import { encounterService, progressNoteService } from '../api/clinical.service.js';
import { FileText, Plus, Search, X, Stethoscope, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  PageHeader, Button, Card, CardBody,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Spinner, EmptyState, Alert,
  Tabs, TabList, Tab, TabPanel, statusVariant,
} from '../components/ui';
import { format } from 'date-fns';

// Encounter form: backend requires patientId, doctorId, appointmentId, encounterDate, chiefComplaint, diagnosis, treatmentPlan
const ENC_FORM = {
  patientId: '', doctorId: '', appointmentId: '',
  encounterDate: new Date().toISOString().split('T')[0],
  chiefComplaint: '', diagnosis: '', treatmentPlan: '', notes: ''
};
// Progress Note form: backend requires patientId, doctorId, noteDate, assessment, plan
// Field names: subjectiveFindings, objectiveFindings (not subjective/objective)
const NOTE_FORM = {
  patientId: '', doctorId: '',
  noteDate: new Date().toISOString().split('T')[0],
  noteType: 'SOAP',
  subjectiveFindings: '', objectiveFindings: '', assessment: '', plan: ''
};
const PAGE_SIZE = 12;

const toArray = (res) => { if (Array.isArray(res)) return res; if (Array.isArray(res?.data)) return res.data; if (Array.isArray(res?.items)) return res.items; return []; };

const F = "flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400";
const FTA = "flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none";
const LBL = "text-xs font-semibold text-slate-700";

// Panel component shared between both forms
const FloatingPanel = ({ id, open, onClose, icon: Icon, title, color = '#3b82f6', children }) => {
  if (!open) return null;
  return (
    <div id={id}
      className="absolute left-1/2 -translate-x-1/2 w-full max-w-2xl z-30 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
      style={{ top: '64px', animation: 'slideDown 0.18s ease-out' }}>
      <div className="flex items-center justify-between px-6 py-3.5" style={{ backgroundColor: color }}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-white" />
          <h2 className="text-sm font-semibold text-white tracking-wide">{title}</h2>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
      </div>
      <div className="px-6 py-4 bg-white">{children}</div>
    </div>
  );
};

const Documentation = () => {
  const dispatch = useDispatch();
  const { allEncounters, allProgressNotes, loading, error } = useSelector((s) => s.clinical);
  const { list: patients } = useSelector((s) => s.patients);
  const { list: doctors } = useSelector((s) => s.doctors);
  const { list: appointments } = useSelector((s) => s.appointments);
  // Get the logged-in doctor's ID (if the user is a doctor)
  const authUser = useSelector((s) => s.auth?.user);
  const isAdmin = authUser?.roleName?.toLowerCase() === 'admin';
  const loggedDoctorId = authUser?.doctorId || authUser?.id ? String(authUser.doctorId || '') : '';

  const [search, setSearch] = useState('');
  const [encOpen, setEncOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [encForm, setEncForm] = useState(ENC_FORM);
  const [noteForm, setNoteForm] = useState(NOTE_FORM);
  const [formErr, setFormErr] = useState('');
  const [success, setSuccess] = useState('');
  const [pageEnc, setPageEnc] = useState(1);
  const [pageNote, setPageNote] = useState(1);

  useEffect(() => {
    dispatch(fetchPatients());
    dispatch(fetchDoctors());
    dispatch(fetchAppointments());
    encounterService.getAll().then((res) => dispatch(setAllEncounters(toArray(res)))).catch(() => { });
    progressNoteService.getAll().then((res) => dispatch(setAllProgressNotes(toArray(res)))).catch(() => { });
  }, [dispatch]);

  const getPatientName = (patientId) => {
    const p = patients.find((pt) => pt.id === patientId || String(pt.id) === String(patientId));
    return p ? `${p.firstName} ${p.lastName}` : `Patient #${patientId}`;
  };

  const filterList = (list) => {
    if (!Array.isArray(list)) return [];
    if (!search) return list;
    return list.filter((item) => {
      const name = getPatientName(item.patientId).toLowerCase();
      return name.includes(search.toLowerCase()) ||
        (item.chiefComplaint || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.noteType || '').toLowerCase().includes(search.toLowerCase());
    });
  };

  const handleEncSubmit = async (e) => {
    e.preventDefault(); setFormErr('');
    if (!encForm.patientId) { setFormErr('Patient is required.'); return; }
    if (!encForm.doctorId) { setFormErr('Doctor is required.'); return; }
    if (!encForm.appointmentId) { setFormErr('Appointment is required (encounters must be linked to an appointment).'); return; }
    if (!encForm.chiefComplaint) { setFormErr('Chief complaint is required.'); return; }
    const payload = {
      patientId: Number(encForm.patientId),
      doctorId: Number(encForm.doctorId),
      appointmentId: Number(encForm.appointmentId),
      encounterDate: encForm.encounterDate || new Date().toISOString(),
      chiefComplaint: encForm.chiefComplaint,
      diagnosis: encForm.diagnosis || 'Pending',
      treatmentPlan: encForm.treatmentPlan || 'To be determined',
      notes: encForm.notes || '',
    };
    const result = await dispatch(createEncounter(payload));
    if (createEncounter.fulfilled.match(result)) {
      setSuccess('Encounter created.'); setEncOpen(false); setEncForm(ENC_FORM);
      setTimeout(() => setSuccess(''), 4000);
    } else { setFormErr(result.payload || 'Failed to create encounter.'); }
  };

  const handleNoteSubmit = async (e) => {
    e.preventDefault(); setFormErr('');
    if (!noteForm.patientId) { setFormErr('Patient is required.'); return; }
    if (!noteForm.doctorId) { setFormErr('Doctor is required.'); return; }
    if (!noteForm.assessment) { setFormErr('Assessment is required.'); return; }
    if (!noteForm.plan) { setFormErr('Plan is required.'); return; }
    const payload = {
      patientId: Number(noteForm.patientId),
      doctorId: Number(noteForm.doctorId),
      noteDate: noteForm.noteDate || new Date().toISOString().split('T')[0],
      noteType: noteForm.noteType || 'SOAP',
      subjectiveFindings: noteForm.subjectiveFindings || '',
      objectiveFindings: noteForm.objectiveFindings || '',
      assessment: noteForm.assessment,
      plan: noteForm.plan,
    };
    const result = await dispatch(createProgressNote(payload));
    if (createProgressNote.fulfilled.match(result)) {
      setSuccess('Progress note created.'); setNoteOpen(false); setNoteForm(NOTE_FORM);
      setTimeout(() => setSuccess(''), 4000);
    } else { setFormErr(result.payload || 'Failed to create note.'); }
  };

  const openEnc = () => { setEncForm(ENC_FORM); setFormErr(''); setNoteOpen(false); setEncOpen(true); };
  const openNote = () => { setNoteForm(NOTE_FORM); setFormErr(''); setEncOpen(false); setNoteOpen(true); };

  const filteredEnc = filterList(allEncounters);
  const filteredNote = filterList(allProgressNotes);

  const totalPagesEnc = Math.max(1, Math.ceil(filteredEnc.length / PAGE_SIZE));
  const paginatedEnc = filteredEnc.slice((pageEnc - 1) * PAGE_SIZE, pageEnc * PAGE_SIZE);

  const totalPagesNote = Math.max(1, Math.ceil(filteredNote.length / PAGE_SIZE));
  const paginatedNote = filteredNote.slice((pageNote - 1) * PAGE_SIZE, pageNote * PAGE_SIZE);

  // Reset pages on search
  useEffect(() => {
    setPageEnc(1);
    setPageNote(1);
  }, [search]);



  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Documentation"
        subtitle="Clinical encounters and progress notes"
        action={
          isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={openNote}><Plus className="h-4 w-4" /> Progress Note</Button>
              <Button onClick={openEnc}><Plus className="h-4 w-4" /> New Encounter</Button>
            </div>
          )
        }
      />

      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert variant="error">{typeof error === 'string' ? error : 'Failed to load records.'}</Alert>}

      {/* Relative wrapper */}
      <div className="relative">

        {/* Search bar */}
        <Card>
          <CardBody className="py-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by patient, complaint…"
                className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
          </CardBody>
        </Card>

        {/* Click-away dimmer */}
        {(encOpen || noteOpen) && (
          <div className="absolute inset-0 z-20" style={{ top: '56px' }} onClick={() => { setEncOpen(false); setNoteOpen(false); }} />
        )}

        {/* New Encounter Panel */}
        <FloatingPanel id="enc-panel" open={encOpen} onClose={() => setEncOpen(false)} icon={Stethoscope} title="New Encounter">
          <form onSubmit={handleEncSubmit} className="space-y-3">
            {formErr && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs"><span className="font-semibold">Error:</span> {formErr}</div>}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={LBL}>Patient <span className="text-red-500">*</span></label>
                <select value={encForm.patientId} onChange={(e) => setEncForm((f) => ({ ...f, patientId: e.target.value }))} className={F}>
                  <option value="">Select patient…</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={LBL}>Doctor <span className="text-red-500">*</span></label>
                <select value={encForm.doctorId} onChange={(e) => setEncForm((f) => ({ ...f, doctorId: e.target.value }))} className={F}>
                  <option value="">Select doctor…</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={LBL}>Linked Appointment <span className="text-red-500">*</span></label>
                <select value={encForm.appointmentId} onChange={(e) => setEncForm((f) => ({ ...f, appointmentId: e.target.value }))} className={F}>
                  <option value="">Select appointment…</option>
                  {appointments.filter(a => !encForm.patientId || String(a.patientId) === String(encForm.patientId)).map((a) => {
                    const pat = patients.find(p => String(p.id) === String(a.patientId));
                    const label = `#${a.id} – ${pat ? pat.firstName + ' ' + pat.lastName : ''} (${a.appointmentType || ''}, ${a.status || ''})`;
                    return <option key={a.id} value={a.id}>{label}</option>;
                  })}
                </select>
              </div>
              <div className="space-y-1">
                <label className={LBL}>Encounter Date</label>
                <input type="date" value={encForm.encounterDate} onChange={(e) => setEncForm((f) => ({ ...f, encounterDate: e.target.value }))} className={F} />
              </div>
            </div>

            <div className="space-y-1">
              <label className={LBL}>Chief Complaint <span className="text-red-500">*</span></label>
              <input value={encForm.chiefComplaint} onChange={(e) => setEncForm((f) => ({ ...f, chiefComplaint: e.target.value }))} placeholder="Why is the patient here?" className={F} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={LBL}>Diagnosis</label>
                <textarea rows={2} value={encForm.diagnosis} onChange={(e) => setEncForm((f) => ({ ...f, diagnosis: e.target.value }))} placeholder="Diagnosis or differential…" className={FTA} />
              </div>
              <div className="space-y-1">
                <label className={LBL}>Treatment Plan</label>
                <textarea rows={2} value={encForm.treatmentPlan} onChange={(e) => setEncForm((f) => ({ ...f, treatmentPlan: e.target.value }))} placeholder="Treatment plan…" className={FTA} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400"><span className="text-red-500">*</span> Required</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEncOpen(false)} className="h-8 px-4 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit"
                  className="h-8 px-5 rounded-md text-xs font-semibold text-white shadow-sm transition-colors"
                  style={{ backgroundColor: '#3b82f6' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}>
                  Create Encounter
                </button>
              </div>
            </div>
          </form>
        </FloatingPanel>

        {/* New Progress Note Panel */}
        <FloatingPanel id="note-panel" open={noteOpen} onClose={() => setNoteOpen(false)} icon={ClipboardList} title="New Progress Note" color="#3b82f6">
          <form onSubmit={handleNoteSubmit} className="space-y-3">
            {formErr && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs"><span className="font-semibold">Error:</span> {formErr}</div>}

            {/* Row 1: Patient + Doctor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={LBL}>Patient <span className="text-red-500">*</span></label>
                <select value={noteForm.patientId} onChange={(e) => setNoteForm((f) => ({ ...f, patientId: e.target.value }))} className={F}>
                  <option value="">Select patient…</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={LBL}>Doctor <span className="text-red-500">*</span></label>
                <select value={noteForm.doctorId} onChange={(e) => setNoteForm((f) => ({ ...f, doctorId: e.target.value }))} className={F}>
                  <option value="">Select doctor…</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2: Note Type + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={LBL}>Note Type</label>
                <select value={noteForm.noteType} onChange={(e) => setNoteForm((f) => ({ ...f, noteType: e.target.value }))} className={F}>
                  <option value="SOAP">SOAP</option>
                  <option value="Narrative">Narrative</option>
                  <option value="Problem-Oriented">Problem-Oriented</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={LBL}>Note Date</label>
                <input type="date" value={noteForm.noteDate} onChange={(e) => setNoteForm((f) => ({ ...f, noteDate: e.target.value }))} className={F} />
              </div>
            </div>

            {/* Row 3: Subjective + Objective */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={LBL}>Subjective</label>
                <textarea rows={2} value={noteForm.subjectiveFindings} onChange={(e) => setNoteForm((f) => ({ ...f, subjectiveFindings: e.target.value }))} placeholder="Patient's reported symptoms…" className={FTA} />
              </div>
              <div className="space-y-1">
                <label className={LBL}>Objective</label>
                <textarea rows={2} value={noteForm.objectiveFindings} onChange={(e) => setNoteForm((f) => ({ ...f, objectiveFindings: e.target.value }))} placeholder="Examination findings, vitals…" className={FTA} />
              </div>
            </div>

            {/* Row 4: Assessment + Plan */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={LBL}>Assessment <span className="text-red-500">*</span></label>
                <textarea rows={2} value={noteForm.assessment} onChange={(e) => setNoteForm((f) => ({ ...f, assessment: e.target.value }))} placeholder="Clinical assessment…" className={FTA} />
              </div>
              <div className="space-y-1">
                <label className={LBL}>Plan <span className="text-red-500">*</span></label>
                <textarea rows={2} value={noteForm.plan} onChange={(e) => setNoteForm((f) => ({ ...f, plan: e.target.value }))} placeholder="Treatment plan…" className={FTA} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400"><span className="text-red-500">*</span> Required</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setNoteOpen(false)} className="h-8 px-4 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit"
                  className="h-8 px-5 rounded-md text-xs font-semibold text-white shadow-sm transition-colors"
                  style={{ backgroundColor: '#3b82f6' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}>
                  Save Note
                </button>
              </div>
            </div>
          </form>
        </FloatingPanel>

        {/* Tabs + Tables */}
        <div className="mt-4">
          <Tabs defaultTab="encounters">
            <TabList>
              <Tab id="encounters">Encounters ({filteredEnc.length})</Tab>
              <Tab id="notes">Progress Notes ({filteredNote.length})</Tab>
            </TabList>

            <TabPanel id="encounters">
              <Card>
                {loading ? (<CardBody><div className="flex justify-center py-16"><Spinner size="lg" /></div></CardBody>)
                  : filteredEnc.length === 0 ? (
                    <CardBody><EmptyState icon={FileText} title="No encounters found" description="Create the first clinical encounter."
                      action={isAdmin && <Button onClick={openEnc}><Plus className="h-4 w-4" /> New Encounter</Button>} /></CardBody>
                  ) : (
                    <Table>
                      <Thead><Tr><Th>Patient</Th><Th>Chief Complaint</Th><Th>Diagnosis</Th><Th>Plan</Th><Th>Date</Th><Th>Status</Th></Tr></Thead>
                      <Tbody>
                        {paginatedEnc.map((enc) => (
                          <Tr key={enc.id}>
                            <Td><span className="font-medium">{getPatientName(enc.patientId)}</span></Td>
                            <Td className="max-w-[200px] truncate text-muted-foreground">{enc.chiefComplaint || '—'}</Td>
                            <Td className="max-w-[180px] truncate text-muted-foreground">{enc.diagnosis || '—'}</Td>
                            <Td className="max-w-[180px] truncate text-muted-foreground">{enc.treatmentPlan || '—'}</Td>
                            <Td className="text-xs text-muted-foreground whitespace-nowrap">{enc.createdAt ? format(new Date(enc.createdAt), 'MMM dd, yyyy') : '—'}</Td>
                            <Td><Badge variant={statusVariant(enc.status)} className="text-emerald-500 font-semibold shadow-sm">{enc.status || 'Completed'}</Badge></Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
              </Card>
              {totalPagesEnc > 1 && (
                <div className="mt-4 flex items-center justify-between px-5 py-3 bg-white border border-border rounded-xl">
                  <p className="text-sm text-muted-foreground">
                    Showing {(pageEnc - 1) * PAGE_SIZE + 1}–{Math.min(pageEnc * PAGE_SIZE, filteredEnc.length)} of {filteredEnc.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPageEnc((p) => Math.max(1, p - 1))}
                      disabled={pageEnc === 1}
                      className="h-8 w-8 rounded-md border border-input flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-foreground px-2">{pageEnc} / {totalPagesEnc}</span>
                    <button
                      onClick={() => setPageEnc((p) => Math.min(totalPagesEnc, p + 1))}
                      disabled={pageEnc === totalPagesEnc}
                      className="h-8 w-8 rounded-md border border-input flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </TabPanel>

            <TabPanel id="notes">
              <Card>
                {loading ? (<CardBody><div className="flex justify-center py-16"><Spinner size="lg" /></div></CardBody>)
                  : filteredNote.length === 0 ? (
                    <CardBody><EmptyState icon={FileText} title="No progress notes" description="Create the first progress note."
                      action={isAdmin && <Button onClick={openNote}><Plus className="h-4 w-4" /> New Note</Button>} /></CardBody>
                  ) : (
                    <Table>
                      <Thead><Tr><Th>Patient</Th><Th>Type</Th><Th>Subjective</Th><Th>Assessment</Th><Th>Date</Th></Tr></Thead>
                      <Tbody>
                        {paginatedNote.map((note) => (
                          <Tr key={note.id}>
                            <Td><span className="font-medium">{getPatientName(note.patientId)}</span></Td>
                            <Td><Badge className="bg-white border border-purple-200 text-purple-700 shadow-sm">{note.noteType || 'SOAP'}</Badge></Td>
                            <Td className="max-w-[200px] truncate text-muted-foreground">{note.subjectiveFindings || 'N/A'}</Td>
                            <Td className="max-w-[180px] truncate text-muted-foreground">{note.assessment || '—'}</Td>
                            <Td className="text-xs text-muted-foreground whitespace-nowrap">{note.createdAt ? format(new Date(note.createdAt), 'MMM dd, yyyy') : '—'}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
              </Card>
              {totalPagesNote > 1 && (
                <div className="mt-4 flex items-center justify-between px-5 py-3 bg-white border border-border rounded-xl">
                  <p className="text-sm text-muted-foreground">
                    Showing {(pageNote - 1) * PAGE_SIZE + 1}–{Math.min(pageNote * PAGE_SIZE, filteredNote.length)} of {filteredNote.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPageNote((p) => Math.max(1, p - 1))}
                      disabled={pageNote === 1}
                      className="h-8 w-8 rounded-md border border-input flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-foreground px-2">{pageNote} / {totalPagesNote}</span>
                    <button
                      onClick={() => setPageNote((p) => Math.min(totalPagesNote, p + 1))}
                      disabled={pageNote === totalPagesNote}
                      className="h-8 w-8 rounded-md border border-input flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </TabPanel>
          </Tabs>
        </div>

      </div> {/* end relative wrapper */}

      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

export default Documentation;
