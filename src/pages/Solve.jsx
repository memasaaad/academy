import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, Clock, Flag, Trophy, XCircle } from 'lucide-react'
import { sb } from '../lib/supabase'
import { Alert, Badge, Btn, ErrorState, IconBtn, Modal, Progress, Skeleton, fdt, friendly, grade, nf, pct, useUi } from '../components/ui'
const hms = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(s % 60).padStart(2, '0')}` }
export default function Solve() {
  const { id } = useParams(), nav = useNavigate(), { toast } = useUi()
  const [meta, setMeta] = useState({ title: '', auto: true, ends: null, lesson: '' }), [att, setAtt] = useState(null), [qs, setQs] = useState([]), [ans, setAns] = useState({}), [i, setI] = useState(0)
  const [err, setErr] = useState(''), [confirm, setConfirm] = useState(false), [res, setRes] = useState(null), [sum, setSum] = useState({ unans: 0 }), [saved, setSaved] = useState(''), [busy, setBusy] = useState(false), [flags, setFlags] = useState({}), [now, setNow] = useState(Date.now()), [t0, setT0] = useState(Date.now())
  const dirty = useRef(new Set()), ansRef = useRef({}), timer = useRef(), lk = a => `ans:${a}`
  const load = async () => {
    setErr('')
    const { data: m } = await sb.from('assignments').select('title,auto_grade,ends_at,lessons(title)').eq('id', id).single(); if (m) setMeta({ title: m.title, auto: m.auto_grade, ends: m.ends_at, lesson: m.lessons?.title || '' })
    const { data: a, error } = await sb.rpc('start_attempt', { p_assignment: id }); if (error) return setErr(friendly(error))
    const [{ data: q }, { data: sa }, { data: at }] = await Promise.all([sb.rpc('get_attempt_questions', { p_attempt: a }), sb.from('student_answers').select('question_id,answer').eq('attempt_id', a), sb.from('attempts').select('started_at').eq('id', a).single()])
    const mm = {}; (sa || []).forEach(r => { if (r.answer != null) mm[r.question_id] = r.answer })
    try { const l = JSON.parse(localStorage.getItem(lk(a)) || '{}'); Object.keys(l).forEach(k => { if (JSON.stringify(mm[k]) !== JSON.stringify(l[k])) { mm[k] = l[k]; dirty.current.add(k) } }); setFlags(JSON.parse(localStorage.getItem('flag:' + a) || '{}')) } catch {}
    if (at) setT0(new Date(at.started_at).getTime())
    ansRef.current = mm; setAns(mm); setQs(q || []); setAtt(a); if (dirty.current.size) flush(a)
  }
  useEffect(() => { load() }, [id]); useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const flush = async (a = att) => {
    const ids = [...dirty.current]; if (!ids.length || !a) return
    const { error } = await sb.from('student_answers').upsert(ids.map(q => ({ attempt_id: a, question_id: q, answer: ansRef.current[q], updated_at: new Date().toISOString() })), { onConflict: 'attempt_id,question_id' })
    if (!error) { ids.forEach(q => dirty.current.delete(q)); setSaved('تم حفظ إجاباتك') } else setSaved('تعذر الحفظ، ستتم إعادة المحاولة')
  }
  const setA = (qid, v) => { ansRef.current = { ...ansRef.current, [qid]: v }; setAns(ansRef.current); dirty.current.add(qid); localStorage.setItem(lk(att), JSON.stringify(ansRef.current)); setSaved('جارٍ الحفظ…'); clearTimeout(timer.current); timer.current = setTimeout(() => flush(), 700) }
  useEffect(() => { const h = () => flush(); window.addEventListener('visibilitychange', h); window.addEventListener('pagehide', h); return () => { window.removeEventListener('visibilitychange', h); window.removeEventListener('pagehide', h) } })
  const flag = qid => { const f = { ...flags, [qid]: !flags[qid] }; setFlags(f); localStorage.setItem('flag:' + att, JSON.stringify(f)) }
  const submit = async () => { setBusy(true); clearTimeout(timer.current); await flush(); const { data, error } = await sb.rpc('submit_attempt', { p_attempt: att }); setBusy(false); setConfirm(false); if (error) return toast(friendly(error), 'error'); localStorage.removeItem(lk(att)); setSum({ unans: qs.filter(x => !(ansRef.current[x.id] != null && ansRef.current[x.id] !== '' && !(Array.isArray(ansRef.current[x.id]) && !ansRef.current[x.id].length))).length }); setRes(data); toast('تم تسليم الواجب') }
  if (err) return <div className="page narrow"><ErrorState text={err} /><div style={{ textAlign: 'center', marginTop: 16 }}><Btn variant="secondary" onClick={() => nav('/assignments')}>العودة إلى الواجبات</Btn></div></div>
  if (res) { const p = pct(res.score, res.max_score), mins = Math.max(1, Math.round((new Date(res.submitted_at) - new Date(res.started_at)) / 60000))
    return <div className="page narrow"><div className="card resultcard">
      {meta.auto ? <><div className="trophy"><Trophy size={40} className="i" /></div><h1>{p >= 50 ? 'أحسنت!' : 'تم التسليم'}</h1><p className="muted">{meta.title}{meta.lesson && ` · ${meta.lesson}`}</p>
        <div className="bigscore" style={{ marginBlock: 8 }}>{nf(res.score)} <span>/ {nf(res.max_score)}</span></div><div className="row" style={{ justifyContent: 'center' }}><b>{p}%</b><Badge tone={p >= 50 ? 'success' : 'danger'}>{grade(p)}</Badge></div>
        {res.pending_count > 0 && <Alert tone="warning">الدرجة أولية. {nf(res.pending_marks)} درجة بانتظار تصحيح المدرس للأسئلة المقالية.</Alert>}
        <div className="rstats"><div className="rstat"><div><span className="muted small">لم تتم الإجابة</span><b>{sum.unans}</b></div><span className="ic2" style={{ background: '#fdeedd', color: '#c2610c' }}><CircleHelp size={18} className="i" /></span></div>
          <div className="rstat"><div><span className="muted small">الإجابات الخاطئة</span><b style={{ color: 'var(--c-danger)' }}>{res.wrong_count}</b></div><span className="ic2" style={{ background: 'var(--c-danger-soft)', color: 'var(--c-danger)' }}><XCircle size={18} className="i" /></span></div>
          <div className="rstat"><div><span className="muted small">الإجابات الصحيحة</span><b>{res.correct_count}</b></div><span className="ic2" style={{ background: 'var(--c-success-soft)', color: 'var(--c-success)' }}><CheckCircle2 size={18} className="i" /></span></div></div></>
        : <><div className="trophy"><CheckCircle2 size={40} className="i" /></div><h1>تم تسليم الواجب</h1><p className="muted">{meta.title}</p><Alert tone="info">سيصحح المدرس الواجب كاملًا، وتظهر لك النتيجة الكاملة هنا بمجرد الانتهاء.</Alert></>}
      <div className="rmeta"><div><small>تاريخ التسليم</small><b>{fdt(res.submitted_at)}</b></div><div style={{ textAlign: 'end' }}><small>الوقت المستغرق</small><b>{mins} دقيقة</b></div></div>
      <div className="row" style={{ marginTop: 20, flexWrap: 'wrap' }}>{meta.auto && <Link className="btn secondary grow" to={`/review/${res.id}`}>مراجعة الإجابات</Link>}<Link className="btn grow" to="/dashboard">العودة للرئيسية</Link></div></div></div> }
  if (!qs.length) return <div className="page narrow"><Skeleton lines={6} h={20} /></div>
  const q = qs[i], v = ans[q.id], has = x => x != null && x !== '' && !(Array.isArray(x) && !x.length), done = qs.filter(x => has(ans[x.id])).length, unans = qs.length - done
  const toggle = k => { const c = Array.isArray(v) ? v : []; setA(q.id, c.includes(k) ? c.filter(x => x !== k) : [...c, k]) }
  const left = meta.ends ? (new Date(meta.ends).getTime() - now) / 1000 : null, low = left != null && left < 300
  return <div className="exam">
    <header className="examtop"><div className="in"><div className="row between"><div className="row"><IconBtn icon={ArrowRight} label="الخروج من الواجب (إجاباتك محفوظة)" onClick={() => { flush(); nav('/assignments') }} /><div><h1>{meta.title}</h1><p className="muted small">{meta.lesson}{saved && ` · ${saved}`}</p></div></div>
      <div className={'row timerbox' + (low ? ' low' : '')}><Clock size={20} className="i muted" /><div><small>{left != null ? 'الوقت المتبقي' : 'الوقت المنقضي'}</small><b>{hms(left != null ? left : (now - t0) / 1000)}</b></div></div></div>
      <div className="row" style={{ marginTop: 10 }}><div className="grow"><Progress value={((i + 1) / qs.length) * 100} /></div><span className="small muted">السؤال {i + 1} من {qs.length}</span></div></div></header>
    <div className="examgrid"><section className="qcard" aria-live="polite">
      <div className="qlabel"><span>السؤال {i + 1}{q.section && <span className="muted small"> · {q.section}</span>} <span className="muted small">· {nf(q.marks)} درجة</span></span><button className="btn ghost sm" onClick={() => flag(q.id)} aria-pressed={!!flags[q.id]}><Flag size={16} className="i" fill={flags[q.id] ? 'currentColor' : 'none'} />{flags[q.id] ? 'تمت العلامة' : 'علّم للمراجعة'}</button></div>
      {q.instruction && <p className="muted small" style={{ marginBottom: 8 }}>{q.instruction}</p>}{q.context && <p className="ctx">{q.context}</p>}
      <h2 className="qt">{q.text}</h2>{q.code && <pre className="code">{q.code}</pre>}{q.image && <img className="qimg" src={q.image} alt="" />}
      {['mcq', 'true_false', 'multi_answer'].includes(q.type) && <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="sr">الاختيارات</legend>{q.type === 'multi_answer' && <p className="muted small">يمكنك اختيار أكثر من إجابة.</p>}{q.options.map(o => { const multi = q.type === 'multi_answer', on = multi ? (v || []).includes(o.key) : v === o.key
        return <label key={o.key} className={'opt' + (on ? ' on' : '') + (multi ? ' multi' : '')}><input type={multi ? 'checkbox' : 'radio'} name={q.id} checked={!!on} onChange={() => multi ? toggle(o.key) : setA(q.id, o.key)} /><span className="k">{o.key === 'true' ? '✓' : o.key === 'false' ? '✕' : o.key}</span><span>{o.text}</span><span className="rad" aria-hidden /></label> })}</fieldset>}
      {['fill_blank', 'short_answer'].includes(q.type) && <input aria-label="إجابتك" value={v || ''} onChange={e => setA(q.id, e.target.value)} placeholder="اكتب إجابتك هنا" style={{ minHeight: 52, fontSize: '1.05rem' }} />}
      {['essay', 'code'].includes(q.type) && <textarea aria-label="إجابتك" rows={8} value={v || ''} onChange={e => setA(q.id, e.target.value)} placeholder="اكتب إجابتك هنا" dir={q.type === 'code' ? 'ltr' : 'rtl'} style={{ fontSize: '1.05rem' }} />}</section>
      <aside className="navwrap card flat" style={{ padding: 16 }}><h3 style={{ fontSize: '.95rem', marginBottom: 12 }}>متصفح الأسئلة</h3><div className="navgrid">{qs.map((x, k) => <button key={x.id} aria-label={`السؤال ${k + 1}${has(ans[x.id]) ? '، تمت الإجابة' : ''}${flags[x.id] ? '، معلّم' : ''}`} aria-current={k === i} className={k === i ? 'cur' : flags[x.id] ? 'flag' : has(ans[x.id]) ? 'done' : ''} onClick={() => setI(k)}>{String(k + 1).padStart(2, '0')}</button>)}</div>
        <div className="legend"><span><i style={{ background: 'var(--c-success)' }} />تمت الإجابة ({done})</span><span><i style={{ background: 'var(--c-primary)' }} />السؤال الحالي</span><span><i style={{ background: '#cbd5e1' }} />لم تتم الإجابة ({unans})</span><span><i style={{ background: '#d97706' }} />معلّم للمراجعة</span></div>
        <Btn variant="secondary" size="sm" className="block" style={{ marginTop: 14 }} onClick={() => setConfirm(true)}>مراجعة وتسليم</Btn></aside></div>
    <div className="examnav"><div className="in"><Btn variant="secondary" icon={ArrowRight} disabled={!i} onClick={() => setI(i - 1)}>السابق</Btn>
      {i < qs.length - 1 ? <Btn onClick={() => setI(i + 1)}>التالي<ArrowLeft size={18} className="i" /></Btn> : <Btn variant="success" icon={CheckCircle2} onClick={() => setConfirm(true)}>تسليم الواجب</Btn>}</div></div>
    {confirm && <Modal title="هل أنت متأكد من تسليم الواجب؟" onClose={() => setConfirm(false)} footer={<><Btn variant="secondary" onClick={() => setConfirm(false)}>العودة للمراجعة</Btn><Btn variant="success" disabled={busy} onClick={submit}>{busy ? 'جارٍ التسليم…' : 'تسليم الواجب'}</Btn></>}>
      <p>أجبت عن <b>{done}</b> من <b>{qs.length}</b> سؤال.</p>{unans > 0 && <Alert tone="warning">{unans} {unans === 1 ? 'سؤال لم تتم' : 'أسئلة لم تتم'} الإجابة {unans === 1 ? 'عنه' : 'عنها'}.</Alert>}{Object.values(flags).some(Boolean) && <p className="muted small">لديك أسئلة معلّمة للمراجعة.</p>}<p className="muted small">لا يمكن تعديل الإجابات بعد التسليم.</p></Modal>}</div>
}
