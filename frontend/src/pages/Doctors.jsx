import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDoctors, createDoctor, createDoctorLogin } from '../store/slices/doctorSlice';
import { Stethoscope, Plus, Search, KeyRound, X, Eye, EyeOff } from 'lucide-react';
import {
  PageHeader, Button, Card, CardBody, Input, Select, Textarea,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Spinner, EmptyState, Alert,
} from '../components/ui';

const EMPTY_FORM = {
  firstName: '', lastName: '', specialization: '', department: '',
  phone: '', email: '', licenseNumber: '',
};

const SPECIALTIES = [
  'General Practice', 'Internal Medicine', 'Cardiology', 'Neurology',
  'Oncology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'Radiology',
  'Surgery', 'Dermatology', 'Endocrinology', 'Gastroenterology',
  'Ophthalmology', 'Urology', 'Emergency Medicine',
];

const Doctors = () => {
  const dispatch = useDispatch();
  const { list: doctors, loading, saving, error } = useSelector((s) => s.doctors);
  const authUser = useSelector((s) => s.auth?.user);
  const isAdmin = authUser?.roleName?.toLowerCase() === 'admin';

  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState('');
  const [success, setSuccess] = useState('');
  // Doctor login creation
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginTarget, setLoginTarget] = useState(null); // { id, firstName, lastName }
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginErr, setLoginErr] = useState('');
  const [loginOk, setLoginOk] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => { dispatch(fetchDoctors()); }, [dispatch]);

  const filtered = doctors.filter((d) => {
    const name = `${d.firstName} ${d.lastName} ${d.specialization || ''}`.toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormErr('');
    if (!form.firstName || !form.lastName || !form.specialization) {
      setFormErr('First name, last name and specialty are required.');
      return;
    }
    const result = await dispatch(createDoctor(form));
    if (createDoctor.fulfilled.match(result)) {
      setSuccess('Doctor added successfully.');
      setAddOpen(false);
      setForm(EMPTY_FORM);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setFormErr(result.payload || 'Failed to add doctor.');
    }
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
    const result = await dispatch(createDoctorLogin({ username: loginForm.username.trim(), password: loginForm.password }));
    if (createDoctorLogin.fulfilled.match(result)) {
      setLoginOk(`Login account created for Dr. ${loginTarget?.firstName} ${loginTarget?.lastName}. Username: ${loginForm.username}`);
      setLoginOpen(false);
      setLoginForm({ username: '', password: '' });
      setTimeout(() => setLoginOk(''), 6000);
    } else {
      setLoginErr(result.payload || 'Failed to create login account.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Doctors"
        subtitle={`${doctors.length} clinical staff members`}
        action={
          isAdmin && (
            <Button onClick={() => { setForm(EMPTY_FORM); setFormErr(''); setLoginOpen(false); setAddOpen(true); setTimeout(() => document.getElementById("add-doctor-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}>
              <Plus className="h-4 w-4" /> Add Doctor
            </Button>
          )
        }
      />

      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}
      {loginOk && <Alert variant="success" onClose={() => setLoginOk('')}>{loginOk}</Alert>}
      {error && <Alert variant="error">{typeof error === 'string' ? error : 'Failed to load doctors.'}</Alert>}

      {/* Relative wrapper for floating panels */}
      <div className="relative">

        {/* Search */}
        <Card>
          <CardBody className="py-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or specialty…"
                className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </CardBody>
        </Card>

        {/* Click-away dimmer */}
        {(addOpen || loginOpen) && (
          <div className="absolute inset-0 z-20" style={{ top: '56px' }} onClick={() => { setAddOpen(false); setLoginOpen(false); }} />
        )}

        {/* Floating Add Doctor Panel */}
        {addOpen && (
          <div id="add-doctor-panel"
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-2xl z-30 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            style={{ top: '64px', animation: 'slideDown 0.18s ease-out' }}>
            <div className="flex items-center justify-between px-6 py-3.5" style={{ backgroundColor: '#3b82f6' }}>
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-white" />
                <h2 className="text-sm font-semibold text-white tracking-wide">Add New Doctor</h2>
              </div>
              <button onClick={() => setAddOpen(false)} className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-6 py-4 bg-white">
              <form onSubmit={handleAdd} className="space-y-4">
                {formErr && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs"><span className="font-semibold">Error:</span> {formErr}</div>}

                <div className="grid grid-cols-2 gap-4">
                  <Input label="First Name" required labelClassName="!text-black" className="!bg-white !text-black border-slate-300" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
                  <Input label="Last Name" required labelClassName="!text-black" className="!bg-white !text-black border-slate-300" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
                </div>

                <Select label="Specialty" required labelClassName="!text-black" className="!bg-white !text-black border-slate-300" value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}>
                  <option value="">Select specialty…</option>
                  {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
                </Select>

                <Input label="Department" labelClassName="!text-black" className="!bg-white !text-black border-slate-300" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder="e.g. Cardiology Ward" />

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Phone" type="tel" labelClassName="!text-black" className="!bg-white !text-black border-slate-300" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  <Input label="Email" type="email" labelClassName="!text-black" className="!bg-white !text-black border-slate-300" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>

                <Input label="License Number" labelClassName="!text-black" className="!bg-white !text-black border-slate-300" value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} placeholder="e.g. MD-123456" />

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving} className="bg-blue-500 text-white hover:bg-blue-600">{saving ? 'Saving…' : 'Add Doctor'}</Button>
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
                Creating a staff login for <strong>Dr. {loginTarget?.firstName} {loginTarget?.lastName}</strong>.
                This account will have the <strong>Doctor</strong> role and can log in to the EHR system.
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
                  placeholder="e.g. dr.smith"
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

        {/* Table */}
        <Card>
          {loading ? (
            <CardBody><div className="flex justify-center py-16"><Spinner size="lg" /></div></CardBody>
          ) : filtered.length === 0 ? (
            <CardBody>
              <EmptyState icon={Stethoscope} title="No doctors found"
                description={isAdmin ? "Add clinical staff to get started." : "No clinical staff records available."}
                action={isAdmin && <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add Doctor</Button>}
              />
            </CardBody>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Doctor</Th>
                  <Th>Specialty</Th>
                  <Th>Department</Th>
                  <Th>License #</Th>
                  <Th>Contact</Th>
                  {isAdmin && <Th>Login</Th>}
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((d) => (
                  <Tr key={d.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                          {d.firstName?.[0]}{d.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium">Dr. {d.firstName} {d.lastName}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>{d.specialization || '—'}</Td>
                    <Td className="text-muted-foreground">{d.department || '—'}</Td>
                    <Td><span className="font-mono" style={{ fontFamily: 'Calibri, sans-serif' }}>{d.licenseNumber || '—'}</span></Td>
                    <Td className="text-xs text-muted-foreground">{d.email || d.phone || '—'}</Td>
                    {isAdmin && (
                      <Td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLoginTarget(d);
                            setLoginForm({ username: `dr.${d.firstName?.toLowerCase()}${d.lastName?.toLowerCase()}`, password: '' });
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
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>

      </div>
    </div>
  );
};

export default Doctors;
