import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl, resolveRouteMeta } from '../seo/routes'

const SITE_URL = import.meta.env.VITE_SITE_URL || ''

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]')
  if (!href) {
    link?.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

/** Keeps description, robots, canonical and Open Graph tags in sync with the current route (defect 1571). The browser tab title stays the site name on every page. */
export default function RouteSeo() {
  const { pathname } = useLocation()

  useEffect(() => {
    const meta = resolveRouteMeta(pathname)
    const canonical = meta.canonicalPath ? absoluteUrl(SITE_URL, meta.canonicalPath) : null

    document.title = SITE_NAME
    upsertMeta('name', 'description', meta.description)
    upsertMeta('name', 'robots', meta.indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow')
    upsertMeta('property', 'og:title', meta.title)
    upsertMeta('property', 'og:description', meta.description)
    upsertMeta('name', 'twitter:title', meta.title)
    upsertMeta('name', 'twitter:description', meta.description)
    if (canonical) upsertMeta('property', 'og:url', canonical)
    const ogImage = absoluteUrl(SITE_URL, DEFAULT_OG_IMAGE)
    if (ogImage) {
      upsertMeta('property', 'og:image', ogImage)
      upsertMeta('name', 'twitter:image', ogImage)
    }
    setCanonical(canonical)
  }, [pathname])

  return null
}
