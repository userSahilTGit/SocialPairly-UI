/** Dashboard keys returned by the API (`allowedDashboards`). */
export const DASHBOARD_KEYS = {
  DASHBOARD: 'DASHBOARD',
  QUESTIONS: 'QUESTIONS',
  MODERATION: 'MODERATION',
  IDENTITY_DOCS: 'IDENTITY_DOCS',
  PLANS: 'PLANS',
  EVENTS: 'EVENTS',
  FINANCE: 'FINANCE',
  CUSTOMER_SUPPORT: 'CUSTOMER_SUPPORT',
  ROLE_ACCESS: 'ROLE_ACCESS',
}

export const DASHBOARD_NAV = [
  { key: DASHBOARD_KEYS.DASHBOARD, path: '/admin', label: 'Dashboard', end: true },
  { key: DASHBOARD_KEYS.QUESTIONS, path: '/admin/questions', label: 'Questions' },
  { key: DASHBOARD_KEYS.MODERATION, path: '/admin/media', label: '🛡️ Moderation Center' },
  { key: DASHBOARD_KEYS.IDENTITY_DOCS, path: '/admin/identity-documents', label: 'Identity Docs' },
  { key: DASHBOARD_KEYS.PLANS, path: '/admin/plans', label: 'Plan & Subscriptions' },
  { key: DASHBOARD_KEYS.EVENTS, path: '/admin/events', label: 'Events & Groups' },
  { key: DASHBOARD_KEYS.FINANCE, path: '/admin/finance', label: 'Finance' },
  { key: DASHBOARD_KEYS.CUSTOMER_SUPPORT, path: '/admin/customer-support', label: 'Customer Support' },
  { key: DASHBOARD_KEYS.ROLE_ACCESS, path: '/admin/access', label: 'Role & Access' },
]

export const EMPLOYEE_ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TESTER: 'Tester',
  FINANCE: 'Finance Team',
  CUSTOMER_SUPPORT: 'Customer Support',
  EVENT_TEAM: 'Event Team',
  MARKETING: 'Management / Marketing',
  QC_LEGAL: 'Quality Control / Legal',
}

export function isEmployeeUser(user) {
  return user?.role === 'ADMIN'
}

export function hasDashboardAccess(user, dashboardKey) {
  if (!isEmployeeUser(user) || !dashboardKey) return false
  const allowed = user.allowedDashboards
  if (!Array.isArray(allowed)) return true
  return allowed.includes(dashboardKey)
}

export function getEmployeeNavItems(user) {
  if (!isEmployeeUser(user)) return []
  return DASHBOARD_NAV.filter((item) => hasDashboardAccess(user, item.key))
}

export function firstAdminPath(user) {
  if (!isEmployeeUser(user)) return '/'
  const items = getEmployeeNavItems(user)
  if (items.length > 0) return items[0].path
  return '/admin'
}

export function pathToDashboardKey(pathname) {
  if (!pathname) return null
  if (pathname === '/admin' || pathname === '/admin/') return DASHBOARD_KEYS.DASHBOARD
  const match = DASHBOARD_NAV.find((item) => item.path !== '/admin' && pathname.startsWith(item.path))
  return match?.key ?? null
}
