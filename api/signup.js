// Vercel Serverless — تسجيل طالب جديد (حسابه غير مفعّل حتى يفعّله المدرس).
// يمر عبر السيرفر لأن التسجيل المباشر من المتصفح بإيميل وهمي (@students.academy.local) قد يرفضه Supabase بسبب فحص نطاق الإيميل.
import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ar = s => String(s || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  try {
    const { full_name, phone, password, website } = req.body || {}
    if (website) return res.json({ ok: true })   // حقل فخّ للروبوتات
    const name = String(full_name || '').trim(), shown = ar(phone).trim(), digits = shown.replace(/\D/g, '')
    if (name.length < 3 || name.length > 80) return res.status(400).json({ error: 'أدخل اسمك بالكامل' })
    if (digits.length < 8 || digits.length > 15) return res.status(400).json({ error: 'رقم الهاتف غير صحيح' })
    if (!password || String(password).length < 6 || String(password).length > 72) return res.status(400).json({ error: 'كلمة المرور 6 أحرف على الأقل' })
    const { error } = await admin.auth.admin.createUser({ email: `${digits}@students.academy.local`, password: String(password), email_confirm: true, user_metadata: { full_name: name, phone: shown } })
    if (error) return res.status(400).json({ error: error.message })
    return res.json({ ok: true })
  } catch (e) { return res.status(500).json({ error: 'server error: ' + (e?.message || '') }) }
}
