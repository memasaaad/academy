import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { X, Bell, BarChart3, BookOpen, ClipboardList, FileQuestion, FileUp, GraduationCap, LayoutDashboard, LogOut, Menu as MenuI, PenLine, Trophy, Users } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Brand } from '../../App'
import { Avatar, IconBtn, Menu, SearchInput, fdt } from '../../components/ui'
import Overview from './Overview'
import Curriculum from './Curriculum'
import Questions from './Questions'
import Assignments from './Assignments'
import Students from './Students'
import Grading from './Grading'
import Results from './Results'
import Analytics from './Analytics'
import Import from './Import'
const groups = [['', [['', LayoutDashboard, 'الرئيسية']]], ['المحتوى', [['curriculum', BookOpen, 'الفصول والدروس'], ['questions', FileQuestion, 'بنك الأسئلة'], ['import', FileUp, 'استيراد / تصدير']]],
  ['التقييم', [['assignments', ClipboardList, 'الواجبات'], ['grading', PenLine, 'التصحيح'], ['results', Trophy, 'النتائج']]], ['المتابعة', [['students', Users, 'الطلاب'], ['analytics', BarChart3, 'التحليلات']]]]
const titles = Object.fromEntries(groups.flatMap(([, l]) => l.map(([p, , t]) => [p, t])))
function Bell_() {
  const [list, setList] = useState([]), [open, setOpen] = useState(false), go = useNavigate()
  const load = async () => setList((await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(20)).data || [])
  useEffect(() => { load(); const ch = sb.channel('notif').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, load).subscribe(); return () => { sb.removeChannel(ch) } }, [])
  const unread = list.filter(n => !n.read).length
  const click = async n => { await sb.from('notifications').update({ read: true }).eq('id', n.id); setOpen(false); load(); go(n.attempt_id ? `/admin/grading?attempt=${n.attempt_id}` : '/admin/grading') }
  return <div className="menuw"><IconBtn icon={Bell} label={`الإشعارات${unread ? ` (${unread} غير مقروء)` : ''}`} badge={unread} aria-expanded={open} onClick={() => setOpen(!open)} />
    {open && <div className="dropp"><div className="row between" style={{ padding: '10px 12px', borderBottom: '1px solid var(--c-border)' }}><b>الإشعارات</b>{unread > 0 && <button className="btn ghost sm" onClick={async () => { await sb.from('notifications').update({ read: true }).eq('read', false); load() }}>تعليم الكل كمقروء</button>}</div>
      <div style={{ maxHeight: 360, overflow: 'auto' }}>{list.length ? list.map(n => <button key={n.id} className={'notif' + (n.read ? '' : ' unread')} onClick={() => click(n)}><b className="small">{n.title}</b><span className="small">{n.body}</span><span className="muted small">{fdt(n.created_at)}</span></button>) : <p className="muted small" style={{ padding: 20, textAlign: 'center' }}>لا توجد إشعارات بعد. ستظهر هنا عند تسليم الطلاب لواجباتهم.</p>}</div></div>}</div>
}
export default function Admin() {
  const { profile, signOut } = useAuth(), [m, setM] = useState(false), loc = useLocation(), go = useNavigate(), [q, setQ] = useState('')
  const seg = loc.pathname.replace(/^\/admin\/?/, '').split('/')[0]
  useEffect(() => setM(false), [loc.pathname])
  return <div className="adm"><div className={'scrim' + (m ? ' show' : '')} onClick={() => setM(false)} />
    <aside className={'side' + (m ? ' open' : '')} aria-label="القائمة الرئيسية"><div className="sdrawer-head"><Brand to="/admin" /><IconBtn icon={X} label="إغلاق القائمة" style={{ background: 'transparent', color: '#fff', borderColor: '#ffffff30' }} onClick={() => setM(false)} /></div><div className="sbrand-d"><Brand to="/admin" /></div>
      <nav>{groups.map(([g, l]) => <div key={g}>{g && <div className="grp">{g}</div>}{l.map(([p, I, t]) => <NavLink key={p} end={p === ''} to={`/admin/${p}`} className="nl"><I size={19} className="i" />{t}</NavLink>)}</div>)}</nav>
      <div className="me"><Avatar name="إ" /><div className="grow"><b>م/ إبراهيم سعد</b><div className="small" style={{ color: '#94a3b8' }}>مدرس</div></div><IconBtn icon={LogOut} label="تسجيل الخروج" style={{ background: 'transparent', color: '#fff', borderColor: '#ffffff30' }} onClick={async () => { await signOut(); go('/') }} /></div></aside>
    <section className="admain"><header className="ahead"><IconBtn className="burger" icon={MenuI} label="فتح القائمة" onClick={() => setM(true)} /><div><div className="crumb">لوحة المدرس</div><h2>{titles[seg] || 'الرئيسية'}</h2></div><span className="sp" />
      <form className="search" onSubmit={e => { e.preventDefault(); go(`/admin/questions?q=${encodeURIComponent(q)}`) }}><SearchInput value={q} onChange={setQ} placeholder="ابحث في بنك الأسئلة…" /></form><Bell_ />
      <Menu label="الحساب" trigger={<button className="who" style={{ background: 'none', border: 0, cursor: 'pointer' }}><Avatar name={profile?.full_name} /><span className="hide-m"><b className="small">م/ إبراهيم سعد</b><small>مدرس</small></span></button>}><button className="dng" onClick={async () => { await signOut(); go('/') }}><LogOut size={17} className="i" />تسجيل الخروج</button></Menu></header>
      <div className="acontent"><Routes><Route index element={<Overview />} /><Route path="curriculum" element={<Curriculum />} /><Route path="questions" element={<Questions />} /><Route path="import" element={<Import />} />
        <Route path="assignments" element={<Assignments />} /><Route path="students" element={<Students />} /><Route path="grading" element={<Grading />} /><Route path="results" element={<Results />} /><Route path="analytics" element={<Analytics />} /></Routes></div></section></div>
}
