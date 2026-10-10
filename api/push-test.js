// Vercel Serverless — إشعار تجريبي لجهاز المستخدم الحالي (للتأكد أن المفاتيح والاشتراك يعملان بدون الحاجة لـ Webhook)
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /, ''), { data, error: ue } = await admin.auth.getUser(token)
    if (ue || !data?.user) return res.status(401).json({ error: 'سجّل الدخول مرة أخرى ثم أعد المحاولة.' })
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return res.status(500).json({ error: 'مفاتيح VAPID غير مضبوطة في Vercel (VAPID_PUBLIC_KEY و VAPID_PRIVATE_KEY).' })
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.VAPID_PUBLIC_KEY.trim(), process.env.VAPID_PRIVATE_KEY.trim())
    const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', data.user.id)
    if (!subs?.length) return res.status(404).json({ error: 'لا يوجد اشتراك محفوظ لحسابك. فعّل الإشعارات من هذا الجهاز أولًا.' })
    const payload = JSON.stringify({ title: 'إشعار تجريبي ✓', body: 'الإشعارات تعمل على جهازك.', url: '/dashboard' }), fails = []
    let sent = 0
    for (const s of subs) { try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload); sent++ } catch (e) { fails.push(`${e?.statusCode || ''} ${(e?.body || e?.message || '').toString().slice(0, 120)}`.trim()); if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', s.id) } }
    return sent ? res.json({ ok: true, sent, devices: subs.length }) : res.status(502).json({ error: 'رفضت خدمة الإشعارات الإرسال: ' + fails.join(' | '), fails })
  } catch (e) { return res.status(500).json({ error: e?.message || 'server error' }) }
}
