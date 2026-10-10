import { useState } from 'react'
import { Link } from 'react-router-dom'
import PracticeEditor from './PracticeEditor'
import { ChevronDown, ClipboardList, Dumbbell, Eye, EyeOff, Paperclip, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { Alert, Badge, Btn, EmptyState, ErrorState, Field, IconBtn, Modal, PageHeader, PageSkeleton, Progress, Segmented, friendly, useAsync, useUi } from '../../components/ui'
import { uploadWithProgress } from '../../lib/upload'
import { sizeLabel } from '../../components/Resources'
export default function Curriculum({ trackId = null }) {
  const { ask, confirm, toast } = useUi(), [open, setOpen] = useState({}), [res, setRes] = useState(null), [pr, setPr] = useState(null)
  const { data: chs, loading, error, reload } = useAsync(async () => { const run0 = sel => { let q = sb.from('chapters').select(sel).order('position'); return trackId ? q.eq('track_id', trackId) : q.is('track_id', null) }; const base = '*, lessons(*, questions(count), lesson_resources(count)'; let { data, error } = await run0(trackId ? base + ', practice_items(count))' : base + ')'); if (error && trackId) ({ data, error } = await run0(base + ')')) /* جدول التدريب غير منشأ بعد (009) */; if (error) throw error; return data.map(c => ({ ...c, lessons: c.lessons.sort((a, b) => a.position - b.position) })) }, [trackId])
  const run = async (p, ok) => { const { error } = await p; if (error) toast(friendly(error), 'error'); else { toast(ok); reload() } }
  if (loading) return <PageSkeleton />; if (error) return <ErrorState onRetry={reload} />
  return <><PageHeader title={trackId ? 'فصول المسار' : 'الفصول والدروس'} desc={trackId ? 'أضف فصول المسار، ثم أجزاء كل فصل (شرح + فيديو)، وامتحانًا على الفصل.' : 'رتّب محتوى الكتاب: الوحدات ثم الدروس.'}><Btn icon={Plus} onClick={async () => { const t = await ask('إضافة فصل', '', { label: 'عنوان الفصل' }); if (t) run(sb.from('chapters').insert({ title: t, position: chs.length + 1, track_id: trackId }), 'تمت إضافة الفصل') }}>إضافة فصل</Btn></PageHeader>
    {!chs.length && <EmptyState title="لا توجد فصول" text="ابدأ بإضافة أول فصل من الكتاب." />}
    <div className="tree">{chs.map(c => { const o = open[c.id] ?? true; return <section key={c.id} className="unit"><div className="uh" onClick={() => setOpen({ ...open, [c.id]: !o })}><ChevronDown size={18} className="i" style={{ transform: o ? '' : 'rotate(90deg)', transition: '.18s' }} /><div className="grow"><b>{c.title}</b><div className="muted small">{c.lessons.length} {trackId ? 'أجزاء' : 'دروس'}</div></div>{!c.active && <Badge>مخفي</Badge>}
      <span className="row" onClick={e => e.stopPropagation()}>{trackId && <Link className="btn secondary sm" to={`/admin/assignments?chapter=${c.id}`}><ClipboardList size={16} className="i" />امتحان الفصل</Link>}<IconBtn icon={Plus} label={trackId ? 'إضافة جزء' : 'إضافة درس'} onClick={async () => { const t = await ask(trackId ? 'إضافة جزء' : 'إضافة درس', '', { label: trackId ? 'عنوان الجزء' : 'عنوان الدرس' }); if (t) run(sb.from('lessons').insert({ chapter_id: c.id, title: t, position: c.lessons.length + 1 }), 'تمت إضافة الدرس') }} />
        <IconBtn icon={Pencil} label="تعديل الفصل" onClick={async () => { const t = await ask('تعديل الفصل', c.title); if (t) run(sb.from('chapters').update({ title: t }).eq('id', c.id), 'تم حفظ التعديل') }} />
        <IconBtn icon={c.active ? EyeOff : Eye} label={c.active ? 'إخفاء الفصل' : 'إظهار الفصل'} onClick={() => run(sb.from('chapters').update({ active: !c.active }).eq('id', c.id), c.active ? 'تم إخفاء الفصل' : 'تم إظهار الفصل')} />
        <IconBtn icon={Trash2} label="حذف الفصل" onClick={async () => { if (await confirm('حذف الفصل؟', 'سيُحذف الفصل بكل دروسه وأسئلته نهائيًا.')) run(sb.from('chapters').delete().eq('id', c.id), 'تم حذف الفصل') }} /></span></div>
      {o && c.lessons.map(l => <div key={l.id} className="lrow"><div className="grow"><span>{l.title}</span> <span className="muted small">· {l.questions?.[0]?.count ?? 0} سؤال {l.source_page ? `· ص ${l.source_page}` : ''}</span></div><Btn size="sm" variant="secondary" icon={Paperclip} onClick={() => setRes(l)}>الشرح ({l.lesson_resources?.[0]?.count ?? 0})</Btn>{trackId && <Btn size="sm" variant="secondary" icon={Dumbbell} onClick={() => setPr(l)}>تدريب ({l.practice_items?.[0]?.count ?? 0})</Btn>}{!l.active && <Badge>مخفي</Badge>}
        <IconBtn icon={Pencil} label="تعديل الدرس" onClick={async () => { const t = await ask('تعديل الدرس', l.title); if (t) run(sb.from('lessons').update({ title: t }).eq('id', l.id), 'تم حفظ التعديل') }} />
        <IconBtn icon={l.active ? EyeOff : Eye} label={l.active ? 'إخفاء الدرس' : 'إظهار الدرس'} onClick={() => run(sb.from('lessons').update({ active: !l.active }).eq('id', l.id), 'تم التحديث')} />
        <IconBtn icon={Trash2} label="حذف الدرس" onClick={async () => { if (await confirm('حذف الدرس؟', 'ستُحذف كل أسئلة الدرس نهائيًا.')) run(sb.from('lessons').delete().eq('id', l.id), 'تم حذف الدرس') }} /></div>)}</section> })}</div>{res && <ResourcesModal lesson={res} onClose={() => { setRes(null); reload() }} />}{pr && <PracticeEditor lesson={pr} onClose={() => { setPr(null); reload() }} />}</>
}

export function ResourcesModal({ lesson, onClose }) {
  const { toast, confirm } = useUi(), [mode, setMode] = useState('file'), [title, setTitle] = useState(''), [url, setUrl] = useState(''), [file, setFile] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [prog, setProg] = useState(null)
  const { data, reload } = useAsync(async () => (await sb.from('lesson_resources').select('*').eq('lesson_id', lesson.id).order('position')).data || [], [lesson.id])
  const add = async () => {
    setErr(''); if (!title.trim()) return setErr('اكتب عنوانًا للملف.'); setBusy(true)
    try {
      let row = { lesson_id: lesson.id, title: title.trim(), position: (data?.length || 0) + 1 }
      if (mode === 'file') {
        if (!file) throw new Error('اختر ملفًا أولًا.'); const ext = (file.name.split('.').pop() || 'bin').replace(/\W/g, ''), path = `${lesson.id}/${Date.now()}.${ext}`
        setProg(0); await uploadWithProgress('lesson-files', path, file, setProg)
        row = { ...row, kind: file.type.startsWith('video/') ? 'video' : 'file', file_path: path, mime: file.type, size_bytes: file.size }
      } else { if (!/^https?:\/\//i.test(url.trim())) throw new Error('اكتب رابطًا صحيحًا يبدأ بـ https://'); row = { ...row, kind: /youtu|vimeo|drive\.google/i.test(url) ? 'video' : 'link', url: url.trim() } }
      const { error } = await sb.from('lesson_resources').insert(row); if (error) throw error
      toast('تمت إضافة ملف الشرح'); setTitle(''); setUrl(''); setFile(null); reload()
    } catch (e) { setErr(/exceeded|too large|413/i.test(e.message || '') ? 'حجم الملف أكبر من المسموح في خطتك على Supabase. للفيديوهات الكبيرة ارفعها على يوتيوب (غير مدرج) وضع الرابط هنا.' : friendly(e)) }
    setBusy(false); setProg(null)
  }
  return <Modal wide title={`ملفات شرح: ${lesson.title}`} desc="ارفع فيديو أو ملف شرح (PDF / Word / PowerPoint) أو ضع رابط فيديو. يراها الطلاب المفعّلون داخل الدرس." onClose={onClose}>
    <NotesEditor lesson={lesson} />
    {data?.length ? data.map(r => <div key={r.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--c-border)' }}><div className="grow"><b>{r.title}</b><div className="muted small"><Badge tone="primary">{r.kind === 'video' ? 'فيديو' : r.kind === 'file' ? 'ملف' : 'رابط'}</Badge> {sizeLabel(r.size_bytes)} {!r.active && <Badge>مخفي</Badge>}</div></div>
      <IconBtn icon={r.active ? EyeOff : Eye} label={r.active ? 'إخفاء' : 'إظهار'} onClick={async () => { await sb.from('lesson_resources').update({ active: !r.active }).eq('id', r.id); reload() }} />
      <IconBtn icon={Trash2} label="حذف" onClick={async () => { if (await confirm('حذف هذا الملف؟', r.title)) { if (r.file_path) await sb.storage.from('lesson-files').remove([r.file_path]); await sb.from('lesson_resources').delete().eq('id', r.id); toast('تم الحذف'); reload() } }} /></div>) : <p className="muted small" style={{ padding: '8px 0' }}>لا توجد ملفات شرح لهذا الدرس بعد.</p>}
    <div className="card flat" style={{ marginTop: 16 }}><h3>إضافة ملف شرح</h3><Segmented value={mode} onChange={setMode} items={[['file', 'رفع ملف أو فيديو'], ['link', 'رابط فيديو / ملف']]} /><Alert>{err}</Alert>
      <Field label="العنوان"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: شرح الدرس الأول" /></Field>
      {mode === 'file' ? <Field label="الملف" hint="فيديو (MP4) أو PDF أو Word أو PowerPoint. الحد الأقصى يعتمد على خطة Supabase (غالبًا 50MB)."><input type="file" accept="video/*,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*" onChange={e => setFile(e.target.files[0] || null)} /></Field>
        : <Field label="الرابط" hint="يوتيوب (غير مدرج) أو Google Drive أو Vimeo يظهر مشغّلًا داخل الموقع. أي رابط آخر يُفتح في صفحة جديدة."><input dir="ltr" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" /></Field>}
      <Btn icon={Upload} disabled={busy} onClick={add}>{busy ? (prog != null ? `جارٍ الرفع ${prog}%` : 'جارٍ الحفظ…') : 'إضافة'}</Btn>{busy && prog != null && <div style={{ marginTop: 10 }}><Progress value={prog} /></div>}</div></Modal>
}

function NotesEditor({ lesson }) {
  const { toast } = useUi(), [v, setV] = useState(null), [busy, setBusy] = useState(false)
  useAsync(async () => { const { data } = await sb.from('lesson_notes').select('body').eq('lesson_id', lesson.id).maybeSingle(); setV(data?.body || ''); return 1 }, [lesson.id])
  const save = async () => { setBusy(true); const { error } = await sb.from('lesson_notes').upsert({ lesson_id: lesson.id, body: v, updated_at: new Date().toISOString() }); setBusy(false); error ? toast(friendly(error), 'error') : toast('تم حفظ الشرح المكتوب') }
  return <div className="card flat"><h3>الشرح المكتوب</h3><Field label="النص" hint="للكود اكتب ``` قبله وبعده ليظهر للطالب داخل صندوق كود."><textarea rows={8} value={v ?? ''} disabled={v == null} onChange={e => setV(e.target.value)} dir="auto" /></Field><Btn disabled={busy || v == null} onClick={save}>حفظ الشرح المكتوب</Btn></div>
}
