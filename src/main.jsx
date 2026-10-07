import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import App from './App'
import { UiProvider } from './components/ui'
import './styles.css'
createRoot(document.getElementById('root')).render(<BrowserRouter><AuthProvider><UiProvider><App /></UiProvider></AuthProvider></BrowserRouter>)
