import { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
export default function Results() {
  const [rows, setRows] = useState([]), [asg, setAsg] = useState([]), [sel, setSel] = useState('')
  useEffect(() => { sb.from('assignments').select('id,title').order('created_at', { ascending: false }).then(({ data }) => setAsg(data || [])) }, [])
  useEffect(() => { let q = sb.from('attempts').select('*, profiles(full_name), assignments(title)').neq('status', 'in_progress'); if (sel) q = q.eq('assignment_id', sel); q.then(({ data }) => setRows((data || []).sort((a, b) => b.score - a.score))) }, [sel])
  const pct = r => r.max_score ? Math.round(r.score / r.max_score * 100) : 0
  return <div><select value={sel} onChange={e => setSel(e.target.value)}><option value="">كل الواجبات</option>{asg.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select>
    <p className="muted">{rows.length} تسليم • نسبة النجاح (≥50%): {rows.length ? Math.round(rows.filter(r => pct(r) >= 50).length / rows.length * 100) : 0}%</p>
    <div className="tblwrap"><table><thead><tr><th>#</th><th>الطالب</th><th>الواجب</th><th>الدرجة</th><th>%</th><th>صحيحة</th><th>خطأ</th><th>مقالي غير مصحح</th><th>التسليم</th></tr></thead>
      <tbody>{rows.map((r, i) => <tr key={r.id}><td>{i + 1}</td><td>{r.profiles?.full_name}</td><td>{r.assignments?.title}</td><td>{+r.score.toFixed(2)} / {+r.max_score.toFixed(2)}</td><td className={pct(r) >= 50 ? 'okc' : 'badc'}>{pct(r)}%</td><td>{r.correct_count}</td><td>{r.wrong_count}</td><td>{r.pending_count || '—'}</td><td>{r.submitted_at && new Date(r.submitted_at).toLocaleString('ar-EG')}</td></tr>)}</tbody></table></div></div>
}
