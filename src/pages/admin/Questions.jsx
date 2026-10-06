import { useEffect, useMemo, useRef, useState } from 'react'
import { sb } from '../../lib/supabase'
import { TYPES, validate, importQuestions, exportQuestions, download } from '../../lib/qio'
const empty = { question_type: 'mcq', question_text: '', marks: 1, active: true, options: [{ key: 'أ', text: '', is_correct: false }, { key: 'ب', text: '', is_correct: false }, { key: 'ج', text: '', is_correct: false }, { key: 'د', text: '', is_correct: false }], correct_answer: '' }
export default function Questions() {
  const [chs, setChs] = useState([]), [qs, setQs] = useState([]), [f, setF] = useState({ ch: '', ls: '', type: '', q: '', hidden: false, review: false }), [edit, setEdit] = useState(null), [msg, setMsg] = useState(''), [pct, setPct] = useState(null), file = useRef()
  const lessons = useMemo(() => chs.flatMap(c => c.lessons.map(l => ({ ...l, ch: c }))), [chs])
  const load = async () => {
    const { data: c } = await sb.from('chapters').select('*, lessons(*)').order('position'); setChs((c || []).map(x => ({ ...x, lessons: x.lessons.sort((a, b) => a.position - b.position) })))
    const { data } = await sb.from('questions').select('*, question_options(*), question_sections(title)').order('position').limit(2000); setQs(data || []) }
  useEffect(() => { load() }, [])
  const shown = qs.filter(q => (!f.ls || q.lesson_id === f.ls) && (!f.ch || lessons.find(l => l.id === q.lesson_id)?.ch.id === f.ch) && (!f.type || q.question_type === f.type) && (!f.q || q.question_text.includes(f.q)) && (!f.hidden || !q.active) && (!f.review || q.needs_review))
  const doImport = async e => {
    const file = e.target.files[0]; if (!file) return
    try { const list = JSON.parse(await file.text()); if (!Array.isArray(list)) throw new Error('الملف يجب أن يكون قائمة أسئلة')
      const errs = validate(list); if (!confirm(`سيتم استيراد ${list.length} سؤال.${errs.length ? `\nتنبيهات (${errs.length}) ستُعلّم للمراجعة:\n` + errs.slice(0, 5).join('\n') : ''}\nمتابعة؟`)) return
      setPct(0); const n = await importQuestions(list, setPct); setMsg(`تم استيراد ${n} سؤال ✓`); load() } catch (er) { setMsg('خطأ: ' + (er.message || er)) } setPct(null); e.target.value = '' }
  const patch = async (id, p) => { await sb.from('questions').update(p).eq('id', id); load() }
  const move = async q => { const t = prompt('انقل لأي درس؟ اكتب رقم:\n' + lessons.map((l, i) => `${i + 1}) ${l.title}`).join('\n')); const l = lessons[+t - 1]; if (l) patch(q.id, { lesson_id: l.id, section_id: null }) }
  return <div>
    <div className="bar"><button className="btn sm" onClick={() => setEdit({ ...empty, lesson_id: f.ls || lessons[0]?.id })}>+ سؤال جديد</button>
      <button className="btn sm ghost" onClick={() => file.current.click()}>استيراد JSON</button><input hidden type="file" accept=".json" ref={file} onChange={doImport} />
      <button className="btn sm ghost" onClick={async () => download(await exportQuestions(), 'questions-export.json')}>تصدير JSON</button></div>
    {pct != null && <div className="prog"><div style={{ width: pct + '%' }} /></div>}{msg && <p>{msg}</p>}
    <div className="filters">
      <select value={f.ch} onChange={e => setF({ ...f, ch: e.target.value, ls: '' })}><option value="">كل الفصول</option>{chs.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
      <select value={f.ls} onChange={e => setF({ ...f, ls: e.target.value })}><option value="">كل الدروس</option>{lessons.filter(l => !f.ch || l.ch.id === f.ch).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select>
      <select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="">كل الأنواع</option>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <input placeholder="بحث…" value={f.q} onChange={e => setF({ ...f, q: e.target.value })} />
      <label><input type="checkbox" checked={f.hidden} onChange={e => setF({ ...f, hidden: e.target.checked })} /> المخفية</label>
      <label><input type="checkbox" checked={f.review} onChange={e => setF({ ...f, review: e.target.checked })} /> تحتاج مراجعة</label></div>
    <p className="muted">{shown.length} سؤال</p>
    {shown.slice(0, 200).map(q => <div key={q.id} className={'card qrow' + (q.active ? '' : ' off')}>
      <div><span className="tag">{TYPES[q.question_type]}</span>{q.needs_review && <span className="tag warn">مراجعة</span>}{q.source_page && <span className="muted"> ص{q.source_page}</span>}<span className="muted"> • {q.marks} د</span>
        <p>{q.question_text}</p></div>
      <div className="acts"><button className="link" onClick={() => setEdit({ ...q, options: [...q.question_options].sort((a, b) => a.position - b.position), correct_answer: typeof q.correct_answer === 'string' ? q.correct_answer : '' })}>تعديل</button>
        <button className="link" onClick={() => patch(q.id, { active: !q.active })}>{q.active ? 'إخفاء' : 'إظهار'}</button><button className="link" onClick={() => move(q)}>نقل</button>
        <button className="link danger" onClick={async () => { if (confirm('حذف السؤال؟')) { await sb.from('questions').delete().eq('id', q.id); load() } }}>حذف</button></div></div>)}
    {shown.length > 200 && <p className="muted">يُعرض أول 200 — استخدم الفلاتر.</p>}
    {edit && <Editor q={edit} chs={chs} lessons={lessons} onClose={() => { setEdit(null); load() }} />}</div>
}
function Editor({ q: init, lessons, onClose }) {
  const [q, setQ] = useState(init), [err, setErr] = useState(''), [sec, setSec] = useState(init.question_sections?.title || ''), [busy, setBusy] = useState(false)
  const set = (k, v) => setQ(x => ({ ...x, [k]: v })), hasOpts = ['mcq', 'multi_answer'].includes(q.question_type)
  const opts = q.question_type === 'true_false' ? [{ key: 'true', text: 'صح ✓' }, { key: 'false', text: 'خطأ ×' }].map(o => ({ ...o, is_correct: (q.options.find(x => x.key === o.key)?.is_correct) || false })) : q.options
  const setOpt = (i, p) => set('options', opts.map((o, j) => j === i ? { ...o, ...p } : (p.is_correct && q.question_type !== 'multi_answer' ? { ...o, is_correct: false } : o)))
  const upload = async e => { const f = e.target.files[0]; if (!f) return; const path = `${Date.now()}-${f.name.replace(/[^\w.]/g, '_')}`; const { error } = await sb.storage.from('question-images').upload(path, f); if (error) return setErr(error.message); set('image_url', sb.storage.from('question-images').getPublicUrl(path).data.publicUrl) }
  const save = async () => {
    setErr(''); if (!q.question_text.trim()) return setErr('اكتب نص السؤال'); setBusy(true)
    let section_id = null
    if (sec.trim()) { const { data: s } = await sb.from('question_sections').select('id').eq('lesson_id', q.lesson_id).eq('title', sec.trim()).maybeSingle(); section_id = s?.id; if (!section_id) { const r = await sb.from('question_sections').insert({ lesson_id: q.lesson_id, title: sec.trim() }).select().single(); section_id = r.data?.id } }
    const o = q.question_type === 'true_false' ? opts : hasOpts ? opts.filter(x => x.text.trim()) : []
    if ((hasOpts || q.question_type === 'true_false') && !o.some(x => x.is_correct)) { setBusy(false); return setErr('حدد الإجابة الصحيحة') }
    const row = { lesson_id: q.lesson_id, section_id, question_type: q.question_type, question_text: q.question_text, context_text: q.context_text || null, code_text: q.code_text || null, group_title: q.group_title || null, group_instruction: q.group_instruction || null,
      correct_answer: o.length ? null : (q.correct_answer || null), model_answer: q.model_answer || null, explanation: q.explanation || null, marks: +q.marks || 0, source_page: q.source_page || null, image_url: q.image_url || null, active: q.active, needs_review: !!q.needs_review }
    const r = q.id ? await sb.from('questions').update(row).eq('id', q.id).select().single() : await sb.from('questions').insert(row).select().single()
    if (r.error) { setBusy(false); return setErr(r.error.message) }
    await sb.from('question_options').delete().eq('question_id', r.data.id)
    if (o.length) await sb.from('question_options').insert(o.map((x, p) => ({ question_id: r.data.id, key: x.key, text: x.text, is_correct: x.is_correct, position: p })))
    onClose()
  }
  return <div className="modal"><div className="card editor"><h3>{q.id ? 'تعديل سؤال' : 'سؤال جديد'}</h3>
    <label>الدرس<select value={q.lesson_id} onChange={e => set('lesson_id', e.target.value)}>{lessons.map(l => <option key={l.id} value={l.id}>{l.ch.title.split(':')[0]} — {l.title}</option>)}</select></label>
    <div className="grid2"><label>القسم<input value={sec} onChange={e => setSec(e.target.value)} placeholder="مثال: تدريبات الفائز" /></label>
      <label>النوع<select value={q.question_type} onChange={e => set('question_type', e.target.value)}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label></div>
    <label>نص السؤال<textarea rows={3} value={q.question_text} onChange={e => set('question_text', e.target.value)} /></label>
    {q.question_type === 'code' && <label>الكود<textarea dir="ltr" rows={4} value={q.code_text || ''} onChange={e => set('code_text', e.target.value)} /></label>}
    <label>صورة (اختياري)<input type="file" accept="image/*" onChange={upload} /></label>{q.image_url && <img className="qimg" src={q.image_url} alt="" />}
    {(hasOpts || q.question_type === 'true_false') && <div><b>الخيارات (حدد الصحيح)</b>{opts.map((o, i) => <div className="optrow" key={i}>
      <input type={q.question_type === 'multi_answer' ? 'checkbox' : 'radio'} name="c" checked={o.is_correct} onChange={e => setOpt(i, { is_correct: e.target.checked })} />
      {hasOpts ? <><input className="k" value={o.key} onChange={e => setOpt(i, { key: e.target.value })} /><input value={o.text} onChange={e => setOpt(i, { text: e.target.value })} /></> : <span>{o.text}</span>}</div>)}
      {hasOpts && <button type="button" className="link" onClick={() => set('options', [...opts, { key: '', text: '', is_correct: false }])}>+ خيار</button>}</div>}
    {['fill_blank', 'short_answer'].includes(q.question_type) && <label>الإجابة الصحيحة (افصل البدائل بـ |)<input value={q.correct_answer || ''} onChange={e => set('correct_answer', e.target.value)} /></label>}
    {['essay', 'code'].includes(q.question_type) && <label>الإجابة النموذجية<textarea rows={3} value={q.model_answer || ''} onChange={e => set('model_answer', e.target.value)} /></label>}
    <div className="grid2"><label>الدرجة<input type="number" step="0.5" value={q.marks} onChange={e => set('marks', e.target.value)} /></label><label>صفحة الكتاب<input type="number" value={q.source_page || ''} onChange={e => set('source_page', e.target.value)} /></label></div>
    <label>شرح (اختياري)<input value={q.explanation || ''} onChange={e => set('explanation', e.target.value)} /></label>
    <label className="inl"><input type="checkbox" checked={q.active} onChange={e => set('active', e.target.checked)} /> ظاهر للطلاب</label>
    <label className="inl"><input type="checkbox" checked={!!q.needs_review} onChange={e => set('needs_review', e.target.checked)} /> يحتاج مراجعة</label>
    {err && <p className="err">{err}</p>}<div className="nav"><button className="btn ghost" onClick={onClose}>إلغاء</button><button className="btn" disabled={busy} onClick={save}>حفظ</button></div></div></div>
}
