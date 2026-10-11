/**
 * Route-level SEO metadata (defect 1571).
 * Shared by the runtime <RouteSeo /> component and the build-time sitemap/robots generator,
 * so keep this file free of browser-only or Vite-only APIs.
 */

export const SITE_NAME = 'SocialPairly'

export const DEFAULT_DESCRIPTION =
  'SocialPairly is a safe, verified matchmaking platform that pairs people on shared values, faith, lifestyle and life goals. Create your profile and meet compatible matches.'

export const DEFAULT_OG_IMAGE = '/brand/socialpairly-logo.png'

/** Public pages that search engines may index (listed in sitemap.xml). */
export const PUBLIC_ROUTES = [
  {
    path: '/signin',
    title: 'Sign In',
    description:
      'Sign in to SocialPairly to see your matches, messages and events. Verified profiles and privacy-first matchmaking.',
    changefreq: 'monthly',
    priority: '1.0',
  },
  {
    path: '/signup',
    title: 'Create Your Free Account',
    description:
      'Join SocialPairly for free. Build a verified profile and get matched with people who share your values, faith and life goals.',
    changefreq: 'monthly',
    priority: '0.9',
  },
]

/** Signed-in areas: titled for the browser tab but kept out of search results. */
const PRIVATE_ROUTE_TITLES = [
  { prefix: '/admin/questions', title: 'Manage Questions' },
  { prefix: '/admin/media', title: 'Media Moderation' },
  { prefix: '/admin/finance', title: 'Finance' },
  { prefix: '/admin/plans', title: 'Plans' },
  { prefix: '/admin/events', title: 'Events Admin' },
  { prefix: '/admin', title: 'Admin Dashboard' },
  { prefix: '/onboarding/identity', title: 'Identity & Background' },
  { prefix: '/onboarding/personality', title: 'Personality & Lifestyle' },
  { prefix: '/onboarding/faith', title: 'Faith' },
  { prefix: '/onboarding', title: 'Onboarding' },
  { prefix: '/profile/media', title: 'Photos & Videos' },
  { prefix: '/profile', title: 'My Profile' },
  { prefix: '/notifications', title: 'Notifications' },
  { prefix: '/subscriptions', title: 'Subscriptions' },
  { prefix: '/settings', title: 'Settings' },
  { prefix: '/events', title: 'Event' },
]

/**
 * Paths crawlers should never request (robots.txt Disallow).
 * Signed-in pages are excluded with a noindex meta tag instead, so robots.txt doesn't advertise their URLs.
 */
export const DISALLOWED_PATHS = ['/api/', '/uploads/']

export function formatTitle(title) {
  return title && title !== SITE_NAME ? `${title} | ${SITE_NAME}` : `${SITE_NAME} – Verified, Values-Based Matchmaking`
}

function normalizePath(pathname) {
  if (!pathname) return '/'
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return trimmed.toLowerCase()
}

/**
 * Metadata for a pathname: { title, description, indexable, canonicalPath }.
 * Anything not explicitly public is treated as private (noindex).
 */
export function resolveRouteMeta(pathname) {
  const path = normalizePath(pathname)
  const publicRoute = PUBLIC_ROUTES.find((r) => r.path === path)
  if (publicRoute) {
    return {
      title: formatTitle(publicRoute.title),
      description: publicRoute.description,
      indexable: true,
      canonicalPath: publicRoute.path,
    }
  }
  const privateRoute = PRIVATE_ROUTE_TITLES.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`))
  return {
    title: formatTitle(privateRoute ? privateRoute.title : path === '/' ? 'Home' : SITE_NAME),
    description: DEFAULT_DESCRIPTION,
    indexable: false,
    canonicalPath: null,
  }
}

/** Absolute URL for a site path, or null when no production site URL is configured. */
export function absoluteUrl(siteUrl, path) {
  if (!siteUrl) return null
  const base = String(siteUrl).trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(base)) return null
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildSitemapXml(siteUrl, lastmod = new Date().toISOString().slice(0, 10)) {
  const urls = PUBLIC_ROUTES
    .map((route) => {
      const loc = absoluteUrl(siteUrl, route.path)
      if (!loc) return null
      return [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${route.changefreq}</changefreq>`,
        `    <priority>${route.priority}</priority>`,
        '  </url>',
      ].join('\n')
    })
    .filter(Boolean)
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}

/** schema.org WebSite + Organization JSON-LD for rich results. */
export function buildStructuredData(siteUrl) {
  const home = absoluteUrl(siteUrl, '/')
  const logo = absoluteUrl(siteUrl, DEFAULT_OG_IMAGE)
  const organization = {
    '@type': 'Organization',
    name: SITE_NAME,
    ...(home ? { url: home } : {}),
    ...(logo ? { logo } : {}),
  }
  const website = {
    '@type': 'WebSite',
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    ...(home ? { url: home } : {}),
  }
  return { '@context': 'https://schema.org', '@graph': [website, organization] }
}

export function buildRobotsTxt(siteUrl) {
  const lines = ['User-agent: *', 'Allow: /', ...DISALLOWED_PATHS.map((p) => `Disallow: ${p}`)]
  const sitemap = absoluteUrl(siteUrl, '/sitemap.xml')
  if (sitemap) lines.push('', `Sitemap: ${sitemap}`)
  return `${lines.join('\n')}\n`
}
