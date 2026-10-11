// Vercel Serverless — يرسل إشعار الموبايل عند إضافة صف في جدول notifications (يُستدعى من Supabase Database Webhook)
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const categoryOf = (n, admin) => {
  if (admin) return n.attempt_id ? 'submissions' : (n.kind === 'student' || n.link === '/admin/students' || /طالب جديد/.test(n.title || '')) ? 'new_students' : 'submissions'
  if (n.kind === 'announcement') return 'announcements'
  if (n.kind === 'chapter') return 'content'
  if (n.kind === 'achievement') return 'achievements'
  if (n.kind === 'warning' || (n.link || '').startsWith('/review/')) return 'results'
  if ((n.link || '').startsWith('/solve/')) return 'assignments'
  return 'other'
}
const allowedFor = (prefs, n, admin) => { const c = categoryOf(n, admin); return c === 'other' || prefs?.[c] !== false }
export default async function handler(req, res) {
  if (!process.env.PUSH_WEBHOOK_SECRET || req.headers['x-webhook-secret'] !== process.env.PUSH_WEBHOOK_SECRET) return res.status(401).json({ error: 'unauthorized: تحقق من Header x-webhook-secret ومن PUSH_WEBHOOK_SECRET' })
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return res.status(500).json({ error: 'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY غير مضبوطين في Vercel' })
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.VAPID_PUBLIC_KEY.trim(), process.env.VAPID_PRIVATE_KEY.trim())
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body, n = body?.record; if (!n) return res.json({ skipped: true })
    let q = admin.from('push_subscriptions').select('*')
    if (n.user_id) q = q.eq('user_id', n.user_id)
    else { const { data: ad } = await admin.from('profiles').select('id').eq('role', 'admin'); q = q.in('user_id', (ad || []).map(x => x.id)) }   // إشعار بدون مستخدم = للمدرس
    const { data: all, error } = await q; if (error) return res.status(500).json({ error: 'db: ' + error.message })
    const { data: pr } = await admin.from('profiles').select('id,notif_prefs').in('id', [...new Set((all || []).map(s => s.user_id))]), pm = Object.fromEntries((pr || []).map(p => [p.id, p.notif_prefs || {}]))
    const subs = (all || []).filter(s => allowedFor(pm[s.user_id], n, !n.user_id))   // يحترم تفضيلات الإشعارات لكل مستخدم
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
