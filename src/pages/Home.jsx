import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sb } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import hero from '../assets/academy-hero.jpg'
import { BRAND } from '../App'
const tones = ['cyan', 'blue', 'green', 'amber']
export default function Home() {
  const { session } = useAuth()
  const [chs, setChs] = useState([]), [asg, setAsg] = useState([]), [open, setOpen] = useState(null)
  useEffect(() => {
    sb.from('chapters').select('*, lessons(*)').order('position').then(({ data }) => setChs((data || []).map(c => ({ ...c, lessons: c.lessons.sort((a, b) => a.position - b.position) }))))
    if (session) sb.from('assignments').select('id,title,lesson_id').eq('is_open', true).then(({ data }) => setAsg(data || []))
  }, [session])
  const nl = chs.reduce((a, c) => a + c.lessons.length, 0), p2 = n => String(n).padStart(2, '0')
  return <>
    <section className="hero" style={{ backgroundImage: `linear-gradient(#0b1736d9,#0b1736f2),url(${hero})` }}>
      <span className="eyebrow">الصف الثاني الثانوي · بكالوريا · الجزء الأول</span>
      <h1>{BRAND}</h1><p className="lead">البرمجة والذكاء الاصطناعي</p><p>منهج الصف الثاني الثانوي في مكان واحد: من تأثير التكنولوجيا على المجتمع إلى الأمن السيبراني وبناء تطبيقات الويب.</p>
      <div className="cta"><Link className="btn" to={session ? '/dashboard' : '/auth'}>ابدأ التعلم</Link><a className="btn ghost" href="#curriculum">استعرض المنهج</a></div></section>
    <section className="wrap wide" id="curriculum"><p className="eyebrow dark">خريطة المنهج</p><h2 className="sec">أربع وحدات. رحلة واحدة واضحة.</h2><p className="muted">المحتويات بحسب ترتيب الكتاب وصفحات بداية كل درس.</p>
      <div className="stats2"><div><b>{p2(chs.length)}</b>وحدات</div><div><b>{nl}</b>درسًا</div></div>
      <div className="units">{chs.map((c, ci) => <div className={'unit ' + tones[ci % 4]} key={c.id}>
        <div className="unum">{p2(ci + 1)}</div><small>الوحدة {ci + 1}</small><h3>{c.title.split(':').slice(1).join(':').trim() || c.title}</h3><p className="muted">تبدأ من صفحة {c.source_page ?? '—'}</p>
        {c.lessons.map((l, li) => { const a = asg.filter(x => x.lesson_id === l.id), isOpen = open === l.id
          return <div key={l.id} className="lesson"><button className="lrow" onClick={() => setOpen(isOpen ? null : l.id)}><span><i className="code">{ci + 1}-{li + 1}</i>{l.title.split(':').slice(1).join(':').trim() || l.title}</span><small>ص {l.source_page ?? '—'}</small></button>
            {isOpen && <div className="sub">{!session ? <Link to="/auth">سجّل الدخول لعرض الواجبات</Link> : a.length ? a.map(x => <Link key={x.id} className="asg" to={`/solve/${x.id}`}>📝 {x.title}</Link>) : <span className="muted">لا توجد واجبات حاليًا</span>}</div>}</div> })}
        <Link className="btn sm ghost" to={session ? '/dashboard' : '/auth'}>عرض الدروس</Link></div>)}</div></section></>
}
