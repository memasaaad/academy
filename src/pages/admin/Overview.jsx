import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ClipboardCheck, ClipboardList, Hourglass, TrendingDown, TrendingUp, Trophy, Users } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { AreaChart } from '../../components/Charts'
import OnlineNow, { usePresence } from './OnlineNow'
import { Alert, Badge, EmptyState, ErrorState, PageHeader, PageSkeleton, Progress, fdt, pct, useAsync } from '../../components/ui'
import '../../components/insights.css'
const tones = ['tone1', 'tone2', 'tone3', 'tone4']
const st = (n, one = 'طالب', two = 'طالبان', few = 'طلاب', many = 'طالبًا') => n === 1 ? `${one} واحد` : n === 2 ? two : `${n} ${n <= 10 ? few : many}`
function Sev({ tone = '', icon, title, children, to }) {
  return <details className={'sev ' + tone}><summary>{icon} {title}</summary>{children}{to && <Link className="btn ghost sm" to={to} style={{ marginTop: 8 }}>فتح</Link>}</details>
}
export default function Overview() {
  const [range, setRange] = useState('30'), live = usePresence()
  const { data: d, loading, error, reload } = useAsync(async () => {
    const c = t => sb.from(t).select('*', { count: 'exact', head: true })
    const [s, a, q, at, pend, act, pc, ins] = await Promise.all([c('profiles').eq('role', 'student'), c('assignments'), c('questions'),
      sb.from('attempts').select('score,max_score,submitted_at').neq('status', 'in_progress').order('submitted_at'),
      sb.from('attempts').select('id,submitted_at,pending_count,profiles(full_name),assignments(title)').eq('status', 'submitted').order('submitted_at').limit(4), sb.from('notifications').select('*').is('user_id', null).order('created_at', { ascending: false }).limit(5), c('attempts').eq('status', 'submitted'), sb.rpc('admin_insights')])
    const rows = at.data || []
    return { s: s.count, a: a.count, q: q.count, pc: pc.count, rows, avg: rows.length ? Math.round(rows.reduce((x, r) => x + pct(r.score, r.max_score), 0) / rows.length) : 0, pend: pend.data || [], act: act.data || [], ins: ins.error ? null : ins.data } }, [])
  if (loading) return <PageSkeleton />; if (error) return <ErrorState onRetry={reload} />
  const i = d.ins
  const since = range === 'all' ? 0 : Date.now() - +range * 864e5, by = {}
  d.rows.filter(r => r.submitted_at && new Date(r.submitted_at) >= since).forEach(r => { const k = new Date(r.submitted_at).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'numeric' }); (by[k] ||= []).push(pct(r.score, r.max_score)) })
  const chart = Object.entries(by).map(([l, v]) => ({ l, v: Math.round(v.reduce((x, y) => x + y, 0) / v.length) }))
  const stats = [[Users, 'الطلاب', i?.students ?? d.s, i ? `${i.activated} حساب مفعّل` : '', 'blue'], [ClipboardList, 'الواجبات', i?.assignments ?? d.a, `${d.q} سؤال في البنك`, 'violet'], [TrendingUp, 'متوسط الدرجات', (i ? (i.avg ?? 0) : d.avg) + '%', 'على كل التسليمات', 'green'], [Hourglass, 'في انتظار التصحيح', i?.pending ?? d.pc, 'تحتاج مراجعتك', 'amber']]
  const needs = i ? [...i.declining.map(x => ({ ...x, why: `انخفض من ${x.from}% إلى ${x.to}%`, tone: 'warning' })), ...i.low.filter(x => !i.declining.some(y => y.id === x.id)).map(x => ({ ...x, why: `متوسطه ${x.avg}%`, tone: 'danger' }))] : []
  const alerts = []
  if (i) {
    if (i.students > i.activated) alerts.push(<Sev key="a" tone="blue" icon="👤" title={`${st(i.students - i.activated)} بانتظار تفعيل الحساب`} to="/admin/students" />)
    if (i.inactive.length) alerts.push(<Sev key="in" icon="⚠️" title={`${st(i.inactive.length)} لم يسجلوا الدخول منذ 14 يومًا`} to="/admin/students"><ul>{i.inactive.slice(0, 8).map(x => <li key={x.id}>{x.name} — {x.seen ? `آخر دخول ${fdt(x.seen)}` : 'لم يدخل بعد'}</li>)}</ul></Sev>)
    if (i.low.length) alerts.push(<Sev key="lo" tone="red" icon="⚠️" title={`${st(i.low.length)} متوسط درجاتهم أقل من 50%`}><ul>{i.low.slice(0, 8).map(x => <li key={x.id}>{x.name} — {x.avg}%</li>)}</ul></Sev>)
    if (i.declining.length) alerts.push(<Sev key="de" tone="red" icon="📉" title={`${st(i.declining.length)} مستواهم في انخفاض`}><ul>{i.declining.slice(0, 8).map(x => <li key={x.id}>{x.name} — من {x.from}% إلى {x.to}%</li>)}</ul></Sev>)
    if (i.hard.length) alerts.push(<Sev key="h" icon="❓" title={`${i.hard.length} ${i.hard.length === 1 ? 'سؤال أخفق' : 'أسئلة أخفق'} فيه معظم الطلاب`} to="/admin/analytics"><ul>{i.hard.map(x => <li key={x.id}>{x.text} — أخطأ {x.wrong}% ({x.n} إجابة)</li>)}</ul></Sev>)
    if (i.ended.length) alerts.push(<Sev key="en" icon="⏰" title={`${i.ended.length} ${i.ended.length === 1 ? 'واجب انتهى' : 'واجبات انتهت'} خلال آخر 3 أيام`} to="/admin/assignments"><ul>{i.ended.map(x => <li key={x.id}>{x.title} — {fdt(x.ends_at)}</li>)}</ul></Sev>)
  }
  return <><PageHeader title="الرئيسية" desc="نظرة سريعة على الطلاب والواجبات وما يحتاج متابعتك." />
    {/* 1) الأرقام */}
    <div className="stat4">{stats.map(([I, l, v, sub, c]) => <div key={l} className="stat"><span className={'sico ' + c}><I size={22} className="i" /></span><b>{v}</b><span className="sl">{l}</span><small>{sub}</small></div>)}</div>
    {!i && <Alert tone="info">لتفعيل التحليلات الذكية شغّل ملف <b className="ltr">008_insights_practice_announcements.sql</b> في Supabase.</Alert>}
    {/* 2) الآن: من متصل + ما ينتظر التصحيح */}
    <div className="two2"><OnlineNow m={live} />
      <div className="card"><div className="row between"><h3 style={{ margin: 0 }}>الواجبات بانتظار التصحيح</h3><Link className="btn ghost sm" to="/admin/grading">عرض الكل</Link></div>
        {d.pend.length ? d.pend.map(p => <div key={p.id} className="pendcard"><div className="grow"><b className="small">{p.profiles?.full_name}</b><div className="muted small">{p.assignments?.title} · {fdt(p.submitted_at)}</div><Badge tone="warning">{p.pending_count} سؤال للتصحيح</Badge></div><Link className="btn sm" to={`/admin/grading?attempt=${p.id}`}>تصحيح</Link></div>)
          : <EmptyState icon={ClipboardCheck} title="لا يوجد ما ينتظر التصحيح" text="ستجد هنا كل واجب يسلّمه طالب ويحتاج مراجعتك." />}</div></div>
    {/* 3) تنبيهات */}
    {i && <><div className="sechead"><h2>تنبيهات تحتاج انتباهك</h2></div>{alerts.length ? alerts : <p className="muted small">لا توجد تنبيهات الآن. كل شيء يسير جيدًا ✓</p>}
      {/* 4) أداء الطلاب */}
      <div className="sechead"><h2>أداء الطلاب</h2></div>
      <div className="two2"><div className="card"><div className="row between"><h3 style={{ margin: 0 }}>أفضل الطلاب</h3><Trophy size={18} className="i muted" /></div>
        {i.top.length ? i.top.map((x, k) => <div key={x.id} className="rank"><span className="n">{k + 1}</span><span className="grow"><b className="small">{x.name}</b><Progress value={x.avg} ok /></span><b>{x.avg}%</b></div>) : <p className="muted small" style={{ marginTop: 8 }}>تظهر القائمة بعد أول تسليمات.</p>}</div>
        <div className="card"><div className="row between"><h3 style={{ margin: 0 }}>يحتاجون متابعة</h3><TrendingDown size={18} className="i muted" /></div>
          {needs.length ? needs.slice(0, 6).map(x => <div key={x.id} className="rank"><span className="grow"><b className="small">{x.name}</b><div className="muted small">{x.why}</div></span><Badge tone={x.tone}>{x.tone === 'danger' ? 'ضعيف' : 'يتراجع'}</Badge></div>) : <p className="muted small" style={{ marginTop: 8 }}>لا يوجد طلاب مستواهم يتراجع حاليًا ✓</p>}</div></div></>}
    {/* 5) الرسم + آخر النشاطات */}
    <div className="card chartcard"><div className="row between wrapx"><div><h3 style={{ margin: 0 }}>متوسط الدرجات</h3><p className="muted small">متوسط نسبة الدرجات في اليوم الواحد.</p></div><select aria-label="الفترة" value={range} onChange={e => setRange(e.target.value)}><option value="7">آخر 7 أيام</option><option value="30">آخر 30 يومًا</option><option value="all">كل الفترة</option></select></div>
      {chart.length ? <AreaChart data={chart} /> : <EmptyState icon={Activity} title="لا توجد تسليمات في هذه الفترة" text="سيظهر الرسم بعد أن يسلّم الطلاب واجباتهم." />}</div>
    <div className="card"><h3>آخر النشاطات</h3>{d.act.length ? d.act.map((n, k) => <div key={n.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--c-border)' }}><span className={'act-ic ' + tones[k % 4]}><ClipboardCheck size={17} className="i" /></span><div className="grow small"><b>{n.title}</b><div>{n.body}</div><div className="muted small">{fdt(n.created_at)}</div></div></div>) : <p className="muted small">لا يوجد نشاط حتى الآن.</p>}</div></>
}
