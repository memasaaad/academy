import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { sb } from '../lib/supabase'
import logo from '../assets/logo.webp'
import card from '../pub/loginCard'
import '../pub/login.css'
const RULES = { login: { identifier: v => v.trim() ? '' : 'أدخل رقم الهاتف أو البريد', password: v => v ? '' : 'أدخل كلمة المرور' }, signup: { name: v => v.trim().length >= 3 ? '' : 'أدخل اسمك بالكامل', phone: v => /^[0-9٠-٩+\s-]{8,15}$/.test(v.trim()) ? '' : 'رقم الهاتف غير صحيح', password: v => v.length >= 6 ? '' : 'كلمة المرور لازم تكون 6 أحرف على الأقل' } }
const Eye = ({ on }) => on ? <svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.4 6.5A17 17 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 4-.8M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg> : <svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
function Field({ id, label, icon, err, hint, pw, ...p }) {
  const [show, setShow] = useState(false)
  return <div className="p-f"><label htmlFor={id}>{label}</label><div className={'p-in' + (err ? ' p-bad' : '')}><svg className="p-lead"><use href={`#i-${icon}`} /></svg>
    <input id={id} {...p} type={pw ? (show ? 'text' : 'password') : p.type} />{pw && <button type="button" className={'p-eye' + (show ? ' p-show' : '')} aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} onClick={() => setShow(!show)}><Eye on={show} /></button>}</div>{hint && <div className="p-hint">{hint}</div>}<div className="p-msg" role="alert">{err}</div></div>
}
export default function Auth() {
  const { signIn, signUp, session, profile } = useAuth(), { toggle } = useTheme(), nav = useNavigate(), [sp, setSp] = useSearchParams(), up = sp.get('mode') === 'up'
  const [f, setF] = useState({ identifier: '', password: '', name: '', phone: '' }), [errs, setErrs] = useState({}), [busy, setBusy] = useState(false), [toast, setToast] = useState('')
  useEffect(() => { document.title = (up ? 'إنشاء حساب' : 'تسجيل الدخول') + ' - اكاديمية المهندس إبراهيم سعد'; setErrs({}); setToast('') }, [up])
  if (session && profile && !busy) return <Navigate to="/go" replace />
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const submit = async e => {
    e.preventDefault(); const rules = RULES[up ? 'signup' : 'login'], er = {}; for (const [k, r] of Object.entries(rules)) { const m = r(f[k]); if (m) er[k] = m } setErrs(er); setToast(''); if (Object.keys(er).length) return
    setBusy(true)
    if (!up) { const r = await signIn(f.identifier, f.password); setBusy(false); if (r.error) return setToast(/Invalid login/i.test(r.error.message) ? 'رقم الهاتف أو كلمة المرور غير صحيحة.' : 'تعذر تسجيل الدخول، حاول مرة أخرى.'); return nav('/go') }
    const r = await signUp(f.name, f.phone, f.password)
    if (r.error) { setBusy(false); return setToast(/already|registered/i.test(r.error.message) ? 'هذا الرقم مسجل بالفعل. سجّل الدخول.' : 'تعذر إنشاء الحساب، حاول مرة أخرى.') }
    await sb.auth.signOut(); setBusy(false); setF({ ...f, password: '' }); setSp({}); setTimeout(() => setToast('تم إنشاء حسابك بنجاح. سيقوم المدرس بتفعيله، وبعدها تستطيع تسجيل الدخول.'), 50)
  }
  return <div className="pub-login"><svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><defs>
    <symbol id="i-phone" viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></symbol><symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></symbol></defs></svg>
    <div className="p-page">
      <aside className="p-brand"><div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: card.replace('__LOGO__', logo) }} /><p className="p-tagline">تدرّب على أسئلة الكتاب، وراجع أخطاءك أولًا بأول.</p><div className="p-copy">Eng. Ibrahim Saad - جميع الحقوق محفوظة</div></aside>
      <main className="p-side"><div className="p-top"><button className="p-theme" onClick={toggle} aria-label="تبديل الوضع الليلي والنهاري"><svg className="p-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg><svg className="p-moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg></button></div>
        <div className="p-box"><Link className="p-back" to="/">الصفحة الرئيسية ←</Link>
          <section className="p-view"><h1>{up ? 'إنشاء حساب طالب' : 'تسجيل الدخول'}</h1><p className="p-sub">{up ? 'أدخل بياناتك لتبدأ حل الواجبات. سيحتاج حسابك إلى تفعيل من المدرس.' : 'أهلًا بعودتك، أدخل بياناتك للمتابعة.'}</p>
            <form onSubmit={submit} noValidate>
              {up ? <>
                <Field id="s-name" label="الاسم" icon="user" autoComplete="name" value={f.name} onChange={set('name')} err={errs.name} />
                <Field id="s-ph" label="رقم الهاتف" icon="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" style={{ textAlign: 'right' }} value={f.phone} onChange={set('phone')} err={errs.phone} />
                <Field id="s-pw" label="كلمة المرور" icon="lock" pw autoComplete="new-password" dir="ltr" style={{ textAlign: 'right' }} value={f.password} onChange={set('password')} err={errs.password} hint="6 أحرف على الأقل" /></> : <>
                <Field id="l-id" label="رقم الهاتف أو البريد" icon="phone" autoComplete="username" dir="ltr" style={{ textAlign: 'right' }} value={f.identifier} onChange={set('identifier')} err={errs.identifier} />
                <Field id="l-pw" label="كلمة المرور" icon="lock" pw autoComplete="current-password" dir="ltr" style={{ textAlign: 'right' }} value={f.password} onChange={set('password')} err={errs.password} /></>}
              <button className="p-submit" type="submit" disabled={busy}>{busy ? 'جارٍ المعالجة…' : up ? 'إنشاء الحساب' : 'تسجيل الدخول'}</button></form>
            <div className={'p-toast' + (toast ? ' p-on' : '')} role="status">{toast}</div>
            <p className="p-alt">{up ? 'لديك حساب؟' : 'طالب جديد؟'}<a href={up ? '/auth' : '/auth?mode=up'} onClick={e => { e.preventDefault(); setSp(up ? {} : { mode: 'up' }) }}>{up ? 'تسجيل الدخول' : 'إنشاء حساب'}</a></p></section></div></main></div></div>
}
