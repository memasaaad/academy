import { createContext, useContext, useEffect, useState } from 'react'
import { sb } from './supabase'
import { startPresence, stopPresence } from './presence'
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)
const ar = s => String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
export const toEmail = id => { id = ar(id).trim(); return id.includes('@') ? id : id.replace(/\D/g, '') + '@students.academy.local' }
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null), [profile, setProfile] = useState(null), [loading, setLoading] = useState(true)
  const load = async s => {
    setSession(s)
    if (s) { const { data } = await sb.from('profiles').select('*').eq('id', s.user.id).single(); setProfile(data) } else setProfile(null)
    setLoading(false)
  }
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => load(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setTimeout(() => load(s), 0))
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!session) return
    const ping = () => sb.rpc('touch_presence', { p_login: false })
    ping(); const i = setInterval(ping, 60000); document.addEventListener('visibilitychange', ping); addEventListener('pagehide', ping)
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', ping); removeEventListener('pagehide', ping) }
  }, [session?.user?.id])
  useEffect(() => { if (!session || !profile) return stopPresence(); startPresence(session.user.id, { name: profile.full_name, role: profile.role }); return stopPresence }, [session?.user?.id, profile?.id])
  const value = { session, profile, loading, isAdmin: profile?.role === 'admin',
    signIn: async (id, password) => { const r = await sb.auth.signInWithPassword({ email: toEmail(id), password }); if (!r.error) sb.rpc('touch_presence', { p_login: true }); return r },
    // التسجيل عبر دالة السيرفر /api/signup (تتجاوز فحص نطاق الإيميل الوهمي في Supabase)، وإن لم تكن متاحة (تشغيل محلي) نرجع للتسجيل المباشر
    signUp: async (full_name, phone, password) => {
      try {
        const r = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name, phone, password }) })
        if (r.status !== 404 && r.status !== 405) { const j = await r.json().catch(() => ({})); return r.ok ? { data: {}, error: null } : { data: null, error: { message: j.error || 'signup failed', status: r.status } } }
      } catch { /* لا يوجد سيرفر: نكمل بالطريقة المباشرة */ }
      return sb.auth.signUp({ email: toEmail(phone), password, options: { data: { full_name, phone } } })
    },
    signOut: () => sb.auth.signOut(), refresh: () => sb.auth.getSession().then(({ data }) => load(data.session)) }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
