import { Link } from 'react-router-dom'
import { ClipboardList, FileQuestion, Gauge, PenLine, Users, Activity, ClipboardCheck } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { LineChart } from '../../components/Charts'
import { Badge, Btn, EmptyState, ErrorState, PageHeader, PageSkeleton, fdt, pct, useAsync } from '../../components/ui'
export default function Overview() {
  const { data: d, loading, error, reload } = useAsync(async () => {
    const c = t => sb.from(t).select('*', { count: 'exact', head: true })
    const [s, a, q, at, pend, act] = await Promise.all([c('profiles').eq('role', 'student'), c('assignments'), c('questions'),
      sb.from('attempts').select('score,max_score,assignments(title)').neq('status', 'in_progress').order('submitted_at', { ascending: false }).limit(200),
      sb.from('attempts').select('id,submitted_at,pending_count,profiles(full_name),assignments(title)').eq('status', 'submitted').order('submitted_at').limit(6), sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(6)])
    const rows = at.data || [], by = {}; rows.forEach(r => { (by[r.assignments?.title || '—'] ||= []).push(pct(r.score, r.max_score)) })
    const { count: pc } = await sb.from('attempts').select('*', { count: 'exact', head: true }).eq('status', 'submitted')
    return { s: s.count, a: a.count, q: q.count, avg: rows.length ? Math.round(rows.reduce((x, r) => x + pct(r.score, r.max_score), 0) / rows.length) : 0, pc, pend: pend.data || [], act: act.data || [], chart: Object.entries(by).slice(0, 7).reverse().map(([l, v]) => ({ l, v: Math.round(v.reduce((x, y) => x + y, 0) / v.length) })) } }, [])
  if (loading) return <PageSkeleton />; if (error) return <ErrorState onRetry={reload} />
  return <><PageHeader title="نظرة عامة على المنصة" desc="ما يحتاج انتباهك الآن." />
    <div className="kpis">{[[Users, 'الطلاب', d.s, 'i'], [ClipboardList, 'الواجبات', d.a, ''], [PenLine, 'بانتظار التصحيح', d.pc, 'a'], [Gauge, 'متوسط الأداء', d.avg + '%', 'g']].map(([I, l, v, c]) => <div key={l} className="kpi big"><span className={'ic ' + c}><I size={20} className="i" /></span><div><b>{v}</b><span>{l}</span></div></div>)}</div>
    <div className="card"><div className="row between"><h3 style={{ margin: 0 }}>بانتظار التصحيح</h3><Link className="btn ghost sm" to="/admin/grading">عرض الكل</Link></div>
      {d.pend.length ? <div className="tablew cards" style={{ marginTop: 12 }}><table><thead><tr><th>الطالب</th><th>الواجب</th><th>وقت التسليم</th><th>الحالة</th><th /></tr></thead><tbody>{d.pend.map(p => <tr key={p.id}><td data-l="الطالب"><b>{p.profiles?.full_name}</b></td><td data-l="الواجب">{p.assignments?.title}</td><td data-l="التسليم">{fdt(p.submitted_at)}</td><td data-l="الحالة"><Badge tone="warning">{p.pending_count} سؤال للتصحيح</Badge></td><td><Link className="btn sm" to={`/admin/grading?attempt=${p.id}`}>تصحيح</Link></td></tr>)}</tbody></table></div>
        : <EmptyState icon={ClipboardCheck} title="لا توجد تسليمات بانتظار التصحيح" text="عندما يسلّم طالب واجبًا يحتوي أسئلة تحتاج مراجعتك ستجده هنا." />}</div>
    <div className="two"><div className="card"><h3>متوسط الدرجات لكل واجب (%)</h3>{d.chart.length ? <LineChart data={d.chart} /> : <EmptyState icon={Activity} title="لا توجد بيانات بعد" text="ستظهر المقارنة بعد أول تسليمات." />}</div>
      <div className="card"><h3>آخر النشاطات</h3>{d.act.length ? d.act.map(n => <div key={n.id} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--c-border)' }}><Activity size={16} className="i muted" /><div className="grow small">{n.body}</div><span className="muted small">{fdt(n.created_at)}</span></div>) : <p className="muted small">لا يوجد نشاط حتى الآن.</p>}</div></div></>
}
