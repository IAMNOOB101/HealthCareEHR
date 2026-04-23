import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Stethoscope, Mail, Key, Lock, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const STEPS = ['request', 'verify', 'reset', 'done'];

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step,      setStep]      = useState('request');
  const [username,  setUsername]  = useState('');
  const [email,     setEmail]     = useState('');
  const [otp,       setOtp]       = useState('');
  const [newPass,   setNewPass]   = useState('');
  const [confirmP,  setConfirmP]  = useState('');
  const [resetTok,  setResetTok]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  // ── Step 1: Request OTP ────────────────────────────────────────────────────
  const handleRequest = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !email.trim()) { setError('Both username and email are required.'); return; }
    setLoading(true);
    try {
      await axiosClient.post('/auth/forgot-password', { username: username.trim(), email: email.trim() });
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────────
  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) { setError('Please enter the OTP sent to your email.'); return; }
    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/verify-otp', { username: username.trim(), otp: otp.trim() });
      const token = res?.data?.resetSessionToken ?? res?.resetSessionToken;
      setResetTok(token);
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally { setLoading(false); }
  };

  // ── Step 3: Reset Password ─────────────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPass.length < 8)      { setError('Password must be at least 8 characters.'); return; }
    if (newPass !== confirmP)    { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await axiosClient.post('/auth/reset-password', { resetSessionToken: resetTok, newPassword: newPass });
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Session may have expired.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white/5 translate-x-1/3 translate-y-1/3" />
        <div className="relative z-10 max-w-sm text-center">
          <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <Stethoscope className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Reset Your Password</h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            Enter your username and email address. We'll send a one-time code to reset your password securely.
          </p>
          <div className="mt-8 space-y-3 text-left">
            {[
              { n: 1, label: 'Enter username & email' },
              { n: 2, label: 'Enter the OTP from email' },
              { n: 3, label: 'Set your new password' },
            ].map(({ n, label }) => (
              <div key={n} className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  (step === 'request' && n === 1) || (step === 'verify' && n === 2) || (step === 'reset' && n === 3)
                    ? 'bg-white text-blue-700'
                    : 'bg-white/20 text-white'
                }`}>{n}</div>
                <span className="text-blue-100 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Healthcare EHR</span>
          </div>

          {/* ── Done ─────────────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="text-center space-y-6">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Password Reset!</h2>
                <p className="text-muted-foreground mt-2 text-sm">Your password has been updated. You can now sign in with your new password.</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* ── Step 1: Request OTP ──────────────────────────────────────── */}
          {step === 'request' && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Forgot Password</h2>
                <p className="text-muted-foreground mt-1 text-sm">Enter your staff username and the email we'll send the OTP to.</p>
              </div>
              <form onSubmit={handleRequest} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Username</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Your staff username" autoFocus
                      className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                      className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                  </div>
                </div>
                {error && <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-60 disabled:pointer-events-none">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending OTP…</> : 'Send OTP'}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: Verify OTP ───────────────────────────────────────── */}
          {step === 'verify' && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Enter OTP</h2>
                <p className="text-muted-foreground mt-1 text-sm">We sent a 6-digit code to <strong>{email}</strong>. It expires in 15 minutes.</p>
              </div>
              <form onSubmit={handleVerify} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">One-Time Passcode</label>
                  <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="••••••" maxLength={6} autoFocus
                    className="flex h-14 w-full rounded-lg border border-input bg-background px-4 text-center text-2xl font-bold tracking-[0.5em] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                </div>
                {error && <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-60 disabled:pointer-events-none">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : 'Verify OTP'}
                </button>
                <button type="button" onClick={() => setStep('request')} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                  ← Resend OTP / Change email
                </button>
              </form>
            </>
          )}

          {/* ── Step 3: New Password ─────────────────────────────────────── */}
          {step === 'reset' && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Set New Password</h2>
                <p className="text-muted-foreground mt-1 text-sm">Choose a strong password you haven't used before.</p>
              </div>
              <form onSubmit={handleReset} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min 8 characters" autoFocus
                      className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="password" value={confirmP} onChange={e => setConfirmP(e.target.value)} placeholder="Repeat new password"
                      className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                  </div>
                </div>
                {error && <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-60 disabled:pointer-events-none">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting…</> : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          {step !== 'done' && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remembered it?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
