// تشغيل مرة واحدة: ADMIN_EMAIL=... ADMIN_PASSWORD=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-admin.mjs
import { createClient } from '@supabase/supabase-js'
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) { console.error('ناقص متغير بيئة'); process.exit(1) }
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await sb.auth.admin.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, email_confirm: true, user_metadata: { full_name: 'م/ إبراهيم سعد', by_admin: '1' } })
if (error) { console.error(error.message); process.exit(1) }
await sb.from('profiles').update({ role: 'admin', active: true }).eq('id', data.user.id)
console.log('تم إنشاء حساب المدرس:', ADMIN_EMAIL)
