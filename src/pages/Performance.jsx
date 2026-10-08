import { Link } from 'react-router-dom'
import { Activity, BarChart3, Dumbbell } from 'lucide-react'
import { sb } from '../lib/supabase'
import { AreaChart } from '../components/Charts'
import { EmptyState, ErrorState, PageHeader, PageSkeleton, nf, useAsync } from '../components/ui'
import '../components/insights.css'
const tone = p => p >= 80 ? '' : p >= 60 ? 'mid' : p >= 40 ? 'weak' : 'bad'
export default function Performance() {
  const r = useAsync(async () => { const { data, error } = await sb.rpc('my_analytics'); if (error) throw error; return data }, [])
  if (r.loading) return <div className="page"><PageSkeleton /></div>; if (r.error) return <div className="page"><ErrorState onRetry={r.reload} /></div>
  const d = r.data, solid = d.topics.filter(t => t.n >= 3), pool = solid.length >= 2 ? solid : d.topics, best = pool.length ? pool[pool.length - 1] : null, worst = pool.length ? pool[0] : null
  const chart = d.timeline.map(x => ({ l: new Date(x.t).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'numeric' }), v: x.p }))
  if (!d.questions) return <div className="page"><PageHeader title="أدائي" desc="تحليل مستواك: نقاط القوة والموضوعات التي تحتاج مراجعة." /><EmptyState icon={BarChart3} title="لا توجد بيانات بعد" text="حُل أول واجب وسيظهر هنا متوسط درجاتك وأقوى موضوعاتك وما يحتاج إلى مراجعة." action={<Link className="btn" to="/assignments">اذهب إلى الواجبات</Link>} /></div>
  const rate = d.questions ? Math.round(100 * d.correct / d.questions) : 0
  return <div className="page"><PageHeader title="أدائي" desc="تحليل مستواك بناءً على إجاباتك في الواجبات." />
    {best && worst && best.id !== worst.id && <div className="verdict"><div className="best"><h4>أقوى موضوع لديك</h4><strong>{best.title.split(':').pop().trim()}</strong><em style={{ color: 'var(--c-success)' }}>{best.pct}%</em> <span className="muted small">من {best.n} سؤال</span></div>
      <div className="worst"><h4>يحتاج إلى تحسين</h4><strong>{worst.title.split(':').pop().trim()}</strong><em style={{ color: 'var(--c-warning)' }}>{worst.pct}%</em> <span className="muted small">من {worst.n} سؤال</span><div style={{ marginTop: 10 }}><Link className="btn sm" to={`/practice/${worst.id}`}><Dumbbell size={16} className="i" />ابدأ التدريب على هذا الموضوع</Link></div></div></div>}
    <div className="perf-top"><div><b>{d.avg != null ? d.avg + '%' : '—'}</b><span>متوسط الدرجات</span></div><div><b>{d.assignments_done}<small style={{ display: 'inline' }}> / {d.assignments_total}</small></b><span>الواجبات المكتملة</span></div><div><b>{d.lessons_done}<small style={{ display: 'inline' }}> / {d.lessons_total}</small></b><span>الدروس المكتملة</span></div>
      <div><b>{nf(d.questions)}</b><span>الأسئلة التي حللتها</span><small>نسبة الصواب {rate}%</small></div><div><b><span style={{ color: 'var(--c-success)', fontSize: 'inherit' }}>{nf(d.correct)}</span> <span className="muted" style={{ fontSize: '1rem' }}>/</span> <span style={{ color: 'var(--c-danger)', fontSize: 'inherit' }}>{nf(d.wrong)}</span></b><span>صحيحة / خاطئة</span></div></div>
    <div className="card chartcard"><h3 style={{ margin: 0 }}>تقدمك مع الوقت</h3><p className="muted small">نسبة درجتك في كل واجب سلّمته.</p>{chart.length > 1 ? <AreaChart data={chart} /> : <EmptyState icon={Activity} title="سلّم واجبًا آخر" text="يظهر الرسم بعد واجبين على الأقل." />}</div>
    <div className="sechead"><h2>مستواك في كل موضوع</h2><span className="muted small">الخط الفاصل = 50%</span></div>
    <div className="ladder">{d.topics.map(t => <div key={t.id} className="rung"><div className="nm"><b>{t.title.split(':').pop().trim()}</b><span>{t.chapter} · {t.n} سؤال</span></div><div className="gauge" role="img" aria-label={`${t.pct}%`}><i className={tone(t.pct)} style={{ width: t.pct + '%' }} /></div>
      <div className="row"><span className="pc">{t.pct}%</span>{t.pct < 80 && <Link className="btn ghost sm" to={`/practice/${t.id}`}>تدريب</Link>}</div></div>)}</div></div>
}
