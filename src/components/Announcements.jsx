import { Megaphone } from 'lucide-react'
import { sb } from '../lib/supabase'
import { fdate, useAsync } from './ui'
import './insights.css'
// الإعلانات التي يراها الطالب (تصفيتها حسب المجموعة تتم في قاعدة البيانات). عند فشل الجلب لا يظهر شيء.
export function useAnnouncements() {
  return useAsync(async () => { const { data } = await sb.from('announcements').select('*').order('created_at', { ascending: false }).limit(100); return data || [] }, [])
}
export function AnnList({ items }) {
  if (!items?.length) return null
  return <div>{items.map(a => <article key={a.id} className="ann" role="note"><span className="ai" aria-hidden="true"><Megaphone size={20} className="i" style={{ color: 'var(--c-primary)' }} /></span><div><b>{a.title}</b>{a.body && <p>{a.body}</p>}<span className="muted small">{fdate(a.created_at)}</span></div></article>)}</div>
}
export function DashboardAnnouncements() {
  const r = useAnnouncements(), items = (r.data || []).filter(a => a.audience === 'all' || a.audience === 'group').slice(0, 3)
  return <AnnList items={items} />
}
