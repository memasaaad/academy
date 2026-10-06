import { createContext, useContext, useEffect, useState } from 'react'
import { sb } from './supabase'
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
  const value = { session, profile, loading, isAdmin: profile?.role === 'admin',
    signIn: (id, password) => sb.auth.signInWithPassword({ email: toEmail(id), password }),
    signUp: (full_name, phone, password) => sb.auth.signUp({ email: toEmail(phone), password, options: { data: { full_name, phone } } }),
    signOut: () => sb.auth.signOut() }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
