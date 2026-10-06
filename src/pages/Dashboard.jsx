import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sb } from '../lib/supabase'
import { useAuth } from '../lib/auth'
const fmt = d => d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
export default function Dashboard() {
  const { profile } = useAuth(), [asg, setAsg] = useState([]), [att, setAtt] = useState([]), [ready, setReady] = useState(false)
  useEffect(() => { (async () => {
    const [a, t] = await Promise.all([sb.from('assignments').select('*, lessons(title)').eq('is_open', true).order('ends_at'), sb.from('attempts').select('*, assignments(title)').order('started_at', { ascending: false })])
    setAsg(a.data || []); setAtt(t.data || []); setReady(true) })() }, [])
  if (!ready) return <div className="center">جارٍ التحميل…</div>
  const now = Date.now(), done = att.filter(t => t.status !== 'in_progress'), doneIds = new Set(done.map(t => t.assignment_id))
  const prog = new Set(att.filter(t => t.status === 'in_progress').map(t => t.assignment_id))
  const attemptsOf = id => att.filter(t => t.assignment_id === id).length
  const late = asg.filter(a => !doneIds.has(a.id) && a.ends_at && new Date(a.ends_at) < now)
  const fresh = asg.filter(a => !late.includes(a) && (!doneIds.has(a.id) || attemptsOf(a.id) < a.max_attempts) && (!a.starts_at || new Date(a.starts_at) <= now) && !(doneIds.has(a.id)))
  return <div className="wrap">
    <h2>أهلًا يا {profile?.full_name} 👋</h2>
    <h3>الواجبات الجديدة</h3>{fresh.length ? fresh.map(a => <Link key={a.id} to={`/solve/${a.id}`} className="card row"><div><b>{a.title}</b><div className="muted">{a.lessons?.title} • ينتهي {fmt(a.ends_at)}</div></div><span className="btn sm">{prog.has(a.id) ? 'متابعة' : 'ابدأ'}</span></Link>) : <p className="muted">لا توجد واجبات جديدة</p>}
    <h3>الواجبات التي حللتها</h3>{done.length ? done.map(t => <div key={t.id} className="card row"><div><b>{t.assignments?.title}</b><div className="muted">سُلّم {fmt(t.submitted_at)}{t.pending_count > 0 && ` • ${t.pending_marks} درجة بانتظار المراجعة`}</div></div><span className="score">{Math.round(t.score * 100) / 100} / {Math.round(t.max_score * 100) / 100}</span></div>) : <p className="muted">لم تحل أي واجب بعد</p>}
    <h3>الواجبات المتأخرة</h3>{late.length ? late.map(a => <div key={a.id} className="card row late"><b>{a.title}</b><span className="muted">انتهى {fmt(a.ends_at)}</span></div>) : <p className="muted">لا توجد واجبات متأخرة 🎉</p>}
  </div>
}
