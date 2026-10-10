// Vercel Serverless — يرسل إشعار الموبايل عند إضافة صف في جدول notifications (يُستدعى من Supabase Database Webhook)
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
export default async function handler(req, res) {
  if (!process.env.PUSH_WEBHOOK_SECRET || req.headers['x-webhook-secret'] !== process.env.PUSH_WEBHOOK_SECRET) return res.status(401).json({ error: 'unauthorized: تحقق من Header x-webhook-secret ومن PUSH_WEBHOOK_SECRET' })
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return res.status(500).json({ error: 'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY غير مضبوطين في Vercel' })
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.VAPID_PUBLIC_KEY.trim(), process.env.VAPID_PRIVATE_KEY.trim())
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body, n = body?.record; if (!n) return res.json({ skipped: true })
    let q = admin.from('push_subscriptions').select('*')
    if (n.user_id) q = q.eq('user_id', n.user_id)
    else { const { data: ad } = await admin.from('profiles').select('id').eq('role', 'admin'); q = q.in('user_id', (ad || []).map(x => x.id)) }   // إشعار بدون مستخدم = للمدرس
    const { data: subs, error } = await q; if (error) return res.status(500).json({ error: 'db: ' + error.message })
    const url = n.link || (n.attempt_id ? (n.user_id ? `/review/${n.attempt_id}` : `/admin/grading?attempt=${n.attempt_id}`) : n.user_id ? '/dashboard' : '/admin')
    const payload = JSON.stringify({ title: n.title, body: n.body || '', url }), fails = []
    let sent = 0
    await Promise.all((subs || []).map(async s => {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload); sent++ }
      catch (e) { fails.push(e?.statusCode || e?.message); if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', s.id) }   // جهاز ألغى الاشتراك
    }))
    return res.json({ subscriptions: (subs || []).length, sent, fails })
  } catch (e) { return res.status(500).json({ error: e?.message || 'server error' }) }
}
