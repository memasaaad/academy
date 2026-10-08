import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlarmClock } from 'lucide-react'
import { sb } from '../lib/supabase'
import { deadlineInfo } from '../lib/deadline'
import './insights.css'
// واجبات لم تُسلَّم وينتهي موعدها خلال 48 ساعة؛ تتجدد كل دقيقة بدون الحاجة لتحديث الصفحة
export function useReminders(enabled = true) {
  const [list, setList] = useState([]), [, setTick] = useState(0)
  useEffect(() => {
    if (!enabled) return; let on = true
    const go = async () => {
      const now = new Date(), [a, t] = await Promise.all([sb.from('assignments').select('id,title,ends_at,starts_at').eq('is_open', true).gt('ends_at', now.toISOString()).lte('ends_at', new Date(+now + 48 * 36e5).toISOString()), sb.from('attempts').select('assignment_id,status')])
      if (!on) return; const done = new Set((t.data || []).filter(x => x.status !== 'in_progress').map(x => x.assignment_id))
      setList((a.data || []).filter(x => !done.has(x.id) && (!x.starts_at || new Date(x.starts_at) <= now)).sort((p, q) => new Date(p.ends_at) - new Date(q.ends_at)))
    }
    go(); const i = setInterval(() => { go(); setTick(x => x + 1) }, 60000); return () => { on = false; clearInterval(i) }
  }, [enabled])
  return list.map(x => ({ ...x, info: deadlineInfo(x.ends_at) })).filter(x => x.info && x.info.soon)
}
export function RemindersBanner() {
  const list = useReminders(true)
  if (!list.length) return null
  return <div aria-label="تذكيرات المواعيد">{list.map(x => <Link key={x.id} to={`/solve/${x.id}`} className={'remind' + (x.info.level >= 3 ? ' hot' : '')}><AlarmClock size={20} className="i" /><span style={{ flex: 1 }}><b>{x.title}</b><span className="small" style={{ display: 'block' }}>{x.info.text}</span></span><span className="btn sm">حل الآن</span></Link>)}</div>
}
