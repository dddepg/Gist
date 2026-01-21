import { registerSW } from 'virtual:pwa-register'

export interface PWAConfig {
  updateCheckInterval?: number
  onUpdate?: () => void
  onError?: (error: Error) => void
}

const DEFAULT_UPDATE_INTERVAL = 60 * 60 * 1000 // 1 hour

function reloadWhenHidden() {
  if (document.hidden) {
    window.location.reload()
  } else {
    const onVisibilityChange = () => {
      if (document.hidden) {
        window.location.reload()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange, { once: true })
  }
}

export function setupPWA(config: PWAConfig = {}) {
  const {
    updateCheckInterval = DEFAULT_UPDATE_INTERVAL,
    onUpdate = reloadWhenHidden,
    onError = (error) => console.error('SW registration error:', error),
  } = config

  if (!('serviceWorker' in navigator)) {
    return
  }

  registerSW({
    immediate: true,
    onNeedRefresh() {
      onUpdate()
    },
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => {
          registration.update()
        }, updateCheckInterval)
      }
    },
    onRegisterError(error) {
      onError(error)
    },
  })
}
