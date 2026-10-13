import { useState } from 'react'
import { ArrowRight, Camera, CheckCircle2, ImagePlus, Loader2, X } from 'lucide-react'
import { sb } from '../lib/supabase'
import { Alert, Btn, Modal, friendly, useUi } from './ui'
import './photo.css'
// تسليم الحل كصور: يصوّر الطالب حلّه (حتى 10 صفحات) ويرسله مرة واحدة، ويصححه المدرس بدرجة إجمالية.
const MAX = 10
const compress = file => new Promise((res, rej) => {
  const img = new Image(), u = URL.createObjectURL(file)
  img.onload = () => { const k = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(b => b ? res(b) : rej(new Error('تعذر معالجة الصورة')), 'image/jpeg', .85) }
  img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('تعذر قراءة الصورة. جرّب صورة بصيغة JPG أو PNG.')) }; img.src = u
})
export default function PhotoSubmit({ attempt, uid, title, onBack, onDone }) {
  const { toast } = useUi(), [items, setItems] = useState([]), [note, setNote] = useState(''), [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false)
  const uploading = items.some(i => i.state === 'uploading'), bad = items.some(i => i.state === 'error'), ready = items.filter(i => i.state === 'done')
  const add = async e => {
    const list = [...e.target.files].slice(0, Math.max(0, MAX - items.length)); e.target.value = ''
    if (!list.length) return toast(`الحد الأقصى ${MAX} صور`, 'error')
    for (const f of list) {
      const id = Math.random().toString(36).slice(2, 10), preview = URL.createObjectURL(f)
      setItems(x => [...x, { id, preview, state: 'uploading' }])
      try {
        const blob = await compress(f), path = `${uid}/${attempt}/photo-${Date.now()}-${id}.jpg`, { error } = await sb.storage.from('answer-images').upload(path, blob, { contentType: 'image/jpeg' })
        if (error) throw error; setItems(x => x.map(i => i.id === id ? { ...i, path, state: 'done' } : i))
      } catch (er) { setItems(x => x.map(i => i.id === id ? { ...i, state: 'error' } : i)); toast(friendly(er), 'error') }
    }
  }
  const remove = it => { if (it.path) sb.storage.from('answer-images').remove([it.path]); setItems(x => x.filter(i => i.id !== it.id)) }
  const send = async () => {
    setBusy(true); const { data, error } = await sb.rpc('submit_photo_attempt', { p_attempt: attempt, p_paths: ready.map(i => i.path), p_note: note || null }); setBusy(false); setConfirm(false)
    if (error) return toast(friendly(error), 'error'); onDone(data)
  }
  return <div className="page narrow"><div className="row" style={{ marginBottom: 10 }}><Btn variant="ghost" size="sm" icon={ArrowRight} onClick={onBack}>تغيير طريقة الحل</Btn></div>
    <div className="card"><h1 style={{ fontSize: '1.3rem', margin: 0 }}>تصوير الحل ورفعه</h1><p className="muted">{title}</p>
      <ul className="ptips"><li>اكتب حلّك كاملًا على ورقة، ثم صوّر كل صفحة (حتى {MAX} صور).</li><li>اجعل الإضاءة جيدة والخط واضحًا، وصوّر الصفحة بالكامل.</li><li>رتّب الصور كما في ورقتك: ترقيم الصفحات يظهر على الصور.</li></ul>
      <div className="padd" style={{ marginTop: 14 }}>
        <label className="btn"><Camera size={18} className="i" />التقاط صورة<input className="fileinp" type="file" accept="image/*" capture="environment" disabled={items.length >= MAX} onChange={add} /></label>
        <label className="btn secondary"><ImagePlus size={18} className="i" />اختيار من المعرض<input className="fileinp" type="file" accept="image/*" multiple disabled={items.length >= MAX} onChange={add} /></label></div>
      {items.length > 0 && <div className="pgrid" aria-live="polite">{items.map((it, k) => <div key={it.id} className={'pthumb' + (it.state === 'error' ? ' err' : '')}><img src={it.preview} alt={`صفحة ${k + 1}`} /><span className="pgno">{k + 1}</span>
        {it.state === 'uploading' && <div className="ov"><Loader2 size={22} className="i spin" /></div>}{it.state === 'error' && <div className="ov">فشل الرفع<br />احذفها وأعد المحاولة</div>}
        <button type="button" className="rm" aria-label={`حذف الصفحة ${k + 1}`} onClick={() => remove(it)}><X size={16} className="i" /></button></div>)}</div>}
      <label className="field" style={{ marginTop: 12 }}><span>ملاحظة للمدرس (اختياري)</span><textarea rows={2} value={note} maxLength={500} onChange={e => setNote(e.target.value)} placeholder="مثال: السؤال 3 حللته في الصفحة الأخيرة" /></label>
      {bad && <Alert>بعض الصور لم تُرفع. احذفها وأعد المحاولة قبل الإرسال.</Alert>}
      <Btn size="lg" variant="success" icon={CheckCircle2} className="block" disabled={!ready.length || uploading || bad || busy} onClick={() => setConfirm(true)} style={{ marginTop: 12 }}>{uploading ? 'جارٍ رفع الصور…' : ready.length ? `إرسال الحل (${ready.length} ${ready.length === 1 ? 'صورة' : 'صور'})` : 'أضف صور حلّك أولًا'}</Btn></div>
    {confirm && <Modal title="إرسال الحل للمدرس؟" desc="بعد الإرسال لا يمكنك تعديل الحل أو إضافة صور." onClose={() => setConfirm(false)} footer={<><Btn variant="secondary" onClick={() => setConfirm(false)}>رجوع</Btn><Btn variant="success" disabled={busy} onClick={send}>{busy ? 'جارٍ الإرسال…' : 'إرسال الحل'}</Btn></>}><p>سيصلك إشعار عند تصحيح المدرس للواجب.</p></Modal>}</div>
}
