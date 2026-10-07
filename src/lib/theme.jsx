import { createContext, useContext, useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { IconBtn } from '../components/ui'
const T = createContext({ theme: 'light', toggle() {} })
export const useTheme = () => useContext(T)
const initial = () => { try { const s = localStorage.getItem('theme'); if (s) return s } catch {} return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' }
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initial)
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('theme', theme) } catch {}; document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#041233' : '#031a4d') }, [theme])
  return <T.Provider value={{ theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }}>{children}</T.Provider>
}
export function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme(), dark = theme === 'dark'
  return <IconBtn className={className} icon={dark ? Sun : Moon} label={dark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الليلي'} aria-pressed={dark} onClick={toggle} />
}
