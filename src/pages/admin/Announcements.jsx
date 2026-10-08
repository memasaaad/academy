import { useState } from 'react'
import { Megaphone, Plus, Trash2 } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { Alert, Badge, Btn, EmptyState, ErrorState, Field, IconBtn, Modal, PageHeader, PageSkeleton, fdt, friendly, useAsync, useUi } from '../../components/ui'
import '../../components/insights.css'
const AUD = { all: 'كل الطلاب', track: 'مسار معين', chapter: 'فصل معين', lesson: 'درس / جزء معين', group: 'مجموعة معينة' }
const blank = { title: '', body: '', audience: 'all', track_id: '', chapter_id: '', lesson_id: '', group_name: '' }
export default function Announcements() {
  const { confirm, toast } = useUi(), [f, setF] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const { data, loading, error, reload } = useAsync(async () => {
    const [a, t, c, g] = await Promise.all([sb.from('announcements').select('*').order('created_at', { ascending: false }), sb.from('tracks').select('id,title').order('position'), sb.from('chapters').select('id,title,tracks(title),lessons(id,title,position)').order('position'), sb.from('profiles').select('group_name').eq('role', 'student').not('group_name', 'is', null)])
    if (a.error) throw a.error
    return { list: a.data || [], tracks: t.data || [], chs: c.data || [], groups: [...new Set((g.data || []).map(x => x.group_name))] } }, [])
  if (loading) return <PageSkeleton />; if (error) return <ErrorState onRetry={reload} />
  const target = a => a.audience === 'track' ? data.tracks.find(x => x.id === a.track_id)?.title : a.audience === 'chapter' ? data.chs.find(x => x.id === a.chapter_id)?.title : a.audience === 'lesson' ? data.chs.flatMap(c => c.lessons).find(x => x.id === a.lesson_id)?.title : a.audience === 'group' ? a.group_name : ''
  const ok = f && f.title.trim() && (f.audience === 'all' || (f.audience === 'group' ? f.group_name.trim() : f[f.audience + '_id']))
  const save = async () => { setBusy(true); setErr(''); const row = { title: f.title.trim(), body: f.body.trim() || null, audience: f.audience, track_id: f.audience === 'track' ? f.track_id : null, chapter_id: f.audience === 'chapter' ? f.chapter_id : null, lesson_id: f.audience === 'lesson' ? f.lesson_id : null, group_name: f.audience === 'group' ? f.group_name.trim() : null }
    const { error } = await sb.from('announcements').insert(row); setBusy(false); if (error) return setErr(friendly(error)); toast('تم نشر الإعلان وإرسال إشعار للطلاب'); setF(null); reload() }
  return <><PageHeader title="الإعلانات" desc="انشر إعلانًا يظهر للطلاب ويصلهم كإشعار."><Btn icon={Plus} onClick={() => { setErr(''); setF({ ...blank }) }}>إعلان جديد</Btn></PageHeader>
    {!data.list.length ? <EmptyState icon={Megaphone} title="لا توجد إعلانات" text="مثال: «امتحان الفصل الثالث متاح الآن». اختر من يراه: الكل أو مسار أو فصل أو درس أو مجموعة." action={<Btn onClick={() => setF({ ...blank })}>إعلان جديد</Btn>} />
      : data.list.map(a => <article key={a.id} className="ann"><span className="ai" aria-hidden="true"><Megaphone size={20} className="i" style={{ color: 'var(--c-primary)' }} /></span><div className="grow"><div className="row wrapx"><b>{a.title}</b><Badge>{AUD[a.audience]}{target(a) ? `: ${target(a)}` : ''}</Badge></div>{a.body && <p>{a.body}</p>}<span className="muted small">{fdt(a.created_at)}</span></div>
        <IconBtn icon={Trash2} label="حذف الإعلان" onClick={async () => { if (await confirm('حذف الإعلان؟', 'سيختفي من صفحات الطلاب (الإشعارات المرسلة تبقى).')) { const { error } = await sb.from('announcements').delete().eq('id', a.id); error ? toast(friendly(error), 'error') : (toast('تم حذف الإعلان'), reload()) } }} /></article>)}
    {f && <Modal title="إعلان جديد" desc="سيصل إشعار فوري للطلاب المستهدفين." onClose={() => setF(null)} footer={<><Btn variant="secondary" onClick={() => setF(null)}>إلغاء</Btn><Btn disabled={busy || !ok} onClick={save}>{busy ? 'جارٍ النشر…' : 'نشر الإعلان'}</Btn></>}>
      <Alert>{err}</Alert><Field label="عنوان الإعلان"><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="امتحان الفصل الثالث متاح الآن" /></Field>
      <Field label="النص (اختياري)"><textarea rows={4} value={f.body} onChange={e => setF({ ...f, body: e.target.value })} /></Field>
      <Field label="لمن يظهر؟"><select value={f.audience} onChange={e => setF({ ...f, audience: e.target.value })}>{Object.entries(AUD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      {f.audience === 'track' && <Field label="المسار"><select value={f.track_id} onChange={e => setF({ ...f, track_id: e.target.value })}><option value="">اختر المسار</option>{data.tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></Field>}
      {f.audience === 'chapter' && <Field label="الفصل"><select value={f.chapter_id} onChange={e => setF({ ...f, chapter_id: e.target.value })}><option value="">اختر الفصل</option>{data.chs.map(c => <option key={c.id} value={c.id}>{c.tracks?.title ? c.tracks.title + ' › ' : ''}{c.title}</option>)}</select></Field>}
      {f.audience === 'lesson' && <Field label="الدرس / الجزء"><select value={f.lesson_id} onChange={e => setF({ ...f, lesson_id: e.target.value })}><option value="">اختر الدرس</option>{data.chs.map(c => <optgroup key={c.id} label={(c.tracks?.title ? c.tracks.title + ' › ' : '') + c.title}>{[...c.lessons].sort((a, b) => a.position - b.position).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</optgroup>)}</select></Field>}
      {f.audience === 'group' && <Field label="اسم المجموعة" hint={data.groups.length ? 'المجموعات الحالية: ' + data.groups.join('، ') : 'عيّن مجموعة لكل طالب من صفحة الطلاب أولًا.'}><input list="grp" value={f.group_name} onChange={e => setF({ ...f, group_name: e.target.value })} /><datalist id="grp">{data.groups.map(g => <option key={g} value={g} />)}</datalist></Field>}</Modal>}</>
}
