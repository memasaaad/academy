import { Link, useParams } from 'react-router-dom'
import { Award, Printer } from 'lucide-react'
import { sb } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Btn, EmptyState, ErrorState, PageSkeleton, fdate, useAsync } from '../components/ui'
import mark from '../pub/mark.webp'
import '../components/insights.css'
export default function Certificate() {
  const { id } = useParams(), { profile } = useAuth()
  const r = useAsync(async () => {
    const [t, c, p] = await Promise.all([sb.from('tracks').select('title').eq('id', id).maybeSingle(), sb.from('chapters').select('active,lessons(id,active)').eq('track_id', id).eq('active', true), sb.from('lesson_progress').select('lesson_id,completed_at')])
    if (t.error) throw t.error; const ids = (c.data || []).flatMap(x => x.lessons.filter(l => l.active).map(l => l.id)), done = new Map((p.data || []).map(x => [x.lesson_id, x.completed_at]))
    const ok = ids.length > 0 && ids.every(x => done.has(x)); return { title: t.data?.title, ok, date: ok ? ids.map(x => done.get(x)).sort().pop() : null } }, [id])
  if (r.loading) return <div className="page"><PageSkeleton /></div>; if (r.error) return <div className="page"><ErrorState onRetry={r.reload} /></div>
  const d = r.data
  if (!d.title || !d.ok) return <div className="page"><EmptyState icon={Award} title="الشهادة غير متاحة بعد" text="تظهر الشهادة بعد إنهاء كل أجزاء المسار." action={<Link className="btn" to={d.title ? `/tracks/${id}` : '/tracks'}>العودة للمسار</Link>} /></div>
  return <div className="page"><div className="cert"><img src={mark} alt="" /><p className="muted">أكاديمية المهندس إبراهيم سعد</p><h1>شهادة إتمام مسار</h1><p>تشهد الأكاديمية بأن</p><div className="who">{profile?.full_name}</div><p>قد أتمّ بنجاح جميع أجزاء مسار</p><h2 style={{ margin: '8px 0' }}>{d.title}</h2>
    <div className="meta"><span>تاريخ الإتمام: {fdate(d.date)}</span><span>Eng. Ibrahim Saad</span></div></div>
    <div className="row noprint" style={{ justifyContent: 'center' }}><Btn icon={Printer} onClick={() => window.print()}>طباعة / حفظ PDF</Btn><Link className="btn secondary" to={`/tracks/${id}`}>رجوع</Link></div></div>
}
