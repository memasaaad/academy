import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ClipboardCheck, ClipboardList, Gauge, PenLine, Users } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { AreaChart } from '../../components/Charts'
import { Badge, Btn, EmptyState, ErrorState, PageHeader, PageSkeleton, fdt, pct, useAsync } from '../../components/ui'
const tones = ['tone1', 'tone2', 'tone3', 'tone4']
export default function Overview() {
  const [range, setRange] = useState('30')
  const { data: d, loading, error, reload } = useAsync(async () => {
    const c = t => sb.from(t).select('*', { count: 'exact', head: true })
    const [s, a, q, at, pend, act, pc] = await Promise.all([c('profiles').eq('role', 'student'), c('assignments'), c('questions'),
      sb.from('attempts').select('score,max_score,submitted_at').neq('status', 'in_progress').order('submitted_at'),
      sb.from('attempts').select('id,submitted_at,pending_count,profiles(full_name),assignments(title)').eq('status', 'submitted').order('submitted_at').limit(4), sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(5), c('attempts').eq('status', 'submitted')])
    const rows = at.data || []
    return { s: s.count, a: a.count, q: q.count, pc: pc.count, rows, avg: rows.length ? Math.round(rows.reduce((x, r) => x + pct(r.score, r.max_score), 0) / rows.length) : 0, pend: pend.data || [], act: act.data || [] } }, [])
  if (loading) return <PageSkeleton />; if (error) return <ErrorState onRetry={reload} />
  const since = range === 'all' ? 0 : Date.now() - +range * 864e5, by = {}
  d.rows.filter(r => r.submitted_at && new Date(r.submitted_at) >= since).forEach(r => { const k = new Date(r.submitted_at).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'numeric' }); (by[k] ||= []).push(pct(r.score, r.max_score)) })
  const chart = Object.entries(by).map(([l, v]) => ({ l, v: Math.round(v.reduce((x, y) => x + y, 0) / v.length) }))
  return <><PageHeader title="الرئيسية" desc="نظرة عامة على المنصة." />
    <div className="kpis">{[[Users, 'الطلاب', d.s], [ClipboardList, 'الواجبات', d.a], [PenLine, 'بانتظار التصحيح', d.pc], [Gauge, 'متوسط الأداء', d.avg + '%']].map(([I, l, v], i) => { return <div key={l} className="kpi big"><span className={'ic ' + tones[i]}><I size={22} className="i" /></span><div><span>{l}</span><b>{v}</b></div></div> })}</div>
    <div className="card chartcard"><div className="row between wrapx"><div><h3 style={{ margin: 0 }}>متوسط الدرجات</h3><p className="muted small">متوسط نسبة الدرجات في اليوم الواحد.</p></div><select aria-label="الفترة" value={range} onChange={e => setRange(e.target.value)}><option value="7">آخر 7 أيام</option><option value="30">آخر 30 يومًا</option><option value="all">كل الفترة</option></select></div>
      {chart.length ? <AreaChart data={chart} /> : <EmptyState icon={Activity} title="لا توجد تسليمات في هذه الفترة" text="سيظهر الرسم بعد أن يسلّم الطلاب واجباتهم." />}</div>
    <div className="two" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="card"><div className="row between"><h3 style={{ margin: 0 }}>الواجبات بانتظار التصحيح</h3><Link className="btn ghost sm" to="/admin/grading">عرض الكل</Link></div>
        {d.pend.length ? d.pend.map(p => <div key={p.id} className="pendcard"><div className="grow"><b className="small">{p.profiles?.full_name}</b><div className="muted small">{p.assignments?.title} · {fdt(p.submitted_at)}</div><Badge tone="warning">{p.pending_count} سؤال للتصحيح</Badge></div><Link className="btn sm" to={`/admin/grading?attempt=${p.id}`}>تصحيح</Link></div>)
          : <EmptyState icon={ClipboardCheck} title="لا يوجد ما ينتظر التصحيح" text="ستجد هنا كل واجب يسلّمه طالب ويحتاج مراجعتك." />}</div>
      <div className="card"><h3>آخر النشاطات</h3>{d.act.length ? d.act.map((n, i) => { return <div key={n.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--c-border)' }}><span className={'act-ic ' + tones[i % 4]}><ClipboardCheck size={17} className="i" /></span><div className="grow small">{n.body}<div className="muted small">{fdt(n.created_at)}</div></div></div> }) : <p className="muted small">لا يوجد نشاط حتى الآن.</p>}</div></div></>
}
