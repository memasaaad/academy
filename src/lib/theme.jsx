import { createContext, useContext, useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { IconBtn } from '../components/ui'
// الوضع: auto (يتبع الجهاز) / light / dark — وحجم الخط: sm / md / lg. كلاهما محفوظ على الجهاز.
const T = createContext({ theme: 'light', mode: 'auto', setMode() {}, toggle() {}, fs: 'md', setFs() {} })
export const useTheme = () => useContext(T)
const get = k => { try { return localStorage.getItem(k) } catch { return null } }
const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* ignore */ } }
const mq = () => window.matchMedia?.('(prefers-color-scheme: dark)')
const FS = { sm: '14.5px', md: '', lg: '18px' }
export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => get('theme') || 'auto'), [sys, setSys] = useState(() => !!mq()?.matches), [fs, setFs] = useState(() => get('fs') || 'md')
  const theme = mode === 'auto' ? (sys ? 'dark' : 'light') : mode
  useEffect(() => { const m = mq(); if (!m) return; const h = e => setSys(e.matches); m.addEventListener?.('change', h); return () => m.removeEventListener?.('change', h) }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme; set('theme', mode === 'auto' ? null : mode); document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#041233' : '#031a4d') }, [theme, mode])
  useEffect(() => { document.documentElement.style.fontSize = FS[fs] ?? ''; set('fs', fs === 'md' ? null : fs) }, [fs])
  return <T.Provider value={{ theme, mode, setMode, toggle: () => setMode(theme === 'dark' ? 'light' : 'dark'), fs, setFs }}>{children}</T.Provider>
}
export function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme(), dark = theme === 'dark'
  return <IconBtn className={className} icon={dark ? Sun : Moon} label={dark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الليلي'} aria-pressed={dark} onClick={toggle} />
}
