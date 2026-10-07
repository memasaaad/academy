import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Phone, User } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { Brand } from '../App'
import { Alert, Btn, Field, friendly } from '../components/ui'
export default function Auth() {
  const { signIn, signUp } = useAuth(), nav = useNavigate()
  const [mode, setMode] = useState('in'), [f, setF] = useState({ name: '', id: '', pw: '' }), [err, setErr] = useState(''), [ok, setOk] = useState(''), [busy, setBusy] = useState(false), [show, setShow] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const go = async e => {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true)
    const r = mode === 'in' ? await signIn(f.id, f.pw) : await signUp(f.name, f.id, f.pw); setBusy(false)
    if (r.error) return setErr(/Invalid login/i.test(r.error.message) ? 'رقم الهاتف أو كلمة المرور غير صحيحة. تأكد من البيانات وحاول مرة أخرى.' : /already/i.test(r.error.message) ? 'هذا الرقم مسجل بالفعل. سجّل الدخول بدلًا من إنشاء حساب.' : friendly(r.error))
    if (mode === 'up' && !r.data.session) { setOk('تم إنشاء حسابك. يمكنك تسجيل الدخول الآن.'); return setMode('in') }
    nav('/dashboard')
  }
  const up = mode === 'up'
  return <div className="authpage"><aside className="authside"><Brand /><div><h2>تدرّب على أسئلة الكتاب، وراجع أخطاءك أولًا بأول.</h2><p>منصة الصف الثاني الثانوي / البكالوريا لمادة البرمجة وتكنولوجيا المعلومات، مع الواجبات والتصحيح ومتابعة المدرس.</p></div><small style={{ color: '#7c8aa5' }}>جميع الحقوق محفوظة - Eng. Ibrahim Saad</small></aside>
    <div className="authform"><form onSubmit={go} noValidate><div className="authform-brand" style={{ marginBottom: 24 }}><Link to="/" className="muted small">← الصفحة الرئيسية</Link></div>
      <h1>{up ? 'إنشاء حساب طالب' : 'تسجيل الدخول'}</h1><p className="muted" style={{ marginBottom: 16 }}>{up ? 'أدخل بياناتك لتبدأ حل الواجبات.' : 'أهلًا بعودتك، أدخل بياناتك للمتابعة.'}</p>
      <Alert tone="success">{ok}</Alert><Alert>{err}</Alert>
      {up && <Field label="الاسم"><div className="inputicon"><User size={18} className="i" /><input required autoComplete="name" value={f.name} onChange={set('name')} /></div></Field>}
      <Field label={up ? 'رقم الهاتف' : 'رقم الهاتف أو البريد'}><div className="inputicon"><Phone size={18} className="i" /><input required dir="ltr" autoComplete="username" inputMode="tel" style={{ textAlign: 'start' }} value={f.id} onChange={set('id')} /></div></Field>
      <Field label="كلمة المرور" hint={up ? '6 أحرف على الأقل' : null}><div className="inputicon"><Lock size={18} className="i" /><input required minLength={6} dir="ltr" type={show ? 'text' : 'password'} autoComplete={up ? 'new-password' : 'current-password'} value={f.pw} onChange={set('pw')} />
        <button type="button" className="eye" aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} className="i" /> : <Eye size={18} className="i" />}</button></div></Field>
      <Btn type="submit" variant="" size="lg" className="block" disabled={busy}>{busy ? 'جارٍ المعالجة…' : up ? 'إنشاء الحساب' : 'تسجيل الدخول'}</Btn>
      <p style={{ textAlign: 'center', marginTop: 16 }} className="muted">{up ? 'لديك حساب؟' : 'طالب جديد؟'} <button type="button" className="btn ghost sm" onClick={() => { setMode(up ? 'in' : 'up'); setErr(''); setOk('') }}>{up ? 'تسجيل الدخول' : 'إنشاء حساب'}</button></p></form></div></div>
}
