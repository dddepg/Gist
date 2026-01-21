import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupPWA, type PWAConfig } from './pwa'

const mockRegisterSW = vi.fn()

vi.mock('virtual:pwa-register', () => ({
  registerSW: (...args: unknown[]) => mockRegisterSW(...args),
}))

describe('pwa', () => {
  const originalNavigator = globalThis.navigator

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    Object.defineProperty(globalThis, 'navigator', {
      value: { serviceWorker: {} },
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
  })

  describe('setupPWA', () => {
    it('should not register SW if serviceWorker is not supported', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
      })

      setupPWA()

      expect(mockRegisterSW).not.toHaveBeenCalled()
    })

    it('should register SW with immediate: true', () => {
      setupPWA()

      expect(mockRegisterSW).toHaveBeenCalledWith(
        expect.objectContaining({
          immediate: true,
        })
      )
    })

    it('should reload immediately when page is hidden', () => {
      const reloadMock = vi.fn()
      vi.stubGlobal('location', { reload: reloadMock })
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })

      setupPWA()

      const { onNeedRefresh } = mockRegisterSW.mock.calls[0][0]
      onNeedRefresh()

      expect(reloadMock).toHaveBeenCalled()
      vi.unstubAllGlobals()
    })

    it('should wait for page to become hidden before reloading', () => {
      const reloadMock = vi.fn()
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      vi.stubGlobal('location', { reload: reloadMock })
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })

      setupPWA()

      const { onNeedRefresh } = mockRegisterSW.mock.calls[0][0]
      onNeedRefresh()

      // Should not reload immediately
      expect(reloadMock).not.toHaveBeenCalled()
      // Should register visibilitychange listener
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function),
        { once: true }
      )

      // Simulate page becoming hidden
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      const visibilityHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'visibilitychange'
      )?.[1] as () => void
      visibilityHandler()

      expect(reloadMock).toHaveBeenCalled()
      vi.unstubAllGlobals()
      addEventListenerSpy.mockRestore()
    })

    it('should call custom onUpdate callback when provided', () => {
      const customOnUpdate = vi.fn()
      const config: PWAConfig = { onUpdate: customOnUpdate }

      setupPWA(config)

      const { onNeedRefresh } = mockRegisterSW.mock.calls[0][0]
      onNeedRefresh()

      expect(customOnUpdate).toHaveBeenCalled()
    })

    it('should call onError (default: console.error) when registration fails', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      setupPWA()

      const { onRegisterError } = mockRegisterSW.mock.calls[0][0]
      const error = new Error('Registration failed')
      onRegisterError(error)

      expect(consoleErrorSpy).toHaveBeenCalledWith('SW registration error:', error)
      consoleErrorSpy.mockRestore()
    })

    it('should call custom onError callback when provided', () => {
      const customOnError = vi.fn()
      const config: PWAConfig = { onError: customOnError }

      setupPWA(config)

      const { onRegisterError } = mockRegisterSW.mock.calls[0][0]
      const error = new Error('Registration failed')
      onRegisterError(error)

      expect(customOnError).toHaveBeenCalledWith(error)
    })

    it('should set up periodic update checks with default interval (1 hour)', () => {
      const mockRegistration = { update: vi.fn() }

      setupPWA()

      const { onRegisteredSW } = mockRegisterSW.mock.calls[0][0]
      onRegisteredSW('sw.js', mockRegistration)

      expect(mockRegistration.update).not.toHaveBeenCalled()

      vi.advanceTimersByTime(60 * 60 * 1000)
      expect(mockRegistration.update).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(60 * 60 * 1000)
      expect(mockRegistration.update).toHaveBeenCalledTimes(2)
    })

    it('should use custom update check interval when provided', () => {
      const mockRegistration = { update: vi.fn() }
      const customInterval = 30 * 60 * 1000 // 30 minutes
      const config: PWAConfig = { updateCheckInterval: customInterval }

      setupPWA(config)

      const { onRegisteredSW } = mockRegisterSW.mock.calls[0][0]
      onRegisteredSW('sw.js', mockRegistration)

      vi.advanceTimersByTime(customInterval)
      expect(mockRegistration.update).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(customInterval)
      expect(mockRegistration.update).toHaveBeenCalledTimes(2)
    })

    it('should not set up update checks if registration is undefined', () => {
      setupPWA()

      const { onRegisteredSW } = mockRegisterSW.mock.calls[0][0]
      onRegisteredSW('sw.js', undefined)

      vi.advanceTimersByTime(60 * 60 * 1000)
      // No error should be thrown
    })
  })
})
