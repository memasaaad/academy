import { useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { currentSub, disablePush, enablePush, pushConfigured, pushSupported } from '../lib/push'
import { Btn, friendly, useUi } from './ui'
// تفعيل إشعارات الموبايل: تصل حتى لو الموقع مغلق (على الآيفون يجب تثبيت الموقع على الشاشة الرئيسية أولًا)
export default function PushToggle({ hideWhenOn = false }) {
  const { session } = useAuth(), { toast } = useUi(), [st, setSt] = useState('checking'), [busy, setBusy] = useState(false)
  useEffect(() => { (async () => { if (!pushSupported()) return setSt('unsupported'); if (Notification.permission === 'denied') return setSt('denied'); setSt((await currentSub()) ? 'on' : 'off') })().catch(() => setSt('unsupported')) }, [])
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  if (st === 'checking' || (hideWhenOn && st === 'on')) return null
  const go = async on => { setBusy(true); try { if (on) setSt(await enablePush(session.user.id)); else { await disablePush(); setSt('off') } } catch (e) { toast(friendly(e), 'error') } setBusy(false) }
  const note = !pushConfigured() ? 'لم يتم إعداد الإشعارات على الموقع بعد (مفتاح VAPID).' : st === 'unsupported' ? (ios && !standalone ? 'على الآيفون: ثبّت الموقع على الشاشة الرئيسية أولًا (زر المشاركة ← إضافة إلى الشاشة الرئيسية) ثم افتحه من هناك وفعّل الإشعارات.' : 'متصفحك لا يدعم إشعارات الموبايل، أو تعمل على النسخة المنشورة فقط.') : st === 'denied' ? 'الإشعارات محظورة من إعدادات المتصفح لهذا الموقع. فعّلها من إعدادات الموقع ثم أعد المحاولة.' : ''
  return <div className="card"><div className="row"><span className="tile" style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary)', marginBottom: 0 }}><BellRing size={22} className="i" /></span>
    <div className="grow"><b>إشعارات الموبايل</b><p className="muted small" style={{ margin: 0 }}>{st === 'on' ? 'مفعّلة على هذا الجهاز ✓' : 'تصلك الإعلانات والواجبات الجديدة والتصحيح على هاتفك حتى لو الموقع مغلق.'}</p></div>
    {pushConfigured() && (st === 'off' || st === 'on') && <Btn variant={st === 'on' ? 'secondary' : 'primary'} disabled={busy} onClick={() => go(st !== 'on')}>{busy ? '…' : st === 'on' ? 'إيقاف' : 'تفعيل'}</Btn>}</div>
    {note && <p className="small muted" style={{ marginTop: 10 }}>{note}</p>}</div>
}
