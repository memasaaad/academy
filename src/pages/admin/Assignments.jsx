import { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import { TYPES } from '../../lib/qio'
const blank = { title: '', chapter_id: '', lesson_id: '', starts_at: '', ends_at: '', is_open: true, max_attempts: 1, total_marks: '', auto_grade: true }
const loc = d => d ? new Date(new Date(d) - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : ''
export default function Assignments() {
  const [list, setList] = useState([]), [chs, setChs] = useState([]), [f, setF] = useState(null), [qs, setQs] = useState([]), [sel, setSel] = useState(new Set()), [cnt, setCnt] = useState({}), [msg, setMsg] = useState('')
  const load = async () => { setList((await sb.from('assignments').select('*, lessons(title), assignment_questions(count)').order('created_at', { ascending: false })).data || []); setChs((await sb.from('chapters').select('*, lessons(*)').order('position')).data || []) }
  useEffect(() => { load() }, [])
  useEffect(() => { if (!f?.lesson_id) return setQs([]); sb.from('questions').select('id,question_type,question_text,marks').eq('lesson_id', f.lesson_id).eq('active', true).order('position').then(({ data }) => setQs(data || [])) }, [f?.lesson_id])
  const set = (k, v) => setF(x => ({ ...x, [k]: v })), lessons = chs.find(c => c.id === f?.chapter_id)?.lessons || []
  const edit = async a => { const { data } = await sb.from('assignment_questions').select('question_id').eq('assignment_id', a.id); setSel(new Set((data || []).map(x => x.question_id))); setF({ ...a, chapter_id: a.chapter_id || '', starts_at: loc(a.starts_at), ends_at: loc(a.ends_at), total_marks: a.total_marks ?? '' }) }
  const pick = () => { const s = new Set(); Object.entries(cnt).forEach(([t, n]) => { qs.filter(q => q.question_type === t).sort(() => Math.random() - 0.5).slice(0, +n || 0).forEach(q => s.add(q.id)) }); setSel(s) }
  const tog = id => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const save = async () => {
    if (!f.title || !f.lesson_id) return setMsg('اكتب اسم الواجب واختر الدرس'); if (!sel.size) return setMsg('اختر أسئلة')
    const row = { title: f.title, chapter_id: f.chapter_id || null, lesson_id: f.lesson_id, starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null, ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null, is_open: f.is_open, max_attempts: +f.max_attempts || 1, total_marks: f.total_marks ? +f.total_marks : null, auto_grade: f.auto_grade }
    const r = f.id ? await sb.from('assignments').update(row).eq('id', f.id).select().single() : await sb.from('assignments').insert(row).select().single()
    if (r.error) return setMsg(r.error.message)
    await sb.from('assignment_questions').delete().eq('assignment_id', r.data.id)
    const { error } = await sb.from('assignment_questions').insert([...sel].map((question_id, position) => ({ assignment_id: r.data.id, question_id, position })))
    if (error) return setMsg(error.message); setF(null); setMsg(''); load()
  }
  if (f) return <div className="card editor"><h3>{f.id ? 'تعديل واجب' : 'واجب جديد'}</h3>
    <label>اسم الواجب<input value={f.title} onChange={e => set('title', e.target.value)} /></label>
    <div className="grid2"><label>الفصل<select value={f.chapter_id} onChange={e => setF({ ...f, chapter_id: e.target.value, lesson_id: '' })}><option value="">—</option>{chs.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <label>الدرس<select value={f.lesson_id} onChange={e => { setSel(new Set()); set('lesson_id', e.target.value) }}><option value="">—</option>{lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
      <label>البداية<input type="datetime-local" value={f.starts_at} onChange={e => set('starts_at', e.target.value)} /></label><label>النهاية<input type="datetime-local" value={f.ends_at} onChange={e => set('ends_at', e.target.value)} /></label>
      <label>عدد المحاولات<input type="number" min="1" value={f.max_attempts} onChange={e => set('max_attempts', e.target.value)} /></label><label>الدرجة الكلية (اتركها فارغة = مجموع الأسئلة)<input type="number" value={f.total_marks} onChange={e => set('total_marks', e.target.value)} /></label></div>
    <label className="inl"><input type="checkbox" checked={f.is_open} onChange={e => set('is_open', e.target.checked)} /> الواجب مفتوح</label>
    <label className="inl"><input type="checkbox" checked={f.auto_grade} onChange={e => set('auto_grade', e.target.checked)} /> تصحيح تلقائي للأسئلة الموضوعية (وإلا تذهب كلها للتصحيح اليدوي)</label>
    {f.lesson_id && <><h4>اختيار الأسئلة ({sel.size} من {qs.length})</h4>
      <div className="bar"><button className="btn sm ghost" onClick={() => setSel(new Set(qs.map(q => q.id)))}>كل أسئلة الدرس</button><button className="btn sm ghost" onClick={() => setSel(new Set())}>مسح</button></div>
      <p className="muted">أو حدد عددًا من كل نوع (يُختار عشوائيًا):</p>
      <div className="bar">{Object.entries(TYPES).filter(([t]) => qs.some(q => q.question_type === t)).map(([t, n]) => <label key={t}>{n} ({qs.filter(q => q.question_type === t).length}) <input className="num" type="number" min="0" value={cnt[t] || ''} onChange={e => setCnt({ ...cnt, [t]: e.target.value })} /></label>)}<button className="btn sm" onClick={pick}>تطبيق</button></div>
      <div className="pick">{qs.map(q => <label key={q.id} className="inl"><input type="checkbox" checked={sel.has(q.id)} onChange={() => tog(q.id)} /><span className="tag">{TYPES[q.question_type]}</span>{q.question_text.slice(0, 90)}</label>)}</div></>}
    {msg && <p className="err">{msg}</p>}<div className="nav"><button className="btn ghost" onClick={() => setF(null)}>إلغاء</button><button className="btn" onClick={save}>حفظ الواجب</button></div></div>
  return <div><button className="btn sm" onClick={() => { setSel(new Set()); setF(blank) }}>+ واجب جديد</button>
    {list.map(a => <div key={a.id} className="card row"><div><b>{a.title}</b><div className="muted">{a.lessons?.title} • {a.assignment_questions?.[0]?.count} سؤال • {a.is_open ? 'مفتوح' : 'مغلق'}</div></div>
      <div className="acts"><button className="link" onClick={() => edit(a)}>تعديل</button><button className="link" onClick={async () => { await sb.from('assignments').update({ is_open: !a.is_open }).eq('id', a.id); load() }}>{a.is_open ? 'إغلاق' : 'فتح'}</button>
        <button className="link danger" onClick={async () => { if (confirm('حذف الواجب ونتائجه؟')) { await sb.from('assignments').delete().eq('id', a.id); load() } }}>حذف</button></div></div>)}</div>
}
