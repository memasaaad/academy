import { useState } from 'react'
import { X } from 'lucide-react'
import { useSigned } from './AnswerView'
import './photo.css'
// صور حل الواجب (للطالب والمدرس): شبكة صور + اضغط لتكبير الصورة
export default function PhotoAnswerView({ paths = [] }) {
  const urls = useSigned(paths), [big, setBig] = useState(null)
  return <><div className="shots">{paths.map((p, i) => urls[p]
    ? <button key={p} type="button" className="shot shotbig" onClick={() => setBig(urls[p])} aria-label={`تكبير الصفحة ${i + 1}`}><img src={urls[p]} alt={`صفحة ${i + 1} من الحل`} loading="lazy" /><span className="pgno">{i + 1}</span></button>
    : <div key={p} className="shot shotbig sk" />)}</div>
    {big && <div className="lightbox" role="dialog" aria-label="عرض الصورة" onClick={() => setBig(null)}><button className="iconbtn lb-x" aria-label="إغلاق" onClick={() => setBig(null)}><X size={20} className="i" /></button><img src={big} alt="" onClick={e => e.stopPropagation()} /></div>}</>
}
