import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sb } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import hero from '../assets/academy-hero.jpg'
import { BRAND } from '../App'
export default function Home() {
  const { session } = useAuth()
  const [chs, setChs] = useState([]), [asg, setAsg] = useState([]), [open, setOpen] = useState(null)
  useEffect(() => {
    sb.from('chapters').select('*, lessons(*)').order('position').then(({ data }) => setChs((data || []).map(c => ({ ...c, lessons: c.lessons.sort((a, b) => a.position - b.position) }))))
    if (session) sb.from('assignments').select('id,title,lesson_id,ends_at').eq('is_open', true).then(({ data }) => setAsg(data || []))
  }, [session])
  return <>
    <section className="hero" style={{ backgroundImage: `linear-gradient(#0b1b3acc,#0b1b3aee),url(${hero})` }}>
      <h1>{BRAND}</h1><p>منصة طلاب الصف الثاني الثانوي / البكالوريا — البرمجة وتكنولوجيا المعلومات</p><p className="sub">م/ إبراهيم سعد</p>
      {!session && <Link className="btn" to="/auth">ابدأ الآن</Link>}</section>
    <section className="wrap">
      {chs.map(c => <div className="card" key={c.id}>
        <h3>{c.title}</h3>
        {c.lessons.map(l => { const a = asg.filter(x => x.lesson_id === l.id); const isOpen = open === l.id
          return <div key={l.id} className="lesson"><button className="lrow" onClick={() => setOpen(isOpen ? null : l.id)}><span>{l.title}</span><span>{isOpen ? '▲' : '▼'}</span></button>
            {isOpen && <div className="sub">{!session ? <Link to="/auth">سجّل الدخول لعرض الواجبات</Link> : a.length ? a.map(x => <Link key={x.id} className="asg" to={`/solve/${x.id}`}>📝 {x.title}</Link>) : <span className="muted">لا توجد واجبات حاليًا</span>}</div>}</div> })}
      </div>)}</section></>
}
