import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
  Heart, CalendarDays, FileText, FlaskConical, Pill,
  LogOut, User, ArrowRight,
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logoutPortal } from '../../store/slices/portalAuthSlice';

const QuickCard = ({ icon: Icon, label, to, color }) => {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(to)}
      className={`flex flex-col items-center gap-3 rounded-xl border p-6 text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5 ${color}`}>
      <Icon className="h-7 w-7" />
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 opacity-60" />
    </button>
  );
};

const PatientDashboard = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { portalUser } = useSelector((s) => s.portalAuth);

  const handleLogout = () => {
    dispatch(logoutPortal());
    navigate('/portal/login');
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Heart className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-foreground">Patient Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{portalUser?.patientName || 'Patient'}</span>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 p-8 text-white shadow-lg">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute bottom-0 right-20 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative z-10">
            <p className="text-emerald-200 text-sm font-medium mb-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold">
              {greeting()}, {portalUser?.patientName?.split(' ')[0] || 'Patient'} 👋
            </h1>
            <p className="mt-2 text-emerald-100 text-sm">
              Welcome to your personal health portal. Access your records and manage your care.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Your Health Records</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickCard icon={CalendarDays} label="Appointments"  to="/portal/appointments" color="border-blue-200 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20" />
            <QuickCard icon={FileText}     label="Health Records" to="/portal/records"      color="border-purple-200 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/20" />
            <QuickCard icon={FlaskConical} label="Lab Results"   to="/portal/lab-results"  color="border-amber-200 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20" />
            <QuickCard icon={Pill}         label="Prescriptions" to="/portal/prescriptions" color="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20" />
          </div>
        </div>

        {/* Patient Info */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
              {portalUser?.patientName?.charAt(0) || 'P'}
            </div>
            <div>
              <p className="font-semibold text-foreground">{portalUser?.patientName || 'Patient'}</p>
              <p className="text-sm text-muted-foreground">{portalUser?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Patient ID:</span> <span className="font-mono font-medium ml-2">{portalUser?.patientId}</span></div>
            <div><span className="text-muted-foreground">Portal Account:</span> <span className="text-emerald-600 font-medium ml-2">Active</span></div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Protected by HIPAA-compliant security protocols · Healthcare EHR Patient Portal
        </p>
      </main>
    </div>
  );
};

export default PatientDashboard;
