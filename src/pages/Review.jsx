import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Hourglass, MinusCircle, XCircle } from 'lucide-react'
import { sb } from '../lib/supabase'
import { Badge, Btn, EmptyState, ErrorState, PageSkeleton, friendly, grade, nf, pct, useAsync } from '../components/ui'
const arr = v => Array.isArray(v) ? v : v == null || v === '' ? [] : [v]
export default function Review() {
  const { id } = useParams(), nav = useNavigate(), [wo, setWo] = useState(false), [cur, setCur] = useState(0)
  const { data: d, loading, error, reload } = useAsync(async () => { const { data, error } = await sb.rpc('get_attempt_review', { p_attempt: id }); if (error) throw error; return data }, [id])
  if (loading) return <div className="page"><PageSkeleton /></div>
  if (error) return <div className="page narrow"><ErrorState text={friendly(error)} onRetry={reload} /></div>
  const a = d.attempt, p = pct(a.score, a.max_score), st = it => it.pending ? 'pending' : it.is_correct || (it.earned >= it.marks && it.marks > 0) ? 'ok' : it.earned > 0 ? 'part' : 'bad'
  const meta = { ok: ['صحيح', 'success', CheckCircle2, 'ok'], bad: ['خطأ', 'danger', XCircle, 'bad'], part: ['جزئي', 'warning', MinusCircle, 'wt'], pending: ['بانتظار المراجعة', 'warning', Hourglass, 'wt'] }
  const all = d.items.map((it, n) => ({ ...it, n })), items = all.filter(it => !wo || ['bad', 'part'].includes(st(it))), it = items[Math.min(cur, items.length - 1)]
  const s = it && st(it), [lb, tone, I] = it ? meta[s] : [], mine = it ? arr(it.answer) : [], hasOpt = it?.options.length > 0
  return <div className="page"><div className="pagehead"><div><h1>مراجعة الإجابات</h1><p>{d.title} · {d.student}</p></div><div style={{ textAlign: 'end' }}><b style={{ fontSize: '1.5rem' }}>{nf(a.score)} / {nf(a.max_score)}</b> <Badge tone={p >= 50 ? 'success' : 'danger'}>{p}% · {grade(p)}</Badge></div></div>
    {!it ? <><label className="check"><input type="checkbox" checked={wo} onChange={e => { setWo(e.target.checked); setCur(0) }} />عرض الأسئلة التي أخطأت فيها فقط</label><EmptyState icon={CheckCircle2} title="لا توجد أخطاء" text="أجبت عن كل الأسئلة بشكل صحيح." /></> :
    <div className="revgrid"><article className={'card rv ' + s} style={{ margin: 0 }}>
      <div className="row between"><h2 style={{ fontSize: '1.1rem' }}>السؤال {String(it.n + 1).padStart(2, '0')}</h2><Badge tone={tone} icon={I}>{lb}</Badge></div>
      {it.context && <p className="ctx" style={{ marginTop: 10 }}>{it.context}</p>}<p style={{ fontSize: '1.1rem', fontWeight: 600, margin: '12px 0' }}>{it.text}</p>{it.code && <pre className="code">{it.code}</pre>}{it.image && <img className="qimg" src={it.image} alt="" />}
      {hasOpt ? it.options.map(o => { const ch = mine.includes(o.key); return <div key={o.key} className={'ansrow' + (o.correct ? ' right' : ch ? ' wrong' : '')}><span className="k">{o.key === 'true' ? '✓' : o.key === 'false' ? '✕' : o.key}</span><span>{o.text}</span><span className="tg">{ch && o.correct ? 'إجابتك · صحيحة' : ch ? 'إجابتك' : o.correct ? 'الإجابة الصحيحة' : ''}</span></div> })
        : <><div className="ans"><b>إجابتك</b><p>{mine.join('، ') || 'لم تجب عن هذا السؤال'}</p></div>{!it.pending && (it.correct_answer || it.model_answer) && <div className="ans good"><b>الإجابة الصحيحة</b><p>{it.model_answer || String(it.correct_answer).replaceAll('|', ' أو ')}</p></div>}</>}
      {it.explanation && <div className="ans"><b>التفسير</b><p>{it.explanation}</p></div>}{it.feedback && <div className="ans note"><b>ملاحظة المدرس</b><p>{it.feedback}</p></div>}
      <div className="row between" style={{ marginTop: 16 }}><Btn variant="secondary" icon={ArrowRight} disabled={cur <= 0} onClick={() => setCur(cur - 1)}>السابق</Btn><span><span className="muted small">الدرجة </span><b>{s === 'pending' ? '—' : nf(it.earned ?? 0)} / {nf(it.marks)}</b></span><Btn disabled={cur >= items.length - 1} onClick={() => setCur(cur + 1)}>التالي<ArrowLeft size={18} className="i" /></Btn></div></article>
      <aside className="card revlist" style={{ margin: 0 }}><h3>الأسئلة</h3><label className="check" style={{ marginBottom: 8 }}><input type="checkbox" checked={wo} onChange={e => { setWo(e.target.checked); setCur(0) }} />الأخطاء فقط</label>
        <div className="revs">{items.map((x, k) => { const [t, , Ic, c] = meta[st(x)]; return <button key={x.id} className="revitem" aria-current={k === cur} onClick={() => setCur(k)}><span className="n">{String(x.n + 1).padStart(2, '0')}</span><span className={'st ' + c}>{t}</span><Ic size={17} className={'i ' + c} /></button> })}</div></aside></div>}
    <div style={{ marginTop: 16 }}><Btn variant="ghost" icon={ArrowRight} onClick={() => nav(-1)}>رجوع</Btn></div></div>
}
