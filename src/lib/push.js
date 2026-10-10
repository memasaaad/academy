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
