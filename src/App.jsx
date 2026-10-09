import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, BookOpen, ClipboardList, Home as HomeI, Layers, LogOut, Menu as MenuIcon, Trophy, User, X, LayoutDashboard } from 'lucide-react'
import { useAuth } from './lib/auth'
import { BRAND } from './lib/brand'
import mark from './assets/mark.png'
import { Avatar, Menu, PageSkeleton } from './components/ui'
import { ThemeToggle } from './lib/theme'
import './components/shell.css'
import './components/responsive.css'
import NotificationBell from './components/NotificationBell'
import Home from './pages/Home'
import Auth from './pages/Auth'
import { StudentHome, Assignments, Results, Account } from './pages/Student'
import Solve from './pages/Solve'
import Review from './pages/Review'
import Admin from './pages/admin/Admin'
import Pending from './pages/Pending'
import { Learn, TrackView, TracksHome } from './pages/Tracks'
import Performance from './pages/Performance'
import Practice from './pages/Practice'
export const Brand = ({ to = '/', sub }) => <Link to={to} className="brand"><img className="mark" src={mark} alt="" width="38" height="38" /><span><b>{BRAND}</b>{sub && <small>{sub}</small>}</span></Link>
function StudentDrawer({ links, open, setOpen }) {
  const { profile, signOut } = useAuth(), nav = useNavigate(), path = useLocation().pathname
  useEffect(() => setOpen(false), [path])
  useEffect(() => { if (!open) return; const k = e => e.key === 'Escape' && setOpen(false), prev = document.body.style.overflow; document.addEventListener('keydown', k); document.body.style.overflow = 'hidden'; return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev } }, [open])
  return <><div className={'sdr-scrim' + (open ? ' show' : '')} onClick={() => setOpen(false)} />
    <aside className={'sdr' + (open ? ' open' : '')} aria-label="القائمة الرئيسية"><div className="sdr-head"><Brand /><button className="iconbtn" aria-label="إغلاق القائمة" onClick={() => setOpen(false)} style={{ background: 'transparent', color: '#fff', borderColor: '#ffffff30' }}><X size={20} className="i" /></button></div>
      <nav>{[...links, ['/account', 'حسابي', User]].map(([to, t, I]) => <NavLink key={to} to={to} className="nl"><I size={20} className="i" />{t}</NavLink>)}</nav>
      <div className="me"><Avatar name={profile?.full_name} /><div className="grow"><b>{profile?.full_name}</b><span className="small" style={{ color: '#94a3b8' }}>طالب</span></div><button className="iconbtn" aria-label="تسجيل الخروج" onClick={async () => { await signOut(); nav('/') }} style={{ background: 'transparent', color: '#fff', borderColor: '#ffffff30' }}><LogOut size={19} className="i" /></button></div></aside></>
}
function Shell() {
  const { profile, isAdmin, signOut } = useAuth(), nav = useNavigate(), student = profile && !isAdmin, home = useLocation().pathname === '/', [drawer, setDrawer] = useState(false)
  const links = [['/dashboard', 'الرئيسية', HomeI], ['/learn', 'المنهج', BookOpen], ['/tracks', 'المسارات', Layers], ['/assignments', 'الواجبات', ClipboardList], ['/performance', 'أدائي', BarChart3], ['/results', 'النتائج', Trophy]]
  return <div className="shell" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
    <header className={'topbar' + (home ? ' dark' : '')}><div className="in">{student && <button className="iconbtn burger-s" aria-label="فتح القائمة" aria-expanded={drawer} onClick={() => setDrawer(true)}><MenuIcon size={20} className="i" /></button>}<Brand />
      {student && <nav className="tnav" aria-label="التنقل الرئيسي">{links.map(([to, t]) => <NavLink key={to} to={to}>{t}</NavLink>)}</nav>}
      {!student && <nav className="tnav hide-m" aria-label="التنقل الرئيسي"><NavLink to="/" end>الرئيسية</NavLink><a href="/#curriculum">المنهج</a><NavLink to={profile ? '/admin/assignments' : '/auth'}>الواجبات</NavLink></nav>}<span className="grow" /><div className="tools"><ThemeToggle />{student && <NotificationBell />}</div>
      {profile ? <Menu label="قائمة الحساب" trigger={<button className="row" style={{ background: 'none', border: 0, cursor: 'pointer' }}><Avatar name={profile.full_name} /><span className="hide-m small">{profile.full_name}</span></button>}>
        {isAdmin ? <Link to="/admin"><LayoutDashboard size={17} className="i" />لوحة المدرس</Link> : <Link to="/account"><User size={17} className="i" />حسابي</Link>}
        <button className="dng" onClick={async () => { await signOut(); nav('/') }}><LogOut size={17} className="i" />تسجيل الخروج</button></Menu>
        : <div className="row"><Link className={'btn sm hide-m ' + (home ? 'outline' : 'secondary')} to="/auth?mode=up">إنشاء حساب</Link><Link className={'btn sm ' + (home ? 'white' : '')} to="/auth">تسجيل الدخول</Link></div>}</div></header>
    <main style={{ flex: '1 0 auto' }}><Outlet /></main>
    <footer className="foot" style={{ flexShrink: 0 }}>جميع الحقوق محفوظة - Eng. Ibrahim Saad</footer>
    {student && <StudentDrawer links={links} open={drawer} setOpen={setDrawer} />}</div>
}
const Guard = ({ admin, children }) => {
  const { session, isAdmin, loading, profile } = useAuth()
  if (loading) return <div className="page"><PageSkeleton /></div>
  if (!session) return <Navigate to="/auth" replace />
  if (admin && !isAdmin) return <Navigate to="/dashboard" replace />
  if (!isAdmin && profile && !profile.active) return <Pending />
  return children
}
function RoleRedirect() {
  const { session, profile, loading, isAdmin } = useAuth()
  if (loading || (session && !profile)) return <div className="page"><PageSkeleton /></div>
  return <Navigate to={!session ? '/auth' : isAdmin ? '/admin' : '/dashboard'} replace />
}
export default function App() {
  return <Routes>
    <Route index element={<Home />} /><Route path="auth" element={<Auth />} /><Route path="go" element={<RoleRedirect />} />
    <Route path="solve/:id" element={<Guard><Solve /></Guard>} />
    <Route element={<Shell />}>
      <Route path="dashboard" element={<Guard><StudentHome /></Guard>} /><Route path="assignments" element={<Guard><Assignments /></Guard>} />
      <Route path="learn" element={<Guard><Learn /></Guard>} /><Route path="performance" element={<Guard><Performance /></Guard>} /><Route path="practice/:lessonId" element={<Guard><Practice /></Guard>} /><Route path="tracks" element={<Guard><TracksHome /></Guard>} /><Route path="tracks/:id" element={<Guard><TrackView /></Guard>} /><Route path="results" element={<Guard><Results /></Guard>} /><Route path="account" element={<Guard><Account /></Guard>} />
      <Route path="review/:id" element={<Guard><Review /></Guard>} /><Route path="*" element={<Navigate to="/" />} /></Route>
    <Route path="admin/*" element={<Guard admin><Admin /></Guard>} /></Routes>
}
