import { useEffect, useState } from 'react'
import { BellRing, Check, X } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { currentSub, diagnose, disablePush, enablePush, pushConfigured, pushSupported, sendTest } from '../lib/push'
import { Alert, Btn, useUi } from './ui'
// تفعيل إشعارات الموبايل: تصل حتى لو الموقع مغلق (على الآيفون يجب تثبيت الموقع على الشاشة الرئيسية أولًا)
const Row = ({ ok, children }) => <li style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '3px 0' }}>{ok ? <Check size={16} className="i" style={{ color: 'var(--c-success)' }} /> : <X size={16} className="i" style={{ color: 'var(--c-danger)' }} />}<span>{children}</span></li>
export default function PushToggle({ hideWhenOn = false }) {
  const { session } = useAuth(), { toast } = useUi(), [st, setSt] = useState('checking'), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [dg, setDg] = useState(null), [msg, setMsg] = useState('')
  useEffect(() => { (async () => { if (!pushSupported()) return setSt('unsupported'); if (Notification.permission === 'denied') return setSt('denied'); setSt((await currentSub()) ? 'on' : 'off') })().catch(() => setSt('unsupported')) }, [])
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  if (st === 'checking' || (hideWhenOn && st === 'on' && !dg)) return null
  const go = async on => { setBusy(true); setErr(''); try { if (on) setSt(await enablePush(session.user.id)); else { await disablePush(); setSt('off') } } catch (e) { setErr(e?.message || String(e)) } setBusy(false) }
  const test = async () => { setBusy(true); setMsg(''); const r = await sendTest(); setBusy(false); r.ok ? (toast('أُرسل إشعار تجريبي — يجب أن يظهر على جهازك خلال ثوانٍ'), setMsg('')) : setMsg(r.error) }
  const note = !pushConfigured() ? 'لم يتم إعداد الإشعارات على الموقع بعد (المتغير VITE_VAPID_PUBLIC_KEY غير موجود في آخر نشر).' : st === 'unsupported' ? (ios && !standalone ? 'الآيفون لا يدعم الإشعارات داخل Safari العادي. ثبّت الموقع أولًا: زر المشاركة ← إضافة إلى الشاشة الرئيسية، ثم افتحه من الأيقونة الجديدة وفعّل الإشعارات من هناك.' : 'متصفحك لا يدعم إشعارات الموبايل، أو أنك تفتح نسخة غير منشورة.') : st === 'denied' ? 'الإشعارات محظورة لهذا الموقع. فعّلها من إعدادات المتصفح/الجهاز ثم أعد المحاولة.' : ''
  return <div className="card"><div className="row"><span className="tile" style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary)', marginBottom: 0 }}><BellRing size={22} className="i" /></span>
    <div className="grow"><b>إشعارات الموبايل</b><p className="muted small" style={{ margin: 0 }}>{st === 'on' ? 'مفعّلة على هذا الجهاز ✓' : 'تصلك الإعلانات والواجبات الجديدة والتصحيح على هاتفك حتى لو الموقع مغلق.'}</p></div>
    {pushConfigured() && (st === 'off' || st === 'on') && <Btn variant={st === 'on' ? 'secondary' : 'primary'} disabled={busy} onClick={() => go(st !== 'on')}>{busy ? '…' : st === 'on' ? 'إيقاف' : 'تفعيل'}</Btn>}</div>
    {note && <p className="small muted" style={{ marginTop: 10 }}>{note}</p>}
    <Alert>{err && 'تعذر التفعيل: ' + err}</Alert>
    <div className="row wrapx" style={{ marginTop: 10 }}>{st === 'on' && <Btn size="sm" variant="secondary" disabled={busy} onClick={test}>إرسال إشعار تجريبي</Btn>}<Btn size="sm" variant="ghost" onClick={async () => setDg(dg ? null : await diagnose())}>{dg ? 'إخفاء التشخيص' : 'تشخيص المشكلة'}</Btn></div>
    {msg && <Alert>{msg}</Alert>}
    {dg && <ul className="small" style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
      <Row ok={dg.secure}>الاتصال آمن (https)</Row><Row ok={dg.key}>مفتاح الإشعارات موجود في هذا النشر (VITE_VAPID_PUBLIC_KEY)</Row>
      <Row ok={dg.supported}>المتصفح يدعم الإشعارات{ios && !dg.standalone ? ' — على الآيفون يلزم فتح الموقع من أيقونة الشاشة الرئيسية' : ''}</Row>
      {ios && <Row ok={dg.standalone}>مفتوح كتطبيق مثبّت على الشاشة الرئيسية</Row>}
      <Row ok={dg.permission === 'granted'}>الإذن: {dg.permission}</Row><Row ok={dg.sw}>الـ Service Worker مسجّل</Row><Row ok={dg.sub}>اشتراك هذا الجهاز محفوظ</Row></ul>}</div>
}
