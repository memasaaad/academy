import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, ClipboardList, GraduationCap } from 'lucide-react'
import { sb } from '../lib/supabase'
import { Badge, EmptyState, ErrorState, PageSkeleton, Progress, friendly, pct, useAsync, useUi } from './ui'
import { ResourceList } from './Resources'
import './tracks.css'
export function Note({ text }) {
  return <div className="cb-note">{(text || '').split('```').map((p, i) => i % 2 ? <pre key={i} className="cb-code">{p.replace(/^\w*\n/, '').replace(/\n$/, '')}</pre> : p.trim() ? <p key={i}>{p.trim()}</p> : null)}</div>
}
export async function loadCurriculum(trackId) {
  let q = sb.from('chapters').select('*, lessons(*)').order('position'); q = trackId ? q.eq('track_id', trackId) : q.is('track_id', null)
  const c = await q; if (c.error) throw c.error
  const chs = (c.data || []).filter(x => x.active).map(x => ({ ...x, lessons: x.lessons.filter(l => l.active).sort((p, q) => p.position - q.position) })), ids = chs.flatMap(x => x.lessons.map(l => l.id))
  if (!chs.length) return { chs, asg: [], res: [], notes: {}, done: new Set(), att: [] }
  const [a, r, n, p, t] = await Promise.all([sb.from('assignments').select('id,title,lesson_id,chapter_id,starts_at,ends_at,auto_grade').eq('is_open', true), ids.length ? sb.from('lesson_resources').select('*').eq('active', true).in('lesson_id', ids).order('position') : { data: [] },
    ids.length ? sb.from('lesson_notes').select('lesson_id,body').in('lesson_id', ids) : { data: [] }, ids.length ? sb.from('lesson_progress').select('lesson_id').in('lesson_id', ids) : { data: [] }, sb.from('attempts').select('id,assignment_id,status')])
  const cids = new Set(chs.map(x => x.id)), lids = new Set(ids)
  return { chs, asg: (a.data || []).filter(x => lids.has(x.lesson_id) || (!x.lesson_id && cids.has(x.chapter_id))), res: r.data || [], notes: Object.fromEntries((n.data || []).map(x => [x.lesson_id, x.body])), done: new Set((p.data || []).map(x => x.lesson_id)), att: t.data || [] }
}
function Asg({ a, att }) {
  const mine = att.filter(x => x.assignment_id === a.id), live = mine.find(x => x.status === 'in_progress'), fin = mine.find(x => x.status !== 'in_progress'), now = Date.now()
  const soon = a.starts_at && new Date(a.starts_at) > now, over = a.ends_at && new Date(a.ends_at) < now, canSee = fin && (fin.status === 'graded' || a.auto_grade)
  return <div className="cb-asg"><ClipboardList size={18} className="i muted" /><span className="grow">{a.title}</span>
    {canSee ? <><Badge tone="success">تم التسليم</Badge><Link className="btn secondary sm" to={`/review/${fin.id}`}>مراجعة</Link></> : fin ? <Badge tone="warning">بانتظار التصحيح</Badge>
      : soon ? <Badge tone="info">لم يبدأ بعد</Badge> : over && !live ? <Badge tone="danger">انتهى</Badge> : <Link className="btn sm" to={`/solve/${a.id}`}>{live ? 'متابعة الحل' : 'ابدأ'}</Link>}</div>
}
// مستعرض الفصول والدروس/الأجزاء للطالب: الشرح (نص + فيديو + ملفات) + الواجبات + امتحان الفصل + علامة الإنهاء
export default function CurriculumBrowser({ trackId = null }) {
  const { toast } = useUi(), r = useAsync(() => loadCurriculum(trackId), [trackId]), [open, setOpen] = useState({}), [part, setPart] = useState(null), [over, setOver] = useState({}), w = trackId ? 'جزء' : 'درس'
  if (r.loading) return <PageSkeleton />; if (r.error) return <ErrorState onRetry={r.reload} />
  const d = r.data, isDone = id => id in over ? over[id] : d.done.has(id)
  const toggle = async (l, v) => { setOver(o => ({ ...o, [l.id]: v })); const res = v ? await sb.from('lesson_progress').insert({ lesson_id: l.id }) : await sb.from('lesson_progress').delete().eq('lesson_id', l.id); if (res.error) { setOver(o => ({ ...o, [l.id]: !v })); toast(friendly(res.error), 'error') } }
  if (!d.chs.length) return <EmptyState icon={GraduationCap} title="لا توجد فصول بعد" text="سيظهر المحتوى هنا فور إضافته من المدرس." />
  return <div>{d.chs.map((c, k) => {
    const o = open[c.id] ?? k === 0, total = c.lessons.length, nd = c.lessons.filter(l => isDone(l.id)).length, exams = d.asg.filter(x => !x.lesson_id && x.chapter_id === c.id)
    return <section key={c.id} className="cb-ch"><button className="cb-head" aria-expanded={o} onClick={() => setOpen({ ...open, [c.id]: !o })}><span className="num">{k + 1}</span>
      <span className="ttl"><b>{c.title}</b><span className="muted small">{total} {trackId ? 'أجزاء' : 'دروس'} · أنهيت {nd}{exams.length > 0 && ` · ${exams.length} امتحان`}</span></span>
      <span style={{ width: 90 }} className="hide-m"><Progress value={pct(nd, total)} ok={total > 0 && nd === total} /></span><ChevronDown size={18} className="i chev" /></button>
      {o && <div className="cb-body">{c.lessons.map(l => { const po = part === l.id, res = d.res.filter(x => x.lesson_id === l.id), asg = d.asg.filter(x => x.lesson_id === l.id), note = d.notes[l.id], dn = isDone(l.id)
        return <div key={l.id} className="cb-part"><button className="cb-prow" aria-expanded={po} onClick={() => setPart(po ? null : l.id)}><span className={'cb-dot' + (dn ? ' on' : '')} aria-label={dn ? 'منتهي' : 'غير منتهي'}>{dn && <Check size={14} className="i" />}</span>
          <span className="grow">{l.title}</span>{l.source_page ? <span className="muted small">ص {l.source_page}</span> : null}<ChevronDown size={16} className="i muted" style={{ transform: po ? 'rotate(180deg)' : '' }} /></button>
          {po && <div className="cb-more">
            {note && <><h4>الشرح</h4><Note text={note} /></>}
            {res.length > 0 && <><h4>فيديوهات وملفات الشرح</h4><div className="cb-res"><ResourceList items={res} /></div></>}
            {asg.length > 0 && <><h4>الواجبات</h4>{asg.map(a => <Asg key={a.id} a={a} att={d.att} />)}</>}
            {!note && !res.length && !asg.length && <p className="muted small" style={{ paddingTop: 10 }}>لم يضف المدرس شرحًا أو واجبات لهذا ال{w} بعد.</p>}
            <div style={{ marginTop: 14 }}><button className={'btn sm ' + (dn ? 'secondary' : 'success')} onClick={() => toggle(l, !dn)}><Check size={16} className="i" />{dn ? `إلغاء علامة الإنهاء` : `أنهيت هذا ال${w}`}</button></div></div>}</div> })}
        {!total && <p className="muted small" style={{ padding: 16 }}>لا توجد {trackId ? 'أجزاء' : 'دروس'} في هذا الفصل بعد.</p>}
        {exams.length > 0 && <div className="cb-exam" style={{ flexDirection: 'column', alignItems: 'stretch' }}><b>امتحان الفصل</b>{exams.map(a => <Asg key={a.id} a={a} att={d.att} />)}</div>}</div>}</section> })}</div>
}
