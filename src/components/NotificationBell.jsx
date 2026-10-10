import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing } from 'lucide-react'
import { sb } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Btn, IconBtn, fdt } from './ui'
import { useReminders } from './Reminders'
import './bell.css'
// قائمة الإشعارات تُرسم داخل body (Portal) فلا تتأثر بأي عنصر أب، وعلى الموبايل تأخذ عرض الشاشة بالكامل بهامش صغير.
export default function NotificationBell({ admin }) {
  const { session } = useAuth(), uid = session?.user.id, go = useNavigate(), [list, setList] = useState([]), [open, setOpen] = useState(false), [pos, setPos] = useState(null), ref = useRef(), pop = useRef()
  const mine = q => admin ? q.is('user_id', null) : q.eq('user_id', uid)
  const load = async () => { const { data } = await mine(sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(25)); setList(data || []) }
  useEffect(() => { if (!uid) return; load(); const ch = sb.channel(`notif-${admin ? 'a' : uid}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, load).subscribe(); return () => { sb.removeChannel(ch) } }, [uid, admin])
  useEffect(() => {
    if (!open) return
    const h = e => { if (!ref.current?.contains(e.target) && !pop.current?.contains(e.target)) setOpen(false) }, k = e => e.key === 'Escape' && setOpen(false), place = () => { const r = ref.current?.getBoundingClientRect(); setPos(r && innerWidth > 640 ? { top: r.bottom + 8, left: Math.max(8, Math.min(r.left, innerWidth - 368)) } : null) }
    place(); document.addEventListener('mousedown', h); document.addEventListener('keydown', k); addEventListener('resize', place); addEventListener('scroll', place, true)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); removeEventListener('resize', place); removeEventListener('scroll', place, true) }
  }, [open])
  const rem = useReminders(!admin), unread = list.filter(n => !n.read).length + rem.length
  const click = async n => { await sb.from('notifications').update({ read: true }).eq('id', n.id); setOpen(false); load(); go(admin ? (n.attempt_id ? `/admin/grading?attempt=${n.attempt_id}` : n.link || '/admin/grading') : n.link || '/dashboard') }
  const readAll = async () => { await mine(sb.from('notifications').update({ read: true })).eq('read', false); load() }
  const panel = <div className="bell-pop" ref={pop} role="dialog" aria-label="الإشعارات" style={pos ? { top: pos.top, left: pos.left, right: 'auto' } : undefined}>
    <div className="bell-head"><b>الإشعارات</b>{unread - rem.length > 0 && <Btn variant="ghost" size="sm" onClick={readAll}>تعليم الكل كمقروء</Btn>}<button className="iconbtn bell-x" aria-label="إغلاق" onClick={() => setOpen(false)}>✕</button></div>
    <div className="bell-list">{rem.map(x => <button key={'r' + x.id} className="notif unread" onClick={() => { setOpen(false); go(`/solve/${x.id}`) }}><b className="small">⏰ تذكير: {x.title}</b><span className="small">{x.info.text}</span></button>)}
      {list.length || rem.length ? list.map(n => <button key={n.id} className={'notif' + (n.read ? '' : ' unread')} onClick={() => click(n)}><b className="small">{n.title}</b>{n.body && <span className="small">{n.body}</span>}<span className="muted small">{fdt(n.created_at)}</span></button>)
        : <p className="muted small" style={{ padding: 24, textAlign: 'center' }}>{admin ? 'ستظهر هنا إشعارات الطلاب الجدد وتسليم الواجبات.' : 'ستصلك هنا الواجبات الجديدة والتذكيرات والنتائج والإعلانات.'}</p>}</div></div>
  return <div className="menuw bellw" ref={ref}><IconBtn icon={unread ? BellRing : Bell} label={`الإشعارات${unread ? ` (${unread} غير مقروء)` : ''}`} badge={unread} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)} />
    {open && createPortal(<><div className="bell-scrim" onClick={() => setOpen(false)} />{panel}</>, document.body)}</div>
}
