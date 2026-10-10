import { sb } from './supabase'
const KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
const u8 = b64 => { const p = '='.repeat((4 - b64.length % 4) % 4), r = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map(c => c.charCodeAt(0))) }
export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
export const pushConfigured = () => !!KEY
export async function currentSub() { const reg = await navigator.serviceWorker.getRegistration(); return reg ? reg.pushManager.getSubscription() : null }
export async function enablePush(userId) {
  const perm = await Notification.requestPermission(); if (perm !== 'granted') return 'denied'
  const reg = await navigator.serviceWorker.ready, sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(KEY) }), j = sub.toJSON()
  const { error } = await sb.from('push_subscriptions').upsert({ user_id: userId, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' }); if (error) throw error
  reg.showNotification('تم تفعيل الإشعارات ✓', { body: 'ستصلك التنبيهات على هذا الجهاز.', icon: '/icon-192.png', dir: 'rtl', lang: 'ar' }); return 'on'
}
export async function disablePush() { const sub = await currentSub(); if (sub) { await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe() } }
// تشخيص: حالة كل شرط يلزم لعمل الإشعارات على هذا الجهاز
export async function diagnose() {
  const d = { key: !!KEY, secure: window.isSecureContext, supported: pushSupported(), standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true, permission: 'Notification' in window ? Notification.permission : 'غير مدعوم', sw: false, sub: false }
  try { const reg = await navigator.serviceWorker?.getRegistration(); d.sw = !!reg; d.sub = !!(reg && await reg.pushManager?.getSubscription()) } catch { /* ignore */ }
  return d
}
export async function sendTest() {
  const { data } = await sb.auth.getSession()
  try { const r = await fetch('/api/push-test', { method: 'POST', headers: { Authorization: 'Bearer ' + data.session.access_token } }); const j = await r.json().catch(() => ({})); return r.ok ? { ok: true, ...j } : { ok: false, error: j.error || 'HTTP ' + r.status } }
  catch (e) { return { ok: false, error: 'تعذر الوصول للسيرفر: ' + e.message } }
}
