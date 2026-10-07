import { BarChart3 } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { Bars, Donut } from '../../components/Charts'
import { Badge, EmptyState, ErrorState, PageHeader, PageSkeleton, pct, useAsync } from '../../components/ui'
import { TYPES } from '../../lib/qio'
const COL = ['#2563eb', '#16a34a', '#d97706', '#0284c7', '#dc2626', '#64748b', '#7c3aed'], lvl = p => p >= 85 ? ['ممتاز', 'success'] : p >= 70 ? ['جيد جدًا', 'primary'] : p >= 50 ? ['متوسط', 'warning'] : ['يحتاج دعمًا', 'danger']
export default function Analytics() {
  const { data: d, loading, error, reload } = useAsync(async () => {
    const [{ data: at }, { data: st }, { data: qt }] = await Promise.all([sb.from('attempts').select('score,max_score,student_id,profiles(full_name)').neq('status', 'in_progress'), sb.from('question_stats').select('*'), sb.from('questions').select('question_type')])
    const by = {}; (at || []).forEach(a => { (by[a.student_id] ||= { name: a.profiles?.full_name, v: [] }).v.push(pct(a.score, a.max_score)) })
    const students = Object.values(by).map(s => ({ name: s.name, avg: Math.round(s.v.reduce((a, b) => a + b, 0) / s.v.length) })).sort((a, b) => b.avg - a.avg), all = (at || []).map(a => pct(a.score, a.max_score))
    return { n: all.length, students, avg: all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0, pass: all.length ? Math.round(all.filter(x => x >= 50).length / all.length * 100) : 0,
      dist: [['0–49', x => x < 50], ['50–69', x => x >= 50 && x < 70], ['70–84', x => x >= 70 && x < 85], ['85–100', x => x >= 85]].map(([l, fn]) => ({ l, v: all.filter(fn).length })),
      types: Object.entries((qt || []).reduce((a, q) => ({ ...a, [q.question_type]: (a[q.question_type] || 0) + 1 }), {})).map(([t, v], i) => ({ l: TYPES[t] || t, v, c: COL[i % 7] })), qs: (st || []).filter(x => x.answered > 0).map(x => ({ ...x, pct: Math.round(x.correct / x.answered * 100) })) } }, [])
  if (loading) return <PageSkeleton />; if (error) return <ErrorState onRetry={reload} />
  if (!d.n) return <><PageHeader title="التحليلات" /><EmptyState icon={BarChart3} title="لا توجد بيانات كافية" text="ستظهر التحليلات بعد أن يسلّم الطلاب أول واجباتهم." /></>
  const hard = [...d.qs].sort((a, b) => a.pct - b.pct)
  return <><PageHeader title="التحليلات" desc={`بناءً على ${d.n} تسليم.`} />
    <div className="kpis">{[['متوسط الدرجات', d.avg + '%'], ['نسبة النجاح', d.pass + '%'], ['أعلى طالب', d.students[0] ? `${d.students[0].name} (${d.students[0].avg}%)` : '—'], ['أقل طالب', d.students.at(-1) ? `${d.students.at(-1).name} (${d.students.at(-1).avg}%)` : '—']].map(([l, v]) => <div key={l} className="kpi"><div><b style={{ fontSize: '1.15rem' }}>{v}</b><span>{l}</span></div></div>)}</div>
    <div className="two"><div className="card"><h3>توزيع الدرجات</h3><p className="muted small" style={{ marginTop: -8, marginBottom: 8 }}>عدد التسليمات في كل شريحة نسبة.</p><Bars data={d.dist} /></div><div className="card"><h3>أنواع الأسئلة في البنك</h3><Donut data={d.types} /></div></div>
    <div className="two"><div className="card"><h3>أصعب الأسئلة</h3><p className="muted small" style={{ marginTop: -8 }}>الأقل في نسبة الإجابة الصحيحة.</p>{hard.slice(0, 5).map(x => <div key={x.question_id} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--c-border)' }}><Badge tone="danger">{x.pct}%</Badge><span className="small">{x.question_text.slice(0, 80)}</span></div>)}</div>
      <div className="card"><h3>أكثر الأسئلة خطأً</h3>{[...d.qs].sort((a, b) => b.wrong - a.wrong).slice(0, 5).map(x => <div key={x.question_id} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--c-border)' }}><Badge tone="warning">{x.wrong} خطأ</Badge><span className="small">{x.question_text.slice(0, 80)}</span></div>)}</div></div>
    <div className="card"><h3>مستوى الطلاب</h3>{d.students.map(s => { const [l, t] = lvl(s.avg); return <div key={s.name} className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--c-border)' }}><span>{s.name}</span><span className="row"><span className="muted small">{s.avg}%</span><Badge tone={t}>{l}</Badge></span></div> })}</div>
    <div className="card"><h3>نسبة الإجابة الصحيحة لكل سؤال</h3><div className="tablew cards" style={{ maxHeight: 360, overflow: 'auto' }}><table><thead><tr><th>السؤال</th><th>صحيحة / إجمالي</th><th>النسبة</th></tr></thead><tbody>{hard.map(x => <tr key={x.question_id}><td data-l="السؤال">{x.question_text.slice(0, 90)}</td><td data-l="العدد">{x.correct} / {x.answered}</td><td data-l="النسبة"><Badge tone={x.pct >= 50 ? 'success' : 'danger'}>{x.pct}%</Badge></td></tr>)}</tbody></table></div></div></>
}
