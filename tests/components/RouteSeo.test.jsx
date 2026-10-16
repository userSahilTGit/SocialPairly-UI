import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render } from '@testing-library/react'
import RouteSeo from '@/components/RouteSeo'

function renderAt(path) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[path]}>
      <RouteSeo />
    </MemoryRouter>,
  )
}

const metaContent = (selector) => document.head.querySelector(selector)?.getAttribute('content')

describe('RouteSeo', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.title = ''
  })

  it('sets indexable metadata on public pages', () => {
    renderAt('/signup')
    expect(document.title).toBe('Create Your Free Account | SocialPairly')
    expect(metaContent('meta[name="robots"]')).toMatch(/^index, follow/)
    expect(metaContent('meta[name="description"]')).toMatch(/Join SocialPairly/)
    expect(metaContent('meta[property="og:title"]')).toBe('Create Your Free Account | SocialPairly')
  })

  it('sets noindex on private pages and drops any canonical link', () => {
    const link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    link.setAttribute('href', 'https://example.com/old')
    document.head.appendChild(link)

    renderAt('/admin/finance')
    expect(document.title).toBe('Finance | SocialPairly')
    expect(metaContent('meta[name="robots"]')).toBe('noindex, nofollow')
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
  })

  it('reuses existing meta tags instead of duplicating them', () => {
    const existing = document.createElement('meta')
    existing.setAttribute('name', 'description')
    existing.setAttribute('content', 'old')
    document.head.appendChild(existing)

    renderAt('/signin')
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(metaContent('meta[name="description"]')).toMatch(/Sign in to SocialPairly/)
  })
})
