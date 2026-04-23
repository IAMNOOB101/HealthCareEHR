import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Mail, Loader2, CheckCircle } from 'lucide-react';
import { portalAuthService } from '../../api/portal.service';

const PortalForgotPassword = () => {
  const navigate = useNavigate();
  const [step,     setStep]     = useState('request');
  const [email,    setEmail]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [newPass,  setNewPass]  = useState('');
  const [confirmP, setConfirmP] = useState('');
  const [resetTok, setResetTok] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleRequest = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required.'); return; }
    setLoading(true);
    try {
      await portalAuthService.forgotPassword({ email: email.trim() });
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) { setError('Please enter the OTP.'); return; }
    setLoading(true);
    try {
      const res = await portalAuthService.verifyOtp({ email: email.trim(), otp: otp.trim() });
      const token = res?.data?.resetSessionToken ?? res?.resetSessionToken;
      setResetTok(token);
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPass.length < 8)   { setError('Password must be at least 8 characters.'); return; }
    if (newPass !== confirmP) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await portalAuthService.resetPassword({ resetSessionToken: resetTok, newPassword: newPass });
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Please start over.');
    } finally { setLoading(false); }
  };

  const inputCls = 'flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40';
  const btnCls = 'w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-60 disabled:pointer-events-none';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-9 w-9 bg-emerald-600 rounded-xl flex items-center justify-center">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">Patient Portal</span>
        </div>

        {step === 'done' && (
          <div className="text-center space-y-6">
            <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Password Reset!</h2>
              <p className="text-muted-foreground mt-2 text-sm">Your portal password has been updated. You can now sign in.</p>
            </div>
            <button onClick={() => navigate('/portal/login')} className={btnCls}>Back to Sign In</button>
          </div>
        )}

        {step === 'request' && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">Forgot Password</h2>
              <p className="text-muted-foreground mt-1 text-sm">Enter your registered email and we'll send you a reset code.</p>
            </div>
            <form onSubmit={handleRequest} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="patient@email.com" autoFocus
                    className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40" />
                </div>
              </div>
              {error && <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</div>}
              <button type="submit" disabled={loading} className={btnCls}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : 'Send Reset Code'}
              </button>
            </form>
          </>
        )}

        {step === 'verify' && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">Enter OTP</h2>
              <p className="text-muted-foreground mt-1 text-sm">We sent a 6-digit code to <strong>{email}</strong>. Valid for 15 minutes.</p>
            </div>
            <form onSubmit={handleVerify} className="space-y-5">
              <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="••••••" maxLength={6} autoFocus
                className="flex h-14 w-full rounded-lg border border-input bg-background px-4 text-center text-2xl font-bold tracking-[0.5em] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40" />
              {error && <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</div>}
              <button type="submit" disabled={loading} className={btnCls}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Verifying…</> : 'Verify Code'}
              </button>
              <button type="button" onClick={() => setStep('request')} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Resend code
              </button>
            </form>
          </>
        )}

        {step === 'reset' && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">Set New Password</h2>
              <p className="text-muted-foreground mt-1 text-sm">Choose a strong new password for your patient account.</p>
            </div>
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">New Password</label>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min 8 characters" autoFocus className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Confirm Password</label>
                <input type="password" value={confirmP} onChange={e => setConfirmP(e.target.value)} placeholder="Repeat new password" className={inputCls} />
              </div>
              {error && <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</div>}
              <button type="submit" disabled={loading} className={btnCls}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Resetting…</> : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        {step !== 'done' && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it?{' '}
            <Link to="/portal/login" className="text-emerald-600 font-medium hover:underline">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default PortalForgotPassword;
