import { useEffect, useState } from 'react'
import { Download, ExternalLink, FileText, Film, Link2, PlayCircle } from 'lucide-react'
import { sb } from '../lib/supabase'
import { Modal } from './ui'
export const embedUrl = u => { const y = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/); if (y) return `https://www.youtube-nocookie.com/embed/${y[1]}`; const d = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/); if (d) return `https://drive.google.com/file/d/${d[1]}/preview`; const v = u.match(/vimeo\.com\/(\d+)/); if (v) return `https://player.vimeo.com/video/${v[1]}`; return null }
export const sizeLabel = b => b ? (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB') : ''
const icon = r => r.kind === 'video' ? Film : r.kind === 'link' ? Link2 : FileText
export function ResourceList({ items }) {
  const [view, setView] = useState(null)
  const open = async r => {
    if (r.file_path) { const { data } = await sb.storage.from('lesson-files').createSignedUrl(r.file_path, 3600); if (!data) return; const isVid = r.kind === 'video' || (r.mime || '').startsWith('video/'); isVid ? setView({ r, src: data.signedUrl }) : window.open(data.signedUrl, '_blank', 'noopener') }
    else { const e = embedUrl(r.url); e ? setView({ r, embed: e }) : window.open(r.url, '_blank', 'noopener') }
  }
  if (!items?.length) return null
  return <>{items.map(r => { const I = icon(r); return <button key={r.id} className="rl" onClick={() => open(r)}><I size={18} className="i" /><span style={{ flex: 1 }}>{r.title}</span>{r.kind === 'video' || embedUrl(r.url || '') ? <PlayCircle size={18} className="i" /> : r.file_path ? <Download size={17} className="i" /> : <ExternalLink size={17} className="i" />}<span className="muted small" style={{ fontWeight: 400 }}>{sizeLabel(r.size_bytes)}</span></button> })}
    {view && <Modal wide title={view.r.title} onClose={() => setView(null)}>{view.embed ? <div style={{ position: 'relative', paddingTop: '56.25%' }}><iframe src={view.embed} title={view.r.title} allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, borderRadius: 10 }} /></div> : <video src={view.src} controls autoPlay playsInline controlsList="nodownload" style={{ width: '100%', borderRadius: 10, background: '#000', maxHeight: '70vh' }} />}</Modal>}</>
}
