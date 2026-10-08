import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, BookOpen, ClipboardList, Home as HomeI, Layers, LogOut, Trophy, User, LayoutDashboard } from 'lucide-react'
import { useAuth } from './lib/auth'
import { BRAND } from './lib/brand'
import mark from './assets/mark.png'
import { Avatar, Menu, PageSkeleton } from './components/ui'
import { ThemeToggle } from './lib/theme'
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
import Certificate from './pages/Certificate'
export const Brand = ({ to = '/', sub }) => <Link to={to} className="brand"><img className="mark" src={mark} alt="" width="38" height="38" /><span><b>{BRAND}</b>{sub && <small>{sub}</small>}</span></Link>
function Shell() {
  const { profile, isAdmin, signOut } = useAuth(), nav = useNavigate(), student = profile && !isAdmin, home = useLocation().pathname === '/'
  const links = [['/dashboard', 'الرئيسية', HomeI], ['/learn', 'المنهج', BookOpen], ['/tracks', 'المسارات', Layers], ['/assignments', 'الواجبات', ClipboardList], ['/performance', 'أدائي', BarChart3], ['/results', 'النتائج', Trophy]]
  return <div className="shell" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
    <header className={'topbar' + (home ? ' dark' : '')}><div className="in"><Brand />
      {student && <nav className="tnav" aria-label="التنقل الرئيسي">{links.map(([to, t]) => <NavLink key={to} to={to}>{t}</NavLink>)}</nav>}
      {!student && <nav className="tnav hide-m" aria-label="التنقل الرئيسي"><NavLink to="/" end>الرئيسية</NavLink><a href="/#curriculum">المنهج</a><NavLink to={profile ? '/admin/assignments' : '/auth'}>الواجبات</NavLink></nav>}<span className="grow" /><div className="tools"><ThemeToggle />{student && <NotificationBell />}</div>
      {profile ? <Menu label="قائمة الحساب" trigger={<button className="row" style={{ background: 'none', border: 0, cursor: 'pointer' }}><Avatar name={profile.full_name} /><span className="hide-m small">{profile.full_name}</span></button>}>
        {isAdmin ? <Link to="/admin"><LayoutDashboard size={17} className="i" />لوحة المدرس</Link> : <Link to="/account"><User size={17} className="i" />حسابي</Link>}
        <button className="dng" onClick={async () => { await signOut(); nav('/') }}><LogOut size={17} className="i" />تسجيل الخروج</button></Menu>
        : <div className="row"><Link className={'btn sm hide-m ' + (home ? 'outline' : 'secondary')} to="/auth?mode=up">إنشاء حساب</Link><Link className={'btn sm ' + (home ? 'white' : '')} to="/auth">تسجيل الدخول</Link></div>}</div></header>
    <main style={{ flex: '1 0 auto' }}><Outlet /></main>
    <footer className="foot" style={{ flexShrink: 0 }}>جميع الحقوق محفوظة - Eng. Ibrahim Saad</footer>
    {student && <nav className="bnav" aria-label="التنقل السفلي">{[...links.slice(0, 4), ['/account', 'حسابي', User]].map(([to, t, I]) => <NavLink key={to} to={to}><I size={22} className="i" />{t}</NavLink>)}</nav>}</div>
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
      <Route path="learn" element={<Guard><Learn /></Guard>} /><Route path="performance" element={<Guard><Performance /></Guard>} /><Route path="practice/:lessonId" element={<Guard><Practice /></Guard>} /><Route path="certificate/:id" element={<Guard><Certificate /></Guard>} /><Route path="tracks" element={<Guard><TracksHome /></Guard>} /><Route path="tracks/:id" element={<Guard><TrackView /></Guard>} /><Route path="results" element={<Guard><Results /></Guard>} /><Route path="account" element={<Guard><Account /></Guard>} />
      <Route path="review/:id" element={<Guard><Review /></Guard>} /><Route path="*" element={<Navigate to="/" />} /></Route>
    <Route path="admin/*" element={<Guard admin><Admin /></Guard>} /></Routes>
}
