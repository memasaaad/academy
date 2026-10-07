import { useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { Alert, Avatar, Badge, Btn, EmptyState, ErrorState, Field, IconBtn, Modal, PageHeader, PageSkeleton, Pager, SearchInput, fdt, friendly, pct, usePager, useAsync, useUi } from '../../components/ui'
export default function Students() {
  const { confirm, toast } = useUi(), [q, setQ] = useState(''), [add, setAdd] = useState(false), [f, setF] = useState({ full_name: '', phone: '', password: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const { data, loading, error, reload } = useAsync(async () => {
    const [p, a] = await Promise.all([sb.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false }), sb.from('attempts').select('student_id,score,max_score,status,submitted_at,started_at')])
    if (p.error) throw p.error
    return p.data.map(s => { const m = (a.data || []).filter(x => x.student_id === s.id), d = m.filter(x => x.status !== 'in_progress'); return { ...s, n: d.length, avg: d.length ? Math.round(d.reduce((t, x) => t + pct(x.score, x.max_score), 0) / d.length) : null, last: m.map(x => x.submitted_at || x.started_at).sort().at(-1) } }) }, [])
  const list = (data || []).filter(s => !q || s.full_name.includes(q) || (s.phone || '').includes(q)), pg = usePager(list, 12)
  const call = async (method, body) => { const { data: { session } } = await sb.auth.getSession(); const r = await fetch('/api/students', { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'تعذر تنفيذ العملية'); return j }
  const save = async () => { setErr(''); setBusy(true); try { await call('POST', f); toast('تمت إضافة الطالب'); setAdd(false); setF({ full_name: '', phone: '', password: '' }); reload() } catch (e) { setErr(friendly(e)) } setBusy(false) }
  if (loading) return <PageSkeleton />; if (error) return <ErrorState onRetry={reload} />
  return <><PageHeader title="الطلاب" desc={`${data.length} طالب مسجل`}><Btn icon={Plus} onClick={() => setAdd(true)}>إضافة طالب</Btn></PageHeader>
    <div style={{ maxWidth: 360, marginBottom: 12 }}><SearchInput value={q} onChange={setQ} placeholder="ابحث بالاسم أو رقم الهاتف" /></div>
    {!list.length ? <EmptyState icon={Users} title={q ? 'لا توجد نتائج' : 'لا يوجد طلاب بعد'} text={q ? 'جرّب اسمًا أو رقمًا آخر.' : 'أضف طلابك من هنا، أو دعهم يسجلون بأنفسهم من صفحة الدخول.'} action={!q && <Btn onClick={() => setAdd(true)}>إضافة طالب</Btn>} /> :
      <div className="tablew cards"><table><thead><tr><th>الطالب</th><th>رقم الهاتف</th><th>الواجبات</th><th>المتوسط</th><th>آخر نشاط</th><th /></tr></thead><tbody>{pg.slice.map(s => <tr key={s.id}><td data-l="الطالب"><span className="row"><Avatar name={s.full_name} /><b>{s.full_name}</b></span></td><td data-l="الهاتف" className="ltr">{s.phone || '—'}</td><td data-l="الواجبات">{s.n}</td>
        <td data-l="المتوسط">{s.avg != null ? <Badge tone={s.avg >= 50 ? 'success' : 'danger'}>{s.avg}%</Badge> : <span className="muted">—</span>}</td><td data-l="آخر نشاط">{s.last ? fdt(s.last) : '—'}</td>
        <td><IconBtn icon={Trash2} label={`حذف ${s.full_name}`} onClick={async () => { if (await confirm('حذف الطالب؟', `سيُحذف ${s.full_name} وكل نتائجه نهائيًا.`)) try { await call('DELETE', { id: s.id }); toast('تم حذف الطالب'); reload() } catch (e) { toast(friendly(e), 'error') } }} /></td></tr>)}</tbody></table></div>}
    <Pager pg={pg} total={list.length} />
    {add && <Modal title="إضافة طالب" onClose={() => setAdd(false)} footer={<><Btn variant="secondary" onClick={() => setAdd(false)}>إلغاء</Btn><Btn disabled={busy || !f.full_name || !f.phone || f.password.length < 6} onClick={save}>{busy ? 'جارٍ الإضافة…' : 'إضافة الطالب'}</Btn></>}>
      <Alert>{err}</Alert><Field label="الاسم"><input value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} /></Field><Field label="رقم الهاتف" hint="يستخدمه الطالب لتسجيل الدخول"><input dir="ltr" inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></Field><Field label="كلمة المرور" hint="6 أحرف على الأقل"><input dir="ltr" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></Field></Modal>}</>
}
