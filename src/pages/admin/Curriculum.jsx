import { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
export default function Curriculum() {
  const [chs, setChs] = useState([]), [msg, setMsg] = useState('')
  const load = async () => { const { data } = await sb.from('chapters').select('*, lessons(*)').order('position'); setChs((data || []).map(c => ({ ...c, lessons: c.lessons.sort((a, b) => a.position - b.position) }))) }
  useEffect(() => { load() }, [])
  const run = async p => { const { error } = await p; setMsg(error ? error.message : ''); load() }
  const ask = (t, d = '') => prompt(t, d)
  return <div>{msg && <p className="err">{msg}</p>}
    <button className="btn sm" onClick={() => { const t = ask('عنوان الفصل'); if (t) run(sb.from('chapters').insert({ title: t, position: chs.length + 1 })) }}>+ إضافة فصل</button>
    {chs.map(c => <div className="card" key={c.id}><div className="row"><h3>{c.title}{!c.active && ' (مخفي)'}</h3><span>
      <button className="link" onClick={() => { const t = ask('تعديل الفصل', c.title); if (t) run(sb.from('chapters').update({ title: t }).eq('id', c.id)) }}>تعديل</button>
      <button className="link" onClick={() => run(sb.from('chapters').update({ active: !c.active }).eq('id', c.id))}>{c.active ? 'إخفاء' : 'إظهار'}</button>
      <button className="link danger" onClick={() => confirm('حذف الفصل بكل دروسه وأسئلته؟') && run(sb.from('chapters').delete().eq('id', c.id))}>حذف</button></span></div>
      {c.lessons.map(l => <div key={l.id} className="row lrow"><span>{l.title}{!l.active && ' (مخفي)'}</span><span>
        <button className="link" onClick={() => { const t = ask('تعديل الدرس', l.title); if (t) run(sb.from('lessons').update({ title: t }).eq('id', l.id)) }}>تعديل</button>
        <button className="link" onClick={() => run(sb.from('lessons').update({ active: !l.active }).eq('id', l.id))}>{l.active ? 'إخفاء' : 'إظهار'}</button>
        <button className="link danger" onClick={() => confirm('حذف الدرس بكل أسئلته؟') && run(sb.from('lessons').delete().eq('id', l.id))}>حذف</button></span></div>)}
      <button className="link" onClick={() => { const t = ask('عنوان الدرس'); if (t) run(sb.from('lessons').insert({ chapter_id: c.id, title: t, position: c.lessons.length + 1 })) }}>+ إضافة درس</button></div>)}</div>
}
