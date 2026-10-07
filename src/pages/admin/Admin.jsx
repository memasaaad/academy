import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { sb } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import Overview from './Overview'
import Curriculum from './Curriculum'
import Questions from './Questions'
import Assignments from './Assignments'
import Students from './Students'
import Grading from './Grading'
import Results from './Results'
import Analytics from './Analytics'
import Import from './Import'
const nav = [['', '🏠', 'الرئيسية'], ['curriculum', '📚', 'الفصول والدروس'], ['questions', '❓', 'بنك الأسئلة'], ['import', '⬆️', 'استيراد / تصدير'], ['assignments', '📝', 'الواجبات'], ['students', '👥', 'الطلاب'], ['grading', '✅', 'التصحيح'], ['results', '🏆', 'النتائج'], ['analytics', '📊', 'التحليلات']]
function Bell() {
  const [list, setList] = useState([]), [open, setOpen] = useState(false), go = useNavigate()
  const load = async () => setList((await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(20)).data || [])
  useEffect(() => { load(); const ch = sb.channel('notif').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, load).subscribe(); return () => { sb.removeChannel(ch) } }, [])
  const unread = list.filter(n => !n.read).length
  const click = async n => { await sb.from('notifications').update({ read: true }).eq('id', n.id); setOpen(false); load(); go(n.attempt_id ? `/review/${n.attempt_id}` : '/admin/grading') }
  return <div className="bellw"><button className="bell" onClick={() => setOpen(!open)}>🔔{unread > 0 && <i>{unread}</i>}</button>
    {open && <div className="drop card">{list.length ? list.map(n => <button key={n.id} className={'nitem' + (n.read ? '' : ' unread')} onClick={() => click(n)}><b>{n.title}</b><span>{n.body}</span><small>{new Date(n.created_at).toLocaleString('ar-EG')}</small></button>) : <p className="muted">لا توجد إشعارات</p>}
      {unread > 0 && <button className="link" onClick={async () => { await sb.from('notifications').update({ read: true }).eq('read', false); load() }}>تعليم الكل كمقروء</button>}</div>}</div>
}
export default function Admin() {
  const { profile, signOut } = useAuth(), [m, setM] = useState(false)
  return <div className="adm"><aside className={'side' + (m ? ' open' : '')} onClick={() => setM(false)}>
    <div className="sbrand"><span className="logo">{'</>'}</span><div><b>اكاديمية المهندس إبراهيم سعد</b><small>لوحة المدرس</small></div></div>
    {nav.map(([p, i, t]) => <NavLink key={p} end={p === ''} to={`/admin/${p}`}><span>{i}</span>{t}</NavLink>)}
    <div className="suser"><b>م/ إبراهيم سعد</b><small>{profile?.full_name}</small><button className="link" onClick={signOut}>تسجيل الخروج</button></div></aside>
    <section className="admain"><div className="atop"><button className="burger" onClick={() => setM(true)}>☰</button><Bell /></div>
      <Routes><Route index element={<Overview />} /><Route path="curriculum" element={<Curriculum />} /><Route path="questions" element={<Questions />} /><Route path="import" element={<Import />} />
        <Route path="assignments" element={<Assignments />} /><Route path="students" element={<Students />} /><Route path="grading" element={<Grading />} /><Route path="results" element={<Results />} /><Route path="analytics" element={<Analytics />} /></Routes></section></div>
}
