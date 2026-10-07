import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Calendar, CheckCircle2, ClipboardList, Clock, Eye, FileQuestion, Hourglass, LogOut, Play, Target, Trophy } from 'lucide-react'
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
export function StudentHome() {
  const { profile } = useAuth(), r = useStudent(), nav = useNavigate()
  return <div className="page"><PageHeader title={`أهلًا، ${profile?.full_name?.split(' ')[0] || ''}`} desc="تابع واجباتك ونتائجك من مكان واحد." />
    <Wrap r={r}>{d => <>
      <div className="kpis">{[[Target, 'متوسط الدرجات', d.avg != null ? d.avg + '%' : '—', ''], [CheckCircle2, 'واجبات مكتملة', d.done.length, 'g'], [Hourglass, 'قيد المراجعة', d.waiting, 'a'], [ClipboardList, 'واجبات متاحة', d.avail.length, 'i']].map(([I, l, v, c]) => <div key={l} className="kpi"><span className={'ic ' + c}><I size={20} className="i" /></span><div><b>{v}</b><span>{l}</span></div></div>)}</div>
      {d.prog && <section className="cont" aria-label="متابعة الحل"><div><p style={{ color: '#9fb3d6', fontSize: '.85rem' }}>متابعة التعلم</p><h2 style={{ fontSize: '1.25rem', margin: '4px 0' }}>{d.prog.assignments?.title}</h2><p style={{ color: '#b6c3d9' }} className="small">{d.prog.assignments?.lessons?.title} · أجبت عن {d.answered} من {d.total} سؤال</p><Progress value={pct(d.answered, d.total)} /></div><Link className="btn lg" to={`/solve/${d.prog.assignment_id}`}>متابعة الحل</Link></section>}
      <div className="sechead"><h2>واجبات متاحة</h2>{d.avail.length > 3 && <Link to="/assignments" className="btn ghost sm">عرض الكل</Link>}</div>
      {d.avail.length ? d.avail.slice(0, 3).map(a => <AssignmentCard key={a.id} a={a} d={d} />) : <EmptyState icon={ClipboardList} title="لا توجد واجبات متاحة الآن" text="عندما ينشر المدرس واجبًا جديدًا سيظهر هنا." action={<Link className="btn secondary" to="/#curriculum">استكشف المنهج</Link>} />}
      <div className="sechead"><h2>آخر النتائج</h2>{d.done.length > 3 && <Link to="/results" className="btn ghost sm">كل النتائج</Link>}</div>
      {d.done.length ? d.done.slice(0, 3).map(t => <ResultRow key={t.id} t={t} />) : <EmptyState icon={Trophy} title="لا توجد نتائج بعد" text="بعد تسليم أول واجب ستظهر درجتك هنا." />}
      {d.asg.length > 0 && <div className="card" style={{ marginTop: 24 }}><div className="row between"><b>تقدمك في الواجبات</b><span className="muted small">{d.done.length} من {d.asg.length}</span></div><div style={{ marginTop: 10 }}><Progress ok value={pct(d.done.length, d.asg.length)} /></div></div>}</>}</Wrap></div>
}
export function Assignments() {
  const r = useStudent(), [tab, setTab] = useState('avail')
  return <div className="page"><PageHeader title="الواجبات" desc="كل الواجبات المنشورة لك." /><Wrap r={r}>{d => { const done = d.asg.filter(a => d.done.some(x => x.assignment_id === a.id)), sets = { avail: d.avail, done, late: d.late }, list = sets[tab]
    return <><Segmented value={tab} onChange={setTab} items={[['avail', 'المتاحة', d.avail.length], ['done', 'المسلّمة', done.length], ['late', 'المتأخرة', d.late.length]]} /><div style={{ marginTop: 12 }}>
      {list.length ? list.map(a => <AssignmentCard key={a.id} a={a} d={d} />) : <EmptyState icon={ClipboardList} title={tab === 'late' ? 'لا توجد واجبات متأخرة' : tab === 'done' ? 'لم تسلّم أي واجب بعد' : 'لا توجد واجبات متاحة'} text={tab === 'late' ? 'أحسنت، أنت ملتزم بالمواعيد.' : 'ستظهر الواجبات هنا فور نشرها.'} />}</div></> }}</Wrap></div>
}
export function Results() {
  const r = useStudent()
  return <div className="page"><PageHeader title="نتائجي" desc="درجاتك في الواجبات المسلّمة." /><Wrap r={r}>{d => d.done.length ? d.done.map(t => <ResultRow key={t.id} t={t} />) : <EmptyState icon={Trophy} title="لا توجد نتائج بعد" text="سلّم أول واجب لتظهر نتيجته هنا." action={<Link className="btn" to="/assignments">اذهب إلى الواجبات</Link>} />}</Wrap></div>
}
export function Account() {
  const { profile, signOut } = useAuth(), nav = useNavigate()
  return <div className="page narrow"><PageHeader title="حسابي" /><div className="card"><div className="row"><span className="avatar" style={{ width: 52, height: 52 }}>{profile?.full_name?.[0]}</span><div><b>{profile?.full_name}</b><p className="muted small ltr">{profile?.phone || '—'}</p></div></div></div><Btn variant="secondary" icon={LogOut} onClick={async () => { await signOut(); nav('/') }}>تسجيل الخروج</Btn></div>
}
