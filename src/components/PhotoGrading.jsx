import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { sb } from '../lib/supabase'
import { Alert, Badge, Btn, ErrorState, Field, PageHeader, PageSkeleton, fdt, friendly, nf, useAsync, useUi } from './ui'
import PhotoAnswerView from './PhotoAnswerView'
// تصحيح واجب مُسلَّم بالصور: يرى المدرس الصور وأسئلة الواجب وإجاباتها النموذجية ثم يضع درجة إجمالية وملاحظة
export default function PhotoGrading({ id, meta, back }) {
  const { toast } = useUi(), [score, setScore] = useState(''), [fb, setFb] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const { data, loading, error, reload } = useAsync(async () => {
    const { data: t, error } = await sb.from('attempts').select('assignment_id,photo_paths,photo_note,max_score,score,status,photo_feedback,submitted_at').eq('id', id).single(); if (error) throw error
    const { data: qs } = await sb.from('assignment_questions').select('position,questions(question_text,marks,model_answer,correct_answer,question_options(key,text,is_correct))').eq('assignment_id', t.assignment_id).order('position')
    if (t.status === 'graded') { setScore(String(t.score)); setFb(t.photo_feedback || '') }
    return { t, qs: qs || [] } }, [id])
  if (loading) return <PageSkeleton />; if (error) return <ErrorState onRetry={reload} />
  const { t, qs } = data, mx = Number(t.max_score)
  const save = async () => { setErr(''); if (score === '' || +score < 0 || +score > mx) return setErr(`الدرجة يجب أن تكون بين 0 و ${nf(mx)}.`); setBusy(true); const { error } = await sb.rpc('grade_photo_attempt', { p_attempt: id, p_score: +score, p_feedback: fb || null }); setBusy(false); if (error) return setErr(friendly(error)); toast('تم حفظ الدرجة وإبلاغ الطالب'); back() }
  const ans = q => q.model_answer || q.question_options?.filter(o => o.is_correct).map(o => o.text).join('، ') || (typeof q.correct_answer === 'string' ? q.correct_answer.replaceAll('|', ' أو ') : q.correct_answer ? JSON.stringify(q.correct_answer) : '—')
  return <><Btn variant="ghost" size="sm" icon={ArrowRight} onClick={back}>رجوع إلى القائمة</Btn>
    <PageHeader title={meta?.profiles?.full_name || 'تصحيح'} desc={`${meta?.assignments?.title || ''} · حل بالصور · ${fdt(t.submitted_at)}`} />
    <div className="card"><div className="row between"><h3 style={{ margin: 0 }}>صور الحل ({t.photo_paths.length})</h3><Badge tone={t.status === 'graded' ? 'success' : 'warning'}>{t.status === 'graded' ? 'مُصحَّح' : 'بانتظار التصحيح'}</Badge></div>
      <p className="muted small">اضغط على أي صورة لتكبيرها.</p><PhotoAnswerView paths={t.photo_paths} />{t.photo_note && <div className="ans" style={{ marginTop: 12 }}><b>ملاحظة الطالب</b><p>{t.photo_note}</p></div>}</div>
    {qs.length > 0 && <details className="card"><summary style={{ cursor: 'pointer', fontWeight: 700 }}>أسئلة الواجب وإجاباتها النموذجية ({qs.length})</summary>{qs.map((x, k) => <div key={k} className="ans good" style={{ marginTop: 10 }}><b>{k + 1}. {x.questions.question_text} <span className="muted small">({nf(x.questions.marks)} درجة)</span></b><p>{ans(x.questions)}</p></div>)}</details>}
    <div className="card"><h3 style={{ marginTop: 0 }}>الدرجة النهائية</h3><Alert>{err}</Alert>
      <div className="row wrapx" style={{ marginBottom: 12 }}><Btn variant="success" size="sm" icon={Check} onClick={() => setScore(String(mx))}>الدرجة كاملة ({nf(mx)})</Btn><Btn variant="secondary" size="sm" onClick={() => setScore(String(mx / 2))}>النصف</Btn><Btn variant="secondary" size="sm" onClick={() => setScore('0')}>صفر</Btn></div>
      <div className="grid2"><Field label={`الدرجة (من ${nf(mx)})`}><input type="number" step="0.5" min="0" max={mx} value={score} onChange={e => setScore(e.target.value)} /></Field></div>
      <Field label="ملاحظة للطالب (اختياري)"><textarea rows={3} value={fb} onChange={e => setFb(e.target.value)} /></Field>
      <Btn size="lg" disabled={busy} onClick={save}>{busy ? 'جارٍ الحفظ…' : t.status === 'graded' ? 'تحديث الدرجة' : 'حفظ الدرجة وإبلاغ الطالب'}</Btn></div></>
}
