import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { Badge, EmptyState, ErrorState, PageHeader, PageSkeleton, Pager, fdt, nf, pct, usePager, useAsync } from '../../components/ui'
export default function Results() {
  const [sel, setSel] = useState(''), [sort, setSort] = useState('score')
  const { data, loading, error, reload } = useAsync(async () => { const [a, r] = await Promise.all([sb.from('assignments').select('id,title').order('created_at', { ascending: false }), sb.from('attempts').select('*, profiles(full_name), assignments(title)').neq('status', 'in_progress')]); if (r.error) throw r.error; return { asg: a.data || [], rows: r.data || [] } }, [])
  const rows = (data?.rows || []).filter(r => !sel || r.assignment_id === sel).sort((a, b) => sort === 'score' ? pct(b.score, b.max_score) - pct(a.score, a.max_score) : new Date(b.submitted_at) - new Date(a.submitted_at)), pg = usePager(rows, 15)
  if (loading) return <PageSkeleton />; if (error) return <ErrorState onRetry={reload} />
  return <><PageHeader title="النتائج" desc="نتائج الطلاب في الواجبات المسلّمة." />
    <div className="filterbar"><select aria-label="الواجب" value={sel} onChange={e => setSel(e.target.value)}><option value="">كل الواجبات</option>{data.asg.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select><select aria-label="الترتيب" value={sort} onChange={e => setSort(e.target.value)}><option value="score">من الأعلى للأقل</option><option value="date">الأحدث تسليمًا</option></select></div>
    <p className="muted small" style={{ marginBottom: 8 }}>{rows.length} تسليم · نسبة النجاح (50% فأكثر): {rows.length ? Math.round(rows.filter(r => pct(r.score, r.max_score) >= 50).length / rows.length * 100) : 0}%</p>
    {!rows.length ? <EmptyState icon={Trophy} title="لا توجد نتائج بعد" text="ستظهر النتائج هنا بعد أن يسلّم الطلاب واجباتهم." /> : <div className="tablew cards"><table><thead><tr><th>#</th><th>الطالب</th><th>الواجب</th><th>الدرجة</th><th>النسبة</th><th>صحيحة</th><th>خطأ</th><th>غير مصحح</th><th>التسليم</th><th /></tr></thead><tbody>{pg.slice.map((r, i) => { const p = pct(r.score, r.max_score); return <tr key={r.id}><td data-l="#">{pg.page * 15 + i + 1}</td><td data-l="الطالب"><b>{r.profiles?.full_name}</b></td><td data-l="الواجب">{r.assignments?.title}</td><td data-l="الدرجة">{nf(r.score)} / {nf(r.max_score)}</td><td data-l="النسبة"><Badge tone={p >= 50 ? 'success' : 'danger'}>{p}%</Badge></td><td data-l="صحيحة">{r.correct_count}</td><td data-l="خطأ">{r.wrong_count}</td><td data-l="غير مصحح">{r.pending_count ? <Badge tone="warning">{r.pending_count}</Badge> : '—'}</td><td data-l="التسليم">{fdt(r.submitted_at)}</td><td><Link className="btn ghost sm" to={`/review/${r.id}`}>عرض الحل</Link></td></tr> })}</tbody></table></div>}
    <Pager pg={pg} total={rows.length} /></>
}
