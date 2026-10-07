import { sb } from './supabase'
export const TYPES = { mcq: 'اختيار من متعدد', true_false: 'صح أو خطأ', fill_blank: 'أكمل', short_answer: 'إجابة قصيرة', essay: 'مقالي', multi_answer: 'أكثر من إجابة', code: 'كود برمجي' }
const key = s => String(s || '').split(':')[0].trim()
export function validate(list) {
  const errs = []
  list.forEach((q, i) => {
    if (!q.chapter || !q.lesson) errs.push(`#${i + 1}: فصل/درس ناقص`)
    if (!TYPES[q.question_type]) errs.push(`#${i + 1}: نوع غير معروف (${q.question_type})`)
    if (!q.question_text) errs.push(`#${i + 1}: نص السؤال ناقص`)
    if (!['essay', 'code'].includes(q.question_type) && (q.correct_answer == null || q.correct_answer === '')) errs.push(`#${i + 1}: لا توجد إجابة (سيُعلّم للمراجعة)`)
  })
  return errs
}
export async function importQuestions(list, onProgress = () => {}, cfg = {}) {
  const { data: chs } = await sb.from('chapters').select('*'); const { data: lss } = await sb.from('lessons').select('*'); const { data: secs } = await sb.from('question_sections').select('*')
  const chapters = [...chs], lessons = [...lss], sections = [...secs]
  const rows = [], opts = {}
  for (let i = 0; i < list.length; i++) {
    const q = list[i]
    const forced = cfg.lessonId ? lessons.find(l => l.id === cfg.lessonId) : null
    let ch = forced ? chapters.find(c => c.id === forced.chapter_id) : chapters.find(c => !c.track_id && key(c.title) === key(q.chapter))
    if (!ch) { const { data } = await sb.from('chapters').insert({ title: q.chapter, position: chapters.length + 1 }).select().single(); ch = data; chapters.push(ch) }
    let ls = forced || lessons.find(l => l.chapter_id === ch.id && key(l.title) === key(q.lesson))
    if (!ls) { const { data } = await sb.from('lessons').insert({ chapter_id: ch.id, title: q.lesson, position: lessons.filter(l => l.chapter_id === ch.id).length + 1 }).select().single(); ls = data; lessons.push(ls) }
    let sc = sections.find(s => s.lesson_id === ls.id && s.title === q.section)
    if (!sc && q.section) { const { data } = await sb.from('question_sections').insert({ lesson_id: ls.id, title: q.section, position: sections.filter(s => s.lesson_id === ls.id).length + 1 }).select().single(); sc = data; sections.push(sc) }
    const ik = [forced ? ls.id : key(q.chapter), forced ? '' : key(q.lesson), q.section, q.group_title, q.number_in_group, q.question_type, q.source_page, i < 0 ? '' : (q.question_text || '').slice(0, 40)].join('|')
    const noAns = !['essay', 'code'].includes(q.question_type) && (q.correct_answer == null || q.correct_answer === '')
    rows.push({ import_key: ik, lesson_id: ls.id, section_id: sc?.id ?? null, group_title: q.group_title, group_instruction: q.group_instruction, number_in_group: q.number_in_group,
      question_type: q.question_type, context_text: q.context_text, code_text: q.code_text ?? null, question_text: q.question_text, correct_answer: q.correct_answer ?? null,
      model_answer: q.model_answer, explanation: q.explanation, marks: q.marks ?? 1, source_page: q.source_page, source_pdf_page: q.source_pdf_page, answer_source_page: q.answer_source_page,
      source_book: q.source_book, image_url: q.image ?? q.image_url ?? null, active: q.active ?? true, needs_review: !!q.needs_review || noAns, review_notes: q.review_notes, position: i })
    opts[ik] = (q.options || []).map((o, p) => ({ key: o.key, text: o.text, position: p,
      is_correct: Array.isArray(q.correct_answer) ? q.correct_answer.includes(o.key) : typeof q.correct_answer === 'string' && q.correct_answer === o.key && q.question_type !== 'essay' }))
    onProgress(Math.round(((i + 1) / list.length) * 40))
  }
  let done = 0; const ids = []
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const { data, error } = await sb.from('questions').upsert(chunk, { onConflict: 'import_key' }).select('id,import_key')
    if (error) throw error
    ids.push(...data.map(d => d.id))
    await sb.from('question_options').delete().in('question_id', data.map(d => d.id))
    const o = data.flatMap(d => (opts[d.import_key] || []).map(x => ({ ...x, question_id: d.id })))
    if (o.length) { const r = await sb.from('question_options').insert(o); if (r.error) throw r.error }
    done += chunk.length; onProgress(40 + Math.round((done / rows.length) * 60))
  }
  return { count: rows.length, ids }
}
export async function exportQuestions() {
  const { data, error } = await sb.from('questions').select('*, question_options(*), lessons(title, chapters(title)), question_sections(title)').order('position')
  if (error) throw error
  return data.map(q => ({ chapter: q.lessons?.chapters?.title, lesson: q.lessons?.title, section: q.question_sections?.title, group_title: q.group_title, group_instruction: q.group_instruction,
    number_in_group: q.number_in_group, question_type: q.question_type, context_text: q.context_text, code_text: q.code_text, question_text: q.question_text,
    options: [...q.question_options].sort((a, b) => a.position - b.position).map(o => ({ key: o.key, text: o.text })), correct_answer: q.correct_answer ?? (() => {
      const c = q.question_options.filter(o => o.is_correct).map(o => o.key); return q.question_type === 'multi_answer' ? c : c[0] ?? null })(),
    model_answer: q.model_answer, explanation: q.explanation, marks: q.marks, source_page: q.source_page, source_pdf_page: q.source_pdf_page, answer_source_page: q.answer_source_page,
    source_book: q.source_book, image: q.image_url, active: q.active, needs_review: q.needs_review, review_notes: q.review_notes }))
}
export const download = (obj, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' })); a.download = name; a.click() }
