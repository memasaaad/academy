import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Home, X, BarChart3, BookOpen, ClipboardList, FileQuestion, FileUp, GraduationCap, Layers, Megaphone, LayoutDashboard, LogOut, Menu as MenuI, PenLine, Trophy, Users } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Brand } from '../../App'
import { Avatar, IconBtn, Menu } from '../../components/ui'
import { ThemeToggle } from '../../lib/theme'
import NotificationBell from '../../components/NotificationBell'
import Overview from './Overview'
import Curriculum from './Curriculum'
import Questions from './Questions'
import Assignments from './Assignments'
import Students from './Students'
import Grading from './Grading'
import Results from './Results'
import Analytics from './Analytics'
import Import from './Import'
import Tracks from './Tracks'
import Announcements from './Announcements'
const groups = [['', [['', LayoutDashboard, 'الرئيسية']]], ['المحتوى', [['curriculum', BookOpen, 'الفصول والدروس'], ['tracks', Layers, 'مسارات البرمجة'], ['questions', FileQuestion, 'بنك الأسئلة'], ['import', FileUp, 'استيراد / تصدير']]],
  ['التقييم', [['assignments', ClipboardList, 'الواجبات'], ['grading', PenLine, 'التصحيح'], ['results', Trophy, 'النتائج']]], ['المتابعة', [['students', Users, 'الطلاب'], ['announcements', Megaphone, 'الإعلانات'], ['analytics', BarChart3, 'التحليلات']]]]
const titles = Object.fromEntries(groups.flatMap(([, l]) => l.map(([p, , t]) => [p, t])))
export default function Admin() {
  const { profile, signOut } = useAuth(), [m, setM] = useState(false), loc = useLocation(), go = useNavigate()
  const seg = loc.pathname.replace(/^\/admin\/?/, '').split('/')[0]
  useEffect(() => setM(false), [loc.pathname])
  useEffect(() => { if (!m) return; const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev } }, [m])
  return <div className="adm"><div className={'scrim' + (m ? ' show' : '')} onClick={() => setM(false)} />
    <aside className={'side' + (m ? ' open' : '')} aria-label="القائمة الرئيسية"><div className="sdrawer-head"><Brand to="/admin" /><IconBtn icon={X} label="إغلاق القائمة" style={{ background: 'transparent', color: '#fff', borderColor: '#ffffff30' }} onClick={() => setM(false)} /></div><div className="sbrand-d"><Brand to="/admin" /></div>
      <nav>{groups.map(([g, l]) => <div key={g}>{g && <div className="grp">{g}</div>}{l.map(([p, I, t]) => <NavLink key={p} end={p === ''} to={`/admin/${p}`} className="nl"><I size={19} className="i" />{t}</NavLink>)}</div>)}</nav>
      <Link to="/" className="nl" style={{ marginTop: 12, borderTop: '1px solid #ffffff1a', borderRadius: 0, paddingTop: 14 }}><Home size={19} className="i" />الصفحة الرئيسية للموقع</Link>
      <div className="me"><Avatar name="إ" /><div className="grow"><b>م/ إبراهيم سعد</b><div className="small" style={{ color: '#94a3b8' }}>مدرس</div></div><IconBtn icon={LogOut} label="تسجيل الخروج" style={{ background: 'transparent', color: '#fff', borderColor: '#ffffff30' }} onClick={async () => { await signOut(); go('/') }} /></div></aside>
    <section className="admain"><header className="ahead"><IconBtn className="burger" icon={MenuI} label="فتح القائمة" onClick={() => setM(true)} /><div><div className="crumb">لوحة المدرس</div><h2>{titles[seg] || 'الرئيسية'}</h2></div><span className="sp" />
      <ThemeToggle /><NotificationBell admin />
      <Menu label="الحساب" trigger={<button className="who" style={{ background: 'none', border: 0, cursor: 'pointer' }}><Avatar name={profile?.full_name} /><span className="hide-m"><b className="small">م/ إبراهيم سعد</b><small>مدرس</small></span></button>}><button className="dng" onClick={async () => { await signOut(); go('/') }}><LogOut size={17} className="i" />تسجيل الخروج</button></Menu></header>
      <div className="acontent"><Routes><Route index element={<Overview />} /><Route path="curriculum" element={<Curriculum />} /><Route path="tracks" element={<Tracks />} /><Route path="announcements" element={<Announcements />} /><Route path="questions" element={<Questions />} /><Route path="import" element={<Import />} />
        <Route path="assignments" element={<Assignments />} /><Route path="students" element={<Students />} /><Route path="grading" element={<Grading />} /><Route path="results" element={<Results />} /><Route path="analytics" element={<Analytics />} /></Routes></div></section></div>
}
