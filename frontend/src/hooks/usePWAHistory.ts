import { useEffect } from 'react'

/**
 * Check if running as iOS PWA in standalone mode
 */
function isIOSStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'standalone' in window.navigator &&
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

/**
 * Hook to handle iOS PWA history navigation issues.
 *
 * In iOS PWA standalone mode, the system's edge swipe gesture triggers
 * browser history navigation. When the history stack is empty, swiping
 * back shows a blank page.
 *
 * This hook adds an initial history entry and handles the popstate event
 * to prevent showing a blank page.
 */
export function usePWAHistory() {
  useEffect(() => {
    // Only apply for iOS PWA standalone mode
    if (!isIOSStandalone()) return

    // Mark current state with our flag if not already marked
    const currentState = window.history.state
    if (!currentState?.pwaInitialized) {
      // Add marker to current state
      window.history.replaceState(
        { ...currentState, pwaInitialized: true },
        ''
      )
      // Push a duplicate entry so first back swipe stays in app
      window.history.pushState(
        { pwaInitialized: true, isAnchor: true },
        '',
        window.location.href
      )
    }

    // Handle back navigation
    const handlePopState = (event: PopStateEvent) => {
      // If user hit our anchor entry, they're trying to go back too far
      if (event.state?.isAnchor) {
        // Push another anchor to maintain the safety net
        window.history.pushState(
          { pwaInitialized: true, isAnchor: true },
          '',
          window.location.href
        )
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
}
