import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatRelativeTime } from './date-utils'

describe('date-utils', () => {
  const mockT = vi.fn((key: string, options?: Record<string, unknown>) => {
    if (key === 'add_feed.just_now') return 'just now'
    if (key === 'add_feed.minutes_ago') return `${options?.count} minutes ago`
    if (key === 'add_feed.hours_ago') return `${options?.count} hours ago`
    if (key === 'add_feed.days_ago') return `${options?.count} days ago`
    return key
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    mockT.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatRelativeTime', () => {
    it('should return "just now" for times less than a minute ago', () => {
      const result = formatRelativeTime('2024-01-15T11:59:30Z', mockT)
      expect(result).toBe('just now')
    })

    it('should return minutes ago for times less than an hour ago', () => {
      const result = formatRelativeTime('2024-01-15T11:30:00Z', mockT)
      expect(result).toBe('30 minutes ago')
    })

    it('should return hours ago for times less than a day ago', () => {
      const result = formatRelativeTime('2024-01-15T08:00:00Z', mockT)
      expect(result).toBe('4 hours ago')
    })

    it('should return days ago for times less than a week ago', () => {
      const result = formatRelativeTime('2024-01-12T12:00:00Z', mockT)
      expect(result).toBe('3 days ago')
    })

    it('should return absolute date for times more than a week ago', () => {
      const result = formatRelativeTime('2024-01-01T12:00:00Z', mockT)
      expect(result).toMatch(/\d/)
    })

    it('should return absolute date for future times', () => {
      const result = formatRelativeTime('2024-01-20T12:00:00Z', mockT)
      expect(result).toMatch(/\d/)
    })
  })
})
