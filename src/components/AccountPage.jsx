import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, Download, Eye, EyeOff, FileDown, KeyRound, LogOut, Palette, ShieldCheck, User as UserIcon } from 'lucide-react'
import { sb } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { ADMIN_PREFS, STUDENT_PREFS } from '../lib/notifPrefs'
import { Alert, Badge, Btn, Field, PageHeader, Segmented, fdate, fdt, friendly, useAsync, useUi } from './ui'
import PushToggle from './PushToggle'
import InstallApp from './InstallApp'
import './account.css'
const Switch = ({ on, onChange, label }) => <button type="button" role="switch" aria-checked={on} aria-label={label} className="sw" onClick={() => onChange(!on)}><i /></button>
// collapsible: الكارت يظهر برأسه دائمًا، والمحتوى ينزل/يطوى بالسهم (ويدفع ما تحته للأسفل)
const Section = ({ icon: I, title, desc, children, danger, collapsible }) => {
  const [open, setOpen] = useState(!collapsible), head = <><span className="ic"><I size={20} className="i" /></span><div className="grow"><h2>{title}</h2>{desc && <p>{desc}</p>}</div>{collapsible && <ChevronDown size={20} className="i chev" />}</>
  return <section className={'acc-card' + (danger ? ' acc-danger' : '')}>{collapsible ? <button type="button" className="acc-h tg" aria-expanded={open} onClick={() => setOpen(!open)}>{head}</button> : <div className="acc-h">{head}</div>}{open && children}</section>
}
const csv = rows => '\ufeff' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
const save = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500) }
const strength = p => { const s = (p.length >= 8) + /\d/.test(p) + /[a-zA-Z\u0600-\u06FF]/.test(p) + (/[^\w\s]/.test(p) || (/[a-z]/.test(p) && /[A-Z]/.test(p))); return p.length < 6 ? [0, '', 'var(--c-danger)'] : [[25, 'ضعيفة', 'var(--c-danger)'], [25, 'ضعيفة', 'var(--c-danger)'], [55, 'متوسطة', 'var(--c-warning)'], [80, 'جيدة', 'var(--c-primary)'], [100, 'قوية', 'var(--c-success)']][s] }
// حسابي — مشتركة بين الطالب والمدرس (الاختلاف في الإحصاءات وخيارات الإشعارات والتصدير)
export default function AccountPage() {
  const { profile, session, isAdmin, refresh, signOut } = useAuth(), { mode, setMode, fs, setFs } = useTheme(), { confirm, toast } = useUi(), nav = useNavigate()
  const [name, setName] = useState(profile?.full_name || ''), [nb, setNb] = useState(false), [prefs, setPrefs] = useState(profile?.notif_prefs || {})
  const [pw, setPw] = useState({ cur: '', nw: '', again: '' }), [show, setShow] = useState(false), [pe, setPe] = useState(''), [pb, setPb] = useState(false), [xb, setXb] = useState(false)
  useEffect(() => { setName(profile?.full_name || ''); setPrefs(profile?.notif_prefs || {}) }, [profile?.id, profile?.full_name])
  const stats = useAsync(async () => {
    if (isAdmin) { const { data } = await sb.rpc('admin_insights'); return data ? [[data.students, 'الطلاب'], [data.assignments, 'الواجبات'], [(data.avg ?? 0) + '%', 'متوسط الدرجات'], [data.pending, 'بانتظار التصحيح']] : null }
    const { data } = await sb.rpc('my_analytics'); return data ? [[data.avg != null ? data.avg + '%' : '—', 'متوسط درجاتي'], [`${data.assignments_done} / ${data.assignments_total}`, 'الواجبات المكتملة'], [`${data.lessons_done} / ${data.lessons_total}`, 'الدروس المكتملة'], [data.questions, 'أسئلة حللتها']] : null }, [isAdmin])
  const rows = isAdmin ? ADMIN_PREFS : STUDENT_PREFS, dirty = name.trim() !== (profile?.full_name || '')
  const saveName = async () => { setNb(true); const { error } = await sb.rpc('update_my_profile', { p_full_name: name }); setNb(false); if (error) return toast(friendly(error), 'error'); await refresh(); toast('تم حفظ الاسم') }
  const setPref = async (k, v) => { const next = { ...prefs, [k]: v }; setPrefs(next); const { error } = await sb.rpc('update_my_profile', { p_prefs: next }); if (error) { setPrefs(prefs); return toast(friendly(error), 'error') } refresh() }
  const changePw = async () => {
    setPe(''); if (!pw.cur) return setPe('اكتب كلمة المرور الحالية.'); if (pw.nw.length < 6) return setPe('كلمة المرور الجديدة 6 أحرف على الأقل.'); if (pw.nw !== pw.again) return setPe('تأكيد كلمة المرور غير مطابق.'); if (pw.nw === pw.cur) return setPe('اختر كلمة مرور مختلفة عن الحالية.')
    setPb(true); const chk = await sb.auth.signInWithPassword({ email: session.user.email, password: pw.cur }); if (chk.error) { setPb(false); return setPe('كلمة المرور الحالية غير صحيحة.') }
    const { error } = await sb.auth.updateUser({ password: pw.nw }); setPb(false); if (error) return setPe(/weak|short|least/i.test(error.message) ? 'كلمة المرور ضعيفة، اختر أقوى.' : friendly(error)); setPw({ cur: '', nw: '', again: '' }); toast('تم تغيير كلمة المرور')
  }
  const exportData = async () => {
    setXb(true)
    try {
      if (isAdmin) { const { data, error } = await sb.from('profiles').select('full_name,phone,group_name,active,last_login_at,created_at').eq('role', 'student').order('full_name'); if (error) throw error; save('students.csv', csv([['الاسم', 'الهاتف', 'المجموعة', 'الحالة', 'آخر دخول', 'تاريخ التسجيل'], ...data.map(s => [s.full_name, s.phone, s.group_name, s.active ? 'مفعّل' : 'غير مفعّل', s.last_login_at ? fdt(s.last_login_at) : '', fdate(s.created_at)])])) }
      else { const { data, error } = await sb.from('attempts').select('score,max_score,status,submitted_at,assignments(title)').neq('status', 'in_progress').order('submitted_at'); if (error) throw error; save('my-results.csv', csv([['الواجب', 'الدرجة', 'من', 'النسبة %', 'الحالة', 'تاريخ التسليم'], ...data.map(a => [a.assignments?.title, a.score, a.max_score, a.max_score ? Math.round(100 * a.score / a.max_score) : '', a.status === 'graded' ? 'مصحَّح' : 'بانتظار التصحيح', a.submitted_at ? fdt(a.submitted_at) : ''])])) }
      toast('تم تنزيل الملف')
    } catch (e) { toast(friendly(e), 'error') } setXb(false)
  }
  const [pct, plabel, pcol] = strength(pw.nw)
  return <div className="acc"><PageHeader title="حسابي" desc={isAdmin ? 'إعدادات حسابك كمدرس.' : 'بياناتك وتفضيلاتك وأمان حسابك.'} />
    <div className="acc-hero"><span className="acc-av" aria-hidden>{(profile?.full_name || '').trim().charAt(0) || '؟'}</span>
      <div className="grow" style={{ minWidth: 0 }}><h1>{profile?.full_name}</h1><div className="row wrapx" style={{ marginTop: 6 }}><Badge tone="info">{isAdmin ? 'مدرس' : 'طالب'}</Badge>{!isAdmin && profile?.group_name && <Badge>{profile.group_name}</Badge>}{!isAdmin && <Badge tone={profile?.active ? 'success' : 'warning'}>{profile?.active ? 'حساب مفعّل' : 'بانتظار التفعيل'}</Badge>}</div>
        <div className="acc-meta">{profile?.created_at && <span>انضممت في {fdate(profile.created_at)}</span>}{profile?.last_login_at && <span>آخر دخول: {fdt(profile.last_login_at)}</span>}</div></div></div>
    {stats.data && <div className="acc-stats">{stats.data.map(([v, l]) => <div key={l} className="acc-stat"><b>{v}</b><span>{l}</span></div>)}</div>}
    <div className="acc-grid">
      <div className="acc-col">
        <Section icon={UserIcon} title="الملف الشخصي" desc="الاسم الذي يظهر للمدرس وفي النتائج">
          <Field label="الاسم بالكامل"><input value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="name" /></Field>
          <div className="acc-ro" style={{ marginBottom: 12 }}><span className="small muted">{profile?.phone ? 'رقم الهاتف' : 'البريد الإلكتروني'}</span><b className="ltr small">{profile?.phone || session?.user?.email}</b></div>
          {!isAdmin && <p className="small muted" style={{ marginTop: -4 }}>رقم الهاتف هو اسم الدخول، ولتغييره تواصل مع المدرس.</p>}
          <Btn disabled={nb || !dirty || name.trim().length < 3} onClick={saveName}>{nb ? 'جارٍ الحفظ…' : 'حفظ الاسم'}</Btn></Section>
        <Section icon={KeyRound} title="تغيير كلمة المرور" desc="يُنصح بكلمة قوية لا تستخدمها في مكان آخر">
          <Alert>{pe}</Alert>
          <Field label="كلمة المرور الحالية"><input type={show ? 'text' : 'password'} dir="ltr" autoComplete="current-password" value={pw.cur} onChange={e => setPw({ ...pw, cur: e.target.value })} /></Field>
          <Field label="كلمة المرور الجديدة"><input type={show ? 'text' : 'password'} dir="ltr" autoComplete="new-password" value={pw.nw} onChange={e => setPw({ ...pw, nw: e.target.value })} /></Field>
          {pw.nw && <div style={{ marginTop: -6, marginBottom: 10 }}><div className="pwmeter"><i style={{ width: pct + '%', background: pcol }} /></div><small className="muted">{plabel}</small></div>}
          <Field label="تأكيد كلمة المرور الجديدة"><input type={show ? 'text' : 'password'} dir="ltr" autoComplete="new-password" value={pw.again} onChange={e => setPw({ ...pw, again: e.target.value })} /></Field>
          <div className="row between wrapx"><Btn variant="ghost" size="sm" icon={show ? EyeOff : Eye} onClick={() => setShow(!show)}>{show ? 'إخفاء' : 'إظهار'} الحروف</Btn><Btn disabled={pb || !pw.cur || !pw.nw} onClick={changePw}>{pb ? 'جارٍ التغيير…' : 'تغيير كلمة المرور'}</Btn></div></Section>
        <Section icon={FileDown} title="بياناتي" desc={isAdmin ? 'تصدير قائمة الطلاب' : 'تنزيل نتائجك'}>
          <p className="small muted" style={{ marginTop: 0 }}>{isAdmin ? 'ملف CSV يحتوي أسماء الطلاب وأرقامهم ومجموعاتهم وآخر دخول، يفتح في Excel.' : 'ملف CSV بكل واجباتك المسلَّمة ودرجاتها، يفتح في Excel.'}</p>
          <Btn variant="secondary" icon={Download} disabled={xb} onClick={exportData}>{xb ? 'جارٍ التجهيز…' : isAdmin ? 'تصدير قائمة الطلاب' : 'تنزيل نتائجي'}</Btn></Section>
      </div>
      <div className="acc-col">
        <Section icon={Bell} title="الإشعارات" desc="اختر ما تريد أن يصلك" collapsible>
          {rows.map(([k, t, d]) => <div key={k} className="optrow"><div className="t"><b>{t}</b><small>{d}</small></div><Switch on={prefs[k] !== false} onChange={v => setPref(k, v)} label={t} /></div>)}</Section>
        <PushToggle /><InstallApp />
        <Section icon={Palette} title="المظهر" desc="يُحفظ على هذا الجهاز">
          <div className="optrow"><div className="t"><b>الوضع</b><small>«تلقائي» يتبع إعداد جهازك</small></div></div>
          <Segmented value={mode} onChange={setMode} items={[['auto', 'تلقائي'], ['light', 'فاتح'], ['dark', 'داكن']]} />
          <div className="optrow" style={{ marginTop: 10 }}><div className="t"><b>حجم الخط</b><small>لتسهيل القراءة</small></div></div>
          <Segmented value={fs} onChange={setFs} items={[['sm', 'صغير'], ['md', 'عادي'], ['lg', 'كبير']]} /></Section>
        <Section icon={ShieldCheck} title="الجلسات" desc="الأجهزة المسجّل دخولك عليها" danger>
          <div className="row wrapx"><Btn variant="secondary" icon={LogOut} onClick={async () => { await signOut(); nav('/') }}>تسجيل الخروج</Btn>
            <Btn variant="secondary" onClick={async () => { if (await confirm('الخروج من كل الأجهزة؟', 'سيُطلب منك تسجيل الدخول مرة أخرى على كل جهاز، بما فيها هذا الجهاز.')) { await sb.auth.signOut({ scope: 'global' }); nav('/') } }}>الخروج من كل الأجهزة</Btn></div></Section>
      </div></div></div>
}
