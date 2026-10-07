import { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import { TYPES, validate, importQuestions, exportQuestions, download } from '../../lib/qio'
export default function Import() {
  const [lessons, setLessons] = useState([]), [target, setTarget] = useState(''), [list, setList] = useState(null), [name, setName] = useState(''), [pct, setPct] = useState(null), [msg, setMsg] = useState('')
  useEffect(() => { sb.from('lessons').select('id,title,chapters(title,position)').order('position').then(({ data }) => setLessons((data || []).sort((a, b) => a.chapters.position - b.chapters.position))) }, [])
  const pick = async e => { const f = e.target.files[0]; if (!f) return; setMsg(''); try { const l = JSON.parse(await f.text()); if (!Array.isArray(l)) throw new Error('الملف يجب أن يكون قائمة أسئلة'); setList(l); setName(f.name) } catch (er) { setMsg('ملف غير صالح: ' + er.message); setList(null) } }
  const run = async () => { setPct(0); try { const r = await importQuestions(list, setPct, { lessonId: target || null }); setMsg(`✅ تم استيراد ${r.count} سؤال`); setList(null) } catch (er) { setMsg('خطأ: ' + (er.message || JSON.stringify(er))) } setPct(null) }
  const errs = list ? validate(list) : [], types = list ? Object.entries(list.reduce((a, q) => ({ ...a, [q.question_type]: (a[q.question_type] || 0) + 1 }), {})) : []
  return <div><h2 className="ptitle">استيراد وتصدير الأسئلة</h2>
    <div className="card"><h3>1) اختر ملف الأسئلة (JSON)</h3><input type="file" accept=".json" onChange={pick} />
      <h3>2) في أي درس تُوضع الأسئلة؟</h3>
      <select value={target} onChange={e => setTarget(e.target.value)}><option value="">حسب الفصل والدرس المكتوبين داخل الملف</option>{lessons.map(l => <option key={l.id} value={l.id}>{l.chapters.title.split(':')[0]} — {l.title}</option>)}</select>
      <p className="muted">اختيار درس هنا يضع كل أسئلة الملف داخله بغض النظر عن المكتوب في الملف.</p>
      {list && <><h3>3) معاينة: {name} — {list.length} سؤال</h3><p>{types.map(([t, n]) => <span key={t} className="tag">{TYPES[t] || t}: {n}</span>)}</p>
        {errs.length > 0 && <div className="warnbox"><b>{errs.length} تنبيه (ستُعلّم الأسئلة «تحتاج مراجعة»)</b>{errs.slice(0, 5).map(e => <div key={e}>{e}</div>)}</div>}
        <div className="tblwrap"><table><thead><tr><th>النوع</th><th>السؤال</th><th>الإجابة</th><th>ص</th></tr></thead><tbody>{list.slice(0, 8).map((q, i) => <tr key={i}><td>{TYPES[q.question_type]}</td><td>{(q.question_text || '').slice(0, 60)}</td><td>{JSON.stringify(q.correct_answer)?.slice(0, 20)}</td><td>{q.source_page}</td></tr>)}</tbody></table></div>
        <button className="btn" disabled={pct != null} onClick={run}>استيراد الآن</button></>}
      {pct != null && <div className="prog"><div style={{ width: pct + '%' }} /></div>}{msg && <p>{msg}</p>}</div>
    <div className="card"><h3>تصدير بنك الأسئلة كاملًا</h3><p className="muted">ملف بنفس الصيغة يمكن إعادة رفعه لاحقًا.</p><button className="btn ghost" onClick={async () => download(await exportQuestions(), 'questions-export.json')}>تصدير JSON</button></div></div>
}
