import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Inbox, X, Search } from 'lucide-react'
export const nf = x => +Number(x ?? 0).toFixed(2)
export const fdate = d => d ? new Date(d).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
export const fdt = d => d ? new Date(d).toLocaleString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'
export const pct = (a, b) => b ? Math.round(a / b * 100) : 0
export const grade = p => p >= 90 ? 'ممتاز' : p >= 75 ? 'جيد جدًا' : p >= 60 ? 'جيد' : p >= 50 ? 'مقبول' : 'يحتاج مراجعة'
export const Btn = ({ variant = '', size = '', icon: I, children, ...p }) => <button type="button" {...p} className={`btn ${variant} ${size} ${p.className || ''}`}>{I && <I size={size === 'sm' ? 16 : 18} className="i" />}{children}</button>
export const IconBtn = ({ icon: I, label, badge, ...p }) => <button type="button" aria-label={label} title={label} {...p} className={`iconbtn ${p.className || ''}`}><I size={19} className="i" />{badge > 0 && <span className="dot">{badge > 9 ? '9+' : badge}</span>}</button>
export const Badge = ({ tone = '', icon: I, children }) => <span className={`badge ${tone}`}>{I && <I className="i" />}{children}</span>
export const Avatar = ({ name = '' }) => <span className="avatar" aria-hidden>{name.trim().charAt(0) || '؟'}</span>
export const Progress = ({ value, ok }) => <div className={'progress' + (ok ? ' ok' : '')} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${Math.min(100, value)}%` }} /></div>
export const Field = ({ label, hint, children, error }) => <label className={'field' + (error ? ' err' : '')}><span>{label}</span>{children}{hint && <small>{hint}</small>}{error && <small style={{ color: 'var(--c-danger)' }}>{error}</small>}</label>
export const PageHeader = ({ title, desc, children }) => <div className="pagehead"><div><h1>{title}</h1>{desc && <p>{desc}</p>}</div><div className="row wrapx">{children}</div></div>
export const SearchInput = ({ value, onChange, placeholder = 'بحث…' }) => <div className="inputicon"><Search size={18} className="i" /><input type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} /></div>
export const Alert = ({ tone = 'danger', children }) => children ? <div className={'alert ' + tone} role={tone === 'danger' ? 'alert' : 'status'}>{tone === 'success' ? <CheckCircle2 size={18} className="i" /> : <AlertTriangle size={18} className="i" />}<div>{children}</div></div> : null
export const Segmented = ({ items, value, onChange }) => <div className="seg" role="tablist">{items.map(([k, t, c]) => <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)}>{t}{c != null && ` (${c})`}</button>)}</div>
export const EmptyState = ({ icon: I = Inbox, title, text, action }) => <div className="empty"><div className="ic"><I size={26} className="i" /></div><h3>{title}</h3>{text && <p>{text}</p>}{action}</div>
export const ErrorState = ({ onRetry, text = 'تعذر تحميل البيانات. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.' }) => <div className="errstate" role="alert"><div className="ic"><AlertTriangle size={26} className="i" /></div><h3>حدث خطأ</h3><p>{text}</p>{onRetry && <Btn variant="secondary" onClick={onRetry}>حاول مرة أخرى</Btn>}</div>
export const Skeleton = ({ lines = 3, h }) => <div aria-busy="true" aria-label="جارٍ التحميل">{Array.from({ length: lines }).map((_, i) => <div key={i} className="sk" style={{ width: `${100 - (i % 3) * 18}%`, height: h }} />)}</div>
export const PageSkeleton = () => <div className="stack" aria-busy="true"><div className="kpis">{[1, 2, 3, 4].map(i => <div key={i} className="kpi"><div className="sk" style={{ width: 40, height: 40 }} /><div className="grow"><div className="sk" /><div className="sk" style={{ width: '60%' }} /></div></div>)}</div><div className="card"><Skeleton lines={4} /></div><div className="card"><Skeleton lines={3} /></div></div>
export const friendly = e => { const m = e?.message || String(e || ''); return /Failed to fetch|NetworkError/i.test(m) ? 'تعذر الاتصال بالخادم' : /duplicate|unique/i.test(m) ? 'هذا العنصر موجود بالفعل' : /row-level|permission|JWT/i.test(m) ? 'ليست لديك صلاحية لتنفيذ هذه العملية' : m }
// Modal
export function Modal({ title, desc, onClose, children, footer, wide }) {
  const ref = useRef()
  useEffect(() => { const k = e => e.key === 'Escape' && onClose?.(); document.addEventListener('keydown', k); const prev = document.activeElement; ref.current?.focus(); document.body.style.overflow = 'hidden'; return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; prev?.focus?.() } }, [])
  return <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose?.()}><div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
    <header><div><h3>{title}</h3>{desc && <p className="muted small">{desc}</p>}</div><IconBtn icon={X} label="إغلاق" onClick={onClose} /></header><div className="body">{children}</div>{footer && <footer>{footer}</footer>}</div></div>
}
// Menu
export function Menu({ trigger, children, label }) {
  const [o, setO] = useState(false), r = useRef()
  useEffect(() => { const h = e => { if (r.current && !r.current.contains(e.target)) setO(false) }; const k = e => e.key === 'Escape' && setO(false); document.addEventListener('mousedown', h); document.addEventListener('keydown', k); return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k) } }, [])
  return <div className="menuw" ref={r}><span onClick={() => setO(!o)} aria-haspopup="menu" aria-expanded={o} aria-label={label}>{trigger}</span>{o && <div className="menu" role="menu" onClick={() => setO(false)}>{children}</div>}</div>
}
// Toast + Dialog providers
const Ui = createContext(null)
export const useUi = () => useContext(Ui)
export function UiProvider({ children }) {
  const [toasts, setT] = useState([]), [dlg, setDlg] = useState(null)
  const toast = useCallback((text, kind = 'success') => { const id = Math.random(); setT(t => [...t, { id, text, kind }]); setTimeout(() => setT(t => t.filter(x => x.id !== id)), 3500) }, [])
  const ask = useCallback((title, def = '', opts = {}) => new Promise(res => setDlg({ type: 'ask', title, def, opts, res })), [])
  const confirm = useCallback((title, text, danger = true) => new Promise(res => setDlg({ type: 'confirm', title, text, danger, res })), [])
  const close = v => { dlg.res(v); setDlg(null) }
  return <Ui.Provider value={{ toast, ask, confirm }}>{children}
    <div className="toasts" aria-live="polite">{toasts.map(t => <div key={t.id} className={'toast ' + t.kind}>{t.kind === 'success' ? <CheckCircle2 size={18} className="i" /> : <AlertTriangle size={18} className="i" />}{t.text}</div>)}</div>
    {dlg?.type === 'ask' && <AskModal d={dlg} close={close} />}
    {dlg?.type === 'confirm' && <Modal title={dlg.title} onClose={() => close(false)} footer={<><Btn variant="secondary" onClick={() => close(false)}>إلغاء</Btn><Btn variant={dlg.danger ? 'danger' : ''} onClick={() => close(true)}>تأكيد</Btn></>}><p>{dlg.text}</p></Modal>}</Ui.Provider>
}
function AskModal({ d, close }) {
  const [v, setV] = useState(d.def)
  return <Modal title={d.title} onClose={() => close(null)} footer={<><Btn variant="secondary" onClick={() => close(null)}>إلغاء</Btn><Btn disabled={!v.trim()} onClick={() => close(v.trim())}>حفظ</Btn></>}><Field label={d.opts.label || 'العنوان'}><input autoFocus value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && v.trim() && close(v.trim())} /></Field></Modal>
}
export function usePager(items, size = 15) { const [p, setP] = useState(0); useEffect(() => setP(0), [items.length]); const pages = Math.max(1, Math.ceil(items.length / size)); return { page: Math.min(p, pages - 1), pages, slice: items.slice(Math.min(p, pages - 1) * size, (Math.min(p, pages - 1) + 1) * size), setP } }
export const Pager = ({ pg, total }) => pg.pages > 1 ? <div className="pager"><span className="muted small">{total} عنصر</span><div className="row"><Btn size="sm" variant="secondary" disabled={pg.page === 0} onClick={() => pg.setP(pg.page - 1)}>السابق</Btn><span className="small">{pg.page + 1} / {pg.pages}</span><Btn size="sm" variant="secondary" disabled={pg.page >= pg.pages - 1} onClick={() => pg.setP(pg.page + 1)}>التالي</Btn></div></div> : null
export function useAsync(fn, deps = []) {
  const [s, set] = useState({ loading: true, error: null, data: null }), run = useCallback(async () => { set(x => ({ ...x, loading: true, error: null })); try { set({ loading: false, error: null, data: await fn() }) } catch (e) { set({ loading: false, error: e, data: null }) } }, deps)
  useEffect(() => { run() }, [run]); return { ...s, reload: run }
}
