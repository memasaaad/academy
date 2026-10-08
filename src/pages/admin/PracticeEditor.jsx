import { useState } from 'react'
import { Dumbbell, Pencil, Plus, Trash2 } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { Alert, Badge, Btn, EmptyState, Field, IconBtn, Modal, Skeleton, friendly, useAsync, useUi } from '../../components/ui'
// تدريب الجزء: أسئلة مع إجابتها وشرحها. تظهر للطالب في وضع التدريب فقط ولا تدخل في الواجبات.
const KINDS = { mcq: 'اختيار من متعدد (إجابة واحدة)', multi: 'اختيار من متعدد (أكثر من إجابة)', true_false: 'صح أو خطأ', text: 'إجابة كتابية قصيرة' }
const KEYS = ['A', 'B', 'C', 'D', 'E', 'F']
const blank = () => ({ kind: 'mcq', question: '', opts: ['', '', '', ''], correct: [], tf: 'true', answers: '', explanation: '' })
const toForm = it => ({ id: it.id, kind: it.kind, question: it.question, explanation: it.explanation || '', opts: it.kind === 'mcq' || it.kind === 'multi' ? [...it.options.map(o => o.text), ...Array(Math.max(0, 2 - it.options.length)).fill('')] : ['', '', '', ''], correct: it.kind === 'mcq' || it.kind === 'multi' ? it.correct.map(k => KEYS.indexOf(k)).filter(x => x >= 0) : [], tf: it.kind === 'true_false' ? it.correct[0] || 'true' : 'true', answers: it.kind === 'text' ? it.correct.join('\n') : '' })
export default function PracticeEditor({ lesson, onClose }) {
  const { confirm, toast } = useUi(), [f, setF] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const { data, loading, reload } = useAsync(async () => { const { data } = await sb.from('practice_items').select('*').eq('lesson_id', lesson.id).order('position').order('created_at'); return data || [] }, [lesson.id])
  const multi = f?.kind === 'multi', choice = f && (f.kind === 'mcq' || f.kind === 'multi')
  const save = async () => {
    setErr(''); if (!f.question.trim()) return setErr('اكتب نص السؤال.')
    let options = [], correct = []
    if (choice) { const used = f.opts.map((t, i) => ({ t: t.trim(), i })).filter(x => x.t); if (used.length < 2) return setErr('أضف خيارين على الأقل.'); const ok = f.correct.filter(i => used.some(x => x.i === i)); if (!ok.length) return setErr('حدّد الإجابة الصحيحة.'); if (f.kind === 'mcq' && ok.length > 1) return setErr('هذا النوع له إجابة صحيحة واحدة.'); options = used.map(x => ({ key: KEYS[x.i], text: x.t })); correct = ok.map(i => KEYS[i]) }
    else if (f.kind === 'true_false') { options = [{ key: 'true', text: 'صح' }, { key: 'false', text: 'خطأ' }]; correct = [f.tf] }
    else { correct = f.answers.split('\n').map(x => x.trim()).filter(Boolean); if (!correct.length) return setErr('اكتب الإجابة الصحيحة (يمكن كتابة أكثر من صيغة مقبولة، كل صيغة في سطر).') }
    setBusy(true); const row = { lesson_id: lesson.id, kind: f.kind, question: f.question.trim(), options, correct, explanation: f.explanation.trim() || null }
    const { error } = f.id ? await sb.from('practice_items').update(row).eq('id', f.id) : await sb.from('practice_items').insert({ ...row, position: (data?.length || 0) + 1 })
    setBusy(false); if (error) return setErr(friendly(error)); toast('تم حفظ السؤال'); setF(null); reload() }
  const del = async it => { if (await confirm('حذف سؤال التدريب؟', 'لن يظهر للطلاب بعد الآن.')) { const { error } = await sb.from('practice_items').delete().eq('id', it.id); error ? toast(friendly(error), 'error') : (toast('تم الحذف'), reload()) } }
  const setOpt = (i, v) => setF({ ...f, opts: f.opts.map((x, k) => k === i ? v : x) }), mark = i => setF({ ...f, correct: multi ? (f.correct.includes(i) ? f.correct.filter(x => x !== i) : [...f.correct, i]) : [i] })
  return <Modal wide title="تدريب الجزء" desc={lesson.title} onClose={onClose}>
    {!f ? <>
      <div className="row between" style={{ marginBottom: 10 }}><p className="muted small" style={{ margin: 0 }}>أسئلة للتدريب فقط: يرى الطالب ✅/❌ والشرح بعد كل سؤال، ولا تُحسب درجات.</p><Btn size="sm" icon={Plus} onClick={() => { setErr(''); setF(blank()) }}>إضافة سؤال</Btn></div>
      {loading ? <Skeleton lines={3} h={18} /> : !data.length ? <EmptyState icon={Dumbbell} title="لا توجد أسئلة تدريب" text="أضف أسئلة بإجاباتها وشرحها ليتدرب عليها الطالب." action={<Btn onClick={() => setF(blank())}>إضافة سؤال</Btn>} />
        : data.map((it, k) => <div key={it.id} className="card flat"><div className="row"><span className="grow"><b>{k + 1}. {it.question}</b><div className="small muted" style={{ marginTop: 4 }}>الإجابة: {it.kind === 'text' ? it.correct.join(' / ') : it.options.filter(o => it.correct.includes(o.key)).map(o => o.text).join('، ')}</div></span><Badge>{KINDS[it.kind].split(' (')[0]}</Badge><IconBtn icon={Pencil} label="تعديل" onClick={() => { setErr(''); setF(toForm(it)) }} /><IconBtn icon={Trash2} label="حذف" onClick={() => del(it)} /></div></div>)}
    </> : <>
      <Alert>{err}</Alert>
      <Field label="نوع السؤال"><select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value, correct: [] })}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="نص السؤال"><textarea rows={3} value={f.question} onChange={e => setF({ ...f, question: e.target.value })} /></Field>
      {choice && <div className="field"><span>الخيارات — حدّد {multi ? 'الإجابات الصحيحة' : 'الإجابة الصحيحة'}</span>{f.opts.map((t, i) => <div key={i} className="row" style={{ marginBlock: 4 }}><input type={multi ? 'checkbox' : 'radio'} name="ok" aria-label={`الخيار ${KEYS[i]} صحيح`} checked={f.correct.includes(i)} onChange={() => mark(i)} style={{ width: 20, height: 20, flex: 'none' }} /><b style={{ width: 20 }}>{KEYS[i]}</b><input value={t} onChange={e => setOpt(i, e.target.value)} placeholder={`الخيار ${KEYS[i]}`} /></div>)}
        {f.opts.length < 6 && <Btn size="sm" variant="ghost" icon={Plus} onClick={() => setF({ ...f, opts: [...f.opts, ''] })}>إضافة خيار</Btn>}</div>}
      {f.kind === 'true_false' && <Field label="الإجابة الصحيحة"><select value={f.tf} onChange={e => setF({ ...f, tf: e.target.value })}><option value="true">صح</option><option value="false">خطأ</option></select></Field>}
      {f.kind === 'text' && <Field label="الإجابة الصحيحة" hint="اكتب كل صيغة مقبولة في سطر مستقل (مثال: console.log)."><textarea rows={3} dir="auto" value={f.answers} onChange={e => setF({ ...f, answers: e.target.value })} /></Field>}
      <Field label="الشرح (يظهر بعد الإجابة)"><textarea rows={3} value={f.explanation} onChange={e => setF({ ...f, explanation: e.target.value })} /></Field>
      <div className="row"><Btn disabled={busy} onClick={save}>{busy ? 'جارٍ الحفظ…' : 'حفظ السؤال'}</Btn><Btn variant="secondary" onClick={() => setF(null)}>رجوع للقائمة</Btn></div></>}
  </Modal>
}
