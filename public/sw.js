// Service worker بسيط: يجعل الموقع قابلًا للتثبيت ويخزّن ملفات الواجهة الثابتة فقط (لا يخزّن أي بيانات من قاعدة البيانات)
const V = 'academy-v1'
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(['/', '/icon-192.png', '/favicon-32.png'])).then(() => self.skipWaiting())) })
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())) })
// إشعارات الموبايل (Web Push)
self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json() } catch { d = { title: 'الأكاديمية', body: e.data ? e.data.text() : '' } }
  e.waitUntil(self.registration.showNotification(d.title || 'الأكاديمية', { body: d.body || '', icon: '/icon-192.png', badge: '/favicon-32.png', dir: 'rtl', lang: 'ar', data: { url: d.url || '/' } }))
})
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => { for (const c of list) { if ('focus' in c) { if (c.navigate) c.navigate(url); return c.focus() } } return clients.openWindow(url) }))
})
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url)
  if (r.method !== 'GET' || u.origin !== location.origin) return
  if (r.mode === 'navigate') return e.respondWith(fetch(r).catch(() => caches.match('/')))
  if (u.pathname.startsWith('/assets/') || /\.(png|webp|ico|svg|woff2?)$/.test(u.pathname)) e.respondWith(caches.match(r).then(c => c || fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(x => x.put(r, cp)); return res })))
})
