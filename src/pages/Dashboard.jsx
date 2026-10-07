import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sb } from '../lib/supabase'
import { useAuth } from '../lib/auth'
const fmt = d => d ? new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—', n2 = x => +Number(x).toFixed(2)
export default function Dashboard() {
  const { profile } = useAuth(), [asg, setAsg] = useState([]), [att, setAtt] = useState([]), [ready, setReady] = useState(false), [tab, setTab] = useState('new')
  useEffect(() => { (async () => {
    const [a, t] = await Promise.all([sb.from('assignments').select('*, lessons(title), assignment_questions(count)').eq('is_open', true).order('ends_at'), sb.from('attempts').select('*, assignments(title,auto_grade)').order('started_at', { ascending: false })])
    setAsg(a.data || []); setAtt(t.data || []); setReady(true) })() }, [])
  if (!ready) return <div className="center">جارٍ التحميل…</div>
  const now = Date.now(), done = att.filter(t => t.status !== 'in_progress'), ids = new Set(done.map(t => t.assignment_id)), prog = new Set(att.filter(t => t.status === 'in_progress').map(t => t.assignment_id))
  const late = asg.filter(a => !ids.has(a.id) && a.ends_at && new Date(a.ends_at) < now)
  const fresh = asg.filter(a => !ids.has(a.id) && !late.includes(a) && (!a.starts_at || new Date(a.starts_at) <= now))
  const graded = done.filter(t => t.status === 'graded' || t.assignments?.auto_grade), avg = graded.length ? Math.round(graded.reduce((x, t) => x + (t.max_score ? t.score / t.max_score * 100 : 0), 0) / graded.length) : null
  const tabs = [['new', 'الجديدة', fresh.length], ['done', 'تم الحل', done.length], ['late', 'المتأخرة', late.length]]
  const card = (a, extra) => <div key={a.id} className="card acard"><div><b>{a.title}</b><div className="muted">{a.lessons?.title}</div><div className="muted">📅 {fmt(a.starts_at)} ← {fmt(a.ends_at)} • {a.assignment_questions?.[0]?.count} سؤال</div></div>{extra}</div>
  return <div className="wrap"><div className="card hello"><div><h2>أهلًا يا {profile?.full_name} 👋</h2><p>واصل التعلم وحقق أفضل النتائج</p></div>{avg != null && <div className="avg"><b>{avg}%</b><span>متوسط درجاتي</span></div>}</div>
    <div className="seg">{tabs.map(([k, t, c]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t} ({c})</button>)}</div>
    {tab === 'new' && (fresh.length ? fresh.map(a => card(a, <Link to={`/solve/${a.id}`} className="btn sm">{prog.has(a.id) ? 'متابعة الحل' : 'ابدأ الواجب'}</Link>)) : <p className="muted">لا توجد واجبات جديدة 🎉</p>)}
    {tab === 'done' && (done.length ? done.map(t => { const shown = t.status === 'graded' || t.assignments?.auto_grade
      return <div key={t.id} className="card acard"><div><b>{t.assignments?.title}</b><div className="muted">سُلّم {fmt(t.submitted_at)}</div>{shown && t.pending_count > 0 && <div className="muted">⏳ {n2(t.pending_marks)} درجة بانتظار مراجعة المدرس</div>}</div>
        <div className="sc">{shown ? <span className="score">{n2(t.score)} / {n2(t.max_score)}</span> : <span className="pill y">بانتظار التصحيح</span>}{shown && <Link className="link" to={`/review/${t.id}`}>عرض الحل والأخطاء</Link>}</div></div> }) : <p className="muted">لم تحل أي واجب بعد</p>)}
    {tab === 'late' && (late.length ? late.map(a => card(a, <span className="pill r">مغلق</span>)) : <p className="muted">لا توجد واجبات متأخرة 🎉</p>)}</div>
}
