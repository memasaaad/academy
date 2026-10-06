import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { sb } from '../lib/supabase'
export default function Solve() {
  const { id } = useParams(), nav = useNavigate()
  const [att, setAtt] = useState(null), [qs, setQs] = useState([]), [ans, setAns] = useState({}), [i, setI] = useState(0)
  const [err, setErr] = useState(''), [confirm, setConfirm] = useState(false), [res, setRes] = useState(null), [saved, setSaved] = useState('')
  const dirty = useRef(new Set()), ansRef = useRef({}), timer = useRef()
  const lk = a => `ans:${a}`
  useEffect(() => { (async () => {
    const { data: a, error } = await sb.rpc('start_attempt', { p_assignment: id }); if (error) return setErr(error.message)
    const [{ data: q }, { data: sa }] = await Promise.all([sb.rpc('get_attempt_questions', { p_attempt: a }), sb.from('student_answers').select('question_id,answer').eq('attempt_id', a)])
    const m = {}; (sa || []).forEach(r => { if (r.answer != null) m[r.question_id] = r.answer })
    try { const l = JSON.parse(localStorage.getItem(lk(a)) || '{}'); Object.keys(l).forEach(k => { if (JSON.stringify(m[k]) !== JSON.stringify(l[k])) { m[k] = l[k]; dirty.current.add(k) } }) } catch {}
    ansRef.current = m; setAns(m); setQs(q || []); setAtt(a); if (dirty.current.size) flush(a)
  })() }, [id])
  const flush = async (a = att) => {
    const ids = [...dirty.current]; if (!ids.length || !a) return
    const rows = ids.map(q => ({ attempt_id: a, question_id: q, answer: ansRef.current[q], updated_at: new Date().toISOString() }))
    const { error } = await sb.from('student_answers').upsert(rows, { onConflict: 'attempt_id,question_id' })
    if (!error) { ids.forEach(q => dirty.current.delete(q)); setSaved('تم الحفظ ✓') } else setSaved('لم يُحفظ — سيُعاد المحاولة')
  }
  const setA = (qid, v) => {
    ansRef.current = { ...ansRef.current, [qid]: v }; setAns(ansRef.current); dirty.current.add(qid)
    localStorage.setItem(lk(att), JSON.stringify(ansRef.current)); setSaved('…'); clearTimeout(timer.current); timer.current = setTimeout(() => flush(), 700)
  }
  useEffect(() => { const h = () => flush(); window.addEventListener('visibilitychange', h); window.addEventListener('pagehide', h); return () => { window.removeEventListener('visibilitychange', h); window.removeEventListener('pagehide', h) } })
  const submit = async () => {
    clearTimeout(timer.current); await flush(); const { data, error } = await sb.rpc('submit_attempt', { p_attempt: att })
    if (error) { setConfirm(false); return setErr(error.message) } localStorage.removeItem(lk(att)); setRes(data); setConfirm(false)
  }
  if (err) return <div className="wrap"><div className="card err">{err}</div><button className="btn" onClick={() => nav('/dashboard')}>رجوع</button></div>
  if (res) return <div className="wrap"><div className="card result"><h2>✅ تم تسليم الواجب بنجاح</h2>
    <div className="big">{Math.round(res.score * 100) / 100} / {Math.round(res.max_score * 100) / 100}</div><p>الدرجة الأولية</p>
    {res.pending_count > 0 && <p className="muted">يوجد {Math.round(res.pending_marks * 100) / 100} درجة في انتظار مراجعة المدرس</p>}
    <button className="btn" onClick={() => nav('/dashboard')}>العودة لواجباتي</button></div></div>
  if (!qs.length) return <div className="center">جارٍ التحميل…</div>
  const q = qs[i], v = ans[q.id], has = x => x != null && x !== '' && !(Array.isArray(x) && !x.length), unans = qs.filter(x => !has(ans[x.id])).length
  const toggle = k => { const c = Array.isArray(v) ? v : []; setA(q.id, c.includes(k) ? c.filter(x => x !== k) : [...c, k]) }
  return <div className="solve">
    <div className="prog"><div style={{ width: `${((i + 1) / qs.length) * 100}%` }} /></div>
    <div className="meta"><b>السؤال {i + 1} من {qs.length}</b><span className="muted">{saved}</span></div>
    <div className="card q">
      {q.instruction && <p className="muted">{q.instruction}</p>}
      {q.context && <p className="ctx">{q.context}</p>}
      <h2 className="qt">{q.text}</h2>
      {q.code && <pre dir="ltr" className="code">{q.code}</pre>}
      {q.image && <img className="qimg" src={q.image} alt="" />}
      {['mcq', 'true_false', 'multi_answer'].includes(q.type) && q.options.map(o => { const multi = q.type === 'multi_answer', on = multi ? (v || []).includes(o.key) : v === o.key
        return <label key={o.key} className={'opt' + (on ? ' on' : '')}><input type={multi ? 'checkbox' : 'radio'} name={q.id} checked={!!on} onChange={() => multi ? toggle(o.key) : setA(q.id, o.key)} /><span className="k">{['true', 'false'].includes(o.key) ? '' : o.key}</span>{o.text}</label> })}
      {q.type === 'essay' && q.options?.length > 0 && <p className="muted">اكتب إجابتك مع ذكر الرموز المطلوبة.</p>}
      {['fill_blank', 'short_answer'].includes(q.type) && <input className="ans" value={v || ''} onChange={e => setA(q.id, e.target.value)} placeholder="اكتب إجابتك هنا" />}
      {['essay', 'code'].includes(q.type) && <textarea className="ans" rows={7} value={v || ''} onChange={e => setA(q.id, e.target.value)} placeholder="اكتب إجابتك هنا" dir={q.type === 'code' ? 'ltr' : 'rtl'} />}
    </div>
    <div className="nav"><button className="btn ghost" disabled={!i} onClick={() => setI(i - 1)}>السابق</button>
      {i < qs.length - 1 ? <button className="btn" onClick={() => setI(i + 1)}>التالي</button> : <button className="btn ok" onClick={() => setConfirm(true)}>تسليم الواجب</button>}</div>
    <div className="dots">{qs.map((x, k) => <button key={x.id} className={(k === i ? 'cur ' : '') + (has(ans[x.id]) ? 'ans' : '')} onClick={() => setI(k)}>{k + 1}</button>)}</div>
    <button className="link" onClick={() => setConfirm(true)}>تسليم الواجب الآن</button>
    {confirm && <div className="modal"><div className="card"><h3>تأكيد التسليم</h3><p>{unans ? `لديك ${unans} سؤال بدون إجابة.` : 'أجبت على كل الأسئلة.'} بعد التسليم لا يمكن التعديل. هل تريد المتابعة؟</p>
      <div className="nav"><button className="btn ghost" onClick={() => setConfirm(false)}>رجوع</button><button className="btn ok" onClick={submit}>نعم، سلّم</button></div></div></div>}
  </div>
}
