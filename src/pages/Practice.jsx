import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Dumbbell, RefreshCw, XCircle } from 'lucide-react'
import { sb } from '../lib/supabase'
import { Alert, Btn, EmptyState, ErrorState, Progress, Skeleton, friendly, useAsync, useUi } from '../components/ui'
import '../components/insights.css'
// وضع التدريب: لا يُسجَّل شيء في المحاولات الرسمية. بعد كل سؤال: صحيح/خطأ + الشرح.
const hasAns = v => Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== ''
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[b[i], b[j]] = [b[j], b[i]] } return b }
export default function Practice() {
  const { lessonId } = useParams(), { toast } = useUi()
  const r = useAsync(async () => { const [q, l] = await Promise.all([sb.rpc('practice_questions', { p_lesson: lessonId }), sb.from('lessons').select('title,chapters(title,track_id)').eq('id', lessonId).maybeSingle()]); if (q.error) throw q.error; return { qs: q.data || [], lesson: l.data } }, [lessonId])
  const [qs, setQs] = useState(null), [i, setI] = useState(0), [ans, setAns] = useState({}), [res, setRes] = useState({}), [busy, setBusy] = useState(false), [fin, setFin] = useState(false)
  useEffect(() => { if (r.data) { setQs(shuffle(r.data.qs)); setI(0); setAns({}); setRes({}); setFin(false) } }, [r.data])
  if (r.loading || (r.data && !qs)) return <div className="page narrow"><Skeleton lines={6} h={20} /></div>; if (r.error) return <div className="page narrow"><ErrorState onRetry={r.reload} /></div>
  const lesson = r.data.lesson, back = lesson?.chapters?.track_id ? `/tracks/${lesson.chapters.track_id}` : '/learn', title = lesson?.title || 'تدريب'
  if (!qs.length) return <div className="page narrow"><EmptyState icon={Dumbbell} title="لا توجد أسئلة للتدريب" text="لم يضف المدرس أسئلة لهذا الجزء بعد." action={<Link className="btn" to={back}>رجوع</Link>} /></div>
  const q = qs[i], v = ans[q.id], got = res[q.id], multi = q.type === 'multi_answer', opts = ['mcq', 'true_false', 'multi_answer'].includes(q.type)
  const set = x => !got && setAns({ ...ans, [q.id]: x }), toggle = k => { const c = Array.isArray(v) ? v : []; set(c.includes(k) ? c.filter(x => x !== k) : [...c, k]) }
  const check = async () => { setBusy(true); const { data, error } = await sb.rpc('practice_check', { p_question: q.id, p_answer: v ?? null }); setBusy(false); if (error) return toast(friendly(error), 'error'); setRes({ ...res, [q.id]: data }) }
  const score = Object.values(res).filter(x => x.graded && x.correct).length, graded = Object.values(res).filter(x => x.graded).length
  const rightKeys = got?.graded && Array.isArray(got.answer) ? got.answer.map(x => x.key) : []
  if (fin) return <div className="page narrow"><div className="card resultcard"><div className="trophy"><Dumbbell size={40} className="i" /></div><h1>انتهى التدريب</h1><p className="muted">{title}</p><div className="bigscore" style={{ marginBlock: 8 }}>{score} <span>/ {graded}</span></div><p className="muted small">هذا التدريب لا يُحتسب في درجاتك الرسمية.</p>
    <div className="row" style={{ marginTop: 20, flexWrap: 'wrap' }}><Btn className="grow" onClick={() => { setQs(shuffle(r.data.qs)); setI(0); setAns({}); setRes({}); setFin(false) }} icon={RefreshCw}>تدرّب مرة أخرى</Btn><Link className="btn secondary grow" to={back}>رجوع للمنهج</Link></div></div></div>
  return <div className="page narrow"><div className="row between" style={{ marginBottom: 10 }}><div><Link className="muted small" to={back}>← {title}</Link><h1 style={{ fontSize: '1.3rem', margin: 0 }}>وضع التدريب</h1></div><span className="muted small">بدون درجات رسمية</span></div>
    <div className="row" style={{ marginBottom: 12 }}><div className="grow"><Progress value={((i + (got ? 1 : 0)) / qs.length) * 100} /></div><span className="small muted">{i + 1} / {qs.length}</span></div>
    <section className="qcard" aria-live="polite">{q.instruction && <p className="muted small" style={{ marginBottom: 8 }}>{q.instruction}</p>}{q.context && <p className="ctx">{q.context}</p>}<h2 className="qt">{q.text}</h2>{q.code && <pre className="code">{q.code}</pre>}{q.image && <img className="qimg" src={q.image} alt="" />}
      {opts && <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="sr">الاختيارات</legend>{multi && <p className="muted small">يمكنك اختيار أكثر من إجابة.</p>}{q.options.map(o => { const on = multi ? (v || []).includes(o.key) : v === o.key, right = got?.graded && rightKeys.includes(o.key), wrong = got?.graded && on && !rightKeys.includes(o.key)
        return <label key={o.key} className={'opt' + (on ? ' on' : '') + (multi ? ' multi' : '') + (right ? ' right' : '') + (wrong ? ' wrong' : '')}><input type={multi ? 'checkbox' : 'radio'} name={q.id} disabled={!!got} checked={!!on} onChange={() => multi ? toggle(o.key) : set(o.key)} /><span className="k">{o.key === 'true' ? '✓' : o.key === 'false' ? '✕' : o.key}</span><span>{o.text}</span></label> })}</fieldset>}
      {['fill_blank', 'short_answer'].includes(q.type) && <input aria-label="إجابتك" disabled={!!got} value={v || ''} onChange={e => set(e.target.value)} placeholder="اكتب إجابتك هنا" style={{ minHeight: 52, fontSize: '1.05rem' }} />}
      {['essay', 'code'].includes(q.type) && <textarea aria-label="إجابتك" disabled={!!got} rows={q.type === 'code' ? 8 : 5} dir={q.type === 'code' ? 'ltr' : 'auto'} value={v || ''} onChange={e => set(e.target.value)} placeholder="اكتب إجابتك هنا" style={q.type === 'code' ? { fontFamily: 'ui-monospace,Consolas,monospace' } : undefined} />}
      {got && (got.graded ? <div className={'pf ' + (got.correct ? 'ok' : 'bad')} role="status">{got.correct ? <CheckCircle2 size={24} className="i" style={{ color: 'var(--c-success)' }} /> : <XCircle size={24} className="i" style={{ color: 'var(--c-danger)' }} />}<div><h4>{got.correct ? '✅ إجابة صحيحة' : '❌ إجابة خاطئة'}</h4>
        {!got.correct && got.answer && <p><b>الإجابة الصحيحة: </b>{Array.isArray(got.answer) ? got.answer.map(x => x.text).join('، ') : got.answer}</p>}{got.explanation && <p><b>الشرح: </b>{got.explanation}</p>}</div></div>
        : <div className="pf info" role="status"><div><h4>إجابة نموذجية</h4><p>{got.model || 'سؤال مقالي: يصححه المدرس في الواجبات الرسمية.'}</p>{got.explanation && <p><b>الشرح: </b>{got.explanation}</p>}</div></div>)}</section>
    {!hasAns(v) && !got && <p className="muted small" style={{ marginTop: 10 }}>اختر أو اكتب إجابتك ثم اضغط «تحقق».</p>}
    <div className="row between" style={{ marginTop: 16 }}><Btn variant="secondary" icon={ArrowRight} disabled={!i} onClick={() => setI(i - 1)}>السابق</Btn>
      {!got ? <Btn disabled={busy || !hasAns(v)} onClick={check}>{busy ? 'جارٍ التحقق…' : 'تحقق'}</Btn> : i < qs.length - 1 ? <Btn onClick={() => setI(i + 1)}>السؤال التالي<ArrowLeft size={18} className="i" /></Btn> : <Btn variant="success" onClick={() => setFin(true)}>إنهاء التدريب</Btn>}</div></div>
}
