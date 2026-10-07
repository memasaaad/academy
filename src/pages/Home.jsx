import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sb } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { useAsync } from '../components/ui'
import NotificationBell from '../components/NotificationBell'
import { ResourceList } from '../components/Resources'
import mark from '../pub/mark.webp'
import art from '../pub/homeArt'
import '../pub/home.css'
const ICONS = { 0: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 3v4M17 5h4', 1: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4', 2: 'M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18 M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18', 3: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16' }
const ORD = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة']
const nm = c => c.title.split(':').slice(1).join(':').trim() || c.title
export default function Home() {
  const { session, profile, isAdmin, signOut } = useAuth(), { toggle } = useTheme(), nav = useNavigate(), [cur, setCur] = useState(0), [open, setOpen] = useState(null)
  const ok = session && profile && (isAdmin || profile.active)
  const { data } = useAsync(async () => {
    const c = await sb.from('chapters').select('*, lessons(*)').order('position'); const chs = (c.data || []).map(x => ({ ...x, lessons: x.lessons.sort((p, q) => p.position - q.position) }))
    if (!ok) return { chs, asg: [], res: [] }
    const [a, r] = await Promise.all([sb.from('assignments').select('id,title,lesson_id').eq('is_open', true), sb.from('lesson_resources').select('*').eq('active', true).order('position')])
    return { chs, asg: a.data || [], res: r.data || [] } }, [ok])
  const chs = data?.chs || [], u = chs[cur], dash = isAdmin ? '/admin' : '/dashboard'
  return <div className="pub-home" id="top">
    <header><div className="p-wrap p-bar">
      <Link className="p-brand" to="/" aria-label="الرئيسية"><img className="p-mark" src={mark} alt="" width="38" height="38" /><span>اكاديمية المهندس إبراهيم سعد</span></Link>
      <nav aria-label="التنقل الرئيسي"><a className="p-on" href="#top">الرئيسية</a><a href="#curriculum">المنهج</a><Link to={ok ? (isAdmin ? '/admin/assignments' : '/assignments') : '/auth'}>الواجبات</Link></nav>
      <div className="p-tools">
        <button className="p-btn p-theme" onClick={toggle} aria-label="تبديل الوضع الليلي والنهاري"><svg className="p-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg><svg className="p-moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg></button>
        {session && ok && !isAdmin && <NotificationBell />}
        {session ? <><Link className="p-btn p-fill" to={dash}>{isAdmin ? 'لوحة المدرس' : 'واجباتي'}</Link><button className="p-btn" onClick={async () => { await signOut(); nav('/') }}>خروج</button></>
          : <><Link className="p-btn" to="/auth?mode=up">إنشاء حساب</Link><Link className="p-btn p-fill" to="/auth">تسجيل الدخول</Link></>}
      </div></div></header>
    <main>
      <section className="p-hero"><div className="p-wrap"><div>
        <span className="p-tag"><svg viewBox="0 0 24 24"><path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z" /></svg>الصف الثاني الثانوي / البكالوريا</span>
        <h1>رحلتك نحو التفوق تبدأ من هنا</h1><p className="p-lead">منصة تعليمية متكاملة لمادة البرمجة وتكنولوجيا المعلومات: واجبات من كتاب الفائز، تصحيح فوري، ومراجعة لأخطائك.</p>
        <div className="p-cta"><Link className="p-btn p-main" to={session ? dash : '/auth?mode=up'}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"><path d="M7 4l13 8-13 8z" /></svg>{session ? 'ادخل الآن' : 'ابدأ الآن'}</Link><a className="p-btn p-big" href="#curriculum">استكشف المنهج</a></div></div>
        <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: art.replace('__MARK__', mark) }} /></div></section>
      <section className="p-cur" id="curriculum"><div className="p-wrap"><h2>استكشف المنهج</h2><p className="p-sub">الوحدات والدروس بترتيب الكتاب.</p>
        <div className="p-units" role="tablist">{chs.map((c, k) => <button key={c.id} className={`p-unit p-u${k % 4}`} role="tab" aria-selected={k === cur} onClick={() => { setCur(k); setOpen(null) }}><div className="p-ico"><svg viewBox="0 0 24 24"><path d={ICONS[k % 4]} /></svg></div><small>الوحدة {ORD[k] || k + 1}</small><b>{nm(c)}</b><span>{c.lessons.length} دروس</span></button>)}</div>
        {u && <><h3 className="p-lh">دروس الوحدة {ORD[cur] || cur + 1}: {nm(u)}</h3><div className="p-sub">{u.source_page ? `تبدأ من صفحة ${u.source_page}` : 'الدروس هتتضاف قريباً'}</div>
          <ul className="p-list">{u.lessons.map((l, k) => { const o = open === l.id, a = (data?.asg || []).filter(x => x.lesson_id === l.id), r = (data?.res || []).filter(x => x.lesson_id === l.id)
            return <li key={l.id}><button className="p-lesson" aria-expanded={o} onClick={() => setOpen(o ? null : l.id)}><span>{cur + 1}-{k + 1} {nm(l)}</span><span className="p-pg">{l.source_page ? 'ص ' + l.source_page : ''}</span><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg></button>
              <div className={'p-more' + (o ? ' p-open' : '')}>{!session ? <>سجّل الدخول لعرض شرح الدرس وواجباته. <Link to="/auth" style={{ color: 'var(--primary)', fontWeight: 700 }}>تسجيل الدخول</Link></> : !ok ? 'حسابك بانتظار تفعيل المدرس.' : <>
                {r.length > 0 && <><h4>شرح الدرس</h4><ResourceList items={r} /></>}{a.length > 0 && <><h4>الواجبات</h4>{a.map(x => <Link key={x.id} to={`/solve/${x.id}`}>{x.title}</Link>)}</>}{!r.length && !a.length && 'لا يوجد شرح أو واجبات لهذا الدرس حاليًا.'}</>}</div></li> })}</ul></>}
      </div></section></main>
    <footer>Eng. Ibrahim Saad - جميع الحقوق محفوظة</footer></div>
}
