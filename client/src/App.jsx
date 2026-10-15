import { createContext, useContext, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowDownRight, ArrowRight, Bell, Check, ChevronDown, CircleHelp, Command, CreditCard, Eye, EyeOff, Fingerprint, LayoutDashboard, LoaderCircle, LockKeyhole, LogOut, Menu, Search, Settings, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import { api } from './api.js';

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/auth/me').then(data => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  const login = async (email, password) => { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); setUser(data.user); return data.user; };
  const signup = async (name, email, password) => { return await api('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }); };
  const logout = async () => { try { await api('/auth/logout', { method: 'POST', body: '{}' }); } finally { setUser(null); } };
  return <AuthContext.Provider value={{ user, setUser, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
}

function Brand({ small = false }) { return <Link to="/" className={`brand ${small ? 'brand-small' : ''}`}><span className="brand-mark"><Command size={18} strokeWidth={2.5}/></span><span>orbit<span className="brand-dot">.</span></span></Link>; }
function Spinner() { return <LoaderCircle className="spin" size={19}/>; }
function Protected({ children, admin = false }) {
  const { user, loading } = useAuth(); const location = useLocation();
  if (loading) return <div className="loading-screen"><Spinner/><span>Preparing your workspace</span></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace/>;
  if (admin && user.role !== 'admin') return <Navigate to="/dashboard" replace/>;
  return children;
}

function AuthLayout({ mode }) {
  const isSignup = mode === 'signup'; const { user, login, signup } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');

useEffect(() => {
  if (user && !isSignup) {
    navigate('/dashboard', { replace: true });
  }
}, [user, isSignup, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (isSignup) {
        const result = await signup(name, email, password);
        navigate('/verify-email', {
          replace: true,
          state: { email }
        });
        return;
      }

      await login(email, password);
      navigate(location.state?.from?.pathname || '/dashboard', {
        replace: true
      });
} catch (err) {
  if (err.needsVerification) {
    navigate('/verify-email', {
      replace: true,
      state: { email: err.email || email }
    });
    return;
  }

  setError(err.message);
} finally {
  setBusy(false);
}
  }

  return <main className="auth-shell">
    <section className="auth-visual"><div className="visual-top"><Brand/><span className="secure-pill"><span className="pulse-dot"/> SECURE WORKSPACE</span></div>
      <div className="visual-copy"><div className="eyebrow"><Sparkles size={14}/> YOUR SPACE, REIMAGINED</div><h1>Good work<br/>starts <span>here.</span></h1><p>A calmer place to focus, organize your work, and move forward with clarity.</p>
        <div className="visual-card"><div className="mini-card-head"><div className="avatar-stack"><span>J</span><span>M</span><span>A</span></div><span className="online-label"><i/> Workspace active</span></div><div className="mini-card-title">Your next chapter, in focus.</div><div className="mini-progress"><span/></div><div className="mini-card-foot"><span>Workspace overview</span><span>Ready when you are <ArrowRight size={13}/></span></div></div>
      </div><div className="visual-footer"><span>BUILT FOR YOUR MOMENTUM</span><span>© 2026 ORBIT WORKSPACE</span></div>
    </section>
    <section className="auth-panel"><div className="mobile-brand"><Brand/></div><div className="auth-form-wrap"><div className="form-icon"><Fingerprint size={23}/></div><div className="form-heading"><h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2><p>{isSignup ? 'Set up your workspace in a few steps.' : 'Enter your details to access your workspace.'}</p></div>
      <form onSubmit={handleSubmit} className="auth-form">{isSignup && <label>Full name<div className="input-wrap"><input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" minLength={2} maxLength={80} required/><Users size={17}/></div></label>}
        <label>Email address<div className="input-wrap"><input autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" maxLength={254} required/><span className="input-at">@</span></div></label>
        <label>Password<div className="input-wrap"><input autoComplete={isSignup ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={isSignup ? 'At least 10 characters' : 'Enter your password'} minLength={isSignup ? 10 : 1} maxLength={72} required/><button type="button" className="icon-button password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
        {error && <div className="error-message" role="alert">{error}</div>}
        <button className="primary-button auth-submit" disabled={busy}>{busy ? <><Spinner/> Please wait…</> : <>{isSignup ? 'Create account' : 'Sign in'} <ArrowRight size={17}/></>}</button>
      </form><div className="auth-switch">{isSignup ? 'Already have an account?' : 'New to Orbit?'} <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create an account'}</Link></div>
      <div className="trust-note"><ShieldCheck size={15}/> Your account is protected with secure authentication.</div></div><div className="panel-footer"><Link to="/login"><CircleHelp size={14}/> Help center</Link><span><LockKeyhole size={13}/> PRIVATE BY DESIGN</span></div></section>
  </main>;
}

function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleVerify(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await api('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), code: code.trim() })
      });
      if (data.user) setUser(data.user);
      setMessage(data.message || 'Email verified successfully. You can now sign in.');
      navigate('/login', { replace: true, state: { verified: true, email: email.trim() } });
    } catch (err) {
      setError(err.message || 'Unable to verify your email. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await api('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() })
      });
      setMessage(data.message || 'If the account can receive a code, a new verification email has been requested.');
    } catch (err) {
      setError(err.message || 'Unable to resend the verification email.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell">
    <section className="auth-visual"><div className="visual-top"><Brand/><span className="secure-pill"><span className="pulse-dot"/> SECURE WORKSPACE</span></div>
      <div className="visual-copy"><div className="eyebrow"><ShieldCheck size={14}/> EMAIL VERIFICATION</div><h1>One more<br/>step <span>to go.</span></h1><p>Verify your email address to keep your Orbit workspace secure.</p></div>
      <div className="visual-footer"><span>BUILT FOR YOUR MOMENTUM</span><span>© 2026 ORBIT WORKSPACE</span></div>
    </section>
    <section className="auth-panel"><div className="mobile-brand"><Brand/></div><div className="auth-form-wrap"><div className="form-icon"><ShieldCheck size={23}/></div><div className="form-heading"><h2>Verify your email</h2><p>Enter the verification code sent to your email address.</p></div>
      <form onSubmit={handleVerify} className="auth-form">
        <label>Email address<div className="input-wrap"><input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required/><span className="input-at">@</span></div></label>
        <label>Verification code<div className="input-wrap"><input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter your code" required maxLength={10}/><Fingerprint size={17}/></div></label>
        {error && <div className="error-message" role="alert">{error}</div>}
        {message && <div className="success-message" role="status">{message}</div>}
        <button className="primary-button auth-submit" disabled={busy}>{busy ? <><Spinner/> Please wait…</> : <>Verify email <ArrowRight size={17}/></>}</button>
      </form>
      <button type="button" className="secondary-button" disabled={busy || !email.trim()} onClick={handleResend}>Resend verification code</button>
      <div className="auth-switch"><Link to="/login">Back to sign in</Link></div>
    </div><div className="panel-footer"><Link to="/login"><CircleHelp size={14}/> Help center</Link><span><LockKeyhole size={13}/> PRIVATE BY DESIGN</span></div></section>
  </main>;
}

const navItems = [ { label: 'Overview', to: '/dashboard', icon: LayoutDashboard }, { label: 'Team members', to: '/admin', icon: Users, admin: true } ];
function Shell({ children, title, subtitle, action }) {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const [sidebarOpen, setSidebarOpen] = useState(false); const [menuOpen, setMenuOpen] = useState(false);
  async function handleLogout() { await logout(); navigate('/login', { replace: true }); }
  return <div className="app-shell"><aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}><div className="sidebar-brand"><Brand/><button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18}/></button></div><div className="workspace-switch"><div className="workspace-icon"><Command size={17}/></div><div><strong>Personal workspace</strong><span>Free plan</span></div><ChevronDown size={15}/></div><div className="nav-caption">WORKSPACE</div><nav className="side-nav">{navItems.filter(item => !item.admin || user?.role === 'admin').map(item => <Link key={item.to} to={item.to} onClick={() => setSidebarOpen(false)} className={`nav-link ${location.pathname === item.to ? 'active' : ''}`}><item.icon size={18}/>{item.label}{item.admin && <span className="nav-count">Admin</span>}</Link>)}</nav><div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><strong>Need a hand?</strong><p>Find answers and get back to work.</p><button onClick={() => window.open('mailto:support@example.com', '_blank')}>Visit help center <ArrowRight size={13}/></button></div><button className="profile-row" onClick={() => setMenuOpen(!menuOpen)}><div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div><div className="profile-info"><strong>{user?.name}</strong><span>{user?.email}</span></div><ChevronDown size={15}/></button>{menuOpen && <div className="profile-menu"><div className="profile-menu-label">SIGNED IN AS</div><div className="profile-menu-email">{user?.email}</div><button onClick={handleLogout}><LogOut size={15}/> Sign out</button></div>}</div></aside>{sidebarOpen && <button className="mobile-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"/>}
    <main className="main-area"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{title}</strong></div></div><div className="topbar-right"><div className="top-search"><Search size={16}/><span>Search anything</span><kbd>⌘ K</kbd></div><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div></div></header><div className="page-content"><div className="page-heading"><div><div className="page-kicker">YOUR WORKSPACE</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>{children}<footer className="app-footer"><span>© 2026 Orbit Workspace</span><span><span className="footer-status"/> All systems operational</span></footer></div></main></div>;
}

function DashboardPage() {
  const { user } = useAuth(); const [dashboard, setDashboard] = useState(null); const [error, setError] = useState('');
return <Shell title="Overview" subtitle={`Here's what's happening in your workspace, ${user?.name?.split(' ')[0]}.`} action={<button className="secondary-button" onClick={() => window.location.reload()}><Activity size={16}/> Refresh data</button>}>
    {error && <div className="error-message page-error">{error}</div>}
    <div className="welcome-banner"><div className="welcome-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-core"><Sparkles size={26}/></div></div><div className="welcome-copy"><div className="welcome-label"><span className="pulse-dot"/> YOUR SPACE IS READY</div><h2>Make room for<br/><span>great things.</span></h2><p>Your workspace is set up. Start with the overview below and build your momentum.</p></div><div className="welcome-index">01 <span>/ 03</span></div></div>
    <div className="section-title-row"><div><h2>Your overview</h2><p>A quick look at your account</p></div><span className="live-tag"><i/> LIVE DATA</span></div>
    <div className="stats-grid">{(dashboard?.stats || [{label:'Account status',value:'—',detail:'Loading your account'},{label:'Account type',value:'—',detail:'Loading permissions'},{label:'Registered',value:'—',detail:'Loading registration date'}]).map((stat, i) => <article className="stat-card" key={stat.label}><div className="stat-top"><span>{stat.label}</span><span className={`stat-icon stat-icon-${i}`}><Check size={17}/></span></div><div className="stat-value">{stat.value}</div><div className="stat-detail"><span className="detail-dot"/>{stat.detail}</div><div className="stat-decoration"/></article>)}</div>
    <div className="content-grid"><article className="panel activity-panel"><div className="panel-heading"><div><h3>Getting started</h3><p>A few things to make this space yours</p></div><span className="subtle-badge">QUICK START</span></div><div className="checklist"><div className="check-row"><span className="check-circle done"><Check size={13}/></span><div><strong>Create your account</strong><span>Your account is active and ready.</span></div><span className="complete-label">COMPLETE</span></div><div className="check-row"><span className="check-circle"><Users size={13}/></span><div><strong>Explore your workspace</strong><span>Get familiar with your overview.</span></div><span className="step-number">02</span></div><div className="check-row"><span className="check-circle"><ShieldCheck size={13}/></span><div><strong>Keep your account secure</strong><span>Use a unique password for this account.</span></div><span className="step-number">03</span></div></div></article><article className="panel account-panel"><div className="panel-heading"><div><h3>Account details</h3><p>Your profile at a glance</p></div><div className="account-mark"><Fingerprint size={19}/></div></div><div className="account-profile"><div className="large-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div><div><strong>{user?.name}</strong><span>{user?.email}</span></div></div><div className="account-line"><span>Account role</span><span className={`role-pill ${user?.role === 'admin' ? 'role-admin' : ''}`}>{user?.role === 'admin' ? 'Administrator' : 'Member'}</span></div><div className="account-line"><span>Account ID</span><span className="id-value">{String(user?.id || '').slice(-8).toUpperCase() || '—'}</span></div><div className="account-note"><LockKeyhole size={15}/><span>Your personal information is only available to authorized account sessions.</span></div></article></div>
    {user?.role === 'admin' && <div className="admin-callout"><div className="admin-callout-icon"><ShieldCheck size={20}/></div><div><strong>Administrator access enabled</strong><p>You can manage workspace members and their roles.</p></div><Link to="/admin">Open admin panel <ArrowRight size={15}/></Link></div>}
  </Shell>;
}

function AdminPage() {
  const { user } = useAuth(); const [users, setUsers] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [query, setQuery] = useState(''); const [changing, setChanging] = useState('');
  const loadUsers = () => { setLoading(true); api('/admin/users').then(data => setUsers(data.users)).catch(err => setError(err.message)).finally(() => setLoading(false)); };
  useEffect(() => { loadUsers(); }, []);
  async function changeRole(target, role) { setError(''); setChanging(target); try { await api(`/admin/users/${target}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }); loadUsers(); } catch (err) { setError(err.message); } finally { setChanging(''); } }
  const filtered = users.filter(u => `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(query.toLowerCase()));
  return <Shell title="Team members" subtitle="Manage accounts and access across your workspace." action={<button className="secondary-button" onClick={loadUsers}><Activity size={16}/> Refresh list</button>}>
    <div className="admin-metrics"><div className="admin-metric"><span>Total members</span><strong>{users.length}</strong><div><Users size={15}/> Registered accounts</div></div><div className="admin-metric"><span>Administrators</span><strong>{users.filter(u => u.role === 'admin').length}</strong><div><ShieldCheck size={15}/> Elevated access</div></div><div className="admin-metric"><span>Standard members</span><strong>{users.filter(u => u.role === 'user').length}</strong><div><Check size={15}/> Standard permissions</div></div></div>
    <section className="panel members-panel"><div className="members-heading"><div><h3>All accounts</h3><p>Review members and manage their permissions.</p></div><div className="member-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search members…" aria-label="Search members"/></div></div>{error && <div className="error-message page-error">{error}</div>}
      <div className="table-scroll"><table><thead><tr><th>MEMBER</th><th>ROLE</th><th>JOINED</th><th>ACCESS</th></tr></thead><tbody>{loading ? <tr><td colSpan="4" className="empty-cell"><Spinner/> Loading accounts…</td></tr> : filtered.length === 0 ? <tr><td colSpan="4" className="empty-cell">No accounts match your search.</td></tr> : filtered.map(member => <tr key={member.id}><td><div className="member-cell"><div className="member-avatar">{member.name.charAt(0).toUpperCase()}</div><div><strong>{member.name}{member.id === user?.id && <span className="you-label">YOU</span>}</strong><span>{member.email}</span></div></div></td><td><span className={`role-pill ${member.role === 'admin' ? 'role-admin' : ''}`}>{member.role === 'admin' ? 'Administrator' : 'Member'}</span></td><td className="joined-date">{new Date(member.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td><td>{member.id === user?.id ? <span className="current-user-label">Current account</span> : <button className="role-action" disabled={changing === member.id} onClick={() => changeRole(member.id, member.role === 'admin' ? 'user' : 'admin')}>{changing === member.id ? <Spinner/> : member.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>}</td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing <strong>{filtered.length}</strong> of <strong>{users.length}</strong> accounts</span><span><ShieldCheck size={14}/> Changes apply immediately</span></div>
    </section><div className="security-note"><ShieldCheck size={18}/><div><strong>Access control matters</strong><p>Only administrators can see this page. New signups always receive standard member access.</p></div></div>
  </Shell>;
}

export default function App() { return <AuthProvider><Routes><Route path="/login" element={<AuthLayout mode="login"/>}/><Route path="/signup" element={<AuthLayout mode="signup"/>}/><Route path="/verify-email" element={<VerifyEmailPage/>}/><Route path="/dashboard" element={<Protected><DashboardPage/></Protected>}/><Route path="/admin" element={<Protected admin><AdminPage/></Protected>}/><Route path="*" element={<HomeRedirect/>}/></Routes></AuthProvider>; }
function HomeRedirect() { const { user, loading } = useAuth(); if (loading) return <div className="loading-screen"><Spinner/><span>Preparing your workspace</span></div>; return <Navigate to={user ? '/dashboard' : '/login'} replace/>; }
