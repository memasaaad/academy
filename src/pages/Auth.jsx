import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
export default function Auth() {
  const { signIn, signUp } = useAuth(), nav = useNavigate()
  const [mode, setMode] = useState('in'), [f, setF] = useState({ name: '', id: '', pw: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const go = async e => {
    e.preventDefault(); setErr(''); setBusy(true)
    const r = mode === 'in' ? await signIn(f.id, f.pw) : await signUp(f.name, f.id, f.pw)
    setBusy(false)
    if (r.error) return setErr(r.error.message.includes('Invalid') ? 'بيانات الدخول غير صحيحة' : r.error.message)
    if (mode === 'up' && !r.data.session) return setErr('تم إنشاء الحساب، سجّل الدخول الآن')
    nav('/dashboard')
  }
  return <form className="card auth" onSubmit={go}>
    <h2>{mode === 'in' ? 'تسجيل الدخول' : 'إنشاء حساب طالب'}</h2>
    {mode === 'up' && <label>الاسم<input required value={f.name} onChange={set('name')} /></label>}
    <label>{mode === 'in' ? 'رقم الهاتف أو البريد' : 'رقم الهاتف'}<input required inputMode={mode === 'up' ? 'tel' : 'text'} dir="ltr" value={f.id} onChange={set('id')} /></label>
    <label>كلمة المرور<input required type="password" minLength={6} dir="ltr" value={f.pw} onChange={set('pw')} /></label>
    {err && <p className="err">{err}</p>}
    <button className="btn" disabled={busy}>{busy ? '…' : mode === 'in' ? 'دخول' : 'تسجيل'}</button>
    <button type="button" className="link" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'طالب جديد؟ أنشئ حسابًا' : 'لديك حساب؟ سجّل الدخول'}</button>
  </form>
}
