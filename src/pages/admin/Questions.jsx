import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, Eye, EyeOff, FileUp, Pencil, Plus, Trash2, FileQuestion, MoveRight } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { TYPES } from '../../lib/qio'
import { Alert, Badge, Btn, EmptyState, ErrorState, Field, IconBtn, Modal, PageHeader, PageSkeleton, Pager, SearchInput, friendly, usePager, useAsync, useUi } from '../../components/ui'
const empty = { question_type: 'mcq', question_text: '', marks: 1, active: true, options: ['أ', 'ب', 'ج', 'د'].map(k => ({ key: k, text: '', is_correct: false })), correct_answer: '' }
export default function Questions() {
  const { confirm, toast } = useUi(), [sp] = useSearchParams(), [f, setF] = useState({ ch: '', ls: '', type: '', q: sp.get('q') || '', hidden: false, review: false }), [edit, setEdit] = useState(null), [sel, setSel] = useState(new Set()), [open, setOpen] = useState(null), [moving, setMoving] = useState(false)
  const { data, loading, error, reload } = useAsync(async () => {
    const [c, q] = await Promise.all([sb.from('chapters').select('*, lessons(*)').order('position'), sb.from('questions').select('*, question_options(*), question_sections(title)').order('position').limit(3000)])
    if (c.error || q.error) throw c.error || q.error
    const chs = c.data.map(x => ({ ...x, lessons: x.lessons.sort((a, b) => a.position - b.position) })); return { chs, qs: q.data, lessons: chs.flatMap(x => x.lessons.map(l => ({ ...l, ch: x }))) } }, [])
  const shown = useMemo(() => data ? data.qs.filter(q => (!f.ls || q.lesson_id === f.ls) && (!f.ch || data.lessons.find(l => l.id === q.lesson_id)?.ch.id === f.ch) && (!f.type || q.question_type === f.type) && (!f.q || q.question_text.includes(f.q)) && (!f.hidden || !q.active) && (!f.review || q.needs_review)) : [], [data, f])
  const pg = usePager(shown, 15)
  if (loading) return <PageSkeleton />; if (error) return <ErrorState onRetry={reload} />
  const ids = [...sel], lessonOf = id => data.lessons.find(l => l.id === id)
  const bulk = async (patch, msg) => { const { error } = await sb.from('questions').update(patch).in('id', ids); error ? toast(friendly(error), 'error') : (toast(msg), setSel(new Set()), reload()) }
  const tog = id => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  return <><PageHeader title="بنك الأسئلة" desc={`${data.qs.length} سؤال في ${data.lessons.length} درسًا`}><Link className="btn secondary" to="/admin/import"><FileUp size={18} className="i" />استيراد / تصدير</Link><Btn icon={Plus} onClick={() => setEdit({ ...empty, lesson_id: f.ls || data.lessons[0]?.id })}>سؤال جديد</Btn></PageHeader>
    <div className="filterbar"><SearchInput value={f.q} onChange={v => setF({ ...f, q: v })} placeholder="ابحث في نص السؤال" />
      <select aria-label="الفصل" value={f.ch} onChange={e => setF({ ...f, ch: e.target.value, ls: '' })}><option value="">كل الفصول</option>{data.chs.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
      <select aria-label="الدرس" value={f.ls} onChange={e => setF({ ...f, ls: e.target.value })}><option value="">كل الدروس</option>{data.lessons.filter(l => !f.ch || l.ch.id === f.ch).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select>
      <select aria-label="النوع" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="">كل الأنواع</option>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
    <div className="row wrapx" style={{ marginBottom: 12 }}><label className="check"><input type="checkbox" checked={f.hidden} onChange={e => setF({ ...f, hidden: e.target.checked })} />المخفية فقط</label><label className="check"><input type="checkbox" checked={f.review} onChange={e => setF({ ...f, review: e.target.checked })} />تحتاج مراجعة فقط</label>
      <label className="check" style={{ marginInlineStart: 'auto' }}><input type="checkbox" checked={pg.slice.length > 0 && pg.slice.every(q => sel.has(q.id))} onChange={e => setSel(s => { const n = new Set(s); pg.slice.forEach(q => e.target.checked ? n.add(q.id) : n.delete(q.id)); return n })} />تحديد الصفحة</label></div>
    {!shown.length ? <EmptyState icon={FileQuestion} title="لا توجد أسئلة مطابقة" text="غيّر الفلاتر أو أضف سؤالًا جديدًا أو استورد ملف أسئلة." action={<Btn onClick={() => setF({ ch: '', ls: '', type: '', q: '', hidden: false, review: false })}>مسح الفلاتر</Btn>} /> :
      pg.slice.map(q => { const l = lessonOf(q.lesson_id), o = open === q.id; return <article key={q.id} className={'qrow' + (q.active ? '' : ' off')}><input type="checkbox" aria-label="تحديد السؤال" checked={sel.has(q.id)} onChange={() => tog(q.id)} />
        <div className="grow"><div className="row wrapx" style={{ gap: 6, marginBottom: 6 }}><Badge tone="primary">{TYPES[q.question_type]}</Badge><Badge>{l?.title.split(':')[0]}</Badge>{q.source_page && <Badge>ص {q.source_page}</Badge>}{q.needs_review && <Badge tone="warning">تحتاج مراجعة</Badge>}{!q.active && <Badge>مخفي</Badge>}<span className="muted small">{q.marks} درجة</span></div>
          <button className="qtx" aria-expanded={o} onClick={() => setOpen(o ? null : q.id)}><span style={{ fontWeight: 600 }}>{q.question_text}</span> <ChevronDown size={15} className="i muted" style={{ verticalAlign: 'middle', transform: o ? 'rotate(180deg)' : '' }} /></button>
          {o && <div className="qprev">{[...q.question_options].sort((a, b) => a.position - b.position).map(x => <div key={x.id} className="small" style={{ color: x.is_correct ? 'var(--c-success)' : '', fontWeight: x.is_correct ? 700 : 400 }}>{x.is_correct ? '✓' : '○'} {x.key}. {x.text}</div>)}{typeof q.correct_answer === 'string' && q.correct_answer && <p className="small">الإجابة: <b>{q.correct_answer}</b></p>}{q.model_answer && <p className="small muted">نموذجية: {q.model_answer}</p>}{q.review_notes && <Alert tone="warning">{q.review_notes}</Alert>}</div>}</div>
        <div className="row acts"><IconBtn icon={Pencil} label="تعديل" onClick={() => setEdit({ ...q, options: [...q.question_options].sort((a, b) => a.position - b.position), correct_answer: typeof q.correct_answer === 'string' ? q.correct_answer : '' })} />
          <IconBtn icon={q.active ? EyeOff : Eye} label={q.active ? 'إخفاء' : 'إظهار'} onClick={async () => { await sb.from('questions').update({ active: !q.active }).eq('id', q.id); toast(q.active ? 'تم إخفاء السؤال' : 'تم إظهار السؤال'); reload() }} />
          <IconBtn icon={Trash2} label="حذف" onClick={async () => { if (await confirm('حذف السؤال؟', 'لا يمكن التراجع عن الحذف.')) { await sb.from('questions').delete().eq('id', q.id); toast('تم حذف السؤال'); reload() } }} /></div></article> })}
    <Pager pg={pg} total={shown.length} />
    {sel.size > 0 && <div className="bulkbar"><b>{sel.size} محدد</b><span style={{ flex: 1 }} /><Btn size="sm" variant="secondary" icon={EyeOff} onClick={() => bulk({ active: false }, 'تم إخفاء الأسئلة')}>إخفاء</Btn><Btn size="sm" variant="secondary" icon={Eye} onClick={() => bulk({ active: true }, 'تم إظهار الأسئلة')}>إظهار</Btn><Btn size="sm" variant="secondary" icon={MoveRight} onClick={() => setMoving(true)}>نقل</Btn>
      <Btn size="sm" variant="danger" icon={Trash2} onClick={async () => { if (await confirm(`حذف ${sel.size} سؤال؟`, 'لا يمكن التراجع عن الحذف.')) { const { error } = await sb.from('questions').delete().in('id', ids); error ? toast(friendly(error), 'error') : (toast('تم الحذف'), setSel(new Set()), reload()) } }}>حذف</Btn><Btn size="sm" variant="ghost" style={{ color: '#fff' }} onClick={() => setSel(new Set())}>إلغاء التحديد</Btn></div>}
    {moving && <MoveModal lessons={data.lessons} onClose={() => setMoving(false)} onMove={async id => { setMoving(false); await bulk({ lesson_id: id, section_id: null }, 'تم نقل الأسئلة') }} />}
    {edit && <Editor q={edit} lessons={data.lessons} onClose={saved => { setEdit(null); if (saved) { toast('تم حفظ السؤال'); reload() } }} />}</>
}
function MoveModal({ lessons, onClose, onMove }) {
  const [v, setV] = useState(lessons[0]?.id)
  return <Modal title="نقل الأسئلة إلى درس" onClose={onClose} footer={<><Btn variant="secondary" onClick={onClose}>إلغاء</Btn><Btn onClick={() => onMove(v)}>نقل</Btn></>}><Field label="الدرس الجديد"><select value={v} onChange={e => setV(e.target.value)}>{lessons.map(l => <option key={l.id} value={l.id}>{l.ch.title.split(':')[0]} — {l.title}</option>)}</select></Field></Modal>
}
function Editor({ q: init, lessons, onClose }) {
  const [q, setQ] = useState(init), [err, setErr] = useState(''), [sec, setSec] = useState(init.question_sections?.title || ''), [busy, setBusy] = useState(false)
  const set = (k, v) => setQ(x => ({ ...x, [k]: v })), hasOpts = ['mcq', 'multi_answer'].includes(q.question_type), isTF = q.question_type === 'true_false'
  const opts = isTF ? [{ key: 'true', text: 'صح' }, { key: 'false', text: 'خطأ' }].map(o => ({ ...o, is_correct: !!q.options.find(x => x.key === o.key)?.is_correct })) : q.options
  const setOpt = (i, p) => set('options', opts.map((o, j) => j === i ? { ...o, ...p } : (p.is_correct && q.question_type !== 'multi_answer' ? { ...o, is_correct: false } : o)))
  const upload = async e => { const f = e.target.files[0]; if (!f) return; const path = `${Date.now()}-${f.name.replace(/[^\w.]/g, '_')}`; const { error } = await sb.storage.from('question-images').upload(path, f); if (error) return setErr(friendly(error)); set('image_url', sb.storage.from('question-images').getPublicUrl(path).data.publicUrl) }
  const save = async () => {
    setErr(''); if (!q.question_text.trim()) return setErr('اكتب نص السؤال.'); setBusy(true)
    let section_id = null
    if (sec.trim()) { const { data: s } = await sb.from('question_sections').select('id').eq('lesson_id', q.lesson_id).eq('title', sec.trim()).maybeSingle(); section_id = s?.id; if (!section_id) section_id = (await sb.from('question_sections').insert({ lesson_id: q.lesson_id, title: sec.trim() }).select().single()).data?.id }
    const o = isTF ? opts : hasOpts ? opts.filter(x => x.text.trim()) : []
    if ((hasOpts || isTF) && !o.some(x => x.is_correct)) { setBusy(false); return setErr('حدد الإجابة الصحيحة.') }
    const row = { lesson_id: q.lesson_id, section_id, question_type: q.question_type, question_text: q.question_text, context_text: q.context_text || null, code_text: q.code_text || null, group_title: q.group_title || null, group_instruction: q.group_instruction || null, correct_answer: o.length ? null : (q.correct_answer || null), model_answer: q.model_answer || null, explanation: q.explanation || null, marks: +q.marks || 0, source_page: q.source_page || null, image_url: q.image_url || null, active: q.active, needs_review: !!q.needs_review }
    const r = q.id ? await sb.from('questions').update(row).eq('id', q.id).select().single() : await sb.from('questions').insert(row).select().single()
    if (r.error) { setBusy(false); return setErr(friendly(r.error)) }
    await sb.from('question_options').delete().eq('question_id', r.data.id)
    if (o.length) await sb.from('question_options').insert(o.map((x, p) => ({ question_id: r.data.id, key: x.key, text: x.text, is_correct: x.is_correct, position: p })))
    onClose(true)
  }
  return <Modal wide title={q.id ? 'تعديل السؤال' : 'سؤال جديد'} onClose={() => onClose(false)} footer={<><Btn variant="secondary" onClick={() => onClose(false)}>إلغاء</Btn><Btn disabled={busy} onClick={save}>{busy ? 'جارٍ الحفظ…' : 'حفظ السؤال'}</Btn></>}>
    <Alert>{err}</Alert>
    <Field label="الدرس"><select value={q.lesson_id} onChange={e => set('lesson_id', e.target.value)}>{lessons.map(l => <option key={l.id} value={l.id}>{l.ch.title.split(':')[0]} — {l.title}</option>)}</select></Field>
    <div className="grid2"><Field label="القسم" hint="مثال: تدريبات الفائز"><input value={sec} onChange={e => setSec(e.target.value)} /></Field><Field label="نوع السؤال"><select value={q.question_type} onChange={e => set('question_type', e.target.value)}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field></div>
    <Field label="نص السؤال"><textarea rows={3} value={q.question_text} onChange={e => set('question_text', e.target.value)} /></Field>
    {q.question_type === 'code' && <Field label="الكود"><textarea dir="ltr" rows={4} value={q.code_text || ''} onChange={e => set('code_text', e.target.value)} /></Field>}
    <Field label="صورة للسؤال (اختياري)"><input type="file" accept="image/*" onChange={upload} /></Field>{q.image_url && <img className="qimg" style={{ maxHeight: 160 }} src={q.image_url} alt="" />}
    {(hasOpts || isTF) && <fieldset style={{ border: 0, padding: 0 }}><legend style={{ fontWeight: 600, fontSize: '.88rem' }}>الاختيارات — حدد الإجابة الصحيحة</legend>{opts.map((o, i) => <div className="optrow" key={i}><input aria-label="صحيح" type={q.question_type === 'multi_answer' ? 'checkbox' : 'radio'} name="c" checked={o.is_correct} onChange={e => setOpt(i, { is_correct: e.target.checked })} />{hasOpts ? <><input className="k" aria-label="الرمز" value={o.key} onChange={e => setOpt(i, { key: e.target.value })} /><input aria-label="نص الاختيار" value={o.text} onChange={e => setOpt(i, { text: e.target.value })} /></> : <span>{o.text}</span>}</div>)}
      {hasOpts && <Btn variant="ghost" size="sm" icon={Plus} onClick={() => set('options', [...opts, { key: '', text: '', is_correct: false }])}>إضافة اختيار</Btn>}</fieldset>}
    {['fill_blank', 'short_answer'].includes(q.question_type) && <Field label="الإجابة الصحيحة" hint="افصل الإجابات البديلة بالرمز |"><input value={q.correct_answer || ''} onChange={e => set('correct_answer', e.target.value)} /></Field>}
    {['essay', 'code'].includes(q.question_type) && <Field label="الإجابة النموذجية"><textarea rows={3} value={q.model_answer || ''} onChange={e => set('model_answer', e.target.value)} /></Field>}
    <div className="grid2"><Field label="الدرجة"><input type="number" step="0.5" value={q.marks} onChange={e => set('marks', e.target.value)} /></Field><Field label="صفحة الكتاب"><input type="number" value={q.source_page || ''} onChange={e => set('source_page', e.target.value)} /></Field></div>
    <Field label="تفسير يظهر للطالب بعد النتيجة (اختياري)"><input value={q.explanation || ''} onChange={e => set('explanation', e.target.value)} /></Field>
    <label className="check"><input type="checkbox" checked={q.active} onChange={e => set('active', e.target.checked)} />ظاهر للطلاب</label><label className="check"><input type="checkbox" checked={!!q.needs_review} onChange={e => set('needs_review', e.target.checked)} />يحتاج مراجعة</label></Modal>
}
