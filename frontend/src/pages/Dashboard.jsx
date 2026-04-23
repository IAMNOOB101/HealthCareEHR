import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Users, CalendarDays, FlaskConical, Pill,
  ArrowRight, Activity, TrendingUp, Clock, ShieldCheck, FileText,
} from 'lucide-react';
import { fetchPatients } from '../store/slices/patientSlice';
import { fetchAppointments } from '../store/slices/appointmentSlice';
import { fetchDoctors } from '../store/slices/doctorSlice';
import { setAllLabOrders, setAllImagingOrders } from '../store/slices/ordersSlice';
import { fetchAllPrescriptions } from '../store/slices/medicationsSlice';
import { labOrderService, imagingOrderService } from '../api/order.service.js';
import { Card, CardBody, CardHeader, Spinner, Badge, statusVariant } from '../components/ui';
import { format, isToday, parseISO } from 'date-fns';

const toArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  return [];
};

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, gradient, onClick, loading }) => (
  <div
    onClick={onClick}
    className="relative overflow-hidden rounded-xl p-6 cursor-pointer group transition-all hover:shadow-lg hover:-translate-y-0.5"
    style={{ background: gradient }}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-white/80 mb-1">{label}</p>
        {loading ? (
          <div className="h-8 w-16 rounded bg-white/20 animate-pulse" />
        ) : (
          <p className={typeof value === 'string' && isNaN(Number(value)) ? "text-lg font-semibold text-white mt-1.5 leading-tight" : "text-3xl font-bold text-white"}>
            {value ?? '—'}
          </p>
        )}
      </div>
      <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
    <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
      <ArrowRight className="h-4 w-4 text-white/70" />
    </div>
  </div>
);

// ── Quick Action ─────────────────────────────────────────────────────────────
const QuickAction = ({ label, icon: Icon, onClick, color }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 rounded-xl border p-5 text-sm font-medium transition-all hover:shadow-sm hover:-translate-y-0.5 ${color}`}
  >
    <Icon className="h-6 w-6" />
    <span>{label}</span>
  </button>
);

// ── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { list: patients, loading: pLoading } = useSelector((s) => s.patients);
  const { list: appointments, loading: aLoading } = useSelector((s) => s.appointments);
  const { allLabOrders, allImagingOrders } = useSelector((s) => s.orders);
  const { list: doctors } = useSelector((s) => s.doctors);
  const { prescriptions } = useSelector((s) => s.medications);

  useEffect(() => {
    dispatch(fetchPatients());
    dispatch(fetchAppointments());
    dispatch(fetchDoctors());
    dispatch(fetchAllPrescriptions());
    labOrderService.getAll({ limit: 1000 })
      .then((res) => dispatch(setAllLabOrders(toArray(res))))
      .catch(() => { });
    imagingOrderService.getAll({ limit: 1000 })
      .then((res) => dispatch(setAllImagingOrders(toArray(res))))
      .catch(() => { });
  }, [dispatch]);

  const isAdmin = user?.roleName?.toLowerCase() === 'admin';
  const isPatient = user?.roleName?.toLowerCase() === 'patient';
  const activeDoctor = doctors.find(
    (d) => `dr.${d.firstName?.toLowerCase()}${d.lastName?.toLowerCase()}` === user?.username?.toLowerCase()
  );

  // Find patient record for logged-in patient
  const myPatientRecord = isPatient
    ? patients.find((p) => `${p.firstName?.toLowerCase()}${p.lastName?.toLowerCase()}` === user?.username?.toLowerCase())
    : null;

  let dashboardAppointments = appointments;
  let dashboardLabOrders = allLabOrders;
  let dashboardImagingOrders = allImagingOrders;
  let dashboardPrescriptions = prescriptions;

  if (isPatient && myPatientRecord) {
    dashboardAppointments = appointments.filter(a => String(a.patientId) === String(myPatientRecord.id));
    dashboardLabOrders = allLabOrders.filter(o => String(o.patientId) === String(myPatientRecord.id));
    dashboardImagingOrders = allImagingOrders.filter(o => String(o.patientId) === String(myPatientRecord.id));
    dashboardPrescriptions = prescriptions.filter(rx => String(rx.patientId) === String(myPatientRecord.id));
  } else if (isPatient && !myPatientRecord) {
    dashboardAppointments = [];
    dashboardLabOrders = [];
    dashboardImagingOrders = [];
    dashboardPrescriptions = [];
  } else if (!isAdmin && activeDoctor) {
    dashboardAppointments = appointments.filter(a => String(a.doctorId) === String(activeDoctor.id));
    dashboardLabOrders = allLabOrders.filter(o => String(o.doctorId) === String(activeDoctor.id));
    dashboardImagingOrders = allImagingOrders.filter(o => String(o.doctorId) === String(activeDoctor.id));
    dashboardPrescriptions = prescriptions.filter(rx => String(rx.doctorId) === String(activeDoctor.id));
  } else if (!isAdmin && !activeDoctor && doctors.length > 0) {
    dashboardAppointments = [];
    dashboardLabOrders = [];
    dashboardImagingOrders = [];
    dashboardPrescriptions = [];
  }

  // Today's appointments
  const todayAppts = dashboardAppointments.filter((a) => {
    try { return isToday(parseISO(a.appointmentDate || a.date)); }
    catch { return false; }
  });

  const pendingAppts = dashboardAppointments.filter(
    (a) => a.status?.toLowerCase() === 'scheduled'
  ).length;

  // Patient-specific stats
  const activePrescriptions = dashboardPrescriptions.filter(
    (rx) => ['active', 'upcoming'].includes((rx.status || '').toLowerCase())
  ).length;

  const pendingOrders = [...dashboardLabOrders, ...dashboardImagingOrders].filter(
    (o) => !['completed', 'cancelled', 'rejected'].includes((o.status || '').toLowerCase())
  ).length;

  const recentPatients = [...patients].slice(0, 6);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getPatientName = (pid) => {
    const p = patients.find((pt) => String(pt.id) === String(pid));
    return p ? `${p.firstName} ${p.lastName}` : `Patient #${pid}`;
  };

  const formatApptTime = (s) => {
    if (!s || !s.includes('T')) return '';
    try {
      return format(parseISO(s), 'h:mm a');
    } catch {
      return '';
    }
  };

  const _rawActiveOrdersCount = [
    ...dashboardLabOrders,
    ...dashboardImagingOrders
  ].filter((o) => (o.status || '').toLowerCase() !== 'completed').length;

  const activeOrdersCountDisplay = _rawActiveOrdersCount > 0 ? _rawActiveOrdersCount : 'No orders available';

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-8 text-white shadow-lg">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-20 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative z-10">
          <p className="text-blue-200 text-sm font-medium mb-1">
            {format(new Date(), "EEEE, MMMM do yyyy")}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold">
            {greeting()}, {user?.username || 'Doctor'} 👋
          </h1>
          {!isAdmin && !isPatient && (
            <p className="mt-2 text-blue-100 text-sm max-w-lg">
              Here's your clinical overview. You have{' '}
              <span className="font-semibold text-white">{todayAppts.length}</span>{' '}
              {todayAppts.length === 0 ? 'appointments scheduled for today.' : `appointment${todayAppts.length !== 1 ? 's' : ''} scheduled for today.`}
            </p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {!isPatient && (
          <StatCard
            label="Total Patients" value={patients.length} icon={Users}
            gradient="linear-gradient(135deg, #3b82f6, #2563eb)"
            loading={pLoading} onClick={() => navigate('/patients')}
          />
        )}
        <StatCard
          label={isPatient ? 'Your Appointments' : "Today's Appointments"}
          value={isPatient ? dashboardAppointments.length : todayAppts.length}
          icon={CalendarDays}
          gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
          loading={aLoading} onClick={() => navigate('/appointments')}
        />
        <StatCard
          label={isPatient ? 'Upcoming / Scheduled' : 'Scheduled (Pending)'}
          value={pendingAppts}
          icon={Clock}
          gradient="linear-gradient(135deg, #f59e0b, #d97706)"
          loading={aLoading} onClick={() => navigate('/appointments')}
        />
        {isPatient && (
          <StatCard
            label="Active Prescriptions"
            value={activePrescriptions}
            icon={Pill}
            gradient="linear-gradient(135deg, #10b981, #059669)"
            onClick={() => navigate('/medications')}
          />
        )}
        {isPatient && (
          <StatCard
            label="Pending Orders"
            value={pendingOrders}
            icon={FlaskConical}
            gradient="linear-gradient(135deg, #3b82f6, #2563eb)"
            onClick={() => navigate('/orders')}
          />
        )}
        {!isPatient && (
          <StatCard
            label="Lab & Imaging Orders" value={activeOrdersCountDisplay} icon={FlaskConical}
            gradient="linear-gradient(135deg, #10b981, #059669)"
            onClick={() => navigate('/orders')}
          />
        )}
      </div>

      {/* Main content: Recent Patients + Today's Schedule */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent Patients */}
        {!isPatient && (
          <div className="xl:col-span-2">
            <Card>
              <CardHeader
                action={
                  <button onClick={() => navigate('/patients')} className="text-sm text-primary hover:underline flex items-center gap-1">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                }
              >
                <p className="font-semibold text-foreground">Recent Patients</p>
                <p className="text-xs text-muted-foreground mt-0.5">{patients.length} total registered</p>
              </CardHeader>
              <CardBody className="p-0">
                {pLoading ? (
                  <div className="flex justify-center py-10"><Spinner /></div>
                ) : recentPatients.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    No patients registered yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentPatients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/patients/${p.id}`)}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 cursor-pointer transition-colors group"
                      >
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                          {p.firstName?.[0]}{p.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.gender ?? '—'} · {p.dateOfBirth ? format(new Date(p.dateOfBirth), 'MMM dd, yyyy') : 'DOB unknown'}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* Today's Schedule */}
        <div>
          <Card>
            <CardHeader>
              <p className="font-semibold text-foreground">Today's Schedule</p>
              <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(), 'MMM d, yyyy')}</p>
            </CardHeader>
            <CardBody className="p-0">
              {aLoading ? (
                <div className="flex justify-center py-8"><Spinner size="sm" /></div>
              ) : todayAppts.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  No appointments today.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {todayAppts.slice(0, 6).map((a) => (
                    <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="text-xs text-muted-foreground w-14 flex-shrink-0 font-semibold" style={{ fontFamily: "'Calibri', 'Segoe UI', sans-serif" }}>
                        {formatApptTime(a.appointmentDate || a.date)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {a.patientName || getPatientName(a.patientId)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{a.reason || a.type || 'Appointment'}</p>
                      </div>
                      <Badge variant={statusVariant(a.status)} className="!bg-white shadow-sm font-semibold">{a.status || 'Scheduled'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div >
      </div >

      {/* Quick Actions — Admin/Doctor */}
      {!isPatient && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction label="Patients" icon={Users} onClick={() => navigate('/patients')} color="border-blue-200   bg-blue-50   text-blue-700   hover:bg-blue-100" />
            <QuickAction label="Appointments" icon={CalendarDays} onClick={() => navigate('/appointments')} color="border-purple-200  bg-purple-50  text-purple-700  hover:bg-purple-100" />
            <QuickAction label="Lab Orders" icon={FlaskConical} onClick={() => navigate('/orders')} color="border-green-200  bg-green-50  text-green-700   hover:bg-green-100" />
            <QuickAction label="Prescriptions" icon={Pill} onClick={() => navigate('/medications')} color="border-amber-200  bg-amber-50  text-amber-700   hover:bg-amber-100" />
          </div>
        </div>
      )}

      {/* Patient Quick Navigation */}
      {isPatient && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction label="Your Profile" icon={Users} onClick={() => navigate('/profile')} color="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" />
            <QuickAction label="Your Appointments" icon={CalendarDays} onClick={() => navigate('/appointments')} color="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100" />
            <QuickAction label="Your Orders" icon={FlaskConical} onClick={() => navigate('/orders')} color="border-green-200 bg-green-50 text-green-700 hover:bg-green-100" />
            <QuickAction label="Your Medications" icon={Pill} onClick={() => navigate('/medications')} color="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" />
          </div>
        </div>
      )}
    </div >
  );
};

export default Dashboard;
