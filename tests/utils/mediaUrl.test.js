import { describe, it, expect, vi, afterEach } from 'vitest'
import { getMediaUrl, isLegacyDiskPhoto, isVideo, createBlobUrl, revokeBlobUrl } from '@/utils/mediaUrl'
import mediaUrlDefault from '@/utils/mediaUrl'

describe('isLegacyDiskPhoto', () => {
  it('returns false for empty or non-string', () => {
    expect(isLegacyDiskPhoto('')).toBe(false)
    expect(isLegacyDiskPhoto(null)).toBe(false)
    expect(isLegacyDiskPhoto(undefined)).toBe(false)
    expect(isLegacyDiskPhoto(12)).toBe(false)
  })

  it('detects /uploads/ paths', () => {
    expect(isLegacyDiskPhoto('/uploads/a.png')).toBe(true)
    expect(isLegacyDiskPhoto('/api/media/1/stream')).toBe(false)
  })
})

describe('getMediaUrl', () => {
  it('returns empty for missing media', () => {
    expect(getMediaUrl(null)).toBe('')
    expect(getMediaUrl(undefined)).toBe('')
    expect(getMediaUrl('')).toBe('')
    expect(getMediaUrl({})).toBe('')
  })

  it('passes through blob, data, and http(s) URLs', () => {
    expect(getMediaUrl('blob:abc')).toBe('blob:abc')
    expect(getMediaUrl('data:image/png;base64,xx')).toBe('data:image/png;base64,xx')
    expect(getMediaUrl('http://cdn.example/a.png')).toBe('http://cdn.example/a.png')
    expect(getMediaUrl('https://cdn.example/a.png')).toBe('https://cdn.example/a.png')
  })

  it('keeps same-origin /api paths', () => {
    expect(getMediaUrl('/api/media/9/stream')).toBe('/api/media/9/stream')
    expect(getMediaUrl({ mediaUrl: '/api/media/9/stream' })).toBe('/api/media/9/stream')
  })

  it('prefixes relative paths with API_URL and prefers mediaUrl over url', () => {
    expect(getMediaUrl('/files/a.png')).toBe('http://localhost:8080/files/a.png')
    expect(getMediaUrl({ url: '/files/b.png' })).toBe('http://localhost:8080/files/b.png')
    expect(getMediaUrl({ mediaUrl: '/api/media/1/stream', url: '/files/ignored.png' }))
      .toBe('/api/media/1/stream')
  })
})

describe('isVideo', () => {
  it('returns false without media', () => {
    expect(isVideo(null)).toBe(false)
  })

  it('uses mediaType VIDEO', () => {
    expect(isVideo({ mediaType: 'VIDEO' })).toBeTruthy()
    expect(isVideo({ mediaType: 'PHOTO' })).toBeFalsy()
  })

  it('detects video extensions', () => {
    expect(isVideo({ mediaUrl: 'clip.mp4' })).toBeTruthy()
    expect(isVideo({ mediaUrl: 'clip.WEBM' })).toBeTruthy()
    expect(isVideo({ mediaUrl: 'clip.ogg' })).toBeTruthy()
    expect(isVideo({ mediaUrl: 'clip.jpg' })).toBeFalsy()
  })
})

describe('blob helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('createBlobUrl returns empty for non-File', () => {
    expect(createBlobUrl(null)).toBe('')
    expect(createBlobUrl({})).toBe('')
  })

  it('createBlobUrl wraps a File', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    expect(createBlobUrl(file)).toBe('blob:preview')
    expect(createObjectURL).toHaveBeenCalledWith(file)
  })

  it('revokeBlobUrl only revokes blob: urls', () => {
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    revokeBlobUrl('https://x')
    revokeBlobUrl('')
    revokeBlobUrl(null)
    expect(revokeObjectURL).not.toHaveBeenCalled()
    revokeBlobUrl('blob:abc')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:abc')
  })

  it('default export exposes helpers', () => {
    expect(mediaUrlDefault.getMediaUrl).toBe(getMediaUrl)
    expect(mediaUrlDefault.isVideo).toBe(isVideo)
  })
})
