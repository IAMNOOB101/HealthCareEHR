import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchPatients, createPatient, deletePatient, createPatientLogin } from '../store/slices/patientSlice';
import { Users, Search, Plus, Trash2, ArrowRight, ChevronLeft, ChevronRight, X, UserPlus, KeyRound, Eye, EyeOff } from 'lucide-react';
import {
  PageHeader, Button, Card, CardBody, Modal,
  Input, Select, Table, Thead, Tbody, Tr, Th, Td,
  Badge, Spinner, EmptyState, Alert,
} from '../components/ui';
import { format, differenceInYears } from 'date-fns';

const EMPTY_FORM = {
  firstName: '', lastName: '', dateOfBirth: '', gender: '',
  contactInformation: { phone: '', email: '', address: '' },
  bloodType: '', emergencyContact: '',
  insuranceDetails: { provider: '', policyNumber: '', groupNumber: '' }
};

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PAGE_SIZE = 12;

const PatientsList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { list: patients, loading, saving, error } = useSelector((s) => s.patients);
  const isAdmin = user?.roleName?.toLowerCase() === 'admin';

  const [search, setSearch] = useState('');
  const [genderFilt, setGenderFilt] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState('');
  const [success, setSuccess] = useState('');

  const [loginOpen, setLoginOpen] = useState(false);
  const [loginTarget, setLoginTarget] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginErr, setLoginErr] = useState('');
  const [loginOk, setLoginOk] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => { dispatch(fetchPatients()); }, [dispatch]);

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = patients.filter((p) => {
    const name = `${p.firstName} ${p.lastName}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) ||
      String(p.id).includes(search);
    const matchGender = !genderFilt || p.gender === genderFilt;
    return matchSearch && matchGender;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);

  // ── Form helpers ─────────────────────────────────────────────────────────
  const setField = (path, value) => {
    setForm((f) => {
      const parts = path.split('.');
      if (parts.length === 1) return { ...f, [path]: value };
      return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: value } };
    });
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormErr('');
    setAddOpen(true);
    // Scroll to the form panel smoothly
    setTimeout(() => document.getElementById('add-patient-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormErr('');
    if (!form.firstName || !form.lastName || !form.dateOfBirth || !form.gender) {
      setFormErr('First name, last name, date of birth and gender are required.');
      return;
    }
    const result = await dispatch(createPatient(form));
    if (createPatient.fulfilled.match(result)) {
      setSuccess('Patient added successfully.');
      setAddOpen(false);
      setForm(EMPTY_FORM);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setFormErr(result.payload || 'Failed to create patient.');
    }
  };

  const handleDelete = async () => {
    await dispatch(deletePatient(deleteId));
    setDeleteId(null);
  };

  const handleCreateLogin = async (e) => {
    e.preventDefault();
    setLoginErr('');
    if (!loginForm.username.trim() || !loginForm.password.trim()) {
      setLoginErr('Username and password are required.');
      return;
    }
    if (loginForm.password.length < 8) {
      setLoginErr('Password must be at least 8 characters.');
      return;
    }
    const result = await dispatch(createPatientLogin({ username: loginForm.username.trim(), password: loginForm.password }));
    if (createPatientLogin.fulfilled.match(result)) {
      setLoginOk(`Login account created for ${loginTarget?.firstName} ${loginTarget?.lastName}. Username: ${loginForm.username}`);
      setLoginOpen(false);
      setLoginForm({ username: '', password: '' });
      setTimeout(() => setLoginOk(''), 6000);
    } else {
      setLoginErr(result.payload || 'Failed to create login account.');
    }
  };

  const calcAge = (dob) => {
    if (!dob) return '—';
    try { return `${differenceInYears(new Date(), new Date(dob))} yrs`; }
    catch { return '—'; }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} total registered patients`}
        action={
          isAdmin && (
            <Button onClick={openAdd}>
              <UserPlus className="h-4 w-4" /> Add Patient
            </Button>
          )
        }
      />

      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}
      {loginOk && <Alert variant="success" onClose={() => setLoginOk('')}>{loginOk}</Alert>}
      {error && <Alert variant="error">{typeof error === 'string' ? error : 'Failed to load patients.'}</Alert>}


      {/* ── Relative wrapper: search bar + floating form + table all share the same stacking context ── */}
      <div className="relative">

        {/* Search / Filter bar */}
        <Card>
          <CardBody className="py-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                  placeholder="Search by name or ID…"
                  className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <select
                value={genderFilt}
                onChange={(e) => { setGenderFilt(e.target.value); resetPage(); }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </CardBody>
        </Card>

        {/* Transparent dimming layer — click to close without closing table */}
        {(addOpen || loginOpen) && (
          <div
            className="absolute inset-0 z-20"
            style={{ top: '56px' }}
            onClick={() => { setAddOpen(false); setLoginOpen(false); }}
          />
        )}
        {/* ── Floating Add Patient Panel — absolutely positioned, table never moves ── */}
        {addOpen && (
          <div
            id="add-patient-panel"
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-2xl z-30 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            style={{ top: '64px', animation: 'slideDown 0.18s ease-out' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-3.5" style={{ backgroundColor: '#3b82f6' }}>
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-white" />
                <h2 className="text-sm font-semibold text-white tracking-wide">Add New Patient</h2>
              </div>
              <button
                onClick={() => setAddOpen(false)}
                className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="px-6 py-4 bg-white">
              <form onSubmit={handleAdd} className="space-y-3">
                {formErr && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
                    <span className="font-semibold">Error:</span> {formErr}
                  </div>
                )}

                {/* Row 1: Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">First Name <span className="text-red-500">*</span></label>
                    <input value={form.firstName} onChange={(e) => setField('firstName', e.target.value)}
                      placeholder="e.g. John"
                      className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Last Name <span className="text-red-500">*</span></label>
                    <input value={form.lastName} onChange={(e) => setField('lastName', e.target.value)}
                      placeholder="e.g. Doe"
                      className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
                  </div>
                </div>

                {/* Row 2: DOB + Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Date of Birth <span className="text-red-500">*</span></label>
                    <input type="date" value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)}
                      className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Gender <span className="text-red-500">*</span></label>
                    <select value={form.gender} onChange={(e) => setField('gender', e.target.value)}
                      className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400">
                      <option value="">Select gender…</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Phone + Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Phone</label>
                    <input type="tel" value={form.contactInformation.phone} onChange={(e) => setField('contactInformation.phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Email</label>
                    <input type="email" value={form.contactInformation.email} onChange={(e) => setField('contactInformation.email', e.target.value)}
                      placeholder="patient@example.com"
                      className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
                  </div>
                </div>

                {/* Row 4: Address */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Address</label>
                  <input value={form.contactInformation.address} onChange={(e) => setField('contactInformation.address', e.target.value)}
                    placeholder="Street, City, State, ZIP"
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
                </div>

                {/* Row 5: Blood Type + Emergency Contact */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Blood Type</label>
                    <select value={form.bloodType} onChange={(e) => setField('bloodType', e.target.value)}
                      className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400">
                      <option value="">Unknown</option>
                      {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Emergency Contact</label>
                    <input value={form.emergencyContact} onChange={(e) => setField('emergencyContact', e.target.value)}
                      placeholder="Name & phone"
                      className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
                  </div>
                </div>

                {/* Row 6: Insurance */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Insurance Provider (Optional)</label>
                  <input value={form.insuranceDetails.provider} onChange={(e) => setField('insuranceDetails.provider', e.target.value)}
                    placeholder="e.g. Blue Cross Blue Shield"
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Policy Number</label>
                    <input value={form.insuranceDetails.policyNumber} onChange={(e) => setField('insuranceDetails.policyNumber', e.target.value)}
                      placeholder="Policy ID"
                      className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Group Number</label>
                    <input value={form.insuranceDetails.groupNumber} onChange={(e) => setField('insuranceDetails.groupNumber', e.target.value)}
                      placeholder="Group ID"
                      className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400"><span className="text-red-500">*</span> Required</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAddOpen(false)}
                      className="h-8 px-4 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving}
                      className="h-8 px-5 rounded-md text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-60 disabled:pointer-events-none"
                      style={{ backgroundColor: '#3b82f6' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}>
                      {saving ? 'Saving…' : 'Add Patient'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Floating Create Login Account Panel */}
        {loginOpen && (
          <div id="login-panel"
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            style={{ top: '64px', animation: 'slideDown 0.18s ease-out' }}>
            <div className="flex items-center justify-between px-6 py-3.5" style={{ backgroundColor: '#3b82f6' }}>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-white" />
                <h2 className="text-sm font-semibold text-white tracking-wide">Create Login Account</h2>
              </div>
              <button onClick={() => { setLoginOpen(false); setShowPass(false); }} className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-6 py-4 bg-white">
              <div className="mb-4 rounded-lg border border-slate-200 px-4 py-3 bg-blue-50 text-sm text-black">
                Creating a portal login for <strong>{loginTarget?.firstName} {loginTarget?.lastName}</strong>.
                This account will have the <strong>Patient</strong> role.
              </div>
              <form onSubmit={handleCreateLogin} className="space-y-4">
                {loginErr && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs"><span className="font-semibold">Error:</span> {loginErr}</div>}

                <Input
                  label="Username"
                  required
                  labelClassName="!text-black"
                  className="!bg-white !text-black border-slate-300"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="e.g. john.doe"
                />
                <Input
                  label="Password"
                  type={showPass ? 'text' : 'password'}
                  required
                  labelClassName="!text-black"
                  className="!bg-white !text-black border-slate-300"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min 8 characters"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" type="button" onClick={() => { setLoginOpen(false); setShowPass(false); }}>Cancel</Button>
                  <Button type="submit" style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none' }}>Create Login</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Patient Table ── */}
        <Card>
          {loading ? (
            <CardBody><div className="flex justify-center py-16"><Spinner size="lg" /></div></CardBody>
          ) : paginated.length === 0 ? (
            <CardBody>
              <EmptyState
                icon={Users}
                title="No patients found"
                description={search ? 'Try adjusting your search or filter.' : 'Add your first patient to get started.'}
                action={!search && isAdmin && (
                  <Button onClick={openAdd}>
                    <Plus className="h-4 w-4" /> Add Patient
                  </Button>
                )}
              />
            </CardBody>
          ) : (
            <>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Patient</Th>
                    <Th>MRN</Th>
                    <Th>Gender</Th>
                    <Th>Age / DOB</Th>
                    <Th>Contact</Th>
                    <Th>Blood Type</Th>
                    {isAdmin && <Th>Login</Th>}
                    {isAdmin && <Th className="w-16"></Th>}
                  </Tr>
                </Thead>
                <Tbody>
                  {paginated.map((p) => (
                    <Tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                            {p.firstName?.[0]}{p.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium">{p.firstName} {p.lastName}</p>
                          </div>
                        </div>
                      </Td>
                      <Td><span className="font-mono text-xs text-muted-foreground">{String(p.id).padStart(8, '0')}</span></Td>
                      <Td>{p.gender ?? '—'}</Td>
                      <Td>
                        <span>{calcAge(p.dateOfBirth)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.dateOfBirth ? format(new Date(p.dateOfBirth), 'MMM dd, yyyy') : '—'}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-muted-foreground">
                          {p.contactInformation?.phone || p.phone || '—'}
                        </span>
                      </Td>
                      <Td>
                        {p.bloodType ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-white border border-slate-200 text-[#3b82f6] shadow-sm">
                            {p.bloodType}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </Td>
                      {isAdmin && (
                        <Td>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLoginTarget(p);
                              setLoginForm({ username: `${p.firstName?.toLowerCase()}${p.lastName?.toLowerCase()}`, password: '' });
                              setLoginErr('');
                              setLoginOpen(true);
                            }}
                            style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                            onMouseDown={(e) => e.target.style.backgroundColor = '#2563eb'}
                            onMouseUp={(e) => e.target.style.backgroundColor = '#3b82f6'}
                          >
                            <KeyRound className="h-3 w-3" /> Create Login
                          </Button>
                        </Td>
                      )}
                      {isAdmin && (
                        <Td>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete patient"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </Td>
                      )}
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-8 w-8 rounded-md border border-input flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-foreground px-2">{page} / {totalPages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="h-8 w-8 rounded-md border border-input flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Dimmer for delete panel — fixed and very light to keep list visible */}
        {deleteId && (
          <div className="fixed inset-0 z-[60] bg-slate-900/5 transition-opacity" onClick={() => setDeleteId(null)} />
        )}

        {/* ── Bespoke Delete Confirmation Panel (No shadow, White Header, Red Text) ── */}
        {deleteId && (
          <div
            id="delete-patient-panel"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[70] bg-white border border-slate-300 rounded-xl overflow-hidden shadow-none"
            style={{ animation: 'slideDown 0.18s ease-out' }}
          >
            {/* Panel header: White background with Red text */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
              <h2 className="text-base font-bold text-red-600 tracking-tight">Delete Patient</h2>
              <button
                onClick={() => setDeleteId(null)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="px-6 py-8 bg-white text-align-left">
              <p className="text-sm text-slate-600 leading-relaxed mb-8">
                Are you sure you want to permanently delete this patient and all associated records? <br />
                <span className="font-semibold text-slate-900">This action cannot be undone.</span>
              </p>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full h-10 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Delete Permanently
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div> {/* end relative wrapper */}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PatientsList;
