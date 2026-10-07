import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileJson, Upload } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { TYPES, validate, importQuestions, exportQuestions, download } from '../../lib/qio'
import { Alert, Badge, Btn, Field, PageHeader, Progress, friendly, useAsync, useUi } from '../../components/ui'
export default function Import() {
  const { toast } = useUi(), ref = useRef(), [target, setTarget] = useState(''), [list, setList] = useState(null), [name, setName] = useState(''), [pct, setPct] = useState(null), [msg, setMsg] = useState(''), [over, setOver] = useState(false), [exp, setExp] = useState(false)
  const { data: lessons } = useAsync(async () => ((await sb.from('lessons').select('id,title,chapters(title,position)').order('position')).data || []).sort((a, b) => a.chapters.position - b.chapters.position), [])
  const read = async f => { if (!f) return; setMsg(''); try { const l = JSON.parse(await f.text()); if (!Array.isArray(l)) throw new Error('يجب أن يحتوي الملف على قائمة أسئلة'); setList(l); setName(f.name) } catch (e) { setList(null); setMsg('تعذر قراءة الملف: ' + friendly(e)) } }
  const run = async () => { setPct(0); try { const r = await importQuestions(list, setPct, { lessonId: target || null }); toast(`تم استيراد ${r.count} سؤال`); setList(null) } catch (e) { setMsg(friendly(e)) } setPct(null) }
  const errs = list ? validate(list) : [], review = list ? list.filter(q => q.needs_review).length : 0, lessonsN = list ? new Set(list.map(q => q.lesson)).size : 0, types = list ? Object.entries(list.reduce((a, q) => ({ ...a, [q.question_type]: (a[q.question_type] || 0) + 1 }), {})) : []
  return <><PageHeader title="استيراد وتصدير الأسئلة" desc="ارفع ملف JSON لإضافة أسئلة دروس جديدة، أو صدّر البنك كاملًا." />
    <div className="card"><h3>1. اختر الملف</h3><div className={'drop' + (over ? ' over' : '')} role="button" tabIndex={0} onClick={() => ref.current.click()} onKeyDown={e => e.key === 'Enter' && ref.current.click()} onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); read(e.dataTransfer.files[0]) }}>
      <div className="ic"><Upload size={30} className="i" /></div><b>اسحب ملف JSON هنا</b><p className="muted small">أو اضغط لاختيار ملف من جهازك</p><input ref={ref} hidden type="file" accept=".json,application/json" onChange={e => { read(e.target.files[0]); e.target.value = '' }} /></div><Alert>{msg}</Alert></div>
    {list && <div className="card"><h3>2. المعاينة</h3><div className="row" style={{ marginBottom: 12 }}><FileJson size={22} className="i" /><b className="ltr">{name}</b></div>
      <div className="stack"><div className="row"><CheckCircle2 size={18} className="i" style={{ color: 'var(--c-success)' }} />{list.length} سؤال في {lessonsN} {lessonsN === 1 ? 'درس' : 'دروس'}</div>{review + errs.length > 0 && <div className="row"><AlertTriangle size={18} className="i" style={{ color: 'var(--c-warning)' }} />{Math.max(review, errs.length)} سؤال تحتاج مراجعة (ستُعلّم تلقائيًا)</div>}</div>
      <div className="row wrapx" style={{ margin: '12px 0' }}>{types.map(([t, n]) => <Badge key={t} tone="primary">{TYPES[t] || t}: {n}</Badge>)}</div>
      <Field label="3. في أي درس تُوضع الأسئلة؟" hint="اختيار درس يضع كل أسئلة الملف داخله بغض النظر عن المكتوب في الملف."><select value={target} onChange={e => setTarget(e.target.value)}><option value="">حسب الفصل والدرس المكتوبين داخل الملف</option>{lessons?.map(l => <option key={l.id} value={l.id}>{l.chapters.title.split(':')[0]} — {l.title}</option>)}</select></Field>
      {errs.length > 0 && <Alert tone="warning"><b>تنبيهات:</b> {errs.slice(0, 3).join(' · ')}</Alert>}
      {pct != null && <Progress value={pct} />}<Btn size="lg" style={{ marginTop: 12 }} disabled={pct != null} onClick={run}>{pct != null ? `جارٍ الاستيراد ${pct}%` : 'استيراد الأسئلة'}</Btn></div>}
    <div className="card"><h3>تصدير بنك الأسئلة</h3><p className="muted small" style={{ marginBottom: 12 }}>ملف بنفس الصيغة يمكن إعادة رفعه لاحقًا.</p><Btn variant="secondary" icon={Download} disabled={exp} onClick={async () => { setExp(true); try { download(await exportQuestions(), 'questions-export.json'); toast('تم تصدير الأسئلة') } catch (e) { toast(friendly(e), 'error') } setExp(false) }}>{exp ? 'جارٍ التصدير…' : 'تصدير JSON'}</Btn></div></>
}
