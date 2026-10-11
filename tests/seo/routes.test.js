import { describe, it, expect } from 'vitest'
import {
  absoluteUrl,
  buildRobotsTxt,
  buildSitemapXml,
  buildStructuredData,
  formatTitle,
  resolveRouteMeta,
} from '@/seo/routes'

describe('seo routes', () => {
  it('marks sign-in and sign-up as indexable with canonical paths', () => {
    const signin = resolveRouteMeta('/signin')
    expect(signin.indexable).toBe(true)
    expect(signin.canonicalPath).toBe('/signin')
    expect(signin.title).toBe('Sign In | SocialPairly')

    const signup = resolveRouteMeta('/SignUp/')
    expect(signup.indexable).toBe(true)
    expect(signup.canonicalPath).toBe('/signup')
  })

  it('keeps signed-in and admin pages out of search results', () => {
    for (const path of ['/', '/profile', '/profile/media', '/admin', '/admin/finance', '/events/12', '/onboarding/identity', '/unknown']) {
      const meta = resolveRouteMeta(path)
      expect(meta.indexable).toBe(false)
      expect(meta.canonicalPath).toBeNull()
    }
    expect(resolveRouteMeta('/admin/finance').title).toBe('Finance | SocialPairly')
    expect(resolveRouteMeta('/profile/media').title).toBe('Photos & Videos | SocialPairly')
    expect(resolveRouteMeta('/').title).toBe('Home | SocialPairly')
  })

  it('formats the default title', () => {
    expect(formatTitle('SocialPairly')).toBe('SocialPairly – Verified, Values-Based Matchmaking')
  })

  it('builds absolute URLs only for http(s) site URLs', () => {
    expect(absoluteUrl('https://app.socialpairly.com/', '/signin')).toBe('https://app.socialpairly.com/signin')
    expect(absoluteUrl('', '/signin')).toBeNull()
    expect(absoluteUrl('javascript:alert(1)', '/signin')).toBeNull()
  })

  it('lists only public pages in the sitemap', () => {
    const xml = buildSitemapXml('https://app.socialpairly.com', '2026-10-11')
    expect(xml).toContain('<loc>https://app.socialpairly.com/signin</loc>')
    expect(xml).toContain('<loc>https://app.socialpairly.com/signup</loc>')
    expect(xml).toContain('<lastmod>2026-10-11</lastmod>')
    expect(xml).not.toContain('/admin')
    expect(xml).not.toContain('/profile')
  })

  it('blocks API/uploads in robots.txt and adds the sitemap when the site URL is known', () => {
    const withoutSite = buildRobotsTxt('')
    expect(withoutSite).toContain('Disallow: /api/')
    expect(withoutSite).toContain('Disallow: /uploads/')
    expect(withoutSite).not.toContain('Sitemap:')
    expect(withoutSite).not.toContain('/admin')

    expect(buildRobotsTxt('https://app.socialpairly.com')).toContain('Sitemap: https://app.socialpairly.com/sitemap.xml')
  })

  it('builds WebSite and Organization structured data', () => {
    const data = buildStructuredData('https://app.socialpairly.com')
    expect(data['@context']).toBe('https://schema.org')
    const types = data['@graph'].map((n) => n['@type'])
    expect(types).toEqual(['WebSite', 'Organization'])
    expect(data['@graph'][1].logo).toBe('https://app.socialpairly.com/brand/socialpairly-logo.png')
    expect(buildStructuredData('')['@graph'][0].url).toBeUndefined()
  })
})
