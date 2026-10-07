// Vercel Serverless — إنشاء/حذف الطلاب (يستخدم Service Role على السيرفر فقط)
import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
export default async function handler(req, res) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    const { data: u } = await admin.auth.getUser(token)
    if (!u?.user) return res.status(401).json({ error: 'غير مصرح' })
    const { data: p } = await admin.from('profiles').select('role').eq('id', u.user.id).single()
    if (p?.role !== 'admin') return res.status(403).json({ error: 'للمدرس فقط' })
    if (req.method === 'POST') {
      const { full_name, phone, password } = req.body || {}
      if (!full_name || !phone || !password || password.length < 6) return res.status(400).json({ error: 'بيانات ناقصة (كلمة المرور 6 أحرف على الأقل)' })
      const email = `${String(phone).replace(/\D/g, '')}@students.academy.local`
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, phone, by_admin: '1' } })
      if (error) return res.status(400).json({ error: error.message })
      await admin.from('profiles').update({ active: true }).eq('id', data.user.id)   // الطالب الذي يضيفه المدرس يكون مفعّلًا
      return res.json({ id: data.user.id })
    }
    if (req.method === 'PATCH') {   // تغيير كلمة مرور طالب
      const { id, password } = req.body || {}
      if (!id || !password || password.length < 6) return res.status(400).json({ error: 'كلمة المرور 6 أحرف على الأقل' })
      const { error } = await admin.auth.admin.updateUserById(id, { password })
      return error ? res.status(400).json({ error: error.message }) : res.json({ ok: true })
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || {}
      const { data: t } = await admin.from('profiles').select('role').eq('id', id).single()
      if (t?.role === 'admin') return res.status(400).json({ error: 'لا يمكن حذف المدرس' })
      const { error } = await admin.auth.admin.deleteUser(id)
      return error ? res.status(400).json({ error: error.message }) : res.json({ ok: true })
    }
    res.status(405).end()
  } catch (e) { res.status(500).json({ error: e.message }) }
}
