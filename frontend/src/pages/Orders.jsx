import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createLabOrder, createImagingOrder,
  updateLabOrder, deleteLabOrder,
  updateImagingOrder, deleteImagingOrder,
  setAllLabOrders, setAllImagingOrders,
} from '../store/slices/ordersSlice';
import { fetchPatients } from '../store/slices/patientSlice';
import { fetchDoctors } from '../store/slices/doctorSlice';
import { labOrderService, imagingOrderService } from '../api/order.service.js';
import { Activity, Plus, Search, FlaskConical, Scan, X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  PageHeader, Button, Card, CardBody,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Spinner, EmptyState, Alert,
  Tabs, TabList, Tab, TabPanel, statusVariant, Modal,
} from '../components/ui';
import { format } from 'date-fns';

const LAB_PANELS = ['Complete Blood Count (CBC)', 'Basic Metabolic Panel (BMP)', 'Comprehensive Metabolic Panel (CMP)', 'Lipid Panel', 'Thyroid Function', 'Liver Function', 'Urinalysis', 'HbA1c', 'PT/INR', 'Blood Culture'];
const IMG_TYPES = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'PET Scan', 'Mammography', 'Echocardiogram'];
const PRIORITIES = ['Routine', 'Urgent', 'STAT'];

const LAB_FORM = { patientId: '', doctorId: '', panelName: '', priority: 'Routine', clinicalIndication: '', notes: '' };
const IMG_FORM = { patientId: '', doctorId: '', imagingType: '', bodyPart: '', priority: 'Routine', clinicalIndication: '', notes: '' };

const PAGE_SIZE = 12;

const toArray = (res) => { if (Array.isArray(res)) return res; if (Array.isArray(res?.data)) return res.data; if (Array.isArray(res?.items)) return res.items; return []; };

const F = "flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400";
const FTA = "flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none";
const LBL = "text-xs font-semibold text-slate-700";

const Orders = () => {
  const dispatch = useDispatch();
  const authUser = useSelector((s) => s.auth?.user);
  const { allLabOrders, allImagingOrders, loading, error } = useSelector((s) => s.orders);
  const { list: patients } = useSelector((s) => s.patients);
  const { list: doctors } = useSelector((s) => s.doctors);

  const [search, setSearch] = useState('');
  const [labPage, setLabPage] = useState(1);
  const [imgPage, setImgPage] = useState(1);
  const [labOpen, setLabOpen] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);
  const [labForm, setLabForm] = useState(LAB_FORM);
  const [imgForm, setImgForm] = useState(IMG_FORM);
  const [editOrder, setEditOrder] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [formErr, setFormErr] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [uiError, setUiError] = useState('');

  const getStatusStyle = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'pending') return { color: '#eab308' }; // yellow
    if (s === 'in progress' || s === 'ordered') return { color: '#3b82f6' }; // blue
    if (s === 'completed') return { color: '#16a34a' }; // green
    if (s === 'rejected' || s === 'cancelled') return { color: '#dc2626' }; // red
    return {};
  };

  const getPriorityStyle = (priority) => {
    const p = priority?.toLowerCase() || '';
    if (p === 'stat') return { color: '#eab308' }; // yellow
    if (p === 'urgent') return { color: '#dc2626' }; // red
    if (p === 'routine') return { color: '#3b82f6' }; // blue
    return {};
  };

  useEffect(() => {
    dispatch(fetchPatients());
    dispatch(fetchDoctors());
    labOrderService.getAll({ limit: 1000 }).then((res) => dispatch(setAllLabOrders(toArray(res)))).catch(() => { });
    imagingOrderService.getAll({ limit: 1000 }).then((res) => dispatch(setAllImagingOrders(toArray(res)))).catch(() => { });
  }, [dispatch]);

  const getPatientName = (pid) => { const p = patients.find((pt) => String(pt.id) === String(pid)); return p ? `${p.firstName} ${p.lastName}` : `Patient #${pid}`; };
  const filterList = (list) => {
    if (!Array.isArray(list)) return [];
    if (!search) return list;
    return list.filter((item) =>
      getPatientName(item.patientId).toLowerCase().includes(search.toLowerCase()) ||
      (item.panelName || item.imagingType || item.testName || '').toLowerCase().includes(search.toLowerCase())
    );
  };

  const handleLabSubmit = async (e) => {
    e.preventDefault(); setFormErr('');
    if (!labForm.patientId) { setFormErr('Patient is required.'); return; }
    if (!labForm.doctorId) { setFormErr('Doctor is required.'); return; }
    if (!labForm.panelName) { setFormErr('Test panel is required.'); return; }
    const isUrine = labForm.panelName.toLowerCase().includes('urin');
    const backendTestType = isUrine ? 'Urine Test' : 'Blood Test';
    const payload = {
      patientId: Number(labForm.patientId),
      doctorId: Number(labForm.doctorId),
      panelName: labForm.panelName,
      testName: labForm.panelName,
      testType: backendTestType,
      orderDate: new Date().toISOString(),
      priority: labForm.priority || 'Routine',
      clinicalIndication: labForm.clinicalIndication || '',
    };
    const result = await dispatch(createLabOrder(payload));
    if (createLabOrder.fulfilled.match(result)) {
      setSuccess('Lab order created.'); setLabOpen(false); setLabForm(LAB_FORM);
      setTimeout(() => setSuccess(''), 4000);
    } else { setFormErr(result.payload || 'Failed.'); }
  };

  const handleImgSubmit = async (e) => {
    e.preventDefault(); setFormErr('');
    if (!imgForm.patientId) { setFormErr('Patient is required.'); return; }
    if (!imgForm.doctorId) { setFormErr('Doctor is required.'); return; }
    if (!imgForm.imagingType) { setFormErr('Imaging type is required.'); return; }
    const payload = {
      patientId: Number(imgForm.patientId),
      doctorId: Number(imgForm.doctorId),
      imagingType: imgForm.imagingType,
      bodyPart: imgForm.bodyPart || 'Not specified',
      priority: imgForm.priority || 'Routine',
      clinicalIndication: imgForm.clinicalIndication || '',
      clinicalReason: imgForm.clinicalIndication || '',  // backend alias
    };
    const result = await dispatch(createImagingOrder(payload));
    if (createImagingOrder.fulfilled.match(result)) {
      setSuccess('Imaging order created.'); setImgOpen(false); setImgForm(IMG_FORM);
      setTimeout(() => setSuccess(''), 4000);
    } else { setFormErr(result.payload || 'Failed.'); }
  };

  const openLab = () => { setLabForm(LAB_FORM); setFormErr(''); setImgOpen(false); setLabOpen(true); };
  const openImg = () => { setImgForm(IMG_FORM); setFormErr(''); setLabOpen(false); setImgOpen(true); };

  const openStatusEdit = (order, type) => {
    setEditOrder({ ...order, type });
    setEditStatus(order.status || (type === 'lab' ? 'Pending' : 'Ordered'));
  };

  const handleStatusUpdate = async () => {
    if (!editOrder) return;
    setUiError('');
    const action = editOrder.type === 'lab'
      ? updateLabOrder({ id: editOrder.id, data: { status: editStatus } })
      : updateImagingOrder({ id: editOrder.id, data: { status: editStatus } });

    const result = await dispatch(action);
    if (result.error) {
      setUiError(result.payload || 'Failed to update status');
    }
    setEditOrder(null);
  };

  const handleDelete = async (id, type) => {
    setUiError('');
    const action = type === 'lab' ? deleteLabOrder(id) : deleteImagingOrder(id);
    const result = await dispatch(action);
    if (result.error) {
      setUiError(result.payload || 'Failed to delete order. It may be locked.');
    } else {
      setDeleteMsg('Order got deleted');
      setTimeout(() => setDeleteMsg(''), 4000);
    }
  };

  const isAdmin = authUser?.roleName?.toLowerCase() === 'admin';
  const isPatient = authUser?.roleName?.toLowerCase() === 'patient';
  const activeDoctor = doctors.find(
    (d) => `dr.${d.firstName?.toLowerCase()}${d.lastName?.toLowerCase()}` === authUser?.username?.toLowerCase()
  );

  // Find the patient record for the logged-in patient user
  const myPatientRecord = isPatient
    ? patients.find((p) => `${p.firstName?.toLowerCase()}${p.lastName?.toLowerCase()}` === authUser?.username?.toLowerCase())
    : null;

  let displayedLabOrders = allLabOrders;
  let displayedImgOrders = allImagingOrders;

  if (isPatient) {
    displayedLabOrders = myPatientRecord
      ? allLabOrders.filter((o) => String(o.patientId) === String(myPatientRecord.id))
      : [];
    displayedImgOrders = myPatientRecord
      ? allImagingOrders.filter((o) => String(o.patientId) === String(myPatientRecord.id))
      : [];
  } else if (!isAdmin && activeDoctor) {
    displayedLabOrders = allLabOrders.filter((o) => String(o.doctorId) === String(activeDoctor.id));
    displayedImgOrders = allImagingOrders.filter((o) => String(o.doctorId) === String(activeDoctor.id));
  } else if (!isAdmin && !activeDoctor && doctors.length > 0) {
    displayedLabOrders = [];
    displayedImgOrders = [];
  }

  const fLab = filterList(displayedLabOrders);
  const fImg = filterList(displayedImgOrders);

  const labTotalPages = Math.max(1, Math.ceil(fLab.length / PAGE_SIZE));
  const imgTotalPages = Math.max(1, Math.ceil(fImg.length / PAGE_SIZE));

  const paginatedLab = fLab.slice((labPage - 1) * PAGE_SIZE, labPage * PAGE_SIZE);
  const paginatedImg = fImg.slice((imgPage - 1) * PAGE_SIZE, imgPage * PAGE_SIZE);

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={isPatient ? 'Your Orders' : 'Orders'}
        subtitle={isPatient ? undefined : 'Lab orders and imaging requests'}
        action={
          isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={openImg}><Plus className="h-4 w-4" /> Imaging</Button>
              <Button onClick={openLab}><Plus className="h-4 w-4" /> Lab Order</Button>
            </div>
          )
        }
      />

      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert variant="error">{typeof error === 'string' ? error : 'Failed to load orders.'}</Alert>}
      {uiError && <Alert variant="error" className="!bg-white !text-red-600 shadow-sm font-semibold" onClose={() => setUiError('')}>{uiError}</Alert>}
      {deleteMsg && <Alert variant="error" className="!bg-white !text-red-600 shadow-sm font-semibold" onClose={() => setDeleteMsg('')}>{deleteMsg}</Alert>}

      {/* Relative wrapper */}
      <div className="relative">

        {/* Search bar — hidden for patients */}
        {!isPatient && (
          <Card>
            <CardBody className="py-3">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input value={search} onChange={(e) => { setSearch(e.target.value); setLabPage(1); setImgPage(1); }} placeholder="Search orders…"
                  className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
            </CardBody>
          </Card>
        )}

        {/* Click-away dimmer */}
        {(labOpen || imgOpen || !!editOrder) && (
          <div className="absolute inset-0 z-20" style={{ top: '56px' }} onClick={() => { setLabOpen(false); setImgOpen(false); setEditOrder(null); }} />
        )}

        {/* Edit Status Floating Panel */}
        {editOrder && (
          <div id="status-panel"
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            style={{ top: '100px', animation: 'slideDown 0.18s ease-out' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3.5" style={{ backgroundColor: '#3b82f6' }}>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-white" />
                <h2 className="text-sm font-semibold text-white tracking-wide">Edit Status</h2>
              </div>
              <button onClick={() => setEditOrder(null)} className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6 bg-white">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className={LBL}>Update Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={F}>
                    {editOrder.type === 'lab' ? (
                      <>
                        <option value="Pending" style={{ color: '#eab308', fontWeight: 600 }}>Pending</option>
                        <option value="In Progress" style={{ color: '#3b82f6', fontWeight: 600 }}>In Progress</option>
                        <option value="Completed" style={{ color: '#16a34a', fontWeight: 600 }}>Completed</option>
                        <option value="Cancelled" style={{ color: '#dc2626', fontWeight: 600 }}>Cancelled</option>
                      </>
                    ) : (
                      <>
                        <option value="Ordered" style={{ color: '#3b82f6', fontWeight: 600 }}>Ordered</option>
                        <option value="Completed" style={{ color: '#16a34a', fontWeight: 600 }}>Completed</option>
                        <option value="Rejected" style={{ color: '#dc2626', fontWeight: 600 }}>Rejected</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button onClick={() => setEditOrder(null)}
                    className="h-8 px-4 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleStatusUpdate}
                    className="h-8 px-5 rounded-md text-xs font-semibold text-white shadow-sm transition-colors bg-blue-500 hover:bg-blue-600">
                    Save Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lab Order Panel */}
        {labOpen && (
          <div id="lab-panel"
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-2xl z-30 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            style={{ top: '64px', animation: 'slideDown 0.18s ease-out' }}>
            <div className="flex items-center justify-between px-6 py-3.5" style={{ backgroundColor: '#3b82f6' }}>
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-white" />
                <h2 className="text-sm font-semibold text-white tracking-wide">New Lab Order</h2>
              </div>
              <button onClick={() => setLabOpen(false)} className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-6 py-4 bg-white">
              <form onSubmit={handleLabSubmit} className="space-y-3">
                {formErr && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs"><span className="font-semibold">Error:</span> {formErr}</div>}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={LBL}>Patient <span className="text-red-500">*</span></label>
                    <select value={labForm.patientId} onChange={(e) => setLabForm((f) => ({ ...f, patientId: e.target.value }))} className={F}>
                      <option value="">Select patient…</option>
                      {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={LBL}>Doctor <span className="text-red-500">*</span></label>
                    <select value={labForm.doctorId} onChange={(e) => setLabForm((f) => ({ ...f, doctorId: e.target.value }))} className={F}>
                      <option value="">Select doctor…</option>
                      {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={LBL}>Test Panel <span className="text-red-500">*</span></label>
                    <select value={labForm.panelName} onChange={(e) => setLabForm((f) => ({ ...f, panelName: e.target.value }))} className={F}>
                      <option value="">Select panel…</option>
                      {LAB_PANELS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={LBL}>Priority</label>
                    <select value={labForm.priority} onChange={(e) => setLabForm((f) => ({ ...f, priority: e.target.value }))} className={F}>
                      {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={LBL}>Clinical Indication</label>
                  <textarea rows={2} value={labForm.clinicalIndication} onChange={(e) => setLabForm((f) => ({ ...f, clinicalIndication: e.target.value }))} placeholder="Reason for ordering…" className={FTA} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400"><span className="text-red-500">*</span> Required</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setLabOpen(false)} className="h-8 px-4 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit"
                      className="h-8 px-5 rounded-md text-xs font-semibold text-white shadow-sm transition-colors"
                      style={{ backgroundColor: '#3b82f6' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}>
                      Place Lab Order
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Imaging Order Panel */}
        {imgOpen && (
          <div id="img-panel"
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-2xl z-30 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            style={{ top: '64px', animation: 'slideDown 0.18s ease-out' }}>
            <div className="flex items-center justify-between px-6 py-3.5" style={{ backgroundColor: '#3b82f6' }}>
              <div className="flex items-center gap-2">
                <Scan className="h-4 w-4 text-white" />
                <h2 className="text-sm font-semibold text-white tracking-wide">New Imaging Order</h2>
              </div>
              <button onClick={() => setImgOpen(false)} className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-6 py-4 bg-white">
              <form onSubmit={handleImgSubmit} className="space-y-3">
                {formErr && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs"><span className="font-semibold">Error:</span> {formErr}</div>}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={LBL}>Patient <span className="text-red-500">*</span></label>
                    <select value={imgForm.patientId} onChange={(e) => setImgForm((f) => ({ ...f, patientId: e.target.value }))} className={F}>
                      <option value="">Select patient…</option>
                      {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={LBL}>Doctor <span className="text-red-500">*</span></label>
                    <select value={imgForm.doctorId} onChange={(e) => setImgForm((f) => ({ ...f, doctorId: e.target.value }))} className={F}>
                      <option value="">Select doctor…</option>
                      {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={LBL}>Imaging Type <span className="text-red-500">*</span></label>
                    <select value={imgForm.imagingType} onChange={(e) => setImgForm((f) => ({ ...f, imagingType: e.target.value }))} className={F}>
                      <option value="">Select type…</option>
                      {IMG_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={LBL}>Body Part</label>
                    <input value={imgForm.bodyPart} onChange={(e) => setImgForm((f) => ({ ...f, bodyPart: e.target.value }))} placeholder="e.g. Chest, Abdomen" className={F} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={LBL}>Priority</label>
                  <select value={imgForm.priority} onChange={(e) => setImgForm((f) => ({ ...f, priority: e.target.value }))} className={F}>
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={LBL}>Clinical Indication</label>
                  <textarea rows={2} value={imgForm.clinicalIndication} onChange={(e) => setImgForm((f) => ({ ...f, clinicalIndication: e.target.value }))} className={FTA} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400"><span className="text-red-500">*</span> Required</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setImgOpen(false)} className="h-8 px-4 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit"
                      className="h-8 px-5 rounded-md text-xs font-semibold text-white shadow-sm transition-colors"
                      style={{ backgroundColor: '#3b82f6' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}>
                      Place Imaging Order
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tabs + Tables */}
        <div className="mt-4">
          <Tabs defaultTab="lab">
            <TabList>
              <Tab id="lab">Lab Orders ({fLab.length})</Tab>
              <Tab id="imaging">Imaging ({fImg.length})</Tab>
            </TabList>

            <TabPanel id="lab">
              <Card>
                {loading ? <CardBody><div className="flex justify-center py-12"><Spinner size="lg" /></div></CardBody>
                  : fLab.length === 0
                    ? (
                      <CardBody>
                        {isAdmin ? (
                          <EmptyState icon={FlaskConical} title="No lab orders" description="Order the first lab test." action={<Button onClick={openLab}><Plus className="h-4 w-4" /> Lab Order</Button>} />
                        ) : (
                          <p className="text-center py-10 text-muted-foreground font-medium text-sm">
                            No orders are available for you
                          </p>
                        )}
                      </CardBody>
                    )
                    : <>
                      <Table>
                        <Thead><Tr>
                          {!isPatient && <Th>Patient</Th>}
                          <Th>Panel / Test</Th><Th>Priority</Th><Th>Ordered</Th><Th>Status</Th>
                          {!isPatient && <Th className="w-28">Actions</Th>}
                        </Tr></Thead>
                        <Tbody>
                          {paginatedLab.map((o) => (
                            <Tr key={o.id}>
                              {!isPatient && <Td><span className="font-medium">{getPatientName(o.patientId)}</span></Td>}
                              <Td>{o.panelName || o.testName || '—'}</Td>
                              <Td><Badge variant={o.priority === 'STAT' ? 'danger' : o.priority === 'Urgent' ? 'warning' : 'muted'} className="!bg-white border" style={getPriorityStyle(o.priority)}>{o.priority || 'Routine'}</Badge></Td>
                              <Td className="text-xs text-muted-foreground whitespace-nowrap">{o.createdAt ? format(new Date(o.createdAt), 'MMM dd, yyyy') : '—'}</Td>
                              <Td><Badge variant={statusVariant(o.status)} className="!bg-white border" style={getStatusStyle(o.status)}>{o.status || 'Ordered'}</Badge></Td>
                              {!isPatient && (
                                <Td>
                                  <div className="flex gap-1">
                                    <button onClick={() => openStatusEdit(o, 'lab')} className="px-2 py-1 text-xs rounded-md border border-input hover:bg-muted transition-colors">Edit</button>
                                    {isAdmin && (
                                      <button onClick={() => handleDelete(o.id, 'lab')} className="px-2 py-1 text-xs rounded-md border border-slate-200 bg-white text-black active:bg-red-600 active:text-white active:border-red-600 transition-all duration-200">Delete</button>
                                    )}
                                  </div>
                                </Td>
                              )}
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                      {labTotalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                          <p className="text-sm text-muted-foreground">
                            Showing {(labPage - 1) * PAGE_SIZE + 1}–{Math.min(labPage * PAGE_SIZE, fLab.length)} of {fLab.length}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setLabPage((p) => Math.max(1, p - 1))}
                              disabled={labPage === 1}
                              className="h-8 w-8 rounded-md border border-input flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm text-foreground px-2">{labPage} / {labTotalPages}</span>
                            <button
                              onClick={() => setLabPage((p) => Math.min(labTotalPages, p + 1))}
                              disabled={labPage === labTotalPages}
                              className="h-8 w-8 rounded-md border border-input flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>}
              </Card>
            </TabPanel>

            <TabPanel id="imaging">
              <Card>
                {loading ? <CardBody><div className="flex justify-center py-12"><Spinner size="lg" /></div></CardBody>
                  : fImg.length === 0
                    ? (
                      <CardBody>
                        {isAdmin ? (
                          <EmptyState icon={Scan} title="No imaging orders" description="Create an imaging request." action={<Button onClick={openImg}><Plus className="h-4 w-4" /> Imaging</Button>} />
                        ) : (
                          <p className="text-center py-10 text-muted-foreground font-medium text-sm">
                            No orders are available for you
                          </p>
                        )}
                      </CardBody>
                    )
                    : <>
                      <Table>
                        <Thead><Tr>
                          {!isPatient && <Th>Patient</Th>}
                          <Th>Type</Th><Th>Body Part</Th><Th>Priority</Th><Th>Ordered</Th><Th>Status</Th>
                          {!isPatient && <Th className="w-28">Actions</Th>}
                        </Tr></Thead>
                        <Tbody>
                          {paginatedImg.map((o) => (
                            <Tr key={o.id}>
                              {!isPatient && <Td><span className="font-medium">{getPatientName(o.patientId)}</span></Td>}
                              <Td>{o.imagingType || '—'}</Td>
                              <Td className="text-muted-foreground">{o.bodyPart || '—'}</Td>
                              <Td><Badge variant={o.priority === 'STAT' ? 'danger' : o.priority === 'Urgent' ? 'warning' : 'muted'} className="!bg-white border" style={getPriorityStyle(o.priority)}>{o.priority || 'Routine'}</Badge></Td>
                              <Td className="text-xs text-muted-foreground whitespace-nowrap">{o.createdAt ? format(new Date(o.createdAt), 'MMM dd, yyyy') : '—'}</Td>
                              <Td><Badge variant={statusVariant(o.status)} className="!bg-white border" style={getStatusStyle(o.status)}>{o.status || 'Ordered'}</Badge></Td>
                              {!isPatient && (
                                <Td>
                                  <div className="flex gap-1">
                                    <button onClick={() => openStatusEdit(o, 'img')} className="px-2 py-1 text-xs rounded-md border border-input hover:bg-muted transition-colors">Edit</button>
                                    {isAdmin && (
                                      <button onClick={() => handleDelete(o.id, 'img')} className="px-2 py-1 text-xs rounded-md border border-slate-200 bg-white text-black active:bg-red-600 active:text-white active:border-red-600 transition-all duration-200">Delete</button>
                                    )}
                                  </div>
                                </Td>
                              )}
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                      {imgTotalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                          <p className="text-sm text-muted-foreground">
                            Showing {(imgPage - 1) * PAGE_SIZE + 1}–{Math.min(imgPage * PAGE_SIZE, fImg.length)} of {fImg.length}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setImgPage((p) => Math.max(1, p - 1))}
                              disabled={imgPage === 1}
                              className="h-8 w-8 rounded-md border border-input flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm text-foreground px-2">{imgPage} / {imgTotalPages}</span>
                            <button
                              onClick={() => setImgPage((p) => Math.min(imgTotalPages, p + 1))}
                              disabled={imgPage === imgTotalPages}
                              className="h-8 w-8 rounded-md border border-input flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>}
              </Card>
            </TabPanel>


          </Tabs>
        </div>

      </div> {/* end relative wrapper */}

      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

export default Orders;
