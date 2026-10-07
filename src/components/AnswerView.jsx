import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
export const normAns = v => v && typeof v === 'object' && !Array.isArray(v) ? { text: v.text || '', images: v.images || [] } : { text: typeof v === 'string' ? v : '', images: [] }
export const isRich = v => v && typeof v === 'object' && !Array.isArray(v)
export const hasAns = x => x != null && x !== '' && !(Array.isArray(x) && !x.length) && !(isRich(x) && !(x.text || '').trim() && !(x.images || []).length)
export function useSigned(paths) {
  const [m, setM] = useState({}), key = (paths || []).join('|')
  useEffect(() => { let on = true; if (!paths?.length) return setM({}); sb.storage.from('answer-images').createSignedUrls(paths, 3600).then(({ data }) => on && setM(Object.fromEntries((data || []).map(d => [d.path, d.signedUrl])))); return () => { on = false } }, [key])
  return m
}
export default function AnswerView({ value }) {
  const a = normAns(value), urls = useSigned(a.images)
  return <>{a.text ? <p style={{ whiteSpace: 'pre-wrap' }}>{a.text}</p> : !a.images.length && <p className="muted">لم يجب عن هذا السؤال</p>}
    {a.images.length > 0 && <div className="shots">{a.images.map(p => urls[p] ? <a key={p} href={urls[p]} target="_blank" rel="noreferrer" className="shot shotbig" aria-label="فتح الصورة"><img src={urls[p]} alt="صورة إجابة الطالب" loading="lazy" /></a> : <div key={p} className="shot shotbig sk" />)}</div>}</>
}
