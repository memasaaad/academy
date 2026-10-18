import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { sb } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Alert, Btn, Modal, fdt, friendly, useUi } from './ui'
// طلب إعادة التصحيح (للطالب صاحب المحاولة فقط، بعد صدور الدرجة)
export default function RegradeRequest({ a, onDone }) {
  const { session } = useAuth(), { toast } = useUi(), [open, setOpen] = useState(false), [note, setNote] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  if (!a || a.status !== 'graded' || a.student_id !== session?.user.id) return null
  if (a.regrade_requested_at) return <Alert tone="info">أرسلت طلب إعادة تصحيح في {fdt(a.regrade_requested_at)} وهو قيد المراجعة. سيصلك إشعار عند الرد.</Alert>
  const send = async () => { setBusy(true); setErr(''); const { error } = await sb.rpc('request_regrade', { p_attempt: a.id, p_note: note || null }); setBusy(false); if (error) return setErr(friendly(error)); toast('تم إرسال طلبك للمدرس'); setOpen(false); onDone?.() }
  return <><div className="row" style={{ margin: '10px 0' }}><Btn variant="secondary" size="sm" icon={RotateCcw} onClick={() => setOpen(true)}>طلب إعادة تصحيح</Btn></div>
    {open && <Modal title="طلب إعادة التصحيح" desc="اكتب سبب طلبك ليراجع المدرس درجتك." onClose={() => setOpen(false)} footer={<><Btn variant="secondary" onClick={() => setOpen(false)}>إلغاء</Btn><Btn disabled={busy} onClick={send}>{busy ? 'جارٍ الإرسال…' : 'إرسال الطلب'}</Btn></>}>
      <Alert>{err}</Alert><label className="field"><span>ملاحظتك (اختياري)</span><textarea rows={4} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="مثال: أرى أن إجابتي في السؤال 3 صحيحة" /></label></Modal>}</>
}
