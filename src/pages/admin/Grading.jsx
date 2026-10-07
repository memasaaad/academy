import { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
export default function Grading() {
  const [items, setItems] = useState(null), [asg, setAsg] = useState(''), [list, setList] = useState([]), [m, setM] = useState(''), [fb, setFb] = useState(''), [err, setErr] = useState('')
  const load = async () => {
    const { data } = await sb.from('student_answers').select('id,answer,questions(question_text,model_answer,marks,question_type,correct_answer,question_options(key,text,is_correct)),attempts!inner(status,assignment_id,assignments(title),profiles(full_name)),essay_reviews(id)').eq('attempts.status', 'submitted').is('auto_marks', null)
    const d = (data || []).filter(x => !x.essay_reviews); setItems(d); setList([...new Map(d.map(x => [x.attempts.assignment_id, x.attempts.assignments.title])).entries()]) }
  useEffect(() => { load() }, [])
  if (!items) return <div className="center">جارٍ التحميل…</div>
  const q = items.filter(x => !asg || x.attempts.assignment_id === asg), cur = q[0]
  const save = async () => {
    const max = cur.questions.marks; if (m === '' || +m < 0 || +m > max) return setErr(`الدرجة بين 0 و ${max}`)
    const { error } = await sb.rpc('save_review', { p_answer: cur.id, p_marks: +m, p_feedback: fb || null }); if (error) return setErr(error.message)
    setErr(''); setM(''); setFb(''); setItems(items.filter(x => x.id !== cur.id))
  }
  const optTxt = (qq, v) => { const ks = Array.isArray(v) ? v : v != null ? [v] : []; return ks.map(k => qq.question_options.find(o => o.key === k)?.text ?? k).join('، ') }
  const correctTxt = qq => qq.question_options.filter(o => o.is_correct).map(o => o.text).join('، ')
  const show = v => Array.isArray(v) ? v.join('، ') : typeof v === 'object' && v ? JSON.stringify(v) : v
  return <div><select value={asg} onChange={e => setAsg(e.target.value)}><option value="">كل الواجبات</option>{list.map(([id, t]) => <option key={id} value={id}>{t}</option>)}</select>
    <p className="muted">متبقٍ للتصحيح: {q.length}</p>
    {!cur ? <div className="card">🎉 لا توجد إجابات تنتظر التصحيح</div> : <div className="card editor">
      <p><b>{cur.attempts.profiles?.full_name}</b> — {cur.attempts.assignments.title}</p>
      <h3>{cur.questions.question_text}</h3>
      <div className="ansbox"><b>إجابة الطالب</b><p>{(cur.questions.question_options.length ? optTxt(cur.questions, cur.answer) : show(cur.answer)) || <span className="muted">(لم يجب)</span>}</p></div>
      <div className="ansbox model"><b>الإجابة النموذجية</b><p>{cur.questions.model_answer || correctTxt(cur.questions) || show(cur.questions.correct_answer) || '—'}</p></div>
      {cur.questions.question_type !== 'essay' && <div className="bar"><button className="btn sm ok" onClick={() => setM(String(cur.questions.marks))}>✓ صحيحة (كامل الدرجة)</button><button className="btn sm ghost" onClick={() => setM('0')}>✗ خطأ (صفر)</button></div>}
      <label>الدرجة (من {cur.questions.marks})<input type="number" step="0.5" value={m} onChange={e => setM(e.target.value)} /></label>
      <label>ملاحظة للطالب<textarea rows={2} value={fb} onChange={e => setFb(e.target.value)} /></label>
      {err && <p className="err">{err}</p>}<button className="btn" onClick={save}>حفظ والطالب التالي</button></div>}</div>
}
