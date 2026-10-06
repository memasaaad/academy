import { Link, Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Solve from './pages/Solve'
import Admin from './pages/admin/Admin'
export const BRAND = 'اكاديمية المهندس إبراهيم سعد'
function Shell() {
  const { profile, isAdmin, signOut } = useAuth()
  return <div className="app">
    <header className="top"><Link to="/" className="brand"><span className="logo">{'</>'}</span>{BRAND}</Link>
      <nav>{profile ? <>{isAdmin ? <Link to="/admin">لوحة المدرس</Link> : <Link to="/dashboard">واجباتي</Link>}<button className="link" onClick={signOut}>خروج</button></> : <Link to="/auth">دخول</Link>}</nav></header>
    <main><Outlet /></main>
    <footer>جميع الحقوق محفوظة - Eng. Ibrahim Saad</footer></div>
}
const Guard = ({ admin, children }) => {
  const { session, isAdmin, loading } = useAuth()
  if (loading) return <div className="center">جارٍ التحميل…</div>
  if (!session) return <Navigate to="/auth" replace />
  if (admin && !isAdmin) return <Navigate to="/dashboard" replace />
  return children
}
export default function App() {
  return <Routes><Route element={<Shell />}>
    <Route index element={<Home />} /><Route path="auth" element={<Auth />} />
    <Route path="dashboard" element={<Guard><Dashboard /></Guard>} />
    <Route path="solve/:id" element={<Guard><Solve /></Guard>} />
    <Route path="admin/*" element={<Guard admin><Admin /></Guard>} />
    <Route path="*" element={<Navigate to="/" />} /></Route></Routes>
}
