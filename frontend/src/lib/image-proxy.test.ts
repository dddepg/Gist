import { describe, it, expect } from 'vitest'
import { getProxiedImageUrl } from './image-proxy'

describe('image-proxy', () => {
  describe('toAbsoluteUrl (tested via getProxiedImageUrl)', () => {
    it('should return absolute URL as-is', () => {
      const url = getProxiedImageUrl('https://example.com/image.jpg')
      expect(url).toContain('/api/proxy/image/')
    })

    it('should convert protocol-relative URL', () => {
      const url = getProxiedImageUrl('//example.com/image.jpg')
      expect(url).toContain('/api/proxy/image/')
    })

    it('should return data URI as-is', () => {
      const dataUri = 'data:image/png;base64,abc123'
      expect(getProxiedImageUrl(dataUri)).toBe(dataUri)
    })

    it('should return already proxied URL as-is', () => {
      const proxied = '/api/proxy/image/abc123'
      expect(getProxiedImageUrl(proxied)).toBe(proxied)
    })

    it('should resolve relative URL with base URL', () => {
      const url = getProxiedImageUrl('image.jpg', 'https://example.com/article/post.html')
      expect(url).toContain('/api/proxy/image/')
    })

    it('should resolve absolute path with base URL', () => {
      const url = getProxiedImageUrl('/images/photo.jpg', 'https://example.com/article/')
      expect(url).toContain('/api/proxy/image/')
    })

    it('should return original for relative URL without base', () => {
      expect(getProxiedImageUrl('image.jpg')).toBe('image.jpg')
    })

    it('should return original for relative URL with invalid base URL', () => {
      expect(getProxiedImageUrl('image.jpg', 'not a valid url')).toBe('image.jpg')
    })
  })

  describe('getProxiedImageUrl', () => {
    it('should generate proxied URL for absolute URL', () => {
      const url = getProxiedImageUrl('https://example.com/image.jpg')
      expect(url).toMatch(/^\/api\/proxy\/image\/[A-Za-z0-9_=-]+$/)
    })

    it('should include referer parameter when articleUrl is provided', () => {
      const url = getProxiedImageUrl('https://example.com/image.jpg', 'https://example.com/article')
      expect(url).toMatch(/^\/api\/proxy\/image\/[A-Za-z0-9_=-]+\?ref=[A-Za-z0-9_=-]+$/)
    })

    it('should handle URLs with special characters', () => {
      const url = getProxiedImageUrl('https://example.com/image.jpg?size=large&format=webp')
      expect(url).toContain('/api/proxy/image/')
    })

    it('should handle URLs with unicode characters', () => {
      const url = getProxiedImageUrl('https://example.com/images/photo.jpg')
      expect(url).toContain('/api/proxy/image/')
    })
  })
})
