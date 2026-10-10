import { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import { watchPresence } from '../../lib/presence'
import { Avatar, fdt } from '../../components/ui'
// حالة الاتصال: الطالب "أونلاين" لو سجّل نبضة خلال آخر دقيقتين ونصف (النبضة كل دقيقة)
export const isOnline = s => !!s?.last_seen_at && Date.now() - new Date(s.last_seen_at).getTime() < 150000
export function usePresence() {
  const [m, setM] = useState({}), [live, setLive] = useState({ ids: new Set(), ready: false })
  useEffect(() => {
    let on = true; const load = async () => { const { data } = await sb.from('profiles').select('id,full_name,last_seen_at,last_login_at').eq('role', 'student'); if (on && data) setM(Object.fromEntries(data.map(x => [x.id, x]))) }
    load(); const i = setInterval(load, 60000)
    const un = watchPresence((st, ready) => on && setLive({ ids: new Set(Object.keys(st)), ready }))
    const ch = sb.channel('profiles-live').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, p => on && p.new?.role === 'student' && setM(o => ({ ...o, [p.new.id]: { ...o[p.new.id], ...p.new } }))).subscribe()
    return () => { on = false; clearInterval(i); un(); sb.removeChannel(ch) }
  }, [])
  // لحظي عبر Presence؛ وإن تعذّر الاتصال بالقناة نعود للنبضة المسجلة في قاعدة البيانات
  return Object.fromEntries(Object.entries(m).map(([id, r]) => [id, { ...r, online: live.ready ? live.ids.has(id) : isOnline(r) }]))
}
export const loginLabel = s => s?.last_login_at ? fdt(s.last_login_at) : 'لم يدخل بعد'
export function OnlineDot({ on }) { return <span aria-hidden="true" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: on ? 'var(--c-success)' : 'var(--c-border-2)', boxShadow: on ? '0 0 0 4px color-mix(in srgb,var(--c-success) 25%,transparent)' : 'none', flexShrink: 0 }} /> }
export default function OnlineNow({ m }) {
  const list = Object.values(m).filter(x => x.online).sort((a, b) => new Date(b.last_seen_at) - new Date(a.last_seen_at))
  return <div className="card"><div className="row between"><h3 style={{ margin: 0 }}>الطلاب الأونلاين الآن</h3><span className="row"><OnlineDot on={list.length > 0} /><b>{list.length}</b></span></div>
    {list.length ? <div className="row wrapx" style={{ marginTop: 12 }}>{list.map(s => <span key={s.id} className="row" style={{ gap: 8, padding: '6px 12px 6px 6px', border: '1px solid var(--c-border)', borderRadius: 99 }}><Avatar name={s.full_name} /><span className="small"><b>{s.full_name}</b></span></span>)}</div> : <p className="muted small" style={{ marginTop: 8 }}>لا يوجد طلاب متصلون حاليًا.</p>}</div>
}
