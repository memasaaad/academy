import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Hourglass, MinusCircle, XCircle } from 'lucide-react'
import { sb } from '../lib/supabase'
import { Alert, Badge, Btn, EmptyState, ErrorState, PageSkeleton, friendly, grade, nf, pct, useAsync } from '../components/ui'
const arr = v => Array.isArray(v) ? v : v == null || v === '' ? [] : [v]
export default function Review() {
  const { id } = useParams(), nav = useNavigate(), [wo, setWo] = useState(false)
  const { data: d, loading, error, reload } = useAsync(async () => { const { data, error } = await sb.rpc('get_attempt_review', { p_attempt: id }); if (error) throw error; return data }, [id])
  if (loading) return <div className="page narrow"><PageSkeleton /></div>
  if (error) return <div className="page narrow"><ErrorState text={friendly(error)} onRetry={reload} /></div>
  const a = d.attempt, p = pct(a.score, a.max_score), st = it => it.pending ? 'pending' : it.is_correct || (it.earned >= it.marks && it.marks > 0) ? 'ok' : it.earned > 0 ? 'part' : 'bad'
  const meta = { ok: ['صحيح', 'success', CheckCircle2], bad: ['خطأ', 'danger', XCircle], part: ['جزئي', 'warning', MinusCircle], pending: ['بانتظار المراجعة', 'warning', Hourglass] }
  const items = d.items.map((it, n) => ({ ...it, n })).filter(it => !wo || ['bad', 'part'].includes(st(it)))
  return <div className="page narrow"><Btn variant="ghost" size="sm" icon={ArrowRight} onClick={() => nav(-1)}>رجوع</Btn>
    <div className="card" style={{ marginTop: 8 }}><div className="row between wrapx"><div><h1 style={{ fontSize: '1.25rem' }}>{d.title}</h1><p className="muted small">{d.student}</p></div><div style={{ textAlign: 'end' }}><b style={{ fontSize: '1.6rem' }}>{nf(a.score)} / {nf(a.max_score)}</b><div><Badge tone={p >= 50 ? 'success' : 'danger'}>{p}% · {grade(p)}</Badge></div></div></div>
      <div className="row wrapx" style={{ marginTop: 14 }}><Badge tone="success" icon={CheckCircle2}>{a.correct_count} صحيحة</Badge><Badge tone="danger" icon={XCircle}>{a.wrong_count} خطأ</Badge>{a.pending_count > 0 && <Badge tone="warning" icon={Hourglass}>{a.pending_count} بانتظار المدرس</Badge>}</div>
      <label className="check" style={{ marginTop: 14 }}><input type="checkbox" checked={wo} onChange={e => setWo(e.target.checked)} />عرض الأسئلة التي أخطأت فيها فقط</label></div>
    {!items.length && <EmptyState icon={CheckCircle2} title="لا توجد أخطاء" text="أجبت عن كل الأسئلة بشكل صحيح." />}
    {items.map(it => { const s = st(it), [lb, tone, I] = meta[s], mine = arr(it.answer), hasOpt = it.options.length > 0
      return <article key={it.id} className={'card rv ' + s}><div className="row between"><b>السؤال {String(it.n + 1).padStart(2, '0')}</b><div className="row"><Badge tone={tone} icon={I}>{lb}</Badge><span className="small muted">{s === 'pending' ? `من ${nf(it.marks)}` : `${nf(it.earned ?? 0)} / ${nf(it.marks)}`}</span></div></div>
        {it.context && <p className="ctx" style={{ marginTop: 10 }}>{it.context}</p>}<p style={{ fontSize: '1.08rem', fontWeight: 600, margin: '10px 0' }}>{it.text}</p>{it.code && <pre className="code">{it.code}</pre>}{it.image && <img className="qimg" src={it.image} alt="" />}
        {hasOpt ? it.options.map(o => { const ch = mine.includes(o.key); return <div key={o.key} className={'ropt' + (o.correct ? ' c' : '') + (ch && !o.correct ? ' w' : '')}><span>{o.text}</span><span className="tg">{ch && o.correct ? 'إجابتك · صحيحة' : ch ? 'إجابتك' : o.correct ? 'الإجابة الصحيحة' : ''}</span></div> })
          : <div className="ans"><b>إجابتك</b><p>{mine.join('، ') || 'لم تجب عن هذا السؤال'}</p></div>}
        {!it.pending && !hasOpt && (it.correct_answer || it.model_answer) && <div className="ans good"><b>الإجابة الصحيحة</b><p>{it.model_answer || String(it.correct_answer).replaceAll('|', ' أو ')}</p></div>}
        {it.explanation && <div className="ans"><b>التفسير</b><p>{it.explanation}</p></div>}{it.feedback && <div className="ans note"><b>ملاحظة المدرس</b><p>{it.feedback}</p></div>}</article> })}</div>
}
