import { useState } from 'react'
import { ChevronDown, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { sb } from '../../lib/supabase'
import { Badge, Btn, EmptyState, ErrorState, IconBtn, PageHeader, PageSkeleton, friendly, useAsync, useUi } from '../../components/ui'
export default function Curriculum() {
  const { ask, confirm, toast } = useUi(), [open, setOpen] = useState({})
  const { data: chs, loading, error, reload } = useAsync(async () => { const { data, error } = await sb.from('chapters').select('*, lessons(*, questions(count))').order('position'); if (error) throw error; return data.map(c => ({ ...c, lessons: c.lessons.sort((a, b) => a.position - b.position) })) }, [])
  const run = async (p, ok) => { const { error } = await p; if (error) toast(friendly(error), 'error'); else { toast(ok); reload() } }
  if (loading) return <PageSkeleton />; if (error) return <ErrorState onRetry={reload} />
  return <><PageHeader title="الفصول والدروس" desc="رتّب محتوى الكتاب: الوحدات ثم الدروس."><Btn icon={Plus} onClick={async () => { const t = await ask('إضافة فصل', '', { label: 'عنوان الفصل' }); if (t) run(sb.from('chapters').insert({ title: t, position: chs.length + 1 }), 'تمت إضافة الفصل') }}>إضافة فصل</Btn></PageHeader>
    {!chs.length && <EmptyState title="لا توجد فصول" text="ابدأ بإضافة أول فصل من الكتاب." />}
    <div className="tree">{chs.map(c => { const o = open[c.id] ?? true; return <section key={c.id} className="unit"><div className="uh" onClick={() => setOpen({ ...open, [c.id]: !o })}><ChevronDown size={18} className="i" style={{ transform: o ? '' : 'rotate(90deg)', transition: '.18s' }} /><div className="grow"><b>{c.title}</b><div className="muted small">{c.lessons.length} دروس</div></div>{!c.active && <Badge>مخفي</Badge>}
      <span className="row" onClick={e => e.stopPropagation()}><IconBtn icon={Plus} label="إضافة درس" onClick={async () => { const t = await ask('إضافة درس', '', { label: 'عنوان الدرس' }); if (t) run(sb.from('lessons').insert({ chapter_id: c.id, title: t, position: c.lessons.length + 1 }), 'تمت إضافة الدرس') }} />
        <IconBtn icon={Pencil} label="تعديل الفصل" onClick={async () => { const t = await ask('تعديل الفصل', c.title); if (t) run(sb.from('chapters').update({ title: t }).eq('id', c.id), 'تم حفظ التعديل') }} />
        <IconBtn icon={c.active ? EyeOff : Eye} label={c.active ? 'إخفاء الفصل' : 'إظهار الفصل'} onClick={() => run(sb.from('chapters').update({ active: !c.active }).eq('id', c.id), c.active ? 'تم إخفاء الفصل' : 'تم إظهار الفصل')} />
        <IconBtn icon={Trash2} label="حذف الفصل" onClick={async () => { if (await confirm('حذف الفصل؟', 'سيُحذف الفصل بكل دروسه وأسئلته نهائيًا.')) run(sb.from('chapters').delete().eq('id', c.id), 'تم حذف الفصل') }} /></span></div>
      {o && c.lessons.map(l => <div key={l.id} className="lrow"><div className="grow"><span>{l.title}</span> <span className="muted small">· {l.questions?.[0]?.count ?? 0} سؤال {l.source_page ? `· ص ${l.source_page}` : ''}</span></div>{!l.active && <Badge>مخفي</Badge>}
        <IconBtn icon={Pencil} label="تعديل الدرس" onClick={async () => { const t = await ask('تعديل الدرس', l.title); if (t) run(sb.from('lessons').update({ title: t }).eq('id', l.id), 'تم حفظ التعديل') }} />
        <IconBtn icon={l.active ? EyeOff : Eye} label={l.active ? 'إخفاء الدرس' : 'إظهار الدرس'} onClick={() => run(sb.from('lessons').update({ active: !l.active }).eq('id', l.id), 'تم التحديث')} />
        <IconBtn icon={Trash2} label="حذف الدرس" onClick={async () => { if (await confirm('حذف الدرس؟', 'ستُحذف كل أسئلة الدرس نهائيًا.')) run(sb.from('lessons').delete().eq('id', l.id), 'تم حذف الدرس') }} /></div>)}</section> })}</div></>
}
