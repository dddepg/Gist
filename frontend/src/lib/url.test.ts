import { describe, it, expect } from 'vitest'
import { isSafeUrl, getSafeHostname, normalizeUrl } from './url'

describe('url utils', () => {
  describe('isSafeUrl', () => {
    it('should accept http urls', () => {
      expect(isSafeUrl('http://example.com')).toBe(true)
    })

    it('should accept https urls', () => {
      expect(isSafeUrl('https://example.com')).toBe(true)
    })

    it('should reject javascript urls', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false)
    })

    it('should reject invalid urls', () => {
      expect(isSafeUrl('not a url')).toBe(false)
    })
  })

  describe('getSafeHostname', () => {
    it('should extract hostname from valid url', () => {
      expect(getSafeHostname('https://example.com/path')).toBe('example.com')
    })

    it('should return undefined for invalid url', () => {
      expect(getSafeHostname('not a url')).toBeUndefined()
    })

    it('should return undefined for unsafe protocol', () => {
      expect(getSafeHostname('javascript:alert(1)')).toBeUndefined()
    })
  })

  describe('normalizeUrl', () => {
    it('should add https to bare domains', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com')
    })

    it('should convert feed:// to https://', () => {
      expect(normalizeUrl('feed://example.com/rss')).toBe('https://example.com/rss')
    })

    it('should preserve existing http://', () => {
      expect(normalizeUrl('http://example.com')).toBe('http://example.com')
    })

    it('should return null for empty input', () => {
      expect(normalizeUrl('')).toBe(null)
      expect(normalizeUrl('   ')).toBe(null)
    })

    it('should return null for invalid URL after normalization', () => {
      // These become invalid URLs even after adding https://
      expect(normalizeUrl(':::')).toBe(null)
      expect(normalizeUrl('[invalid')).toBe(null)
    })
  })
})
