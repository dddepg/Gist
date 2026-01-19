import { describe, it, expect } from 'vitest'
import { parseRoute, buildPath, isAddFeedPath } from './router'

describe('router', () => {
  describe('parseRoute', () => {
    it('should parse root path as all', () => {
      const result = parseRoute('/', '')
      expect(result).toEqual({
        selection: { type: 'all' },
        entryId: null,
        unreadOnly: false,
        contentType: 'article',
      })
    })

    it('should parse /all path', () => {
      const result = parseRoute('/all', '')
      expect(result).toEqual({
        selection: { type: 'all' },
        entryId: null,
        unreadOnly: false,
        contentType: 'article',
      })
    })

    it('should parse /all with entry id', () => {
      const result = parseRoute('/all/123', '')
      expect(result).toEqual({
        selection: { type: 'all' },
        entryId: '123',
        unreadOnly: false,
        contentType: 'article',
      })
    })

    it('should parse /feed/:feedId', () => {
      const result = parseRoute('/feed/456', '')
      expect(result).toEqual({
        selection: { type: 'feed', feedId: '456' },
        entryId: null,
        unreadOnly: false,
        contentType: 'article',
      })
    })

    it('should parse /feed/:feedId/:entryId', () => {
      const result = parseRoute('/feed/456/789', '')
      expect(result).toEqual({
        selection: { type: 'feed', feedId: '456' },
        entryId: '789',
        unreadOnly: false,
        contentType: 'article',
      })
    })

    it('should parse /folder/:folderId', () => {
      const result = parseRoute('/folder/111', '')
      expect(result).toEqual({
        selection: { type: 'folder', folderId: '111' },
        entryId: null,
        unreadOnly: false,
        contentType: 'article',
      })
    })

    it('should parse /folder/:folderId/:entryId', () => {
      const result = parseRoute('/folder/111/222', '')
      expect(result).toEqual({
        selection: { type: 'folder', folderId: '111' },
        entryId: '222',
        unreadOnly: false,
        contentType: 'article',
      })
    })

    it('should parse /starred', () => {
      const result = parseRoute('/starred', '')
      expect(result).toEqual({
        selection: { type: 'starred' },
        entryId: null,
        unreadOnly: false,
        contentType: 'article',
      })
    })

    it('should parse /starred/:entryId', () => {
      const result = parseRoute('/starred/333', '')
      expect(result).toEqual({
        selection: { type: 'starred' },
        entryId: '333',
        unreadOnly: false,
        contentType: 'article',
      })
    })

    it('should parse unread query parameter', () => {
      const result = parseRoute('/all', 'unread=true')
      expect(result.unreadOnly).toBe(true)
    })

    it('should parse type query parameter', () => {
      expect(parseRoute('/all', 'type=picture').contentType).toBe('picture')
      expect(parseRoute('/all', 'type=notification').contentType).toBe('notification')
      expect(parseRoute('/all', 'type=invalid').contentType).toBe('article')
    })

    it('should fallback to all for unknown paths', () => {
      const result = parseRoute('/unknown/path', '')
      expect(result.selection).toEqual({ type: 'all' })
    })
  })

  describe('buildPath', () => {
    it('should build /all path', () => {
      expect(buildPath({ type: 'all' })).toBe('/all')
    })

    it('should build /all with entry id', () => {
      expect(buildPath({ type: 'all' }, '123')).toBe('/all/123')
    })

    it('should build /feed path', () => {
      expect(buildPath({ type: 'feed', feedId: '456' })).toBe('/feed/456')
    })

    it('should build /feed with entry id', () => {
      expect(buildPath({ type: 'feed', feedId: '456' }, '789')).toBe('/feed/456/789')
    })

    it('should build /folder path', () => {
      expect(buildPath({ type: 'folder', folderId: '111' })).toBe('/folder/111')
    })

    it('should build /folder with entry id', () => {
      expect(buildPath({ type: 'folder', folderId: '111' }, '222')).toBe('/folder/111/222')
    })

    it('should build /starred path', () => {
      expect(buildPath({ type: 'starred' })).toBe('/starred')
    })

    it('should build /starred with entry id', () => {
      expect(buildPath({ type: 'starred' }, '333')).toBe('/starred/333')
    })

    it('should add unread query parameter', () => {
      expect(buildPath({ type: 'all' }, null, true)).toBe('/all?unread=true')
    })

    it('should add type query parameter', () => {
      expect(buildPath({ type: 'all' }, null, false, 'picture')).toBe('/all?type=picture')
    })

    it('should combine query parameters', () => {
      const path = buildPath({ type: 'all' }, null, true, 'notification')
      expect(path).toContain('unread=true')
      expect(path).toContain('type=notification')
    })
  })

  describe('isAddFeedPath', () => {
    it('should return true for /add-feed', () => {
      expect(isAddFeedPath('/add-feed')).toBe(true)
    })

    it('should return false for other paths', () => {
      expect(isAddFeedPath('/')).toBe(false)
      expect(isAddFeedPath('/all')).toBe(false)
      expect(isAddFeedPath('/feed/123')).toBe(false)
      expect(isAddFeedPath('/add-feed/extra')).toBe(false)
    })
  })
})
