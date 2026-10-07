import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ClipboardList, Home as HomeI, LogOut, Trophy, User, LayoutDashboard } from 'lucide-react'
import { useAuth } from './lib/auth'
import { BRAND } from './lib/brand'
import mark from './assets/mark.png'
import { Avatar, Menu, PageSkeleton } from './components/ui'
import Home from './pages/Home'
import Auth from './pages/Auth'
import { StudentHome, Assignments, Results, Account } from './pages/Student'
import Solve from './pages/Solve'
import Review from './pages/Review'
import Admin from './pages/admin/Admin'
export const Brand = ({ to = '/', sub }) => <Link to={to} className="brand"><img className="mark" src={mark} alt="" width="38" height="38" /><span><b aria-label={BRAND}><span className="bn">اكاديمية المهندس</span><span className="bn">إبراهيم سعد</span></b>{sub && <small>{sub}</small>}</span></Link>
function Shell() {
  const { profile, isAdmin, signOut } = useAuth(), nav = useNavigate(), student = profile && !isAdmin, home = useLocation().pathname === '/'
  const links = [['/dashboard', 'الرئيسية', HomeI], ['/assignments', 'الواجبات', ClipboardList], ['/results', 'النتائج', Trophy]]
  return <>
    <header className={'topbar' + (home ? ' dark' : '')}><div className="in"><Brand />
      {student && <nav className="tnav" aria-label="التنقل الرئيسي">{links.map(([to, t]) => <NavLink key={to} to={to}>{t}</NavLink>)}</nav>}
      {!student && <nav className="tnav hide-m" aria-label="التنقل الرئيسي"><NavLink to="/" end>الرئيسية</NavLink><a href="/#curriculum">المنهج</a><NavLink to={profile ? '/admin/assignments' : '/auth'}>الواجبات</NavLink></nav>}<span className="grow" />
      {profile ? <Menu label="قائمة الحساب" trigger={<button className="row" style={{ background: 'none', border: 0, cursor: 'pointer' }}><Avatar name={profile.full_name} /><span className="hide-m small">{profile.full_name}</span></button>}>
        {isAdmin ? <Link to="/admin"><LayoutDashboard size={17} className="i" />لوحة المدرس</Link> : <Link to="/account"><User size={17} className="i" />حسابي</Link>}
        <button className="dng" onClick={async () => { await signOut(); nav('/') }}><LogOut size={17} className="i" />تسجيل الخروج</button></Menu>
        : <div className="row"><Link className={'btn sm hide-m ' + (home ? 'outline' : 'secondary')} to="/auth?mode=up">إنشاء حساب</Link><Link className={'btn sm ' + (home ? 'white' : '')} to="/auth">تسجيل الدخول</Link></div>}</div></header>
    <main><Outlet /></main>
    <footer className="foot">جميع الحقوق محفوظة - Eng. Ibrahim Saad</footer>
    {student && <nav className="bnav" aria-label="التنقل السفلي">{[...links, ['/account', 'حسابي', User]].map(([to, t, I]) => <NavLink key={to} to={to}><I size={22} className="i" />{t}</NavLink>)}</nav>}</>
}
const Guard = ({ admin, children }) => {
  const { session, isAdmin, loading } = useAuth()
  if (loading) return <div className="page"><PageSkeleton /></div>
  if (!session) return <Navigate to="/auth" replace />
  if (admin && !isAdmin) return <Navigate to="/dashboard" replace />
  return children
}
export default function App() {
  return <Routes>
    <Route path="auth" element={<Auth />} />
    <Route path="solve/:id" element={<Guard><Solve /></Guard>} />
    <Route element={<Shell />}>
      <Route index element={<Home />} />
      <Route path="dashboard" element={<Guard><StudentHome /></Guard>} /><Route path="assignments" element={<Guard><Assignments /></Guard>} />
      <Route path="results" element={<Guard><Results /></Guard>} /><Route path="account" element={<Guard><Account /></Guard>} />
      <Route path="review/:id" element={<Guard><Review /></Guard>} /><Route path="*" element={<Navigate to="/" />} /></Route>
    <Route path="admin/*" element={<Guard admin><Admin /></Guard>} /></Routes>
}
