import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { sb } from '../lib/supabase'
const arr = v => Array.isArray(v) ? v : v == null || v === '' ? [] : [v]
export default function Review() {
  const { id } = useParams(), nav = useNavigate(), [d, setD] = useState(null), [err, setErr] = useState(''), [wrongOnly, setWO] = useState(false)
  useEffect(() => { sb.rpc('get_attempt_review', { p_attempt: id }).then(({ data, error }) => error ? setErr(error.message) : setD(data)) }, [id])
  if (err) return <div className="wrap"><div className="card err">{err}</div><button className="btn" onClick={() => nav(-1)}>رجوع</button></div>
  if (!d) return <div className="center">جارٍ التحميل…</div>
  const a = d.attempt, st = it => it.pending ? 'pending' : (it.earned >= it.marks && it.marks > 0) || it.is_correct ? 'ok' : (it.earned > 0 ? 'part' : 'bad')
  const items = d.items.filter(it => !wrongOnly || ['bad', 'part'].includes(st(it)))
  const fmt = n => +Number(n).toFixed(2)
  return <div className="wrap"><button className="link" onClick={() => nav(-1)}>→ رجوع</button>
    <div className="card result"><h2>{d.title}</h2><p className="muted">{d.student}</p><div className="big">{fmt(a.score)} / {fmt(a.max_score)}</div>
      <p>✔ {a.correct_count} صحيحة &nbsp; ✘ {a.wrong_count} خطأ{a.pending_count > 0 && <> &nbsp; ⏳ {a.pending_count} بانتظار المدرس</>}</p>
      <label className="inl center2"><input type="checkbox" checked={wrongOnly} onChange={e => setWO(e.target.checked)} /> عرض الأخطاء فقط</label></div>
    {items.map((it, n) => { const s = st(it), mine = arr(it.answer), hasOpt = it.options.length > 0
      return <div key={it.id} className={'card rv ' + s}><div className="row"><b>السؤال {n + 1}</b><span className={'pill ' + (s === 'ok' ? 'g' : s === 'pending' ? 'y' : 'r')}>{s === 'pending' ? 'بانتظار التصحيح' : `${fmt(it.earned ?? 0)} / ${it.marks}`}</span></div>
        {it.context && <p className="ctx">{it.context}</p>}<p className="qt2">{it.text}</p>{it.code && <pre dir="ltr" className="code">{it.code}</pre>}{it.image && <img className="qimg" src={it.image} alt="" />}
        {hasOpt ? it.options.map(o => { const chosen = mine.includes(o.key); return <div key={o.key} className={'ropt' + (o.correct ? ' c' : '') + (chosen && !o.correct ? ' w' : '')}>{chosen ? '●' : '○'} {o.text}{o.correct && ' ✓'}{chosen && !o.correct && ' ✗'}</div> })
          : <><div className="ansbox"><b>إجابتك</b><p>{mine.join('، ') || '(لم تجب)'}</p></div></>}
        {!it.pending && !hasOpt && (it.correct_answer || it.model_answer) && <div className="ansbox model"><b>الإجابة الصحيحة / النموذجية</b><p>{it.model_answer || String(it.correct_answer).replaceAll('|', ' أو ')}</p></div>}
        {it.explanation && <p className="muted">💡 {it.explanation}</p>}{it.feedback && <div className="ansbox fb"><b>ملاحظة المدرس</b><p>{it.feedback}</p></div>}</div> })}
    {!items.length && <div className="card">🎉 لا توجد أخطاء</div>}</div>
}
