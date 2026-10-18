import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Save, Wand2 } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { Alert, Badge, Btn, EmptyState, ErrorState, PageHeader, PageSkeleton, fdt, friendly, nf, pct, useUi } from '../../components/ui'
import AnswerView, { isRich } from '../../components/AnswerView'
import PhotoGrading from '../../components/PhotoGrading'
// إعادة التصحيح: يفتح المدرس أي محاولة (مصحَّحة أو لا) ويعدّل درجة/ملاحظة أي سؤال، أو يعيد التصحيح التلقائي للمحاولة، ثم «إنهاء وإبلاغ الطالب».
export default function Regrade({ id, back }) {
  const [t, setT] = useState(null), [err, setErr] = useState(null)
  useEffect(() => { (async () => {
    const base = 'id,status,score,max_score,assignment_id,profiles(full_name),assignments(title)'
    let q = await sb.from('attempts').select(base + ',mode,regrade_requested_at,regrade_note').eq('id', id).single()
    if (q.error) q = await sb.from('attempts').select(base).eq('id', id).single()   // قبل تشغيل 013/014
    q.error ? setErr(q.error) : setT(q.data) })() }, [id])
  if (err) return <ErrorState text={friendly(err)} onRetry={() => location.reload()} />
  if (!t) return <PageSkeleton />
  return t.mode === 'photo' ? <PhotoGrading id={id} meta={t} back={back} /> : <RegradeWork t={t} back={back} />
}
const nowMarks = r => r.auto_marks ?? r.essay_reviews?.marks ?? null
function RegradeWork({ t, back }) {
  const { confirm, toast } = useUi(), [att, setAtt] = useState(t), [rows, setRows] = useState(null), [ed, setEd] = useState({}), [busy, setBusy] = useState(''), [err, setErr] = useState('')
  const load = async () => {
    const [a, o, s] = await Promise.all([
      sb.from('student_answers').select('id,answer,auto_marks,question_id,questions(question_text,model_answer,marks,question_type,correct_answer,question_options(key,text,is_correct)),essay_reviews(marks,feedback)').eq('attempt_id', t.id),
      sb.from('assignment_questions').select('question_id,position').eq('assignment_id', t.assignment_id), sb.from('attempts').select('score,max_score,status').eq('id', t.id).single()])
    if (a.error) return setErr(friendly(a.error)); const pos = Object.fromEntries((o.data || []).map(x => [x.question_id, x.position]))
    setRows((a.data || []).sort((x, y) => (pos[x.question_id] ?? 0) - (pos[y.question_id] ?? 0))); if (s.data) setAtt(x => ({ ...x, ...s.data })) }
  useEffect(() => { load() }, [t.id])
  if (!rows) return err ? <ErrorState text={err} onRetry={load} /> : <PageSkeleton />
  const save = async r => {
    const q = r.questions, e = ed[r.id] || {}, m = e.m ?? String(nowMarks(r) ?? ''), f = e.f ?? r.essay_reviews?.feedback ?? ''
    if (m === '' || +m < 0 || +m > q.marks) return setErr(`الدرجة يجب أن تكون بين 0 و ${nf(q.marks)}.`); setErr(''); setBusy(r.id)
    const { error } = await sb.rpc('regrade_answer', { p_answer: r.id, p_marks: +m, p_feedback: f || null }); setBusy(''); if (error) return setErr(friendly(error))
    toast('تم حفظ الدرجة'); setEd(x => { const { [r.id]: _, ...rest } = x; return rest }); load() }
  const auto = async () => {
    if (!(await confirm('إعادة التصحيح التلقائي لهذه المحاولة؟', 'سيُعاد حساب الأسئلة ذات الإجابة الثابتة من مفتاح الإجابة الحالي. الدرجات التي عدّلتها يدويًا تبقى كما هي.'))) return
    setBusy('auto'); const { data, error } = await sb.rpc('regrade_assignment', { p_attempt: t.id }); setBusy(''); if (error) return setErr(friendly(error))
    toast(data.answers ? `تم تحديث ${data.answers} إجابة` : 'لا توجد تغييرات'); load() }
  const finish = async () => { setBusy('fin'); const { error } = await sb.rpc('finish_regrade', { p_attempt: t.id }); setBusy(''); if (error) return setErr(friendly(error)); toast('تم إبلاغ الطالب بنتيجة إعادة التصحيح'); back() }
  const p = pct(att.score, att.max_score)
  return <><div className="row between wrapx"><Btn variant="ghost" size="sm" icon={ArrowRight} onClick={back}>رجوع</Btn><Btn variant="secondary" size="sm" icon={Wand2} disabled={!!busy} onClick={auto}>{busy === 'auto' ? 'جارٍ التحديث…' : 'إعادة التصحيح التلقائي للمحاولة'}</Btn></div>
    <PageHeader title={t.profiles?.full_name || 'إعادة التصحيح'} desc={`${t.assignments?.title || ''} · إعادة تصحيح`} />
    {t.regrade_requested_at && <Alert tone="warning">طلب الطالب إعادة التصحيح ({fdt(t.regrade_requested_at)}): {t.regrade_note || 'بدون ملاحظة'}</Alert>}
    <div className="card row between wrapx"><div><span className="muted small">الدرجة الحالية</span><div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{nf(att.score)} / {nf(att.max_score)} <Badge tone={p >= 50 ? 'success' : 'danger'}>{p}%</Badge></div></div><Btn variant="success" icon={CheckCircle2} disabled={!!busy} onClick={finish}>{busy === 'fin' ? 'جارٍ الإرسال…' : 'إنهاء وإبلاغ الطالب'}</Btn></div>
    <Alert>{err}</Alert>
    {!rows.length ? <EmptyState icon={CheckCircle2} title="لا توجد إجابات" text="لم يجب الطالب عن أي سؤال في هذه المحاولة." /> : rows.map((r, k) => {
      const q = r.questions, now = nowMarks(r), hasO = q.question_options.length > 0, ks = Array.isArray(r.answer) ? r.answer : r.answer != null ? [r.answer] : []
      const mine = hasO ? ks.map(x => q.question_options.find(o => o.key === x)?.text ?? x).join('، ') : (typeof r.answer === 'string' ? r.answer : r.answer ? JSON.stringify(r.answer) : '')
      const right = q.model_answer || (hasO ? q.question_options.filter(o => o.is_correct).map(o => o.text).join('، ') : typeof q.correct_answer === 'string' ? q.correct_answer.replaceAll('|', ' أو ') : '—'), e = ed[r.id] || {}
      return <div key={r.id} className="card"><div className="row between wrapx"><b>السؤال {k + 1}</b><Badge tone={now == null ? 'warning' : now >= q.marks ? 'success' : now > 0 ? 'info' : 'danger'}>{now == null ? 'غير مصحح' : `${nf(now)} / ${nf(q.marks)}`}</Badge></div>
        <h3 style={{ fontSize: '1.05rem' }}>{q.question_text}</h3>
        <div className="ans"><b>إجابة الطالب</b>{isRich(r.answer) ? <AnswerView value={r.answer} /> : <p>{mine || 'لم يجب عن هذا السؤال'}</p>}</div><div className="ans good"><b>الإجابة النموذجية</b><p>{right || '—'}</p></div>
        <div className="grid2" style={{ marginTop: 10 }}><label className="field"><span>الدرجة (من {nf(q.marks)})</span><input type="number" step="0.5" min="0" max={q.marks} value={e.m ?? String(now ?? '')} onChange={ev => setEd({ ...ed, [r.id]: { ...e, m: ev.target.value } })} /></label></div>
        <label className="field"><span>ملاحظة للطالب (اختياري)</span><textarea rows={2} value={e.f ?? r.essay_reviews?.feedback ?? ''} onChange={ev => setEd({ ...ed, [r.id]: { ...e, f: ev.target.value } })} /></label>
        <Btn icon={Save} disabled={!!busy} onClick={() => save(r)}>{busy === r.id ? 'جارٍ الحفظ…' : 'حفظ الدرجة'}</Btn></div> })}</>
}
