import { useEffect, useState } from 'react'
import { Download, Share } from 'lucide-react'
import { Btn } from './ui'
// تثبيت الموقع كتطبيق: أندرويد/كروم عبر زر مباشر، وآيفون عبر "إضافة إلى الشاشة الرئيسية"
let deferred = null
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; window.dispatchEvent(new Event('pwa-ready')) })
const standalone = () => typeof window !== 'undefined' && (matchMedia('(display-mode: standalone)').matches || navigator.standalone === true)
export default function InstallApp() {
  const [ready, setReady] = useState(!!deferred), [done, setDone] = useState(standalone())
  useEffect(() => { const a = () => setReady(true), b = () => setDone(true); addEventListener('pwa-ready', a); addEventListener('appinstalled', b); return () => { removeEventListener('pwa-ready', a); removeEventListener('appinstalled', b) } }, [])
  if (done) return <div className="card"><p className="muted small" style={{ margin: 0 }}>✓ أنت تستخدم التطبيق المثبّت على جهازك.</p></div>
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  return <div className="card"><div className="row"><span className="tile" style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary)', marginBottom: 0 }}><Download size={22} className="i" /></span><div className="grow"><b>ثبّت التطبيق على هاتفك</b><p className="muted small" style={{ margin: 0 }}>يفتح من الشاشة الرئيسية مثل أي تطبيق، وبدون شريط المتصفح.</p></div>
    {ready && <Btn onClick={async () => { deferred.prompt(); await deferred.userChoice; deferred = null; setReady(false) }}>تثبيت</Btn>}</div>
    {!ready && <p className="small" style={{ marginTop: 10 }}>{ios ? <>على الآيفون: اضغط زر المشاركة <Share size={14} className="i" /> في Safari ثم اختر «إضافة إلى الشاشة الرئيسية».</> : 'من قائمة المتصفح (⋮) اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'}</p>}</div>
}
