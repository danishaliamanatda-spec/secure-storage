import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import config from './config';

const userPool = new CognitoUserPool({
  UserPoolId: config.cognito.userPoolId,
  ClientId: config.cognito.clientId,
});

const api = async (path, token, options = {}) => {
  const res = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  });
  return res.json();
};

// ── SVG Icons ──────────────────────────────────────────────
const Icons = {
  shield: (cls = 'w-6 h-6') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
  upload: (cls = 'w-5 h-5') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
  download: (cls = 'w-4 h-4') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
  trash: (cls = 'w-4 h-4') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
  share: (cls = 'w-4 h-4') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>,
  folder: (cls = 'w-5 h-5') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>,
  search: (cls = 'w-4 h-4') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  lock: (cls = 'w-5 h-5') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>,
  users: (cls = 'w-5 h-5') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
  clipboard: (cls = 'w-5 h-5') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>,
  x: (cls = 'w-5 h-5') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  check: (cls = 'w-5 h-5') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  refresh: (cls = 'w-4 h-4') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>,
  cloud: (cls = 'w-8 h-8') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" /></svg>,
  eye: (cls = 'w-4 h-4') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  logout: (cls = 'w-4 h-4') => <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>,
};

// ── File type icon helper ──────────────────────────────────
function fileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  const map = {
    pdf: { bg: 'bg-red-100 text-red-600', label: 'PDF' },
    doc: { bg: 'bg-blue-100 text-blue-600', label: 'DOC' },
    docx: { bg: 'bg-blue-100 text-blue-600', label: 'DOC' },
    xls: { bg: 'bg-green-100 text-green-600', label: 'XLS' },
    xlsx: { bg: 'bg-green-100 text-green-600', label: 'XLS' },
    png: { bg: 'bg-purple-100 text-purple-600', label: 'IMG' },
    jpg: { bg: 'bg-purple-100 text-purple-600', label: 'IMG' },
    jpeg: { bg: 'bg-purple-100 text-purple-600', label: 'IMG' },
    gif: { bg: 'bg-purple-100 text-purple-600', label: 'GIF' },
    svg: { bg: 'bg-pink-100 text-pink-600', label: 'SVG' },
    zip: { bg: 'bg-yellow-100 text-yellow-600', label: 'ZIP' },
    rar: { bg: 'bg-yellow-100 text-yellow-600', label: 'RAR' },
    mp4: { bg: 'bg-indigo-100 text-indigo-600', label: 'VID' },
    mp3: { bg: 'bg-indigo-100 text-indigo-600', label: 'AUD' },
    txt: { bg: 'bg-gray-100 text-gray-600', label: 'TXT' },
    csv: { bg: 'bg-green-100 text-green-600', label: 'CSV' },
    json: { bg: 'bg-amber-100 text-amber-600', label: 'JSON' },
    js: { bg: 'bg-yellow-100 text-yellow-700', label: 'JS' },
    py: { bg: 'bg-blue-100 text-blue-700', label: 'PY' },
  };
  return map[ext] || { bg: 'bg-slate-100 text-slate-600', label: ext.toUpperCase().slice(0, 3) || 'FILE' };
}

// ── Toast notification ─────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={`fixed top-6 right-6 z-50 animate-slide-down ${colors[type] || colors.info} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-sm`}>
      {type === 'success' && Icons.check('w-5 h-5')}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-auto opacity-70 hover:opacity-100">{Icons.x('w-4 h-4')}</button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// LOGIN PAGE
// ════════════════════════════════════════════════════════════
function LoginPage({ onLogin, onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [cognitoUser, setCognitoUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const user = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    user.authenticateUser(authDetails, {
      onSuccess: (session) => { setLoading(false); onLogin(session.getIdToken().getJwtToken(), email); },
      onFailure: (err) => { setLoading(false); setError(err.message); },
      mfaSetup: () => {
        user.associateSoftwareToken({
          associateSecretCode: (secret) => { setCognitoUser(user); setShowMfa(true); setLoading(false); alert(`Set up your authenticator app with this code: ${secret}`); },
          onFailure: (err) => { setLoading(false); setError(err.message); },
        });
      },
      totpRequired: () => { setCognitoUser(user); setShowMfa(true); setLoading(false); },
      newPasswordRequired: () => {
        user.completeNewPasswordChallenge(password, {}, {
          onSuccess: (session) => { setLoading(false); onLogin(session.getIdToken().getJwtToken(), email); },
          onFailure: (err) => { setLoading(false); setError(err.message); },
          mfaSetup: () => {
            user.associateSoftwareToken({
              associateSecretCode: (secret) => { setCognitoUser(user); setShowMfa(true); setLoading(false); alert(`Set up your authenticator app with this code: ${secret}`); },
              onFailure: (err) => { setLoading(false); setError(err.message); },
            });
          },
        });
      },
    });
  };

  const handleMfa = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!cognitoUser) return;
    cognitoUser.verifySoftwareToken(mfaCode, 'TOTP', {
      onSuccess: () => {
        cognitoUser.setUserMfaPreference(null, { PreferredMfa: true, Enabled: true }, (err) => {
          if (err) { setError(err.message); setLoading(false); return; }
          setShowMfa(false); setLoading(false); alert('MFA set up successfully! Please sign in again.');
        });
      },
      onFailure: (err) => { setLoading(false); setError(err.message); },
    });
    cognitoUser.sendMFACode(mfaCode, {
      onSuccess: (session) => { setLoading(false); onLogin(session.getIdToken().getJwtToken(), email); },
      onFailure: (err) => { if (!err.message.includes('verifySoftwareToken')) { setLoading(false); setError(err.message); } },
    }, 'SOFTWARE_TOKEN_MFA');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative animate-bounce-in w-full max-w-md">
        {/* Logo card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl shadow-blue-500/25 mb-4">
            {Icons.shield('w-8 h-8 text-white')}
          </div>
          <h1 className="text-3xl font-bold text-white">SecureCloud</h1>
          <p className="text-blue-200 text-sm mt-1">Encrypted File Storage System</p>
        </div>

        <div className="bg-white/10 glass rounded-2xl p-8 shadow-2xl border border-white/10">
          {error && (
            <div className="animate-slide-down bg-red-500/20 border border-red-400/30 text-red-200 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
              {error}
            </div>
          )}

          {!showMfa ? (
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-blue-200 text-xs font-medium mb-1.5 ml-1">Email Address</label>
                <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all" required />
              </div>
              <div className="mb-6">
                <label className="block text-blue-200 text-xs font-medium mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all pr-10" required />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/60 hover:text-white transition-colors">
                    {Icons.eye()}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2">
                {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</> : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfa}>
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-xl mb-3">{Icons.lock('w-6 h-6 text-blue-300')}</div>
                <p className="text-blue-200 text-sm">Enter the 6-digit code from your authenticator app</p>
              </div>
              <input type="text" placeholder="000000" value={mfaCode} onChange={e => setMfaCode(e.target.value)}
                className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-center text-2xl tracking-[0.5em] placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4" maxLength={6} required autoFocus />
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2">
                {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</> : 'Verify Code'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-blue-200/70 text-sm">
              Don't have an account?{' '}
              <button onClick={onSwitch} className="text-blue-300 hover:text-white font-medium transition-colors">Create Account</button>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-8 text-blue-300/50 text-xs">
          <span className="flex items-center gap-1.5">{Icons.lock('w-3.5 h-3.5')} AES-256</span>
          <span className="flex items-center gap-1.5">{Icons.shield('w-3.5 h-3.5')} TLS 1.3</span>
          <span className="flex items-center gap-1.5">{Icons.lock('w-3.5 h-3.5')} MFA</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SIGN UP PAGE
// ════════════════════════════════════════════════════════════
function SignUpPage({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    userPool.signUp(email, password, [
      { Name: 'email', Value: email }, { Name: 'name', Value: name },
    ], null, (err) => {
      setLoading(false);
      if (err) { setError(err.message); return; }
      setShowConfirm(true);
    });
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    setLoading(true);
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.confirmRegistration(code, true, (err) => {
      setLoading(false);
      if (err) { setError(err.message); return; }
      alert('Account confirmed! Please sign in.');
      onSwitch();
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-4">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative animate-bounce-in w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl shadow-emerald-500/25 mb-4">
            {Icons.users('w-8 h-8 text-white')}
          </div>
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-blue-200 text-sm mt-1">Join SecureCloud today</p>
        </div>

        <div className="bg-white/10 glass rounded-2xl p-8 shadow-2xl border border-white/10">
          {error && (
            <div className="animate-slide-down bg-red-500/20 border border-red-400/30 text-red-200 p-3 rounded-xl mb-4 text-sm">{error}</div>
          )}

          {!showConfirm ? (
            <form onSubmit={handleSignUp}>
              <div className="mb-3">
                <label className="block text-blue-200 text-xs font-medium mb-1.5 ml-1">Full Name</label>
                <input type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all" required />
              </div>
              <div className="mb-3">
                <label className="block text-blue-200 text-xs font-medium mb-1.5 ml-1">Email Address</label>
                <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all" required />
              </div>
              <div className="mb-6">
                <label className="block text-blue-200 text-xs font-medium mb-1.5 ml-1">Password (min 12 characters)</label>
                <input type="password" placeholder="Create a strong password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all" required minLength={12} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2">
                {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</> : 'Create Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirm} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-xl mb-3">{Icons.check('w-6 h-6 text-emerald-300')}</div>
              <p className="text-blue-200 text-sm mb-4">We sent a verification code to <span className="text-white font-medium">{email}</span></p>
              <input type="text" placeholder="Enter verification code" value={code} onChange={e => setCode(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-center placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 mb-4" required />
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/25">
                {loading ? 'Confirming...' : 'Verify Email'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-blue-200/70 text-sm">
              Already have an account?{' '}
              <button onClick={onSwitch} className="text-blue-300 hover:text-white font-medium transition-colors">Sign In</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════
function Dashboard({ token, email, onLogout }) {
  const [tab, setTab] = useState('files');
  const [files, setFiles] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareFileId, setShareFileId] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePerm, setSharePerm] = useState('read');
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const notify = useCallback((message, type = 'success') => setToast({ message, type, key: Date.now() }), []);

  const loadFiles = useCallback(async () => {
    const data = await api('/api/files', token);
    setFiles(data.files || []);
  }, [token]);

  const loadShared = useCallback(async () => {
    const data = await api('/api/shared', token);
    setSharedFiles(data.shares || []);
  }, [token]);

  const loadAudit = useCallback(async () => {
    const data = await api('/api/audit', token);
    if (data.error) { setAuditLogs([]); return; }
    setAuditLogs(data.logs || []);
  }, [token]);

  useEffect(() => { loadFiles(); }, [loadFiles]);
  useEffect(() => { if (tab === 'shared') loadShared(); }, [tab, loadShared]);
  useEffect(() => { if (tab === 'audit') loadAudit(); }, [tab, loadAudit]);

  const doUpload = async (file) => {
    if (!file) return;
    setUploading(true); setUploadProgress(10);
    try {
      setUploadProgress(30);
      const { uploadUrl } = await api('/api/files/upload-url', token, {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
      });
      setUploadProgress(60);
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setUploadProgress(100);
      notify(`"${file.name}" uploaded successfully`);
      loadFiles();
    } catch (err) {
      notify('Upload failed', 'error');
    }
    setTimeout(() => { setUploading(false); setUploadProgress(0); }, 500);
  };

  const handleUpload = (e) => { doUpload(e.target.files[0]); e.target.value = ''; };
  const handleDrop = (e) => { e.preventDefault(); setDragging(false); doUpload(e.dataTransfer.files[0]); };
  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const handleDownload = async (fileId) => {
    const { downloadUrl } = await api(`/api/files/${fileId}/download`, token);
    if (downloadUrl) window.open(downloadUrl, '_blank');
    else notify('Download failed', 'error');
  };

  const handleSharedDownload = async (shareId) => {
    const { downloadUrl } = await api(`/api/shared/${shareId}/download`, token);
    if (downloadUrl) window.open(downloadUrl, '_blank');
    else notify('Download failed', 'error');
  };

  const handleDelete = async (fileId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    await api(`/api/files/${fileId}`, token, { method: 'DELETE' });
    notify(`"${fileName}" deleted`);
    loadFiles();
  };

  const handleShare = async (e) => {
    e.preventDefault();
    const result = await api(`/api/files/${shareFileId}/share`, token, {
      method: 'POST',
      body: JSON.stringify({ email: shareEmail, permission: sharePerm }),
    });
    if (result.shareId) notify(`File shared with ${shareEmail}`);
    else notify('Share failed', 'error');
    setShareFileId(null); setShareEmail(''); setSharePerm('read');
  };

  const formatSize = (bytes) => {
    if (!bytes) return '--';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortIcon = (field) => {
    if (sortField !== field) return <span className="text-slate-300 ml-1">&#8597;</span>;
    return <span className="text-blue-500 ml-1">{sortDir === 'asc' ? '&#9650;' : '&#9660;'}</span>;
  };

  const filteredFiles = files
    .filter(f => f.file_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === 'file_size') { va = va || 0; vb = vb || 0; }
      if (sortField === 'created_at') { va = new Date(va); vb = new Date(vb); }
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalSize = files.reduce((acc, f) => acc + (f.file_size || 0), 0);
  const initials = email ? email.substring(0, 2).toUpperCase() : '?';

  const tabs = [
    { id: 'files', label: 'My Files', icon: Icons.folder },
    { id: 'shared', label: 'Shared', icon: Icons.users },
    { id: 'audit', label: 'Audit Logs', icon: Icons.clipboard },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} key={toast.key} />}

      {/* Header */}
      <header className="bg-white/80 glass border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                {Icons.shield('w-5 h-5 text-white')}
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">SecureCloud</span>
            </div>

            <nav className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {t.icon('w-4 h-4')} {t.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-xl">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">{initials}</div>
                <span className="text-sm text-slate-600 max-w-[150px] truncate">{email}</span>
              </div>
              <button onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                {Icons.logout()} <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Mobile tabs */}
          <nav className="sm:hidden flex gap-1 pb-2 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  tab === t.id ? 'bg-blue-50 text-blue-600' : 'text-slate-500'
                }`}>
                {t.icon('w-3.5 h-3.5')} {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* ── MY FILES TAB ── */}
        {tab === 'files' && (
          <div className="animate-fade-in">
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Files</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{files.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Storage Used</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{formatSize(totalSize)}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Encryption</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1 flex items-center gap-1.5">{Icons.shield('w-5 h-5')} AES-256</p>
              </div>
            </div>

            {/* Drag & drop upload zone */}
            <div className={`bg-white rounded-2xl border-2 border-dashed transition-all mb-6 ${dragging ? 'border-blue-400 bg-blue-50 scale-[1.01]' : 'border-slate-200 hover:border-blue-300'}`}
              onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
              <div className="p-8 text-center">
                {uploading ? (
                  <div className="animate-fade-in">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full border-3 border-blue-200 border-t-blue-500 animate-spin" />
                    <p className="text-sm text-blue-600 font-medium">Uploading... {uploadProgress}%</p>
                    <div className="w-48 h-1.5 bg-blue-100 rounded-full mx-auto mt-3 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 mx-auto mb-3 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                      {Icons.upload('w-7 h-7')}
                    </div>
                    <p className="text-sm text-slate-600"><span className="font-medium text-blue-600">Drag & drop files here</span> or click to browse</p>
                    <p className="text-xs text-slate-400 mt-1">Files are encrypted with AES-256 and KMS</p>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="mt-4 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20">
                      Choose File
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
                  </>
                )}
              </div>
            </div>

            {/* Search bar */}
            <div className="relative mb-4">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search()}</div>
              <input type="text" placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all shadow-sm" />
            </div>

            {/* File list */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {filteredFiles.length === 0 ? (
                <div className="p-16 text-center animate-fade-in">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
                    {Icons.folder('w-8 h-8')}
                  </div>
                  <p className="text-slate-500 font-medium">{search ? 'No files match your search' : 'No files yet'}</p>
                  <p className="text-slate-400 text-sm mt-1">{search ? 'Try a different search term' : 'Upload your first file to get started'}</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-600" onClick={() => handleSort('file_name')}>
                        <span className="flex items-center">Name <span dangerouslySetInnerHTML={{ __html: sortField === 'file_name' ? (sortDir === 'asc' ? '&#9650;' : '&#9660;') : '&#8597;' }} className={sortField === 'file_name' ? 'text-blue-500 ml-1' : 'text-slate-300 ml-1'} /></span>
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-600 hidden sm:table-cell" onClick={() => handleSort('file_size')}>
                        <span className="flex items-center">Size <span dangerouslySetInnerHTML={{ __html: sortField === 'file_size' ? (sortDir === 'asc' ? '&#9650;' : '&#9660;') : '&#8597;' }} className={sortField === 'file_size' ? 'text-blue-500 ml-1' : 'text-slate-300 ml-1'} /></span>
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-600 hidden md:table-cell" onClick={() => handleSort('created_at')}>
                        <span className="flex items-center">Date <span dangerouslySetInnerHTML={{ __html: sortField === 'created_at' ? (sortDir === 'asc' ? '&#9650;' : '&#9660;') : '&#8597;' }} className={sortField === 'created_at' ? 'text-blue-500 ml-1' : 'text-slate-300 ml-1'} /></span>
                      </th>
                      <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((f, i) => {
                      const fi = fileIcon(f.file_name);
                      return (
                        <tr key={f.file_id} className="border-b border-slate-50 hover:bg-blue-50/50 transition-colors group" style={{ animationDelay: `${i * 30}ms` }}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 ${fi.bg} rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0`}>{fi.label}</div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{f.file_name}</p>
                                <p className="text-xs text-slate-400 sm:hidden">{formatSize(f.file_size)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-500 hidden sm:table-cell">{formatSize(f.file_size)}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-500 hidden md:table-cell">{new Date(f.created_at).toLocaleDateString()}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleDownload(f.file_id)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Download">
                                {Icons.download()}
                              </button>
                              <button onClick={() => setShareFileId(f.file_id)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors" title="Share">
                                {Icons.share()}
                              </button>
                              <button onClick={() => handleDelete(f.file_id, f.file_name)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Delete">
                                {Icons.trash()}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Security footer */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              {[
                { icon: Icons.lock, title: 'AES-256 + KMS', desc: 'Server-side encryption' },
                { icon: Icons.shield, title: 'TLS 1.3', desc: 'Encrypted in transit' },
                { icon: Icons.lock, title: 'MFA Protected', desc: 'Multi-factor auth' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/70 rounded-xl p-3 border border-slate-100">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500 flex-shrink-0">{item.icon('w-4 h-4')}</div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{item.title}</p>
                    <p className="text-[10px] text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SHARED WITH ME TAB ── */}
        {tab === 'shared' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Shared With Me</h2>
                <p className="text-sm text-slate-400 mt-0.5">Files others have shared with you</p>
              </div>
              <button onClick={loadShared} className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                {Icons.refresh()} Refresh
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {sharedFiles.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
                    {Icons.users('w-8 h-8')}
                  </div>
                  <p className="text-slate-500 font-medium">No shared files yet</p>
                  <p className="text-slate-400 text-sm mt-1">When someone shares a file with you, it will appear here</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">File</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Shared By</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Permission</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                      <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharedFiles.map(s => {
                      const fi = fileIcon(s.file_name);
                      return (
                        <tr key={s.share_id} className="border-b border-slate-50 hover:bg-blue-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 ${fi.bg} rounded-xl flex items-center justify-center text-xs font-bold`}>{fi.label}</div>
                              <span className="text-sm font-medium text-slate-800 truncate">{s.file_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-500 hidden sm:table-cell truncate max-w-[200px]">{s.owner_id}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              s.permission === 'write' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>{s.permission === 'write' ? 'Read & Write' : 'Read Only'}</span>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-500 hidden md:table-cell">{new Date(s.created_at).toLocaleDateString()}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button onClick={() => handleSharedDownload(s.share_id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors font-medium">
                              {Icons.download()} Download
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── AUDIT LOGS TAB ── */}
        {tab === 'audit' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Audit Logs</h2>
                <p className="text-sm text-slate-400 mt-0.5">Activity trail for compliance and security</p>
              </div>
              <button onClick={loadAudit} className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                {Icons.refresh()} Refresh
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {auditLogs.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
                    {Icons.clipboard('w-8 h-8')}
                  </div>
                  <p className="text-slate-500 font-medium">No audit logs available</p>
                  <p className="text-slate-400 text-sm mt-1">Admin access required to view logs</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">User</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.log_id} className="border-b border-slate-50 hover:bg-blue-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-sm text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            log.action === 'UPLOAD' ? 'bg-emerald-100 text-emerald-700' :
                            log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                            log.action === 'SHARE' ? 'bg-purple-100 text-purple-700' :
                            log.action === 'DOWNLOAD' ? 'bg-blue-100 text-blue-700' :
                            log.action === 'DOWNLOAD_SHARED' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>{log.action}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500 hidden sm:table-cell truncate max-w-[200px]">{log.user_id}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-400 hidden md:table-cell truncate max-w-[250px]">
                          {log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Share Modal ── */}
      {shareFileId && (
        <div className="fixed inset-0 bg-black/50 glass flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-bounce-in">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">{Icons.share('w-5 h-5')}</div>
                <h3 className="font-bold text-slate-800">Share File</h3>
              </div>
              <button onClick={() => setShareFileId(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">{Icons.x()}</button>
            </div>
            <form onSubmit={handleShare}>
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Recipient Email</label>
                <input type="email" placeholder="colleague@company.com" value={shareEmail} onChange={e => setShareEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent" required />
              </div>
              <div className="mb-5">
                <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Permission Level</label>
                <select value={sharePerm} onChange={e => setSharePerm(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white">
                  <option value="read">Read Only - Can download</option>
                  <option value="write">Read & Write - Can modify</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2.5 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20 text-sm">
                  Share File
                </button>
                <button type="button" onClick={() => setShareFileId(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-all text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState('login');
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.getSession((err, session) => {
        if (!err && session.isValid()) {
          setToken(session.getIdToken().getJwtToken());
          setEmail(currentUser.getUsername());
          setPage('dashboard');
        }
      });
    }
  }, []);

  const handleLogin = (jwt, userEmail) => { setToken(jwt); setEmail(userEmail); setPage('dashboard'); };
  const handleLogout = () => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) currentUser.signOut();
    setToken(null); setEmail(''); setPage('login');
  };

  if (page === 'dashboard' && token) return <Dashboard token={token} email={email} onLogout={handleLogout} />;
  if (page === 'signup') return <SignUpPage onSwitch={() => setPage('login')} />;
  return <LoginPage onLogin={handleLogin} onSwitch={() => setPage('signup')} />;
}
