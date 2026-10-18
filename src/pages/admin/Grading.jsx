import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, ClipboardCheck, Check, Wand2, X } from 'lucide-react'
import { sb } from '../../lib/supabase'
import AnswerView, { isRich } from '../../components/AnswerView'
import PhotoGrading from '../../components/PhotoGrading'
import Regrade from './Regrade'
import { Alert, Badge, Btn, EmptyState, ErrorState, Field, PageHeader, PageSkeleton, Progress, fdt, friendly, useAsync, useUi } from '../../components/ui'
export default function Grading() {
  const { confirm, toast } = useUi(), [sp, setSp] = useSearchParams(), cur = sp.get('attempt'), [flt, setFlt] = useState(''), [busy, setBusy] = useState(false)
  const { data, loading, error, reload } = useAsync(async () => { const base = 'id,submitted_at,pending_count,assignment_id,profiles(full_name),assignments(title)'; let r = await sb.from('attempts').select(base + ',mode').eq('status', 'submitted').order('submitted_at'); if (r.error) r = await sb.from('attempts').select(base).eq('status', 'submitted').order('submitted_at') /* قبل تشغيل 013 */; if (r.error) throw r.error; return r.data }, [])
  const rq = useAsync(async () => { const { data: d, error: e } = await sb.from('attempts').select('id,regrade_note,regrade_requested_at,profiles(full_name),assignments(title)').not('regrade_requested_at', 'is', null).order('regrade_requested_at'); return e ? [] : d || [] }, [])   // يعمل بعد تشغيل 014
  if (loading) return <PageSkeleton />; if (error) return <ErrorState onRetry={reload} />
  if (cur) { const m = data.find(x => x.id === cur), b = () => { setSp({}); reload(); rq.reload() }; if (sp.get('redo') === '1' || !m) return <Regrade id={cur} back={b} />; return m?.mode === 'photo' ? <PhotoGrading id={cur} meta={m} back={b} /> : <Work id={cur} meta={m} back={b} /> }
  const asg = [...new Map(data.map(x => [x.assignment_id, x.assignments?.title])).entries()], list = data.filter(x => !flt || x.assignment_id === flt)
  const auto = async () => { if (!(await confirm('تصحيح تلقائي؟', `سيُصحَّح تلقائيًا كل سؤال له إجابة ثابتة (اختيار من متعدد، صح/خطأ، إجابة قصيرة) ${flt ? 'في الواجب المحدد' : 'في كل التسليمات'}. الأسئلة المقالية وأسئلة الكود تبقى للتصحيح اليدوي.`))) return; setBusy(true); const { data: r, error } = await sb.rpc('auto_grade_pending', { p_assignment: flt || null }); setBusy(false); if (error) return toast(friendly(error), 'error'); toast(r.answers ? `تم تصحيح ${r.answers} إجابة تلقائيًا في ${r.attempts} محاولة` : 'لا توجد أسئلة ثابتة تحتاج تصحيحًا'); reload() }
  return <><PageHeader title="التصحيح" desc="الأسئلة ذات الإجابة الثابتة تُصحَّح بزر واحد، والمقالي تصححه بنفسك."><Btn icon={Wand2} disabled={busy || !list.length} onClick={auto}>{busy ? 'جارٍ التصحيح…' : 'تصحيح تلقائي للأسئلة الثابتة'}</Btn></PageHeader>{rq.data?.length > 0 && <div className="card" style={{ borderColor: 'var(--c-warning)' }}><h3 style={{ marginTop: 0 }}>طلبات إعادة التصحيح ({rq.data.length})</h3>{rq.data.map(x => <div key={x.id} className="row between wrapx" style={{ padding: '8px 0', borderTop: '1px solid var(--c-border)' }}><div><b className="small">{x.profiles?.full_name}</b> <span className="muted small">· {x.assignments?.title}</span>{x.regrade_note && <div className="muted small">«{x.regrade_note}»</div>}</div><Link className="btn sm" to={`/admin/grading?attempt=${x.id}&redo=1`}>مراجعة الطلب</Link></div>)}</div>}<div className="row between wrapx" style={{ marginBottom: 12 }}><b>بانتظار التصحيح: {list.length} محاولة</b>
    <select aria-label="الواجب" style={{ maxWidth: 260 }} value={flt} onChange={e => setFlt(e.target.value)}><option value="">كل الواجبات</option>{asg.map(([id, t]) => <option key={id} value={id}>{t}</option>)}</select></div>
    {!list.length ? <EmptyState icon={ClipboardCheck} title="لا يوجد ما ينتظر التصحيح" text="سيظهر هنا كل واجب يسلّمه طالب ويحتاج مراجعتك." /> : <div className="tablew cards"><table><thead><tr><th>الطالب</th><th>الواجب</th><th>وقت التسليم</th><th>المتبقي</th><th /></tr></thead><tbody>{list.map(a => <tr key={a.id}><td data-l="الطالب"><b>{a.profiles?.full_name}</b></td><td data-l="الواجب">{a.assignments?.title}</td><td data-l="التسليم">{fdt(a.submitted_at)}</td><td data-l="المتبقي">{a.mode === 'photo' ? <Badge tone="info">حل بالصور</Badge> : <Badge tone="warning">{a.pending_count} سؤال</Badge>}</td><td><Btn size="sm" onClick={() => setSp({ attempt: a.id })}>ابدأ التصحيح</Btn></td></tr>)}</tbody></table></div>}</>
}
function Work({ id, meta, back }) {
  const { confirm, toast } = useUi(), [m, setM] = useState(''), [fb, setFb] = useState(''), [err, setErr] = useState(''), [i, setI] = useState(0), [total, setTotal] = useState(0)
  const { data: items, loading, error, reload } = useAsync(async () => {
    const { data, error } = await sb.from('student_answers').select('id,answer,questions(question_text,model_answer,marks,question_type,correct_answer,question_options(key,text,is_correct)),essay_reviews(id)').eq('attempt_id', id).is('auto_marks', null)
    if (error) throw error; const d = (data || []).filter(x => !x.essay_reviews); setTotal(d.length); return d }, [id])
  const [left, setLeft] = useState(null); useEffect(() => { if (items) setLeft(items) }, [items])
  if (loading || !left) return <PageSkeleton />; if (error) return <ErrorState onRetry={reload} />
  const cur = left[0]
  if (!cur) return <EmptyState icon={ClipboardCheck} title="اكتمل تصحيح هذه المحاولة" text="تم احتساب الدرجة النهائية وإتاحتها للطالب." action={<Btn onClick={back}>العودة إلى القائمة</Btn>} />
  const q = cur.questions, ks = Array.isArray(cur.answer) ? cur.answer : cur.answer != null ? [cur.answer] : [], hasO = q.question_options.length > 0
  const mine = hasO ? ks.map(k => q.question_options.find(o => o.key === k)?.text ?? k).join('، ') : (typeof cur.answer === 'string' ? cur.answer : cur.answer ? JSON.stringify(cur.answer) : '')
  const right = hasO ? q.question_options.filter(o => o.is_correct).map(o => o.text).join('، ') : ''
  const save = async () => { if (m === '' || +m < 0 || +m > q.marks) return setErr(`الدرجة يجب أن تكون بين 0 و ${q.marks}.`); const { error } = await sb.rpc('save_review', { p_answer: cur.id, p_marks: +m, p_feedback: fb || null }); if (error) return setErr(friendly(error)); setErr(''); setM(''); setFb(''); setLeft(left.slice(1)); toast('تم حفظ الدرجة') }
  const doneN = total - left.length
  return <><div className="row between wrapx"><Btn variant="ghost" size="sm" icon={ArrowRight} onClick={back}>رجوع إلى القائمة</Btn><Btn variant="secondary" size="sm" icon={Wand2} onClick={async () => { const { data: r, error } = await sb.rpc('auto_grade_pending', { p_attempt: id }); if (error) return toast(friendly(error), 'error'); toast(r.answers ? `تم تصحيح ${r.answers} إجابة تلقائيًا` : 'لا توجد أسئلة ثابتة في هذه المحاولة'); setM(''); setFb(''); reload() }}>تصحيح الأسئلة الثابتة تلقائيًا</Btn></div><PageHeader title={meta?.profiles?.full_name || 'تصحيح'} desc={meta?.assignments?.title} />
    <div className="card"><div className="row between small muted"><span>السؤال {doneN + 1} من {total}</span><span>{left.length} متبقٍ</span></div><div style={{ marginTop: 8 }}><Progress value={(doneN / total) * 100} /></div></div>
    <div className="card"><h3 style={{ fontSize: '1.1rem' }}>{q.question_text}</h3><div className="ans"><b>إجابة الطالب</b>{isRich(cur.answer) ? <AnswerView value={cur.answer} /> : <p>{mine || 'لم يجب عن هذا السؤال'}</p>}</div>
      <div className="ans good"><b>الإجابة النموذجية</b><p>{q.model_answer || right || (typeof q.correct_answer === 'string' ? q.correct_answer : q.correct_answer ? JSON.stringify(q.correct_answer) : '—')}</p></div>
      <Alert>{err}</Alert>{q.question_type !== 'essay' && <div className="row wrapx" style={{ margin: '12px 0' }}><Btn variant="success" icon={Check} onClick={() => setM(String(q.marks))}>صحيحة (الدرجة كاملة)</Btn><Btn variant="secondary" icon={X} onClick={() => setM('0')}>خطأ (صفر)</Btn></div>}
      <div className="grid2"><Field label={`الدرجة (من ${q.marks})`}><input type="number" step="0.5" min="0" max={q.marks} value={m} onChange={e => setM(e.target.value)} /></Field></div><Field label="ملاحظة للطالب (اختياري)"><textarea rows={2} value={fb} onChange={e => setFb(e.target.value)} /></Field>
      <Btn size="lg" onClick={save}>حفظ والتالي</Btn></div></>
}
