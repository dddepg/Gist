import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { queryClient } from '@/lib/queryClient'
import { I18nProvider } from '@/components/i18n-provider'

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, r) {
      // Check for updates periodically (every hour)
      if (r) {
        setInterval(
          () => {
            r.update()
          },
          60 * 60 * 1000
        )
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error)
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
)
