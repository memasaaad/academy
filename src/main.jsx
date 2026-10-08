import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import App from './App'
import { UiProvider } from './components/ui'
import { ThemeProvider } from './lib/theme'
import './styles.css'
if ('serviceWorker' in navigator && import.meta.env.PROD) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
createRoot(document.getElementById('root')).render(<BrowserRouter><AuthProvider><ThemeProvider><UiProvider><App /></UiProvider></ThemeProvider></AuthProvider></BrowserRouter>)
