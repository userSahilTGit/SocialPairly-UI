import { Navigate, useLocation } from 'react-router-dom'
import { IDENTITY_CONTINUE_LATER_KEY, useAuth } from '../context/AuthContext'
import { userNeedsIdentityOnboarding } from '../utils/user'

function isIdentityGateExempt(pathname) {
  return (
    pathname.startsWith('/onboarding/identity')
    || pathname.startsWith('/onboarding/personality')
    || pathname.startsWith('/onboarding/faith')
    || pathname.startsWith('/onboarding/coming-soon')
    || pathname.startsWith('/profile/media')
    || pathname.startsWith('/subscriptions')
  )
}

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/signin" replace />
  }

  if (adminOnly && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  const dismissedLater = sessionStorage.getItem(IDENTITY_CONTINUE_LATER_KEY) === '1'
  if (
    userNeedsIdentityOnboarding(user)
    && !dismissedLater
    && !isIdentityGateExempt(location.pathname)
  ) {
    return <Navigate to="/onboarding/identity" replace />
  }

  return children
}
