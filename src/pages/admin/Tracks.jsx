import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { Alert, Btn, EmptyState, ErrorState, Field, IconBtn, Modal, PageHeader, PageSkeleton, friendly, useAsync, useUi } from '../../components/ui'
import { THEMES, TrackArt, themeVars } from '../../components/TrackArt'
import Curriculum from './Curriculum'
import '../../components/tracks.css'
function TrackForm({ t, onClose, onSaved, count }) {
  const { toast } = useUi(), [f, setF] = useState({ title: t.title || '', subtitle: t.subtitle || '', theme: t.theme || 'violet' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const save = async () => {
    if (!f.title.trim()) return setErr('اكتب اسم المسار.'); setBusy(true)
    const row = { title: f.title.trim(), subtitle: f.subtitle.trim() || null, theme: f.theme }
    const { error } = t.id ? await sb.from('tracks').update(row).eq('id', t.id) : await sb.from('tracks').insert({ ...row, position: count + 1 })
    setBusy(false); if (error) return setErr(friendly(error)); toast(t.id ? 'تم حفظ المسار' : 'تمت إضافة المسار'); onSaved()
  }
  return <Modal title={t.id ? 'تعديل المسار' : 'إضافة مسار'} desc="المسار يظهر للطالب ككارت ملوّن (مثل JavaScript أو Python) وبداخله الفصول والأجزاء." onClose={onClose}>
    <Alert>{err}</Alert><Field label="اسم المسار"><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="مثال: JavaScript" /></Field>
    <Field label="وصف قصير (اختياري)"><input value={f.subtitle} onChange={e => setF({ ...f, subtitle: e.target.value })} placeholder="مثال: ابدأ من الصفر حتى بناء مشروع" /></Field>
    <div className="field"><span>لون الكارت</span><div className="row wrapx">{Object.entries(THEMES).map(([k, [a, b, n]]) => <button key={k} type="button" title={n} aria-label={n} aria-pressed={f.theme === k} onClick={() => setF({ ...f, theme: k })} style={{ width: 54, height: 54, borderRadius: 14, border: f.theme === k ? '3px solid var(--c-text)' : '3px solid transparent', background: `linear-gradient(160deg,${a},${b})`, cursor: 'pointer' }} />)}</div></div>
    <div className="row" style={{ marginTop: 12 }}><Btn disabled={busy} onClick={save}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</Btn><Btn variant="secondary" onClick={onClose}>إلغاء</Btn></div></Modal>
}
export default function Tracks() {
  const { confirm, toast } = useUi(), [sp, setSp] = useSearchParams(), [form, setForm] = useState(null), sel = sp.get('t')
  const { data, loading, error, reload } = useAsync(async () => { const { data, error } = await sb.from('tracks').select('*, chapters(id, lessons(id))').order('position'); if (error) throw error; return data }, [])
  if (loading) return <PageSkeleton />; if (error) return <ErrorState onRetry={reload} />
  const cur = sel && data.find(x => x.id === sel)
  if (cur) return <><Btn variant="ghost" size="sm" icon={ArrowRight} onClick={() => setSp({})}>رجوع إلى المسارات</Btn>
    <div className="trk-banner" style={{ ...themeVars(cur.theme), marginTop: 12 }}><TrackArt /><div className="grow"><h1>{cur.title}</h1>{cur.subtitle && <p>{cur.subtitle}</p>}</div><Btn variant="secondary" icon={Pencil} onClick={() => setForm(cur)}>تعديل المسار</Btn></div>
    <Curriculum trackId={cur.id} />{form && <TrackForm t={form} count={data.length} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload() }} />}</>
  return <><PageHeader title="مسارات البرمجة" desc="كروت مسارات للطالب (JavaScript / Python …). لكل مسار فصول، ولكل فصل أجزاء وشرح وامتحان."><Btn icon={Plus} onClick={() => setForm({})}>إضافة مسار</Btn></PageHeader>
    {!data.length ? <EmptyState icon={Layers} title="لا توجد مسارات" text="أضف أول مسار، مثل JavaScript، ثم أضف له الفصول والأجزاء." action={<Btn onClick={() => setForm({})}>إضافة مسار</Btn>} />
      : <div className="trk-grid">{data.map(t => { const lc = t.chapters.reduce((n, c) => n + c.lessons.length, 0)
        return <div key={t.id}><Link to={{ search: `?t=${t.id}` }} className={'trk-card' + (t.active ? '' : ' off')} style={themeVars(t.theme)}><h3>{t.title}</h3><TrackArt /><div className="trk-foot"><div className="trk-sub">{t.subtitle}</div><div className="trk-pct">{t.chapters.length} فصول · {lc} أجزاء{!t.active && ' · مخفي'}</div></div></Link>
          <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}><IconBtn icon={Pencil} label="تعديل" onClick={() => setForm(t)} />
            <IconBtn icon={t.active ? EyeOff : Eye} label={t.active ? 'إخفاء المسار' : 'إظهار المسار'} onClick={async () => { const { error } = await sb.from('tracks').update({ active: !t.active }).eq('id', t.id); error ? toast(friendly(error), 'error') : (toast(t.active ? 'تم إخفاء المسار' : 'تم إظهار المسار'), reload()) }} />
            <IconBtn icon={Trash2} label="حذف المسار" onClick={async () => { if (await confirm('حذف المسار؟', 'سيُحذف المسار بكل فصوله وأجزائه وأسئلته نهائيًا.')) { const { error } = await sb.from('tracks').delete().eq('id', t.id); error ? toast(friendly(error), 'error') : (toast('تم حذف المسار'), reload()) } }} /></div></div> })}</div>}
    {form && <TrackForm t={form} count={data.length} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload() }} />}</>
}
