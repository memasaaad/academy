import { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
export default function Students() {
  const [list, setList] = useState([]), [f, setF] = useState({ full_name: '', phone: '', password: '' }), [msg, setMsg] = useState('')
  const load = async () => setList((await sb.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false })).data || [])
  useEffect(() => { load() }, [])
  const call = async (method, body) => { const { data: { session } } = await sb.auth.getSession(); const r = await fetch('/api/students', { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'خطأ'); return j }
  const add = async e => { e.preventDefault(); try { await call('POST', f); setF({ full_name: '', phone: '', password: '' }); setMsg('تمت الإضافة ✓'); load() } catch (er) { setMsg(er.message) } }
  return <div><form className="card" onSubmit={add}><h3>إضافة طالب</h3><div className="grid2"><label>الاسم<input required value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} /></label>
    <label>الهاتف<input required dir="ltr" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></label><label>كلمة المرور<input required minLength={6} dir="ltr" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label></div>
    <button className="btn sm">إضافة</button>{msg && <p>{msg}</p>}</form>
    <p className="muted">{list.length} طالب</p>
    {list.map(s => <div key={s.id} className="card row"><div><b>{s.full_name}</b><div className="muted" dir="ltr">{s.phone}</div></div>
      <button className="link danger" onClick={async () => { if (confirm('حذف الطالب وكل نتائجه؟')) { try { await call('DELETE', { id: s.id }); load() } catch (er) { setMsg(er.message) } } }}>حذف</button></div>)}</div>
}
