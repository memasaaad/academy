import { useEffect, useState } from 'react'
import { Copy, Download, Share } from 'lucide-react'
import { Btn, useUi } from './ui'
// تثبيت الموقع كتطبيق: أندرويد/كروم عبر زر مباشر، وآيفون عبر "إضافة إلى الشاشة الرئيسية" (لا يوجد زر برمجي في iOS)
let deferred = null
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; window.dispatchEvent(new Event('pwa-ready')) })
const standalone = () => typeof window !== 'undefined' && (matchMedia('(display-mode: standalone)').matches || navigator.standalone === true)
export default function InstallApp() {
  const { toast } = useUi(), [ready, setReady] = useState(!!deferred), [done, setDone] = useState(standalone())
  useEffect(() => { const a = () => setReady(true), b = () => setDone(true); addEventListener('pwa-ready', a); addEventListener('appinstalled', b); return () => { removeEventListener('pwa-ready', a); removeEventListener('appinstalled', b) } }, [])
  if (done) return <div className="card"><p className="muted small" style={{ margin: 0 }}>✓ أنت تستخدم التطبيق المثبّت على جهازك.</p></div>
  const ua = navigator.userAgent, ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), inApp = /FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat|Messenger|TikTok|Telegram/i.test(ua), notSafari = ios && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
  const copy = async () => { try { await navigator.clipboard.writeText(location.origin); toast('تم نسخ الرابط. الصقه في Safari') } catch { toast('انسخ الرابط يدويًا من شريط العنوان', 'error') } }
  return <div className="card"><div className="row"><span className="tile" style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary)', marginBottom: 0 }}><Download size={22} className="i" /></span><div className="grow"><b>ثبّت التطبيق على هاتفك</b><p className="muted small" style={{ margin: 0 }}>يفتح من الشاشة الرئيسية مثل أي تطبيق، وبدون شريط المتصفح.</p></div>
    {ready && <Btn onClick={async () => { deferred.prompt(); await deferred.userChoice; deferred = null; setReady(false) }}>تثبيت</Btn>}</div>
    {!ready && ios && <div className="small" style={{ marginTop: 10 }}>
      {inApp ? <p><b>أنت تفتح الموقع من داخل تطبيق آخر (واتساب/فيسبوك…)</b> وهذا المتصفح لا يوفّر «إضافة إلى الشاشة الرئيسية». افتح الرابط في <b>Safari</b> أولًا.</p> : null}
      <ol style={{ paddingInlineStart: 20, margin: '6px 0' }}>
        <li>افتح الموقع في <b>Safari</b>{notSafari ? ' (أنت الآن في متصفح آخر؛ الأفضل Safari)' : ''}.</li>
        <li>اضغط زر المشاركة <Share size={14} className="i" /> (المربع والسهم للأعلى) أسفل الشاشة.</li>
        <li><b>مرّر القائمة لأسفل</b> واضغط «إضافة إلى الشاشة الرئيسية» (وقد تحتاج الضغط على «المزيد» أولًا).</li>
        <li>اضغط «إضافة»، ثم افتح الموقع من الأيقونة الجديدة.</li></ol>
      <Btn size="sm" variant="secondary" icon={Copy} onClick={copy}>نسخ رابط الموقع</Btn></div>}
    {!ready && !ios && <p className="small" style={{ marginTop: 10 }}>من قائمة المتصفح (⋮) اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p>}</div>
}
