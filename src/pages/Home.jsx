import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ChevronDown, ClipboardCheck, Code2, Globe, Play, ShieldCheck, Sparkles } from 'lucide-react'
import { sb } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import hero from '../assets/hero.webp'
import heroM from '../assets/hero-m.webp'
import { Badge, ErrorState, Progress, Skeleton, pct, useAsync } from '../components/ui'
const ord = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'], icons = [Sparkles, ShieldCheck, Globe, Code2]
export default function Home() {
  const { session } = useAuth(), [u, setU] = useState(0), [open, setOpen] = useState(null)
  const { data, loading, error, reload } = useAsync(async () => {
    const [c, a, t] = await Promise.all([sb.from('chapters').select('*, lessons(*)').order('position'), session ? sb.from('assignments').select('id,title,lesson_id').eq('is_open', true) : { data: [] }, session ? sb.from('attempts').select('status,assignments(lesson_id)').neq('status', 'in_progress') : { data: [] }])
    if (c.error) throw c.error
    const done = new Set((t.data || []).map(x => x.assignments?.lesson_id)); return { chs: (c.data || []).map(x => ({ ...x, lessons: x.lessons.sort((p, q) => p.position - q.position) })), asg: a.data || [], done } }, [session])
  const ch = data?.chs[u], name = c => c.title.split(':').slice(1).join(':').trim() || c.title
  return <>
    <section className="hero"><picture><source media="(max-width: 860px)" srcSet={heroM} /><img className="herobg" src={hero} alt="" fetchpriority="high" /></picture>
      <div className="in"><div className="herotxt"><Badge icon={BookOpen}>الصف الثاني الثانوي / البكالوريا</Badge>
      <h1 style={{ marginTop: 16 }}>رحلتك نحو التفوق تبدأ من هنا</h1><p className="lead">منصة تعليمية متكاملة لمادة البرمجة وتكنولوجيا المعلومات: واجبات من كتاب الفائز، تصحيح فوري، ومراجعة لأخطائك.</p>
      <div className="cta"><Link className="btn lg" to={session ? '/dashboard' : '/auth'}><Play size={18} className="i" />{session ? 'ادخل إلى واجباتي' : 'ابدأ الآن'}</Link><a className="btn secondary lg" href="#curriculum">استكشف المنهج</a></div></div></div></section>
    <section className="sec" id="curriculum"><div className="page" style={{ paddingBlock: 0 }}><h2>استكشف المنهج</h2><p className="sub">الوحدات والدروس بترتيب الكتاب{session ? '، ومعها تقدمك في كل وحدة.' : '.'}</p>
      {loading && <Skeleton lines={5} h={20} />}{error && <ErrorState onRetry={reload} />}
      {data && <><div className="unitcards" role="tablist" aria-label="الوحدات">{data.chs.map((c, i) => { const I = icons[i % 4], dn = c.lessons.filter(l => data.done.has(l.id)).length, p = pct(dn, c.lessons.length)
        return <button key={c.id} role="tab" aria-selected={u === i} className="ucard" onClick={() => { setU(i); setOpen(null) }}><span className={'tile t' + (i % 4 + 1)}><I size={24} className="i" /></span><small>الوحدة {ord[i] || i + 1}</small><h3>{name(c)}</h3><span className="muted small">{c.lessons.length} دروس</span>
          {session && <><div className="pct"><span>التقدم</span><b>{p}%</b></div><Progress value={p} /></>}</button> })}</div>
        {ch && <div role="tabpanel" style={{ marginTop: 24 }}><h3 style={{ fontSize: '1.15rem', marginBottom: 4 }}>دروس الوحدة {ord[u] || u + 1}: {name(ch)}</h3><p className="muted small" style={{ marginBottom: 12 }}>تبدأ من صفحة {ch.source_page ?? '—'}</p>
          <ul className="lessons">{ch.lessons.map((l, li) => { const a = data.asg.filter(x => x.lesson_id === l.id), o = open === l.id
            return <li key={l.id} className={a.length ? 'has' : ''}><button className="lbtn" aria-expanded={o} onClick={() => setOpen(o ? null : l.id)}><span><b>{u + 1}-{li + 1}</b> &nbsp;{name(l)}</span><span className="row muted small">{data.done.has(l.id) && <Badge tone="success">تم الحل</Badge>}ص {l.source_page ?? '—'}<ChevronDown size={16} className="i" style={{ transform: o ? 'rotate(180deg)' : '', transition: '.18s' }} /></span></button>
              {o && <div className="lsub">{!session ? <p className="small muted">سجّل الدخول لعرض واجبات هذا الدرس. <Link to="/auth" style={{ color: 'var(--c-primary)' }}>تسجيل الدخول</Link></p> : a.length ? a.map(x => <Link key={x.id} to={`/solve/${x.id}`} className="row" style={{ padding: '8px 0', textDecoration: 'none', color: 'var(--c-primary-dark)', fontWeight: 600 }}><ClipboardCheck size={17} className="i" />{x.title}</Link>) : <p className="small muted">لا توجد واجبات لهذا الدرس حاليًا.</p>}</div>}</li> })}</ul></div>}</>}</div></section></>
}
