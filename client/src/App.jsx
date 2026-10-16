import { createContext, useContext, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowDownRight, ArrowRight, Bell, Check, ChevronDown, CircleHelp, Command, CreditCard, Eye, EyeOff, Fingerprint, LayoutDashboard, LoaderCircle, LockKeyhole, LogOut, Menu, Search, Settings, ShieldCheck, Sparkles, Users, X, CalendarCheck, Clock3, FileText, Megaphone, UserRound, KeyRound, History, CheckCircle2, Plus, AlertCircle } from 'lucide-react';
import { api } from './api.js';

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/auth/me').then(data => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  const login = async (email, password) => { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); setUser(data.user); return data.user; };
  const signup = async (name, email, password) => api('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
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
  useEffect(() => { if (user && !isSignup) navigate('/dashboard', { replace: true }); }, [user, isSignup, navigate]);
  async function handleSubmit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (isSignup) {
        await signup(name, email, password);
        navigate('/verify-email', { replace: true, state: { email } });
        return;
      }
      await login(email, password);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      if (err.needsVerification) {
        navigate('/verify-email', { replace: true, state: { email: err.email || email } });
        return;
      }
      setError(err.message || 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
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
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const data = await api('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email: email.trim(), code: code.trim() }) });
      if (data.user) setUser(data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) { setError(err.message || 'Unable to verify your email. Please try again.'); }
    finally { setBusy(false); }
  }
  async function handleResend() {
    setBusy(true); setError(''); setMessage('');
    try {
      const data = await api('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
      setMessage(data.message || 'A new verification code has been requested.');
    } catch (err) { setError(err.message || 'Unable to resend the verification email.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell">
    <section className="auth-visual"><div className="visual-top"><Brand/><span className="secure-pill"><span className="pulse-dot"/> SECURE WORKSPACE</span></div><div className="visual-copy"><div className="eyebrow"><ShieldCheck size={14}/> EMAIL VERIFICATION</div><h1>One more<br/>step <span>to go.</span></h1><p>Verify your email address to keep your Orbit workspace secure.</p></div><div className="visual-footer"><span>BUILT FOR YOUR MOMENTUM</span><span>© 2026 ORBIT WORKSPACE</span></div></section>
    <section className="auth-panel"><div className="mobile-brand"><Brand/></div><div className="auth-form-wrap"><div className="form-icon"><ShieldCheck size={23}/></div><div className="form-heading"><h2>Verify your email</h2><p>Enter the six-digit code sent to your email. In local development, check the backend terminal if email delivery is blocked.</p></div>
      <form onSubmit={handleVerify} className="auth-form"><label>Email address<div className="input-wrap"><input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required/><span className="input-at">@</span></div></label><label>Verification code<div className="input-wrap"><input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" required maxLength={6} pattern="\d{6}"/><Fingerprint size={17}/></div></label>
        {error && <div className="error-message" role="alert">{error}</div>}{message && <div className="success-message" role="status">{message}</div>}<button className="primary-button auth-submit" disabled={busy}>{busy ? <><Spinner/> Please wait…</> : <>Verify email <ArrowRight size={17}/></>}</button></form><button type="button" className="secondary-button" disabled={busy || !email.trim()} onClick={handleResend}>Resend verification code</button><div className="auth-switch"><Link to="/login">Back to sign in</Link></div></div><div className="panel-footer"><Link to="/login"><CircleHelp size={14}/> Help center</Link><span><LockKeyhole size={13}/> PRIVATE BY DESIGN</span></div></section>
  </main>;
}

const navItems = [ { label: 'Overview', to: '/dashboard', icon: LayoutDashboard }, { label: 'Attendance', to: '/attendance', icon: Clock3 }, { label: 'Leave requests', to: '/leave', icon: CalendarCheck }, { label: 'Announcements', to: '/announcements', icon: Megaphone }, { label: 'Activity log', to: '/activity', icon: History }, { label: 'My profile', to: '/profile', icon: UserRound }, { label: 'Team members', to: '/admin', icon: Users, admin: true } ];
function Shell({ children, title, subtitle, action }) {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const [sidebarOpen, setSidebarOpen] = useState(false); const [menuOpen, setMenuOpen] = useState(false);
  async function handleLogout() { await logout(); navigate('/login', { replace: true }); }
  return <div className="app-shell"><aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}><div className="sidebar-brand"><Brand/><button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18}/></button></div><div className="workspace-switch"><div className="workspace-icon"><Command size={17}/></div><div><strong>Personal workspace</strong><span>Free plan</span></div><ChevronDown size={15}/></div><div className="nav-caption">WORKSPACE</div><nav className="side-nav">{navItems.filter(item => !item.admin || user?.role === 'admin').map(item => <Link key={item.to} to={item.to} onClick={() => setSidebarOpen(false)} className={`nav-link ${location.pathname === item.to ? 'active' : ''}`}><item.icon size={18}/>{item.label}{item.admin && <span className="nav-count">Admin</span>}</Link>)}</nav><div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><strong>Need a hand?</strong><p>Find answers and get back to work.</p><button onClick={() => window.open('mailto:support@example.com', '_blank')}>Visit help center <ArrowRight size={13}/></button></div><button className="profile-row" onClick={() => setMenuOpen(!menuOpen)}><div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div><div className="profile-info"><strong>{user?.name}</strong><span>{user?.email}</span></div><ChevronDown size={15}/></button>{menuOpen && <div className="profile-menu"><div className="profile-menu-label">SIGNED IN AS</div><div className="profile-menu-email">{user?.email}</div><button onClick={handleLogout}><LogOut size={15}/> Sign out</button></div>}</div></aside>{sidebarOpen && <button className="mobile-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"/>}
    <main className="main-area"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{title}</strong></div></div><div className="topbar-right"><div className="top-search"><Search size={16}/><span>Search anything</span><kbd>⌘ K</kbd></div><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div></div></header><div className="page-content"><div className="page-heading"><div><div className="page-kicker">YOUR WORKSPACE</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>{children}<footer className="app-footer"><span>© 2026 Orbit Workspace</span><span><span className="footer-status"/> All systems operational</span></footer></div></main></div>;
}

function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [attendance, setAttendance] = useState({ records: [], current: null });
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [clockNote, setClockNote] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([api('/dashboard'), api('/workspace/attendance'), api('/workspace/announcements')])
      .then(([dash, timeData, announcementData]) => {
        if (!active) return;
        setDashboard(dash);
        setAttendance(timeData);
        setAnnouncements((announcementData.announcements || []).slice(0, 4));
        setError('');
      })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [reloadKey]);
  const currentRecord = attendance.current || (attendance.records || []).find(record => record.date === localDateString()) || null;
  const activeClock = currentRecord && !currentRecord.clockOutAt;
  const workedMinutes = currentRecord ? (currentRecord.totalMinutes ?? Math.max(0, Math.round((Date.now() - new Date(currentRecord.clockInAt).getTime()) / 60000))) : 0;
  async function runClockAction(kind) {
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await api(`/workspace/attendance/clock-${kind}`, {
        method: 'POST',
        body: JSON.stringify(kind === 'in' ? { date: localDateString(), note: clockNote } : { date: localDateString() })
      });
      setSuccess(result.message || `Clocked ${kind} successfully.`);
      setClockNote('');
      setReloadKey(v => v + 1);
    } catch (err) { setError(err.message || 'Could not update attendance.'); }
    finally { setBusy(false); }
  }
  return <Shell title="Overview" subtitle={`Here's what's happening in your workspace, ${user?.name?.split(' ')[0]}.`} action={<button className="secondary-button" onClick={() => setReloadKey(v => v + 1)}><Activity size={16}/> Refresh data</button>}>
    {error && <div className="error-message feature-message" role="alert"><AlertCircle size={15}/>{error}</div>}
    {success && <div className="success-message feature-message" role="status"><CheckCircle2 size={15}/>{success}</div>}
    <div className="welcome-banner"><div className="welcome-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-core"><Sparkles size={26}/></div></div><div className="welcome-copy"><div className="welcome-label"><span className="pulse-dot"/> YOUR SPACE IS READY</div><h2>Make room for<br/><span>great things.</span></h2><p>Your workspace, attendance, and team updates in one place.</p></div><div className="welcome-index">01 <span>/ 03</span></div></div>
    <div className="section-title-row"><div><h2>Your overview</h2><p>A quick look at your account</p></div><span className="live-tag"><i/> LIVE DATA</span></div>
    <div className="stats-grid">{(dashboard?.stats || [{label:'Account status',value:'—',detail:'Loading your account'},{label:'Account type',value:'—',detail:'Loading permissions'},{label:'Registered',value:'—',detail:'Loading registration date'}]).map((stat, i) => <article className="stat-card" key={stat.label}><div className="stat-top"><span>{stat.label}</span><span className={`stat-icon stat-icon-${i}`}><Check size={17}/></span></div><div className="stat-value">{stat.value}</div><div className="stat-detail"><span className="detail-dot"/>{stat.detail}</div><div className="stat-decoration"/></article>)}</div>
    <div className="dashboard-work-grid">
      <section className="panel feature-panel dashboard-clock-panel">
        <div className="panel-heading"><div><h3>Today's attendance</h3><p>Clock in when you start and clock out when you're done.</p></div><span className={`status-chip ${activeClock ? 'status-live' : ''}`}>{activeClock ? 'CLOCKED IN' : currentRecord?.clockOutAt ? 'COMPLETED' : 'NOT STARTED'}</span></div>
        <div className="dashboard-clock-summary"><div><span className="dashboard-small-label">WORKED TODAY</span><strong>{formatMinutes(currentRecord?.clockOutAt ? currentRecord.totalMinutes : activeClock ? workedMinutes : 0)}</strong><span className="dashboard-muted">{currentRecord ? `Started at ${formatTime(currentRecord.clockInAt)}` : formatDate(localDateString())}</span></div><div className="clock-actions">{!currentRecord ? <button className="primary-button" disabled={busy} onClick={() => runClockAction('in')}><Clock3 size={17}/>{busy ? 'Please wait…' : 'Clock in'}</button> : activeClock ? <button className="primary-button clock-out-button" disabled={busy} onClick={() => runClockAction('out')}><LogOut size={17}/>{busy ? 'Please wait…' : 'Clock out'}</button> : <span className="status-chip">Day completed</span>}</div></div>
        {!currentRecord && <label className="field-label dashboard-note-label">Optional note<input className="feature-input" value={clockNote} onChange={e => setClockNote(e.target.value)} maxLength={300} placeholder="e.g. Working from home"/></label>}
        <Link className="dashboard-text-link" to="/attendance">View attendance history <ArrowRight size={14}/></Link>
      </section>
      <section className="panel feature-panel dashboard-announcements-panel">
        <div className="panel-heading"><div><h3>Announcements</h3><p>Latest updates from your team.</p></div><Megaphone size={19} color="var(--accent)"/></div>
        {announcements.length ? <div className="dashboard-announcement-list">{announcements.map(item => <article className="dashboard-announcement" key={item._id}><div className="dashboard-announcement-top"><strong>{item.title}</strong>{item.priority === 'important' && <span className="leave-status leave-rejected">Important</span>}</div><p>{item.body}</p><span className="dashboard-announcement-meta">{item.createdBy?.name ? `${item.createdBy.name} · ` : ''}{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></article>)}</div> : <div className="dashboard-empty-announcements"><Megaphone size={20}/><span>No announcements yet.</span></div>}
        <Link className="dashboard-text-link" to="/announcements">View all announcements <ArrowRight size={14}/></Link>
      </section>
    </div>
    <div className="content-grid"><article className="panel activity-panel"><div className="panel-heading"><div><h3>Getting started</h3><p>A few things to make this space yours</p></div><span className="subtle-badge">QUICK START</span></div><div className="checklist"><div className="check-row"><span className="check-circle done"><Check size={13}/></span><div><strong>Create your account</strong><span>Your account is active and ready.</span></div><span className="complete-label">COMPLETE</span></div><div className="check-row"><span className="check-circle"><Clock3 size={13}/></span><div><strong>Track your workday</strong><span>Use clock in and clock out to record hours.</span></div><Link to="/attendance" className="step-number">VIEW</Link></div><div className="check-row"><span className="check-circle"><CalendarCheck size={13}/></span><div><strong>Manage time off</strong><span>Submit a leave request when needed.</span></div><Link to="/leave" className="step-number">VIEW</Link></div></div></article><article className="panel account-panel"><div className="panel-heading"><div><h3>Account details</h3><p>Your profile at a glance</p></div><div className="account-mark"><Fingerprint size={19}/></div></div><div className="account-profile"><div className="large-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div><div><strong>{user?.name}</strong><span>{user?.email}</span></div></div><div className="account-line"><span>Account role</span><span className={`role-pill ${user?.role === 'admin' ? 'role-admin' : ''}`}>{user?.role === 'admin' ? 'Administrator' : 'Member'}</span></div><div className="account-line"><span>Account ID</span><span className="id-value">{String(user?.id || '').slice(-8).toUpperCase() || '—'}</span></div><div className="account-note"><LockKeyhole size={15}/><span>Your personal information is only available to authorized account sessions.</span></div></article></div>
    {user?.role === 'admin' && <div className="admin-callout"><div className="admin-callout-icon"><ShieldCheck size={20}/></div><div><strong>Administrator access enabled</strong><p>You can manage workspace members and their roles.</p></div><Link to="/admin">Open admin panel <ArrowRight size={15}/></Link></div>}
  </Shell>;
}
function AdminPage() {
  const { user } = useAuth(); const [users, setUsers] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [query, setQuery] = useState(''); const [changing, setChanging] = useState(''); const [creating, setCreating] = useState(false); const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
  const loadUsers = () => { setLoading(true); api('/admin/users').then(data => setUsers(data.users)).catch(err => setError(err.message)).finally(() => setLoading(false)); };
  useEffect(() => { loadUsers(); }, []);
  async function changeRole(target, role) { setError(''); setSuccess(''); setChanging(target); try { await api(`/admin/users/${target}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }); setSuccess('Member role updated.'); loadUsers(); } catch (err) { setError(err.message); } finally { setChanging(''); } }
  async function createAdmin(event) { event.preventDefault(); setError(''); setSuccess(''); setCreating(true); try { const result = await api('/admin/users', { method: 'POST', body: JSON.stringify(adminForm) }); setSuccess(result.message || 'Administrator account created.'); setAdminForm({ name: '', email: '', password: '' }); loadUsers(); } catch (err) { setError(err.message); } finally { setCreating(false); } }
  const filtered = users.filter(u => `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(query.toLowerCase()));
  return <Shell title="Team members" subtitle="Manage accounts and access across your workspace." action={<button className="secondary-button" onClick={loadUsers}><Activity size={16}/> Refresh list</button>}>
    {error && <div className="error-message feature-message" role="alert"><AlertCircle size={15}/>{error}</div>}{success && <div className="success-message feature-message" role="status"><CheckCircle2 size={15}/>{success}</div>}
    <section className="panel feature-panel admin-create-panel"><div className="panel-heading"><div><h3>Add an administrator</h3><p>Create an admin account directly. The password is stored as a hash.</p></div><ShieldCheck size={19} color="var(--accent)"/></div><form className="feature-form admin-create-form" onSubmit={createAdmin}><label className="field-label">Full name<input className="feature-input" value={adminForm.name} onChange={e => setAdminForm(v => ({ ...v, name: e.target.value }))} minLength={2} maxLength={80} autoComplete="name" required/></label><label className="field-label">Email address<input className="feature-input" type="email" value={adminForm.email} onChange={e => setAdminForm(v => ({ ...v, email: e.target.value }))} maxLength={254} autoComplete="email" required/></label><label className="field-label">Temporary password<input className="feature-input" type="password" value={adminForm.password} onChange={e => setAdminForm(v => ({ ...v, password: e.target.value }))} minLength={10} maxLength={72} autoComplete="new-password" required/><span className="admin-password-help">Use at least 10 characters. Share it securely and ask the new admin to change it after signing in.</span></label><button className="primary-button feature-submit" disabled={creating}>{creating ? <><Spinner/> Creating…</> : <><Plus size={16}/> Create administrator</>}</button></form></section>
    <div className="admin-metrics"><div className="admin-metric"><span>Total members</span><strong>{users.length}</strong><div><Users size={15}/> Registered accounts</div></div><div className="admin-metric"><span>Administrators</span><strong>{users.filter(u => u.role === 'admin').length}</strong><div><ShieldCheck size={15}/> Elevated access</div></div><div className="admin-metric"><span>Standard members</span><strong>{users.filter(u => u.role === 'user').length}</strong><div><Check size={15}/> Standard permissions</div></div></div>
    <section className="panel members-panel"><div className="members-heading"><div><h3>All accounts</h3><p>Review members and manage their permissions.</p></div><div className="member-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search members…" aria-label="Search members"/></div></div>
      <div className="table-scroll"><table><thead><tr><th>MEMBER</th><th>ROLE</th><th>JOINED</th><th>ACCESS</th></tr></thead><tbody>{loading ? <tr><td colSpan="4" className="empty-cell"><Spinner/> Loading accounts…</td></tr> : filtered.length === 0 ? <tr><td colSpan="4" className="empty-cell">No accounts match your search.</td></tr> : filtered.map(member => <tr key={member.id}><td><div className="member-cell"><div className="member-avatar">{member.name.charAt(0).toUpperCase()}</div><div><strong>{member.name}{member.id === user?.id && <span className="you-label">YOU</span>}</strong><span>{member.email}</span></div></div></td><td><span className={`role-pill ${member.role === 'admin' ? 'role-admin' : ''}`}>{member.role === 'admin' ? 'Administrator' : 'Member'}</span></td><td className="joined-date">{new Date(member.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td><td>{member.id === user?.id ? <span className="current-user-label">Current account</span> : <button className="role-action" disabled={changing === member.id} onClick={() => changeRole(member.id, member.role === 'admin' ? 'user' : 'admin')}>{changing === member.id ? <Spinner/> : member.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>}</td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing <strong>{filtered.length}</strong> of <strong>{users.length}</strong> accounts</span><span><ShieldCheck size={14}/> Changes apply immediately</span></div>
    </section><div className="security-note"><ShieldCheck size={18}/><div><strong>Access control matters</strong><p>Only administrators can see this page. New signups always receive standard member access.</p></div></div>
  </Shell>;
}


function localDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function formatDate(value) { if (!value) return '—'; return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
function formatTime(value) { return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'; }
function formatMinutes(value) { if (value == null) return 'In progress'; return `${Math.floor(value / 60)}h ${value % 60}m`; }
function FeaturePage() {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [leaveForm, setLeaveForm] = useState({ startDate: localDateString(), endDate: localDateString(), leaveType: 'Annual', reason: '' });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '', priority: 'normal' });
  const [clockNote, setClockNote] = useState('');
  const [reviewNotes, setReviewNotes] = useState({});
  const path = location.pathname;
  const isAdmin = user?.role === 'admin';
  const configs = {
    '/attendance': { title: 'Attendance', subtitle: 'Clock in when your workday starts and clock out when it ends.' },
    '/leave': { title: isAdmin ? 'Leave management' : 'Leave requests', subtitle: isAdmin ? 'Review and manage team leave requests.' : 'Submit time-off requests and track their status.' },
    '/announcements': { title: 'Announcements', subtitle: 'Company updates and important notices in one place.' },
    '/activity': { title: 'Activity log', subtitle: 'A timeline of account and workspace actions.' },
    '/profile': { title: 'My profile', subtitle: 'Manage your personal details and account security.' }
  };
  const config = configs[path] || configs['/profile'];
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    const requests = {
      '/attendance': () => api('/workspace/attendance'),
      '/leave': () => api(`/workspace/leave${isAdmin ? '?scope=all' : ''}`),
      '/announcements': () => api('/workspace/announcements'),
      '/activity': () => api(`/workspace/activity${isAdmin ? '?scope=all' : ''}`),
      '/profile': async () => ({})
    };
    (requests[path] || requests['/profile'])().then(result => { if (active) setData(result); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, isAdmin, reloadKey]);
  async function perform(action, payload) {
    setBusy(true); setError(''); setSuccess('');
    try { const result = await action(payload); setSuccess(result.message || 'Changes saved successfully.'); if (result.user) { setUser(result.user); setProfile({ name: result.user.name, email: result.user.email }); } setReloadKey(v => v + 1); return result; }
    catch (err) { setError(err.message || 'Something went wrong.'); return null; }
    finally { setBusy(false); }
  }
  async function clockIn() { await perform(() => api('/workspace/attendance/clock-in', { method: 'POST', body: JSON.stringify({ date: localDateString(), note: clockNote }) })); }
  async function clockOut() { await perform(() => api('/workspace/attendance/clock-out', { method: 'POST', body: JSON.stringify({ date: localDateString() }) })); }
  async function submitLeave(e) { e.preventDefault(); await perform(() => api('/workspace/leave', { method: 'POST', body: JSON.stringify(leaveForm) })); setLeaveForm(v => ({ ...v, reason: '' })); }
  async function publishAnnouncement(e) { e.preventDefault(); const result = await perform(() => api('/workspace/announcements', { method: 'POST', body: JSON.stringify(announcementForm) })); if (result) setAnnouncementForm({ title: '', body: '', priority: 'normal' }); }
  async function updateProfile(e) { e.preventDefault(); const result = await perform(() => api('/workspace/profile', { method: 'PATCH', body: JSON.stringify(profile) })); if (result?.user) setUser(result.user); }
  async function changePassword(e) { e.preventDefault(); const result = await perform(() => api('/workspace/password/change', { method: 'POST', body: JSON.stringify(passwords) })); if (result) setPasswords({ currentPassword: '', newPassword: '' }); }
  async function reviewLeave(id, status) { await perform(() => api(`/workspace/leave/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reviewNote: reviewNotes[id] || '' }) })); }
  const currentRecord = (data.records || []).find(record => record.date === localDateString()) || null;
  const activeClock = currentRecord && !currentRecord.clockOutAt;
  return <Shell title={config.title} subtitle={config.subtitle} action={<button className="secondary-button" onClick={() => setReloadKey(v => v + 1)}><Activity size={16}/> Refresh</button>}>
    {error && <div className="error-message feature-message"><AlertCircle size={15}/>{error}</div>}
    {success && <div className="success-message feature-message"><CheckCircle2 size={15}/>{success}</div>}
    {loading ? <div className="panel feature-empty"><Spinner/> Loading workspace data…</div> : <>
      {path === '/attendance' && <>
        <div className="feature-stats"><article className="stat-card"><div className="stat-top"><span>Today's status</span><span className="stat-icon"><Clock3 size={17}/></span></div><div className="stat-value">{!currentRecord ? 'Not started' : currentRecord.clockOutAt ? 'Completed' : 'Clocked in'}</div><div className="stat-detail"><span className="detail-dot"/>{localDateString()}</div></article><article className="stat-card"><div className="stat-top"><span>Clock-in time</span><span className="stat-icon"><Check size={17}/></span></div><div className="stat-value">{formatTime(currentRecord?.clockInAt)}</div><div className="stat-detail">Today's first clock-in</div></article><article className="stat-card"><div className="stat-top"><span>Hours recorded</span><span className="stat-icon"><Activity size={17}/></span></div><div className="stat-value">{currentRecord ? formatMinutes(currentRecord.totalMinutes ?? Math.max(0, Math.round((Date.now() - new Date(currentRecord.clockInAt).getTime()) / 60000))) : '0h 0m'}</div><div className="stat-detail">{currentRecord?.clockOutAt ? 'Final total for today' : activeClock ? 'Live estimate until clock-out' : 'Clock in to begin'}</div></article></div>
        <section className="panel feature-panel"><div className="panel-heading"><div><h3>Today's time clock</h3><p>One attendance record per employee per day.</p></div><span className={`status-chip ${activeClock ? 'status-live' : ''}`}>{activeClock ? 'IN PROGRESS' : currentRecord?.clockOutAt ? 'COMPLETED' : 'NOT STARTED'}</span></div><div className="clock-action-row"><div><div className="clock-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><p>Local device time · {formatDate(localDateString())}</p></div><div className="clock-actions">{!currentRecord ? <button className="primary-button" disabled={busy} onClick={clockIn}><Clock3 size={17}/> Clock in</button> : activeClock ? <button className="primary-button clock-out-button" disabled={busy} onClick={clockOut}><LogOut size={17}/> Clock out</button> : <span className="status-chip">Day completed</span>}</div></div>{!currentRecord && <label className="field-label">Optional note<input className="feature-input" value={clockNote} onChange={e => setClockNote(e.target.value)} maxLength={300} placeholder="e.g. Working from home"/></label>}</section>
        <section className="panel feature-panel"><div className="panel-heading"><div><h3>Attendance history</h3><p>Your recent daily clock-in and clock-out records.</p></div></div><div className="table-scroll"><table><thead><tr><th>DATE</th><th>CLOCK IN</th><th>CLOCK OUT</th><th>HOURS</th><th>NOTE</th></tr></thead><tbody>{(data.records || []).length ? data.records.map(r => <tr key={r._id}><td>{formatDate(r.date)}</td><td>{formatTime(r.clockInAt)}</td><td>{formatTime(r.clockOutAt)}</td><td>{formatMinutes(r.totalMinutes)}</td><td>{r.note || '—'}</td></tr>) : <tr><td colSpan="5" className="empty-cell">No attendance records yet.</td></tr>}</tbody></table></div></section>
      </>}
      {path === '/leave' && <>
        {!isAdmin && <section className="panel feature-panel"><div className="panel-heading"><div><h3>Request time off</h3><p>Submit a request for your manager to review.</p></div><CalendarCheck size={19} color="var(--accent)"/></div><form className="feature-form" onSubmit={submitLeave}><div className="form-two-col"><label className="field-label">Leave type<select className="feature-input" value={leaveForm.leaveType} onChange={e => setLeaveForm(v => ({ ...v, leaveType: e.target.value }))}><option>Annual</option><option>Sick</option><option>Personal</option><option>Unpaid</option><option>Other</option></select></label><label className="field-label">Start date<input className="feature-input" type="date" value={leaveForm.startDate} onChange={e => setLeaveForm(v => ({ ...v, startDate: e.target.value }))} required/></label><label className="field-label">End date<input className="feature-input" type="date" min={leaveForm.startDate} value={leaveForm.endDate} onChange={e => setLeaveForm(v => ({ ...v, endDate: e.target.value }))} required/></label></div><label className="field-label">Reason<textarea className="feature-input feature-textarea" minLength={3} maxLength={1000} value={leaveForm.reason} onChange={e => setLeaveForm(v => ({ ...v, reason: e.target.value }))} placeholder="Share the reason for your leave request…" required/></label><button className="primary-button feature-submit" disabled={busy}><Plus size={16}/> Submit leave request</button></form></section>}
        <section className="panel feature-panel"><div className="panel-heading"><div><h3>{isAdmin ? 'Team leave requests' : 'My requests'}</h3><p>{isAdmin ? 'Approve or reject pending requests.' : 'Review your submitted leave requests and their status.'}</p></div></div><div className="request-list">{(data.requests || []).length ? data.requests.map(r => <article className="request-card" key={r._id}><div className="request-main"><div className="request-icon"><CalendarCheck size={18}/></div><div className="request-content"><strong>{r.leaveType} leave <span className={`leave-status leave-${r.status}`}>{r.status}</span></strong><p>{formatDate(r.startDate)} – {formatDate(r.endDate)} · {r.reason}</p>{isAdmin && r.user && <span className="request-meta">Requested by {r.user.name} · {r.user.email}</span>}{r.reviewNote && <span className="request-meta">Review note: {r.reviewNote}</span>}</div></div>{isAdmin && r.status === 'pending' && <div className="review-actions"><input className="feature-input review-note" placeholder="Optional review note" value={reviewNotes[r._id] || ''} onChange={e => setReviewNotes(v => ({ ...v, [r._id]: e.target.value }))}/><button className="small-action approve" disabled={busy} onClick={() => reviewLeave(r._id, 'approved')}>Approve</button><button className="small-action reject" disabled={busy} onClick={() => reviewLeave(r._id, 'rejected')}>Reject</button></div>}</article>) : <div className="feature-empty">No leave requests to display.</div>}</div></section>
      </>}
      {path === '/announcements' && <>
        {isAdmin && <section className="panel feature-panel"><div className="panel-heading"><div><h3>Publish announcement</h3><p>Visible to all signed-in team members.</p></div><Megaphone size={19} color="var(--accent)"/></div><form className="feature-form" onSubmit={publishAnnouncement}><label className="field-label">Title<input className="feature-input" minLength={3} maxLength={120} value={announcementForm.title} onChange={e => setAnnouncementForm(v => ({ ...v, title: e.target.value }))} required placeholder="e.g. Office holiday schedule"/></label><label className="field-label">Message<textarea className="feature-input feature-textarea" minLength={3} maxLength={3000} value={announcementForm.body} onChange={e => setAnnouncementForm(v => ({ ...v, body: e.target.value }))} required placeholder="Write your company announcement…"/></label><label className="field-label">Priority<select className="feature-input" value={announcementForm.priority} onChange={e => setAnnouncementForm(v => ({ ...v, priority: e.target.value }))}><option value="normal">Normal</option><option value="important">Important</option></select></label><button className="primary-button feature-submit" disabled={busy}><Plus size={16}/> Publish announcement</button></form></section>}
        <div className="announcement-list">{(data.announcements || []).length ? data.announcements.map(a => <article className="panel announcement-card" key={a._id}><div className="announcement-top"><div className="announcement-icon"><Megaphone size={18}/></div><div className="announcement-heading"><h3>{a.title}</h3><span>{new Date(a.createdAt).toLocaleString()} {a.createdBy?.name ? `· ${a.createdBy.name}` : ''}</span></div>{a.priority === 'important' && <span className="leave-status leave-rejected">Important</span>}</div><p>{a.body}</p></article>) : <div className="panel feature-empty">No announcements have been published yet.</div>}</div>
      </>}
      {path === '/activity' && <section className="panel feature-panel"><div className="panel-heading"><div><h3>{isAdmin ? 'Workspace activity' : 'Your recent activity'}</h3><p>{isAdmin ? 'Recent actions across the workspace.' : 'A record of actions taken by your account.'}</p></div><History size={19} color="var(--accent)"/></div><div className="timeline-list">{(data.activities || []).length ? data.activities.map(a => <article className="timeline-item" key={a._id}><span className="timeline-dot"/><div className="timeline-copy"><strong>{a.action}</strong><p>{a.detail || 'Workspace activity'}</p>{isAdmin && <span>{a.actorName} · </span>}<span>{new Date(a.createdAt).toLocaleString()}</span></div></article>) : <div className="feature-empty">No activity has been recorded yet.</div>}</div></section>}
      {path === '/profile' && <div className="profile-grid"><section className="panel feature-panel"><div className="panel-heading"><div><h3>Personal information</h3><p>Update your name and email address.</p></div><UserRound size={19} color="var(--accent)"/></div><form className="feature-form" onSubmit={updateProfile}><label className="field-label">Full name<input className="feature-input" value={profile.name} minLength={2} maxLength={80} onChange={e => setProfile(v => ({ ...v, name: e.target.value }))} required/></label><label className="field-label">Email address<input className="feature-input" type="email" value={profile.email} maxLength={254} onChange={e => setProfile(v => ({ ...v, email: e.target.value }))} required/></label><div className="profile-role-row"><span>Current role</span><span className={`role-pill ${isAdmin ? 'role-admin' : ''}`}>{isAdmin ? 'Administrator' : 'Member'}</span></div><button className="primary-button feature-submit" disabled={busy}>Save profile <ArrowRight size={16}/></button></form></section><section className="panel feature-panel"><div className="panel-heading"><div><h3>Change password</h3><p>Use a unique password with at least 10 characters.</p></div><KeyRound size={19} color="var(--accent)"/></div><form className="feature-form" onSubmit={changePassword}><label className="field-label">Current password<input className="feature-input" type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={e => setPasswords(v => ({ ...v, currentPassword: e.target.value }))} required/></label><label className="field-label">New password<input className="feature-input" type="password" autoComplete="new-password" minLength={10} maxLength={72} value={passwords.newPassword} onChange={e => setPasswords(v => ({ ...v, newPassword: e.target.value }))} required/></label><button className="primary-button feature-submit" disabled={busy}>Update password <LockKeyhole size={16}/></button></form><div className="security-note"><ShieldCheck size={17}/><div><strong>Protected account</strong><p>Your password is hashed before storage. Never share it with anyone.</p></div></div></section></div>}
    </>}
  </Shell>;
}

export default function App() { return <AuthProvider><Routes><Route path="/login" element={<AuthLayout mode="login"/>}/><Route path="/signup" element={<AuthLayout mode="signup"/>}/><Route path="/verify-email" element={<VerifyEmailPage/>}/><Route path="/dashboard" element={<Protected><DashboardPage/></Protected>}/><Route path="/attendance" element={<Protected><FeaturePage/></Protected>}/><Route path="/leave" element={<Protected><FeaturePage/></Protected>}/><Route path="/announcements" element={<Protected><FeaturePage/></Protected>}/><Route path="/activity" element={<Protected><FeaturePage/></Protected>}/><Route path="/profile" element={<Protected><FeaturePage/></Protected>}/><Route path="/admin" element={<Protected admin><AdminPage/></Protected>}/><Route path="*" element={<HomeRedirect/>}/></Routes></AuthProvider>; }
function HomeRedirect() { const { user, loading } = useAuth(); if (loading) return <div className="loading-screen"><Spinner/><span>Preparing your workspace</span></div>; return <Navigate to={user ? '/dashboard' : '/login'} replace/>; }
