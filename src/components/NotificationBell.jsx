import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing } from 'lucide-react'
import { sb } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Btn, IconBtn, fdt } from './ui'
import { useReminders } from './Reminders'
export default function NotificationBell({ admin }) {
  const { session } = useAuth(), uid = session?.user.id, go = useNavigate(), [list, setList] = useState([]), [open, setOpen] = useState(false), ref = useRef()
  const load = async () => { let q = sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(25); q = admin ? q.is('user_id', null) : q.eq('user_id', uid); const { data } = await q; setList(data || []) }
  useEffect(() => { if (!uid) return; load(); const ch = sb.channel(`notif-${admin ? 'a' : uid}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, load).subscribe(); return () => { sb.removeChannel(ch) } }, [uid, admin])
  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }, k = e => e.key === 'Escape' && setOpen(false); document.addEventListener('mousedown', h); document.addEventListener('keydown', k); return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k) } }, [])
  const rem = useReminders(!admin), unread = list.filter(n => !n.read).length + rem.length
  const click = async n => { await sb.from('notifications').update({ read: true }).eq('id', n.id); setOpen(false); load(); go(admin ? (n.attempt_id ? `/admin/grading?attempt=${n.attempt_id}` : n.link || '/admin/grading') : n.link || '/dashboard') }
  return <div className="menuw bellw" ref={ref}><IconBtn icon={unread ? BellRing : Bell} label={`الإشعارات${unread ? ` (${unread} غير مقروء)` : ''}`} badge={unread} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)} />
    {open && <div className="dropp" role="region" aria-label="الإشعارات"><div className="row between" style={{ padding: '10px 12px', borderBottom: '1px solid var(--c-border)', color: 'var(--c-text)' }}><b>الإشعارات</b>{unread > 0 && <Btn variant="ghost" size="sm" onClick={async () => { await sb.from('notifications').update({ read: true }).eq(admin ? 'user_id' : 'user_id', admin ? null : uid).eq('read', false); load() }}>تعليم الكل كمقروء</Btn>}</div>
      <div style={{ maxHeight: 380, overflow: 'auto' }}>{rem.map(x => <button key={'r' + x.id} className="notif unread" onClick={() => { setOpen(false); go(`/solve/${x.id}`) }} style={{ color: 'var(--c-text)' }}><b className="small">⏰ تذكير: {x.title}</b><span className="small">{x.info.text}</span></button>)}{list.length || rem.length ? list.map(n => <button key={n.id} className={'notif' + (n.read ? '' : ' unread')} onClick={() => click(n)} style={{ color: 'var(--c-text)' }}><b className="small">{n.title}</b><span className="small">{n.body}</span><span className="muted small">{fdt(n.created_at)}</span></button>)
        : <p className="muted small" style={{ padding: 24, textAlign: 'center' }}>{admin ? 'ستظهر هنا إشعارات الطلاب الجدد وتسليم الواجبات.' : 'ستصلك هنا الواجبات الجديدة والتذكيرات والنتائج والإعلانات.'}</p>}</div></div>}</div>
}
