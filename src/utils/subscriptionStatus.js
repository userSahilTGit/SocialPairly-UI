import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { isEmployeeUser } from './employeeAccess'

export const SUBSCRIPTION_CHANGED_EVENT = 'sp:subscription-changed'
const PREMIUM_STORAGE_PREFIX = 'sp_premium_member:'

function resolveUserStorageKey(user) {
  if (!user) return null
  const id = user.id ?? user.userId
  if (id != null && String(id).trim() !== '') {
    return `${PREMIUM_STORAGE_PREFIX}id:${String(id).trim()}`
  }
  if (user.email && String(user.email).trim() !== '') {
    return `${PREMIUM_STORAGE_PREFIX}email:${String(user.email).trim().toLowerCase()}`
  }
  return null
}

export function isActiveSubscriptionPayload(data) {
  if (!data || typeof data !== 'object') return false
  if (data.active === false) return false
  if (data.id != null) {
    return !data.status || String(data.status).toLowerCase() === 'active'
  }
  return data.active === true
}

export function readCachedPremiumStatus(user) {
  if (!user || isEmployeeUser(user)) {
    return { isPremium: false, resolved: true }
  }

  const details = String(user.subscriptionDetails || '').trim().toLowerCase()
  if (details === 'subscribed') {
    return { isPremium: true, resolved: true }
  }

  const storageKey = resolveUserStorageKey(user)
  if (storageKey && typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === '1') return { isPremium: true, resolved: true }
      if (stored === '0') return { isPremium: false, resolved: true }
    } catch {
      /* ignore storage errors */
    }
  }

  if (details === 'unsubscribed') {
    return { isPremium: false, resolved: true }
  }

  return { isPremium: false, resolved: false }
}

export function writeCachedPremiumStatus(user, isPremium) {
  const storageKey = resolveUserStorageKey(user)
  if (!storageKey || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(storageKey, isPremium ? '1' : '0')
  } catch {
    /* ignore storage errors */
  }
}

export function clearCachedPremiumStatus() {
  if (typeof localStorage === 'undefined') return
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith(PREMIUM_STORAGE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {
    /* ignore storage errors */
  }
}

export function notifySubscriptionChanged(isPremium, user = null) {
  if (user) {
    writeCachedPremiumStatus(user, Boolean(isPremium))
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(SUBSCRIPTION_CHANGED_EVENT, {
        detail: { isPremium: typeof isPremium === 'boolean' ? isPremium : undefined },
      }),
    )
  }
}

function samePremiumState(prev, next) {
  return prev.isPremium === next.isPremium && prev.resolved === next.resolved
}

export function usePremiumStatus(user) {
  const userRef = useRef(user)
  userRef.current = user

  const userIdentityKey = resolveUserStorageKey(user) || ''
  const isStaff = !user || isEmployeeUser(user)
  const subscriptionDetails = String(user?.subscriptionDetails || '').trim().toLowerCase()

  const [state, setState] = useState(() => readCachedPremiumStatus(user))

  const updateState = useCallback((next) => {
    setState((prev) => (samePremiumState(prev, next) ? prev : next))
  }, [])

  const refreshPremiumStatus = useCallback(async () => {
    const currentUser = userRef.current
    if (!currentUser || isEmployeeUser(currentUser)) {
      updateState({ isPremium: false, resolved: true })
      return false
    }
    if (typeof api?.get !== 'function') {
      const cached = readCachedPremiumStatus(currentUser)
      updateState({ isPremium: cached.isPremium, resolved: true })
      return cached.isPremium
    }
    try {
      const { data } = await api.get('/subscriptions/current')
      const active = isActiveSubscriptionPayload(data)
      writeCachedPremiumStatus(currentUser, active)
      updateState({ isPremium: active, resolved: true })
      return active
    } catch {
      const cached = readCachedPremiumStatus(currentUser)
      updateState({ isPremium: cached.isPremium, resolved: true })
      return cached.isPremium
    }
  }, [userIdentityKey, isStaff, subscriptionDetails, updateState])

  useEffect(() => {
    const currentUser = userRef.current
    const cached = readCachedPremiumStatus(currentUser)
    updateState(cached)

    if (!currentUser || isEmployeeUser(currentUser)) {
      return undefined
    }

    let cancelled = false
    if (typeof api?.get === 'function') {
      ;(async () => {
        try {
          const { data } = await api.get('/subscriptions/current')
          if (cancelled) return
          const active = isActiveSubscriptionPayload(data)
          writeCachedPremiumStatus(userRef.current, active)
          updateState({ isPremium: active, resolved: true })
        } catch {
          if (!cancelled) {
            const fallback = readCachedPremiumStatus(userRef.current)
            updateState({ isPremium: fallback.isPremium, resolved: true })
          }
        }
      })()
    } else {
      updateState({ isPremium: cached.isPremium, resolved: true })
    }

    const handleSubscriptionEvent = (event) => {
      if (cancelled) return
      const explicit = event?.detail?.isPremium
      if (typeof explicit === 'boolean') {
        writeCachedPremiumStatus(userRef.current, explicit)
        updateState({ isPremium: explicit, resolved: true })
      }
      refreshPremiumStatus()
    }

    const handleWindowFocus = () => {
      if (!cancelled) refreshPremiumStatus()
    }

    window.addEventListener(SUBSCRIPTION_CHANGED_EVENT, handleSubscriptionEvent)
    window.addEventListener('focus', handleWindowFocus)
    return () => {
      cancelled = true
      window.removeEventListener(SUBSCRIPTION_CHANGED_EVENT, handleSubscriptionEvent)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [userIdentityKey, isStaff, subscriptionDetails, refreshPremiumStatus, updateState])

  return {
    isPremium: state.isPremium,
    premiumResolved: state.resolved,
    refreshPremiumStatus,
  }
}
