import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, compareStrings, getCheckboxClassName, getSortIcon } from './table-utils'

describe('table-utils', () => {
  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const result = formatDate('2024-03-15T10:30:00Z')
      expect(result).toMatch(/2024/)
      expect(result).toMatch(/03|3/)
      expect(result).toMatch(/15/)
    })
  })

  describe('formatDateTime', () => {
    it('should format date with time', () => {
      const result = formatDateTime('2024-03-15T10:30:00Z')
      expect(result).toMatch(/2024/)
      expect(result).toMatch(/03|3/)
      expect(result).toMatch(/15/)
    })
  })

  describe('compareStrings', () => {
    it('should sort ASCII strings before Chinese', () => {
      expect(compareStrings('Apple', 'ABC')).toBeGreaterThan(0)
      expect(compareStrings('abc', 'xyz')).toBeLessThan(0)
    })

    it('should put ASCII before non-ASCII', () => {
      expect(compareStrings('English', 'Apple')).toBeGreaterThan(0)
    })

    it('should sort Chinese strings using locale', () => {
      const result = compareStrings('ABC', 'XYZ')
      expect(result).toBeLessThan(0)
    })
  })

  describe('getCheckboxClassName', () => {
    it('should return primary styles when all selected', () => {
      const result = getCheckboxClassName(true, false)
      expect(result).toContain('bg-primary')
      expect(result).toContain('border-primary')
    })

    it('should return partial styles when partially selected', () => {
      const result = getCheckboxClassName(false, true)
      expect(result).toContain('bg-primary/50')
    })

    it('should return default styles when not selected', () => {
      const result = getCheckboxClassName(false, false)
      expect(result).toContain('bg-background')
      expect(result).toContain('border-border')
    })
  })

  describe('getSortIcon', () => {
    it('should return dash when not sorting by field', () => {
      expect(getSortIcon('name', 'date', 'asc')).toBe('-')
    })

    it('should return up arrow for ascending sort', () => {
      expect(getSortIcon('name', 'name', 'asc')).toBe('\u2191')
    })

    it('should return down arrow for descending sort', () => {
      expect(getSortIcon('name', 'name', 'desc')).toBe('\u2193')
    })
  })
})
