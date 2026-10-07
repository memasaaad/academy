import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sb } from '../../lib/supabase'
import { LineChart } from '../../components/Charts'
import { useAuth } from '../../lib/auth'
export default function Overview() {
  const { profile } = useAuth(), [d, setD] = useState(null)
  useEffect(() => { (async () => {
    const c = t => sb.from(t).select('*', { count: 'exact', head: true })
    const [s, a, q, at, last] = await Promise.all([c('profiles').eq('role', 'student'), c('assignments'), c('questions'),
      sb.from('attempts').select('score,max_score,pending_count,assignments(title)').neq('status', 'in_progress').order('submitted_at', { ascending: false }).limit(200), sb.from('assignments').select('id,title,ends_at,is_open,lessons(title)').order('created_at', { ascending: false }).limit(4)])
    const rows = at.data || [], by = {}
    rows.forEach(r => { const k = r.assignments?.title || '—'; (by[k] ||= []).push(r.max_score ? r.score / r.max_score * 100 : 0) })
    const chart = Object.entries(by).slice(0, 7).reverse().map(([l, v]) => ({ l, v: Math.round(v.reduce((x, y) => x + y, 0) / v.length) }))
    const avg = rows.length ? Math.round(rows.reduce((x, r) => x + (r.max_score ? r.score / r.max_score * 100 : 0), 0) / rows.length) : 0
    setD({ s: s.count, a: a.count, q: q.count, avg, pending: rows.filter(r => r.pending_count > 0).length, chart, last: last.data || [] }) })() }, [])
  if (!d) return <div className="center">جارٍ التحميل…</div>
  return <div><h2 className="ptitle">مرحبًا أ. إبراهيم سعد 👋</h2><p className="muted">إليك نظرة عامة على منصة التعليم — {profile?.full_name}</p>
    <div className="stats"><div className="card st"><i className="b1">👥</i><b>{d.s}</b><span>إجمالي الطلاب</span></div><div className="card st"><i className="b2">📝</i><b>{d.a}</b><span>إجمالي الواجبات</span></div>
      <div className="card st"><i className="b3">❓</i><b>{d.q}</b><span>إجمالي الأسئلة</span></div><div className="card st"><i className="b4">🎯</i><b>{d.avg}%</b><span>متوسط الدرجات</span></div></div>
    {d.pending > 0 && <Link to="/admin/grading" className="card alert">✅ لديك {d.pending} تسليم بانتظار التصحيح — اضغط للتصحيح</Link>}
    <div className="two"><div className="card"><h3>تطور أداء الطلاب (متوسط % لكل واجب)</h3><LineChart data={d.chart} /></div>
      <div className="card"><h3>أحدث الواجبات</h3>{d.last.map(a => <div key={a.id} className="row lrow2"><div><b>{a.title}</b><div className="muted">{a.lessons?.title}</div></div><span className={'pill ' + (a.is_open ? 'g' : 'r')}>{a.is_open ? 'مفتوح' : 'مغلق'}</span></div>)}<Link className="link" to="/admin/assignments">عرض كل الواجبات</Link></div></div></div>
}
