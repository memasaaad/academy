import { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import { Bars, Donut } from '../../components/Charts'
import { TYPES } from '../../lib/qio'
const level = p => p >= 85 ? 'ممتاز' : p >= 70 ? 'جيد جدًا' : p >= 50 ? 'متوسط' : 'يحتاج دعم', COL = ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#64748b']
export default function Analytics() {
  const [d, setD] = useState(null)
  useEffect(() => { (async () => {
    const [{ data: at }, { data: st }, { data: qt }] = await Promise.all([sb.from('attempts').select('score,max_score,student_id,profiles(full_name)').neq('status', 'in_progress'), sb.from('question_stats').select('*'), sb.from('questions').select('question_type')])
    const p = x => x.max_score ? x.score / x.max_score * 100 : 0, by = {}
    ;(at || []).forEach(a => { (by[a.student_id] ||= { name: a.profiles?.full_name, v: [] }).v.push(p(a)) })
    const students = Object.values(by).map(s => ({ name: s.name, avg: s.v.reduce((a, b) => a + b, 0) / s.v.length })).sort((a, b) => b.avg - a.avg)
    const dist = ['0-50', '50-70', '70-85', '85-100'].map((l, i) => ({ l, v: (at || []).filter(a => { const x = p(a); return i === 0 ? x < 50 : i === 1 ? x < 70 : i === 2 ? x < 85 : x >= 85 }).length }))
    const types = Object.entries((qt || []).reduce((a, q) => ({ ...a, [q.question_type]: (a[q.question_type] || 0) + 1 }), {})).map(([t, v], i) => ({ l: TYPES[t] || t, v, c: COL[i % 7] }))
    const qs = (st || []).filter(x => x.answered > 0).map(x => ({ ...x, pct: x.correct / x.answered * 100 }))
    const all = (at || []).length
    setD({ students, dist, types, qs, avg: students.length ? students.reduce((a, b) => a + b.avg, 0) / students.length : 0, pass: all ? Math.round((at || []).filter(a => p(a) >= 50).length / all * 100) : 0 }) })() }, [])
  if (!d) return <div className="center">جارٍ التحميل…</div>
  const r = Math.round, hard = [...d.qs].sort((a, b) => a.pct - b.pct)
  return <div><h2 className="ptitle">التحليلات والإحصائيات</h2>
    <div className="stats"><div className="card st"><b>{r(d.avg)}%</b><span>متوسط الدرجات</span></div><div className="card st"><b>{d.pass}%</b><span>نسبة النجاح</span></div>
      <div className="card st"><b>{d.students[0]?.name || '—'}</b><span>أعلى طالب {d.students[0] ? r(d.students[0].avg) + '%' : ''}</span></div><div className="card st"><b>{d.students.at(-1)?.name || '—'}</b><span>أقل طالب {d.students.at(-1) ? r(d.students.at(-1).avg) + '%' : ''}</span></div></div>
    <div className="two"><div className="card"><h3>توزيع الدرجات</h3><Bars data={d.dist} /></div><div className="card"><h3>أنواع الأسئلة</h3><Donut data={d.types} /></div></div>
    <div className="card"><h3>أصعب الأسئلة</h3>{hard.slice(0, 5).map(x => <p key={x.question_id}><span className="pill r">{r(x.pct)}%</span> {x.question_text.slice(0, 90)}</p>)}{!hard.length && <p className="muted">لا توجد بيانات بعد</p>}</div>
    <div className="card"><h3>أكثر الأسئلة خطأً</h3>{[...d.qs].sort((a, b) => b.wrong - a.wrong).slice(0, 5).map(x => <p key={x.question_id}><span className="pill r">{x.wrong} خطأ</span> {x.question_text.slice(0, 90)}</p>)}</div>
    <div className="card"><h3>نسبة الإجابة الصحيحة لكل سؤال</h3><div className="tblwrap"><table><tbody>{hard.map(x => <tr key={x.question_id}><td>{x.question_text.slice(0, 70)}</td><td>{x.correct}/{x.answered}</td><td className={x.pct >= 50 ? 'okc' : 'badc'}>{r(x.pct)}%</td></tr>)}</tbody></table></div></div>
    <div className="card"><h3>مستوى كل طالب</h3>{d.students.map(s => <div key={s.name} className="row lrow2"><span>{s.name}</span><span className={'pill ' + (s.avg >= 70 ? 'g' : s.avg >= 50 ? 'y' : 'r')}>{r(s.avg)}% — {level(s.avg)}</span></div>)}</div></div>
}
