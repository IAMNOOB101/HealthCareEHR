import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Eye, EyeOff, Loader2, CheckCircle, Info } from 'lucide-react';
import { registerPortalUser } from '../../store/slices/portalAuthSlice';

const PatientPortalRegister = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((s) => s.portalAuth);

  const [form,      setForm]      = useState({ patientId: '', email: '', password: '', confirmPassword: '' });
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  const handleChange = (e) => {
    setError('');
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.patientId || !form.email || !form.password) { setError('All fields are required.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }

    const result = await dispatch(registerPortalUser({
      patientId: Number(form.patientId),
      email:     form.email.trim(),
      password:  form.password,
    }));

    if (registerPortalUser.fulfilled.match(result)) {
      setSuccess(true);
    } else {
      setError(result.payload || 'Registration failed. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md text-center space-y-6 animate-fade-in">
          <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-12 w-12 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Account Created!</h2>
            <p className="text-muted-foreground mt-2">Your patient portal account is ready. You can now sign in.</p>
          </div>
          <button onClick={() => navigate('/portal/login')}
            className="w-full h-11 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-semibold shadow-sm hover:bg-emerald-700 transition-all">
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
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
          <h2 className="text-4xl font-bold leading-tight mb-6">Create Your Patient Account</h2>
          <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm space-y-3">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 mt-0.5 flex-shrink-0 text-emerald-200" />
              <div>
                <p className="text-sm font-semibold">Where's my Patient ID?</p>
                <p className="text-emerald-200 text-xs mt-1 leading-relaxed">
                  Your Patient ID is a number that the clinic provides when you register in person. Check your clinic registration card, discharge summary, or appointment confirmation letter.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Patient Portal</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
            <p className="text-muted-foreground mt-1 text-sm">Register with your clinic-provided Patient ID to access your records.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="patientId" className="text-sm font-medium text-foreground">
                Patient ID <span className="text-muted-foreground font-normal">(from your clinic)</span>
              </label>
              <input id="patientId" name="patientId" type="number" autoFocus
                value={form.patientId} onChange={handleChange} placeholder="e.g. 42"
                className="flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email Address</label>
              <input id="email" name="email" type="email" autoComplete="email"
                value={form.email} onChange={handleChange} placeholder="patient@email.com"
                className="flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <input id="password" name="password" type={showPass ? 'text' : 'password'}
                  value={form.password} onChange={handleChange} placeholder="Min 8 characters"
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-4 pr-11 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40" />
                <button type="button" onClick={() => setShowPass(v => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password"
                value={form.confirmPassword} onChange={handleChange} placeholder="Repeat your password"
                className="flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40" />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Creating account…</> : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already registered?{' '}
            <Link to="/portal/login" className="text-emerald-600 font-medium hover:underline">Sign in</Link>
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Are you a staff member?{' '}
            <Link to="/login" className="text-primary hover:underline">Staff login →</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PatientPortalRegister;
