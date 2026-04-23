import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Mail, Eye, EyeOff, Loader2, ShieldCheck, CalendarDays, FileText } from 'lucide-react';
import { loginPortalUser } from '../../store/slices/portalAuthSlice';

const FEATURES = [
  { icon: CalendarDays, text: 'View and manage your appointments' },
  { icon: FileText,     text: 'Access your health records & prescriptions' },
  { icon: ShieldCheck,  text: 'Secure HIPAA-compliant patient access' },
];

const PatientPortalLogin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.portalAuth);

  const [form,     setForm]     = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [localErr, setLocalErr] = useState('');

  const handleChange = (e) => {
    setLocalErr('');
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setLocalErr('Please enter your email and password.'); return; }
    const result = await dispatch(loginPortalUser(form));
    if (loginPortalUser.fulfilled.match(result)) {
      navigate('/portal/dashboard');
    } else {
      setLocalErr(result.payload || 'Invalid credentials. Please try again.');
    }
  };

  const displayError = localErr || (typeof error === 'string' ? error : null);

  return (
    <div className="min-h-screen flex">
      {/* Left panel — green gradient to distinguish from staff blue */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 flex-col items-center justify-center p-12 text-white">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white/5 translate-x-1/3 translate-y-1/3" />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Heart className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Patient Portal</h1>
              <p className="text-emerald-200 text-xs tracking-wide">Healthcare EHR</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Your Health,<br />Your Access
          </h2>
          <p className="text-emerald-100 text-base leading-relaxed mb-10">
            View your appointments, prescriptions, lab results and health records — all in one secure place.
          </p>
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm text-emerald-100">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-8 left-12 text-emerald-300 text-xs">
          Patient Portal — Secure Access
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Patient Portal</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground mt-1 text-sm">Sign in to your patient account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email Address</label>
              <input id="email" name="email" type="email" autoComplete="email" autoFocus
                value={form.email} onChange={handleChange} placeholder="patient@email.com"
                className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <input id="password" name="password" type={showPass ? 'text' : 'password'} autoComplete="current-password"
                  value={form.password} onChange={handleChange} placeholder="Enter your password"
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-4 pr-11 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40" />
                <button type="button" onClick={() => setShowPass(v => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="text-right">
                <Link to="/portal/forgot-password" className="text-xs text-emerald-600 hover:underline">Forgot password?</Link>
              </div>
            </div>

            {displayError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{displayError}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</> : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have a portal account?{' '}
            <Link to="/portal/register" className="text-emerald-600 font-medium hover:underline">Register now</Link>
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Are you a staff member?{' '}
            <Link to="/login" className="text-primary hover:underline">Staff login →</Link>
          </p>
          <p className="mt-6 text-center text-xs text-muted-foreground">Protected by HIPAA-compliant security protocols</p>
        </div>
      </div>
    </div>
  );
};

export default PatientPortalLogin;
