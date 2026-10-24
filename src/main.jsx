import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { startPwa } from './pwa.js'
import '@fontsource-variable/inter'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

startPwa()

createRoot(/** @type {HTMLElement} */ (document.getElementById('root'))).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
