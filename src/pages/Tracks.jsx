import { Link, useParams } from 'react-router-dom'
import { ArrowRight, BookOpen, Layers } from 'lucide-react'
import { sb } from '../lib/supabase'
import { EmptyState, ErrorState, PageHeader, PageSkeleton, Progress, pct, useAsync } from '../components/ui'
import CurriculumBrowser from '../components/CurriculumBrowser'
import { AnnList, useAnnouncements } from '../components/Announcements'
import { TrackArt, themeVars } from '../components/TrackArt'
import '../components/tracks.css'
async function loadTracks() {
  const [t, c, p] = await Promise.all([sb.from('tracks').select('*').eq('active', true).order('position'), sb.from('chapters').select('track_id,active,lessons(id,active)').not('track_id', 'is', null).eq('active', true), sb.from('lesson_progress').select('lesson_id')])
  if (t.error) throw t.error
  const done = new Set((p.data || []).map(x => x.lesson_id))
  return (t.data || []).map(x => { const ls = (c.data || []).filter(y => y.track_id === x.id).flatMap(y => y.lessons.filter(l => l.active)); return { ...x, total: ls.length, done: ls.filter(l => done.has(l.id)).length } })
}
export function TrackCard({ t, to }) {
  return <Link to={to} className={'trk-card' + (t.active === false ? ' off' : '')} style={themeVars(t.theme)}><h3>{t.title}</h3><TrackArt />
    <div className="trk-foot"><div className="trk-sub">{t.subtitle}</div>{t.total != null && <><div className="trk-bar"><i style={{ width: pct(t.done, t.total) + '%' }} /></div><div className="trk-pct">{t.total ? `${t.done} من ${t.total} أجزاء` : 'قريبًا'}</div></>}</div></Link>
}
export function TracksHome() {
  const r = useAsync(loadTracks, [])
  return <div className="page"><PageHeader title="مسارات البرمجة" desc="تعلّم خطوة بخطوة: اختر مسارًا، ثم افتح الفصول وشاهد الشرح وحل الامتحانات." />
    {r.loading ? <PageSkeleton /> : r.error ? <ErrorState onRetry={r.reload} /> : r.data.length ? <div className="trk-grid">{r.data.map(t => <TrackCard key={t.id} t={t} to={`/tracks/${t.id}`} />)}</div>
      : <EmptyState icon={Layers} title="لا توجد مسارات بعد" text="سيظهر هنا كل مسار برمجة يضيفه المدرس." action={<Link className="btn secondary" to="/learn">اذهب إلى المنهج</Link>} />}</div>
}
export function TrackView() {
  const an = useAnnouncements(), { id } = useParams(), r = useAsync(async () => { const [t, l] = await Promise.all([sb.from('tracks').select('*').eq('id', id).maybeSingle(), loadTracks()]); if (t.error) throw t.error; return t.data ? l.find(x => x.id === id) || t.data : null }, [id])
  if (r.loading) return <div className="page"><PageSkeleton /></div>; if (r.error) return <div className="page"><ErrorState onRetry={r.reload} /></div>
  const t = r.data
  if (!t) return <div className="page"><EmptyState icon={Layers} title="المسار غير موجود" text="ربما أُخفي أو حُذف." action={<Link className="btn" to="/tracks">كل المسارات</Link>} /></div>
  return <div className="page"><Link className="btn ghost sm" to="/tracks" style={{ marginBottom: 12 }}><ArrowRight size={16} className="i" />كل المسارات</Link>
    <div className="trk-banner" style={themeVars(t.theme)}><TrackArt /><div className="grow"><h1>{t.title}</h1>{t.subtitle && <p>{t.subtitle}</p>}{t.total != null && <><div className="trk-bar"><i style={{ width: pct(t.done, t.total) + '%' }} /></div><div className="trk-pct">{t.done} من {t.total} أجزاء مكتملة</div></>}</div></div>
    <AnnList items={(an.data || []).filter(x => x.track_id === id)} /><CurriculumBrowser trackId={id} /></div>
}
export function Learn() {
  return <div className="page"><PageHeader title="المنهج الدراسي" desc="فصول ودروس الكتاب: الشرح والواجبات في مكان واحد." /><CurriculumBrowser /></div>
}
