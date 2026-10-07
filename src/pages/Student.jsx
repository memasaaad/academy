import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Calendar, CheckCircle2, ClipboardList, Clock, Code2, Eye, FileQuestion, Hourglass, LogOut, Play, Target, Trophy } from 'lucide-react'
import { sb } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Badge, Btn, EmptyState, ErrorState, PageHeader, PageSkeleton, Progress, Segmented, fdate, grade, nf, pct, useAsync } from '../components/ui'
function useStudent() {
  return useAsync(async () => {
    const [a, t] = await Promise.all([sb.from('assignments').select('*, lessons(title), assignment_questions(count)').eq('is_open', true).order('ends_at', { nullsFirst: false }), sb.from('attempts').select('*, assignments(title,auto_grade,lessons(title))').order('started_at', { ascending: false })])
    if (a.error || t.error) throw a.error || t.error
    const asg = a.data || [], att = t.data || [], now = Date.now()
    const done = att.filter(x => x.status !== 'in_progress'), doneIds = new Set(done.map(x => x.assignment_id)), prog = att.find(x => x.status === 'in_progress')
    const late = asg.filter(x => !doneIds.has(x.id) && x.ends_at && new Date(x.ends_at) < now)
    const avail = asg.filter(x => !doneIds.has(x.id) && !late.includes(x) && (!x.starts_at || new Date(x.starts_at) <= now))
    const visible = x => x.status === 'graded' || x.assignments?.auto_grade, scored = done.filter(visible)
    let answered = 0, total = 0
    if (prog) { const [c, q] = await Promise.all([sb.from('student_answers').select('*', { count: 'exact', head: true }).eq('attempt_id', prog.id).not('answer', 'is', null), sb.from('assignment_questions').select('*', { count: 'exact', head: true }).eq('assignment_id', prog.assignment_id)]); answered = c.count || 0; total = q.count || 0 }
    return { asg, att, done, prog, late, avail, visible, avg: scored.length ? Math.round(scored.reduce((s, x) => s + pct(x.score, x.max_score), 0) / scored.length) : null, answered, total, waiting: done.filter(x => x.status === 'submitted').length } }, [])
}
export function statusOf(a, d) {
  const mine = d.att.filter(x => x.assignment_id === a.id), live = mine.find(x => x.status === 'in_progress'), fin = mine.find(x => x.status !== 'in_progress')
  if (live) return ['قيد الحل', 'info', Play]
  if (fin) return fin.status === 'graded' ? ['تم التصحيح', 'success', CheckCircle2] : a.auto_grade ? ['تم التسليم', 'primary', CheckCircle2] : ['بانتظار التصحيح', 'warning', Hourglass]
  if (a.ends_at && new Date(a.ends_at) < Date.now()) return ['متأخر', 'danger', Clock]
  return ['متاح', 'success', Play]
}
export function AssignmentCard({ a, d }) {
  const [label, tone, Ic] = statusOf(a, d), mine = d.att.filter(x => x.assignment_id === a.id), fin = mine.find(x => x.status !== 'in_progress'), live = mine.find(x => x.status === 'in_progress')
  const canStart = (label === 'متاح' || label === 'قيد الحل')
  return <article className="acard"><span className="ic" aria-hidden><ClipboardList size={21} className="i" /></span>
    <div className="grow"><div className="row wrapx"><h4>{a.title}</h4><Badge tone={tone} icon={Ic}>{label}</Badge></div><p className="muted small">{a.lessons?.title}</p>
      <div className="meta"><span><FileQuestion className="i" />{a.assignment_questions?.[0]?.count ?? 0} سؤال</span><span><Calendar className="i" />يبدأ {fdate(a.starts_at)}</span><span><Clock className="i" />ينتهي {fdate(a.ends_at)}</span></div></div>
    <div className="act">{canStart ? <Link className="btn" to={`/solve/${a.id}`}>{live ? 'متابعة الحل' : 'ابدأ الواجب'}</Link> : fin && (fin.status === 'graded' || a.auto_grade) ? <Link className="btn secondary" to={`/review/${fin.id}`}><Eye size={17} className="i" />مراجعة الحل</Link> : null}</div></article>
}
function ResultRow({ t }) {
  const p = pct(t.score, t.max_score), show = t.status === 'graded' || t.assignments?.auto_grade
  return <article className="acard"><span className="ic" aria-hidden><Trophy size={21} className="i" /></span><div className="grow"><h4>{t.assignments?.title}</h4><p className="muted small">{t.assignments?.lessons?.title} · سُلّم {fdate(t.submitted_at)}</p>
    {show && t.pending_count > 0 && <p className="small" style={{ color: 'var(--c-warning)' }}>{nf(t.pending_marks)} درجة بانتظار مراجعة المدرس</p>}</div>
    <div className="act" style={{ textAlign: 'end' }}>{show ? <><b style={{ fontSize: '1.15rem' }}>{nf(t.score)} / {nf(t.max_score)}</b><div className="row" style={{ justifyContent: 'flex-end', marginBlock: 4 }}><span className="muted small">{p}%</span><Badge tone={p >= 50 ? 'success' : 'danger'}>{grade(p)}</Badge></div><Link className="small" style={{ color: 'var(--c-primary)' }} to={`/review/${t.id}`}>مراجعة الحل والأخطاء</Link></> : <Badge tone="warning" icon={Hourglass}>بانتظار التصحيح</Badge>}</div></article>
}
const Wrap = ({ r, children }) => r.loading ? <PageSkeleton /> : r.error ? <ErrorState onRetry={r.reload} /> : children(r.data)
function AvailCard({ a, d }) {
  const [label, tone, Ic] = statusOf(a, d), live = label === 'قيد الحل'
  return <article className="vcard"><div className="top"><Badge tone={tone} icon={Ic}>{label}</Badge><span className="ic" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--c-primary-soft)', color: 'var(--c-primary)', display: 'grid', placeItems: 'center' }}><ClipboardList size={18} className="i" /></span></div>
    <h4>{a.title}</h4><p className="muted small">{a.lessons?.title}</p><div className="meta"><span><FileQuestion className="i" />{a.assignment_questions?.[0]?.count ?? 0} سؤال</span><span><Clock className="i" />ينتهي {fdate(a.ends_at)}</span></div>
    <Link className="btn" to={`/solve/${a.id}`}>{live ? 'متابعة الحل' : 'ابدأ'}</Link></article>
}
export function StudentHome() {
  const { profile } = useAuth(), r = useStudent()
  return <div className="page"><div className="pagehead"><div><h1>أهلًا، {profile?.full_name?.split(' ')[0] || ''} 👋</h1><p>جاهز تكمل رحلتك؟</p></div></div>
    <Wrap r={r}>{d => <>
      <div className="kpis">{[[CheckCircle2, 'الواجبات المكتملة', d.done.length, 'g'], [Hourglass, 'قيد المراجعة', d.waiting, 'o'], [ClipboardList, 'الواجبات المتاحة', d.avail.length, 'i'], [Target, 'متوسط الدرجات', d.avg != null ? d.avg + '%' : '—', 'p']].map(([I, l, v, c]) => <div key={l} className="kpi"><span className={'ic ' + c}><I size={22} className="i" /></span><div><span>{l}</span><b>{v}</b></div></div>)}</div>
      <div className="sechead"><h2>متابعة التعلم</h2></div>
      {d.prog ? <section className="cont" aria-label="متابعة الحل"><div className="row" style={{ alignItems: 'flex-start' }}><span className="tile" aria-hidden><Code2 size={26} className="i" /></span><div className="grow"><h3 style={{ margin: 0, fontSize: '1.1rem' }}>{d.prog.assignments?.title}</h3><p className="muted small">{d.prog.assignments?.lessons?.title}</p>
        <div className="row" style={{ marginTop: 10 }}><div className="grow"><Progress value={pct(d.answered, d.total)} /></div><span className="small muted">{d.answered} / {d.total}</span></div></div></div><Link className="btn lg" to={`/solve/${d.prog.assignment_id}`}>متابعة الحل</Link></section>
        : <EmptyState icon={Play} title="لا يوجد واجب قيد الحل" text="ابدأ أحد الواجبات المتاحة وسيظهر هنا لتكمله لاحقًا." />}
      <div className="sechead"><h2>الواجبات المتاحة</h2>{d.avail.length > 3 && <Link to="/assignments" className="btn ghost sm">عرض الكل</Link>}</div>
      {d.avail.length ? <div className="availgrid">{d.avail.slice(0, 3).map(a => <AvailCard key={a.id} a={a} d={d} />)}</div> : <EmptyState icon={ClipboardList} title="لا توجد واجبات متاحة الآن" text="عندما ينشر المدرس واجبًا جديدًا سيظهر هنا." action={<Link className="btn secondary" to="/#curriculum">استكشف المنهج</Link>} />}
      <div className="twocol" style={{ marginTop: 24 }}><div><div className="sechead" style={{ marginTop: 0 }}><h2>آخر النتائج</h2>{d.done.length > 3 && <Link to="/results" className="btn ghost sm">كل النتائج</Link>}</div>
        {d.done.length ? <div className="card" style={{ paddingBlock: 4 }}>{d.done.slice(0, 4).map(t => { const show = d.visible(t), p = pct(t.score, t.max_score); return <div key={t.id} className="rrow"><div><b>{t.assignments?.title}</b><div className="muted small">{fdate(t.submitted_at)}{show && ` · ${nf(t.score)} / ${nf(t.max_score)}`}</div></div>
          <div className="row">{show ? <><Badge tone={p >= 85 ? 'success' : p >= 50 ? 'primary' : 'danger'}>{grade(p)}</Badge><Link className="btn ghost sm" to={`/review/${t.id}`}>مراجعة</Link></> : <Badge tone="warning" icon={Hourglass}>بانتظار التصحيح</Badge>}</div></div> })}</div>
          : <EmptyState icon={Trophy} title="لا توجد نتائج بعد" text="بعد تسليم أول واجب ستظهر درجتك هنا." />}</div>
        <div><div className="sechead" style={{ marginTop: 0 }}><h2>مستواك العام</h2></div><div className="card"><div className="ring" style={{ '--p': d.avg || 0, '--c': (d.avg || 0) >= 50 ? 'var(--c-success)' : 'var(--c-danger)' }} role="img" aria-label={`متوسط الدرجات ${d.avg || 0}%`}><div>{d.avg != null ? d.avg + '%' : '—'}<small>متوسط الدرجات</small></div></div>
          <div className="lg"><span><i style={{ background: 'var(--c-success)' }} />الواجبات المكتملة</span><b>{d.done.length}</b></div><div className="lg"><span><i style={{ background: 'var(--c-primary)' }} />الواجبات المتاحة</span><b>{d.avail.length}</b></div><div className="lg"><span><i style={{ background: 'var(--c-danger)' }} />الواجبات المتأخرة</span><b>{d.late.length}</b></div></div></div></div></>}</Wrap></div>
}
export function Assignments() {
  const r = useStudent(), [tab, setTab] = useState('all')
  return <div className="page"><PageHeader title="الواجبات" desc="كل الواجبات المنشورة لك." /><Wrap r={r}>{d => { const st = a => statusOf(a, d)[0], sets = { all: d.asg, avail: d.asg.filter(a => st(a) === 'متاح'), live: d.asg.filter(a => st(a) === 'قيد الحل'), done: d.asg.filter(a => ['تم التسليم', 'بانتظار التصحيح', 'تم التصحيح'].includes(st(a))), late: d.asg.filter(a => st(a) === 'متأخر') }, list = sets[tab]
    return <><Segmented value={tab} onChange={setTab} items={[['all', 'الكل', sets.all.length], ['avail', 'متاح', sets.avail.length], ['live', 'قيد الحل', sets.live.length], ['done', 'مسلّم', sets.done.length], ['late', 'متأخر', sets.late.length]]} /><div style={{ marginTop: 12 }}>
      {list.length ? list.map(a => <AssignmentCard key={a.id} a={a} d={d} />) : <EmptyState icon={ClipboardList} title={tab === 'late' ? 'لا توجد واجبات متأخرة' : 'لا توجد واجبات هنا'} text={tab === 'late' ? 'أحسنت، أنت ملتزم بالمواعيد.' : 'ستظهر الواجبات هنا فور نشرها أو تغيّر حالتها.'} />}</div></> }}</Wrap></div>
}
export function Results() {
  const r = useStudent()
  return <div className="page"><PageHeader title="نتائجي" desc="درجاتك في الواجبات المسلّمة." /><Wrap r={r}>{d => d.done.length ? d.done.map(t => <ResultRow key={t.id} t={t} />) : <EmptyState icon={Trophy} title="لا توجد نتائج بعد" text="سلّم أول واجب لتظهر نتيجته هنا." action={<Link className="btn" to="/assignments">اذهب إلى الواجبات</Link>} />}</Wrap></div>
}
export function Account() {
  const { profile, signOut } = useAuth(), nav = useNavigate()
  return <div className="page narrow"><PageHeader title="حسابي" /><div className="card"><div className="row"><span className="avatar" style={{ width: 52, height: 52 }}>{profile?.full_name?.[0]}</span><div><b>{profile?.full_name}</b><p className="muted small ltr">{profile?.phone || '—'}</p></div></div></div><Btn variant="secondary" icon={LogOut} onClick={async () => { await signOut(); nav('/') }}>تسجيل الخروج</Btn></div>
}
