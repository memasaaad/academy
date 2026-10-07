import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ChevronDown, ClipboardCheck, FileText, ListChecks, Play } from 'lucide-react'
import { sb } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { BRAND } from '../lib/brand'
import { Badge, Btn, ErrorState, Skeleton, useAsync } from '../components/ui'
const demo = { q: 'ما الذي يصفه قانون مور؟', o: ['سرعة الإنترنت', 'زيادة عدد الترانزستورات', 'حجم الحواسب', 'عدد المستخدمين'], right: 1 }
function Demo() {
  const [s, setS] = useState(null)
  return <div className="demo" aria-label="مثال لسؤال من الكتاب"><div className="dh"><span>الدرس 1-1 · اختيار من متعدد</span><span>السؤال 1 من 10</span></div><h3>{demo.q}</h3>
    {demo.o.map((t, i) => <label key={i} className={'opt' + (s === i ? (i === demo.right ? ' right' : ' on') : s != null && i === demo.right ? ' right' : '')}><input type="radio" name="demo" onChange={() => setS(i)} /><span className="k">{'أبجد'[i]}</span>{t}</label>)}
    <p className="small muted" style={{ marginTop: 12, minHeight: 22 }}>{s == null ? 'جرّب اختيار إجابة.' : s === demo.right ? 'إجابة صحيحة.' : 'إجابة خاطئة، الصحيح مظلل بالأخضر.'}</p></div>
}
export default function Home() {
  const { session } = useAuth(), [u, setU] = useState(0), [open, setOpen] = useState(null)
  const { data, loading, error, reload } = useAsync(async () => {
    const [c, a] = await Promise.all([sb.from('chapters').select('*, lessons(*)').order('position'), session ? sb.from('assignments').select('id,title,lesson_id').eq('is_open', true) : { data: [] }])
    if (c.error) throw c.error; return { chs: (c.data || []).map(x => ({ ...x, lessons: x.lessons.sort((p, q) => p.position - q.position) })), asg: a.data || [] } }, [session])
  const ch = data?.chs[u], nl = data?.chs.reduce((a, c) => a + c.lessons.length, 0)
  return <>
    <section className="hero"><div className="in"><div><Badge icon={BookOpen}>الصف الثاني الثانوي / البكالوريا · الجزء الأول</Badge>
      <h1 style={{ marginTop: 16 }}>{BRAND}</h1><p className="lead">واجبات على أسئلة كتاب البرمجة وتكنولوجيا المعلومات، بتصحيح فوري ومراجعة لأخطائك.</p>
      <div className="cta"><Link className="btn lg" to={session ? '/dashboard' : '/auth'}><Play size={18} className="i" />{session ? 'ادخل إلى واجباتي' : 'ابدأ الآن'}</Link><a className="btn secondary lg" href="#curriculum">استعرض المنهج</a></div></div><Demo /></div></section>
    <section className="sec" id="curriculum"><div className="page" style={{ paddingBlock: 0 }}><h2>المنهج كما في الكتاب</h2><p className="sub">{data ? `${data.chs.length} وحدات و${nl} درسًا، مرتبة بحسب صفحات الكتاب.` : 'خريطة الوحدات والدروس.'}</p>
      {loading && <Skeleton lines={6} />}{error && <ErrorState onRetry={reload} />}
      {data && <div className="units"><div className="unitnav" role="tablist" aria-label="الوحدات">{data.chs.map((c, i) => <button key={c.id} role="tab" aria-selected={u === i} onClick={() => { setU(i); setOpen(null) }}><span className="n">{i + 1}</span><span>{c.title.split(':').slice(1).join(':').trim() || c.title}</span></button>)}</div>
        {ch && <div role="tabpanel"><div className="row between wrapx" style={{ marginBottom: 12 }}><div><h3 style={{ fontSize: '1.2rem' }}>الوحدة {u + 1}: {ch.title.split(':').slice(1).join(':').trim() || ch.title}</h3><p className="muted small">{ch.lessons.length} دروس · تبدأ من صفحة {ch.source_page ?? '—'}</p></div></div>
          <ul className="lessons">{ch.lessons.map((l, li) => { const a = data.asg.filter(x => x.lesson_id === l.id), o = open === l.id
            return <li key={l.id} className={a.length ? 'has' : ''}><button className="lbtn" aria-expanded={o} onClick={() => setOpen(o ? null : l.id)}><span><b>{u + 1}-{li + 1}</b> &nbsp;{l.title.split(':').slice(1).join(':').trim() || l.title}</span><span className="row muted small">ص {l.source_page ?? '—'}<ChevronDown size={16} className="i" style={{ transform: o ? 'rotate(180deg)' : '', transition: '.18s' }} /></span></button>
              {o && <div className="lsub">{!session ? <p className="small muted">سجّل الدخول لعرض واجبات هذا الدرس. <Link to="/auth" style={{ color: 'var(--c-primary)' }}>تسجيل الدخول</Link></p> : a.length ? a.map(x => <Link key={x.id} to={`/solve/${x.id}`} className="row" style={{ padding: '8px 0', textDecoration: 'none', color: 'var(--c-primary-dark)', fontWeight: 600 }}><ClipboardCheck size={17} className="i" />{x.title}</Link>) : <p className="small muted">لا توجد واجبات لهذا الدرس حاليًا.</p>}</div>}</li> })}</ul></div>}</div>}</div></section>
    <section style={{ background: 'var(--c-surface)', borderBlock: '1px solid var(--c-border)' }}><div className="page" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 24, paddingBlock: 40 }}>
      {[[FileText, 'أسئلة من الكتاب نفسه', 'كل سؤال محفوظ برقم صفحته الأصلية.'], [ListChecks, 'تصحيح فوري', 'الأسئلة الموضوعية تُصحح تلقائيًا، والمقالي يراجعه المدرس.'], [ClipboardCheck, 'مراجعة الأخطاء', 'بعد النتيجة ترى إجابتك والإجابة الصحيحة وملاحظات المدرس.']].map(([I, t, d]) => <div key={t} className="row" style={{ alignItems: 'flex-start' }}><span className="kpi" style={{ padding: 10, border: 0 }}><span className="ic"><I size={20} className="i" /></span></span><div><h3 style={{ fontSize: '1rem' }}>{t}</h3><p className="muted small">{d}</p></div></div>)}</div></section></>
}
