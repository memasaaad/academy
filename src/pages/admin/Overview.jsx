import { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
const level = p => p >= 85 ? 'ممتاز' : p >= 70 ? 'جيد جدًا' : p >= 50 ? 'متوسط' : 'يحتاج دعم'
export default function Overview() {
  const [d, setD] = useState(null)
  useEffect(() => { (async () => {
    const [{ data: at }, { data: st }, { count }] = await Promise.all([sb.from('attempts').select('score,max_score,student_id,profiles(full_name)').neq('status', 'in_progress'), sb.from('question_stats').select('*'), sb.from('questions').select('*', { count: 'exact', head: true })])
    const p = x => x.max_score ? x.score / x.max_score * 100 : 0, by = {}
    ;(at || []).forEach(a => { (by[a.student_id] ||= { name: a.profiles?.full_name, v: [] }).v.push(p(a)) })
    const students = Object.values(by).map(s => ({ name: s.name, avg: s.v.reduce((a, b) => a + b, 0) / s.v.length })).sort((a, b) => b.avg - a.avg)
    const qs = (st || []).filter(x => x.answered > 0).map(x => ({ ...x, pct: x.correct / x.answered * 100 }))
    setD({ n: at?.length || 0, count, avg: students.length ? students.reduce((a, b) => a + b.avg, 0) / students.length : 0, students, hardest: [...qs].sort((a, b) => a.pct - b.pct).slice(0, 5), wrongest: [...qs].sort((a, b) => b.wrong - a.wrong).slice(0, 5) }) })() }, [])
  if (!d) return <div className="center">جارٍ التحميل…</div>
  const r = x => Math.round(x)
  return <div><div className="stats"><div className="card"><b>{d.n}</b><span>تسليمات</span></div><div className="card"><b>{d.count}</b><span>سؤال في البنك</span></div><div className="card"><b>{r(d.avg)}%</b><span>متوسط الدرجات</span></div>
    <div className="card"><b>{d.students[0]?.name || '—'}</b><span>أعلى طالب {d.students[0] && r(d.students[0].avg) + '%'}</span></div>
    <div className="card"><b>{d.students.at(-1)?.name || '—'}</b><span>أقل طالب {d.students.at(-1) && r(d.students.at(-1).avg) + '%'}</span></div></div>
    <div className="card"><h3>أصعب الأسئلة (أقل نسبة صحة)</h3>{d.hardest.map(x => <p key={x.question_id}>{r(x.pct)}% — {x.question_text.slice(0, 80)}</p>)}</div>
    <div className="card"><h3>أكثر الأسئلة خطأً</h3>{d.wrongest.map(x => <p key={x.question_id}>{x.wrong} خطأ من {x.answered} — {x.question_text.slice(0, 80)}</p>)}</div>
    <div className="card"><h3>مستوى الطلاب</h3>{d.students.map(s => <div key={s.name} className="row"><span>{s.name}</span><span>{r(s.avg)}% — {level(s.avg)}</span></div>)}</div></div>
}
