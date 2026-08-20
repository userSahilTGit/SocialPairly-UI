import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import PaymentReceiptPreview from '../components/PaymentReceiptPreview'
import RefundTracker from '../components/RefundTracker'
import { DiscontinueModal, ScheduleSlotModal, BankDetailsModal } from '../components/RefundModals'
import UpgradeTracker from '../components/UpgradeTracker'
import { UpgradeRequestModal } from '../components/UpgradeModals'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { downloadReceiptPdf } from '../utils/downloadReceiptPdf'
import { logClientError } from '../utils/safeLog'
import './Subscriptions.css'

export default function Subscriptions() {
  const { refreshUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePlanId, setActivePlanId] = useState(null)
  const [activePlan, setActivePlan] = useState(null)
  const [planFilter, setPlanFilter] = useState('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [currentSubscription, setCurrentSubscription] = useState(null)
  const [paymentBanner, setPaymentBanner] = useState(null)
  const [receiptModal, setReceiptModal] = useState({ open: false, data: null })
  const [pendingSubscription, setPendingSubscription] = useState(null)
  const [showSubscriptionBanner, setShowSubscriptionBanner] = useState(true)
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)
  const [currentRefund, setCurrentRefund] = useState(null)
  const [discontinueModalOpen, setDiscontinueModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [refundLoading, setRefundLoading] = useState(false)
  const [currentUpgrade, setCurrentUpgrade] = useState(null)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [eligibleUpgradePlans, setEligibleUpgradePlans] = useState([])
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [upgradeCheckoutLoading, setUpgradeCheckoutLoading] = useState(false)
  const [upgradeModalError, setUpgradeModalError] = useState(null)
  const [refundTrackerDismissed, setRefundTrackerDismissed] = useState(false)
  const [upgradeTrackerDismissed, setUpgradeTrackerDismissed] = useState(false)
  const [subscriptionResolved, setSubscriptionResolved] = useState(false)
  const receiptPreviewRef = useRef(null)
  const confirmSessionHandledRef = useRef(false)
  const refreshUserRef = useRef(refreshUser)
  refreshUserRef.current = refreshUser

  const paymentResult = searchParams.get('payment')
  const sessionId = searchParams.get('session_id')

  const fetchCurrentRefund = useCallback(async () => {
    try {
      const { data } = await api.get('/refunds/current')
      if (data && data.active === false) {
        setCurrentRefund(null)
        setRefundTrackerDismissed(false)
        return null
      }
      setCurrentRefund(data)
      const terminal = data?.status === 'Completed' || data?.status === 'Rejected'
      if (!terminal) {
        setRefundTrackerDismissed(false)
      } else if (data?.refundId) {
        const dismissed = sessionStorage.getItem(`hideRefundTracker_${data.refundId}`) === '1'
        setRefundTrackerDismissed(dismissed)
      }
      return data
    } catch (err) {
      logClientError('Failed to load refund status', err)
      return null
    }
  }, [])

  const fetchCurrentUpgrade = useCallback(async () => {
    try {
      const { data } = await api.get('/upgrades/current')
      if (data && data.active === false) {
        setCurrentUpgrade(null)
        setUpgradeTrackerDismissed(false)
        return null
      }
      setCurrentUpgrade(data)
      const terminal = data?.status === 'Completed' || data?.status === 'Rejected'
      if (!terminal) {
        setUpgradeTrackerDismissed(false)
      } else if (data?.id) {
        const dismissed = sessionStorage.getItem(`hideUpgradeTracker_${data.id}`) === '1'
        setUpgradeTrackerDismissed(dismissed)
      }
      return data
    } catch (err) {
      logClientError('Failed to load upgrade status', err)
      return null
    }
  }, [])

  const fetchCurrentSubscription = useCallback(async () => {
    try {
      const { data } = await api.get('/subscriptions/current')
      if (data && data.active === false) {
        return null
      }
      if (data && data.active !== false) {
        try {
          await refreshUserRef.current()
        } catch {
          // balance syncs on next profile refresh
        }
      }
      return data
    } catch (err) {
      logClientError('Failed to load current subscription', err)
      return null
    }
  }, [])

  const fetchLatestPaymentStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/payment/latest-status')
      if (data?.status === 'failed') {
        setPaymentBanner({
          type: 'error',
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again with a different payment method.',
        })
      }
      return data
    } catch (err) {
      logClientError('Failed to load payment status', err)
      return null
    }
  }, [])

  const closeReceiptModal = () => {
    setReceiptModal({ open: false, data: null })
    if (pendingSubscription) {
      setCurrentSubscription(pendingSubscription)
      setPendingSubscription(null)
    }
    setShowSubscriptionBanner(true)
  }

  const downloadReceipt = async () => {
    if (!receiptPreviewRef.current || !receiptModal.data) return

    setDownloadingReceipt(true)
    try {
      const receiptNumber = receiptModal.data.receiptNumber || 'payment'
      const safeName = receiptNumber.replace(/[^a-zA-Z0-9-_]/g, '-')
      await downloadReceiptPdf(receiptPreviewRef.current, `receipt-${safeName}.pdf`)
    } catch (err) {
      logClientError('Failed to download receipt PDF', err)
      setPaymentBanner({
        type: 'error',
        title: 'Download Failed',
        message: 'Unable to generate the receipt PDF. Please try again.',
      })
    } finally {
      setDownloadingReceipt(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const fetchPlans = async () => {
      try {
        const { data } = await api.get('/plans')
        if (cancelled) return
        setPlans(data)
      } catch (err) {
        if (cancelled) return
        logClientError('Failed to load subscription plans', err)
        setError(err.response?.data?.message || err.message || 'Failed to load plans')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPlans()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (paymentResult === 'success') return

    let cancelled = false

    fetchCurrentSubscription().then((subscription) => {
      if (cancelled) return
      if (subscription) {
        setCurrentSubscription(subscription)
        setShowSubscriptionBanner(true)
      }
      setSubscriptionResolved(true)
    }).catch(() => {
      if (!cancelled) setSubscriptionResolved(true)
    })
    fetchCurrentRefund()
    fetchCurrentUpgrade()

    return () => { cancelled = true }
  }, [fetchCurrentSubscription, fetchCurrentRefund, fetchCurrentUpgrade, paymentResult])

  useEffect(() => {
    if (plans.length === 0) return
    if (paymentResult !== 'success' && !subscriptionResolved) return

    if (currentSubscription?.planId) {
      const currentPlan = plans.find((plan) => plan.id === currentSubscription.planId)
      if (currentPlan) {
        setActivePlanId((prev) => (prev === currentPlan.id ? prev : currentPlan.id))
        setActivePlan((prev) => (prev?.id === currentPlan.id ? prev : currentPlan))
      }
      return
    }

    setActivePlanId((prev) => prev ?? plans[0]?.id ?? null)
    setActivePlan((prev) => prev ?? plans[0] ?? null)
  }, [plans, currentSubscription?.planId, subscriptionResolved, paymentResult])

  useEffect(() => {
    const isTerminal = currentRefund && (currentRefund.status === 'Completed' || currentRefund.status === 'Rejected')
    if (!currentRefund || isTerminal) return undefined

    const interval = setInterval(() => {
      fetchCurrentRefund()
    }, 5000)

    return () => clearInterval(interval)
  }, [currentRefund, fetchCurrentRefund])

  useEffect(() => {
    const isTerminal = currentUpgrade && (currentUpgrade.status === 'Completed' || currentUpgrade.status === 'Rejected')
    if (!currentUpgrade || isTerminal) return undefined

    const interval = setInterval(() => {
      fetchCurrentUpgrade()
    }, 5000)

    return () => clearInterval(interval)
  }, [currentUpgrade, fetchCurrentUpgrade])

  useEffect(() => {
    if (currentRefund?.status === 'Completed') {
      fetchCurrentSubscription().then((subscription) => {
        if (subscription && subscription.active === false) {
          setCurrentSubscription(null)
          setShowSubscriptionBanner(false)
        }
      })
    }
  }, [currentRefund?.status, fetchCurrentSubscription])

  useEffect(() => {
    if (currentUpgrade?.status === 'Completed') {
      fetchCurrentSubscription().then((subscription) => {
        if (subscription && subscription.active !== false) {
          setCurrentSubscription(subscription)
          setShowSubscriptionBanner(true)
        }
      })
      refreshUserRef.current?.()
    }
  }, [currentUpgrade?.status, fetchCurrentSubscription])

  useEffect(() => {
    if (paymentResult !== 'success' || !sessionId) return
    if (confirmSessionHandledRef.current) return
    confirmSessionHandledRef.current = true

    const confirmPaymentSession = async () => {
      setPaymentBanner(null)
      setShowSubscriptionBanner(false)

      try {
        const { data } = await api.post('/payment/confirm-session', { sessionId })

        if (data?.subscription) {
          setPendingSubscription(data.subscription)
          try {
            await refreshUserRef.current()
          } catch {
            // token balance will sync on next /users/me refresh
          }
          await fetchCurrentUpgrade()
          if (data.receipt) {
            setReceiptModal({ open: true, data: data.receipt })
          } else {
            setCurrentSubscription(data.subscription)
            setShowSubscriptionBanner(true)
          }
        } else {
          setPaymentBanner({
            type: 'info',
            title: 'Payment Received',
            message: 'Your payment is being processed. Your subscription will appear shortly.',
          })
        }
      } catch (err) {
        logClientError('Failed to confirm checkout session', err)
        setPaymentBanner({
          type: 'error',
          title: 'Payment Confirmation Failed',
          message: err.response?.data?.message || err.message || 'Unable to confirm your payment. Please contact support.',
        })
      } finally {
        setSearchParams((params) => {
          const next = new URLSearchParams(params)
          next.delete('payment')
          next.delete('session_id')
          return next
        }, { replace: true })
      }
    }

    confirmPaymentSession()
  }, [paymentResult, sessionId, setSearchParams])

  useEffect(() => {
    if (paymentResult) return
    fetchLatestPaymentStatus()
  }, [paymentResult, fetchLatestPaymentStatus])

  useEffect(() => {
    if (paymentResult === 'cancelled') {
      setPaymentBanner({
        type: 'warning',
        title: 'Payment Cancelled',
        message: 'You cancelled the checkout. No charges were made.',
      })
      searchParams.delete('payment')
      setSearchParams(searchParams, { replace: true })
    } else if (paymentResult === 'failed') {
      setPaymentBanner({
        type: 'error',
        title: 'Payment Failed',
        message: 'Your payment could not be completed. Please try again.',
      })
      searchParams.delete('payment')
      setSearchParams(searchParams, { replace: true })
    }
  }, [paymentResult, searchParams, setSearchParams])

  const filteredPlans = useMemo(() => {
    if (planFilter === 'ALL') return plans
    const filter = planFilter
    return plans.filter((plan) => {
      const type = (plan.planType || '').toUpperCase()
      const days = Number(plan.durationDays || 0)

      if (filter === 'WEEKLY') {
        return type.includes('WEEK') || days > 0 && days <= 14
      }
      if (filter === 'MONTHLY') {
        return type.includes('MONTH') || (days >= 25 && days <= 40)
      }
      if (filter === 'LONGTERM') {
        return type.includes('LONG') || days >= 80
      }
      return type === filter
    })
  }, [plans, planFilter])

  const handleSelectPlan = (plan) => {
    if (hasActiveSubscription) return
    setActivePlanId(plan.id)
    setActivePlan(plan)
  }

  const formatPrice = (amount) => {
    if (amount == null) return ''
    return `$${parseFloat(amount).toFixed(2)}`
  }

  const formatDuration = (days) => {
    if (days == null) return ''
    return `${days} Days`
  }

  const renderFeatureList = (description) => {
    if (!description) return null
    const items = description.split(/\r?\n|\||;|•|\u2022/).map((s) => s.trim()).filter(Boolean)

    const getIconClass = (text) => {
      const t = (text || '').toLowerCase()
      if (t.includes('token')) return 'fa-solid fa-coins'
      if (t.includes('community') || t.includes('post')) return 'fa-solid fa-pen-to-square'
      if (t.includes('photo') || t.includes('video') || t.includes('media')) return 'fa-solid fa-photo-film'
      if (t.includes('message') || t.includes('direct')) return 'fa-solid fa-comments'
      if (t.includes('priority') || t.includes('priority message')) return 'fa-solid fa-star'
      if (t.includes('boost') || t.includes('visibility')) return 'fa-solid fa-eye'
      if (t.includes('unlimited') || t.includes('infinite')) return 'fa-solid fa-infinity'
      if (t.includes('spotlight') || t.includes('top')) return 'fa-solid fa-fire'
      if (t.includes('read') || t.includes('receipts')) return 'fa-solid fa-check-double'
      if (t.includes('vip') || t.includes('crown')) return 'fa-solid fa-crown'
      return 'fa-solid fa-coins'
    }

    return (
      <ul className="plan-features">
        {items.map((it, idx) => (
          <li key={idx}>
            <i className={getIconClass(it)} aria-hidden />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    )
  }

  const getLabel = (plan) => {
    const type = plan.planType?.toUpperCase() || ''
    if (type === 'WEEKLY') return 'Weekly Pass'
    if (type === 'MONTHLY') return 'Monthly'
    if (type === 'LONGTERM') return '3 to 12 Months'
    return 'Plan'
  }

  const startStripeCheckout = async () => {
    if (!activePlan) return

    if (hasActiveSubscription) {
      setPaymentBanner({
        type: 'warning',
        title: 'Active Subscription',
        message: 'You already have an active membership. Please discontinue your current plan or wait until it expires before purchasing another.',
      })
      return
    }

    setCheckoutLoading(true)
    setPaymentBanner(null)

    try {
      const amountInCents = Math.round(Number(activePlan.amount) * 100)
      const { data } = await api.post('/payment/checkout', {
        amount: amountInCents,
        quantity: 1,
        currency: 'USD',
        name: activePlan.planName,
        planId: activePlan.id,
      })

      if (data?.sessionUrl) {
        window.location.href = data.sessionUrl
        return
      }

      setPaymentBanner({
        type: 'error',
        title: 'Checkout Error',
        message: data?.message || 'Unable to start checkout. Please try again.',
      })
    } catch (err) {
      logClientError('Checkout failed', err)
      setPaymentBanner({
        type: 'error',
        title: 'Checkout Error',
        message: err.response?.data?.message || err.message || 'Unable to start checkout.',
      })
    } finally {
      setCheckoutLoading(false)
    }
  }

  const openCheckoutModal = () => {
    if (hasActiveSubscription) {
      setPaymentBanner({
        type: 'warning',
        title: 'Active Subscription',
        message: 'You already have an active membership. Please discontinue your current plan or wait until it expires before purchasing another.',
      })
      return
    }
    setIsModalOpen(true)
  }
  const closeCheckoutModal = () => setIsModalOpen(false)

  const hasActiveRefund = currentRefund && currentRefund.status !== 'Completed' && currentRefund.status !== 'Rejected'
  const hasActiveUpgrade = currentUpgrade && currentUpgrade.status !== 'Completed' && currentUpgrade.status !== 'Rejected'
  const hasActiveSubscription = !!currentSubscription
  const showRefundTracker = currentRefund && currentRefund.refundId && !refundTrackerDismissed
  const showUpgradeTracker = currentUpgrade && currentUpgrade.id && !upgradeTrackerDismissed

  const dismissRefundTracker = () => {
    if (currentRefund?.refundId) {
      sessionStorage.setItem(`hideRefundTracker_${currentRefund.refundId}`, '1')
    }
    setRefundTrackerDismissed(true)
  }

  const dismissUpgradeTracker = () => {
    if (currentUpgrade?.id) {
      sessionStorage.setItem(`hideUpgradeTracker_${currentUpgrade.id}`, '1')
    }
    setUpgradeTrackerDismissed(true)
  }

  const openUpgradeModal = async () => {
    if (hasActiveRefund) {
      setPaymentBanner({
        type: 'warning',
        title: 'Refund In Progress',
        message: 'You cannot request a plan upgrade while a refund request is active.',
      })
      return
    }
    if (hasActiveUpgrade) {
      setPaymentBanner({
        type: 'info',
        title: 'Upgrade In Progress',
        message: 'You already have an active upgrade request. Track its status below.',
      })
      return
    }

    setUpgradeModalError(null)
    setUpgradeLoading(true)
    try {
      const { data } = await api.get('/upgrades/eligible-plans')
      setEligibleUpgradePlans(data || [])
      if (!data || data.length === 0) {
        setUpgradeModalError('No higher-token plans are available for your current balance.')
      }
      setUpgradeModalOpen(true)
    } catch (err) {
      setPaymentBanner({
        type: 'error',
        title: 'Unable to Load Plans',
        message: err.response?.data?.message || 'Could not load upgrade plans.',
      })
    } finally {
      setUpgradeLoading(false)
    }
  }

  const handleUpgradeSubmit = async ({ upgradePlanId, reason }) => {
    setUpgradeLoading(true)
    setUpgradeModalError(null)
    try {
      const { data } = await api.post('/upgrades', { upgradePlanId, reason })
      setCurrentUpgrade(data)
      setUpgradeModalOpen(false)
    } catch (err) {
      setUpgradeModalError(err.response?.data?.message || 'Unable to submit upgrade request.')
    } finally {
      setUpgradeLoading(false)
    }
  }

  const handleUpgradeCheckout = async () => {
    if (!currentUpgrade?.id) return
    setUpgradeCheckoutLoading(true)
    setPaymentBanner(null)
    try {
      const { data } = await api.post(`/upgrades/${currentUpgrade.id}/checkout`)
      if (data?.sessionUrl) {
        window.location.href = data.sessionUrl
        return
      }
      setPaymentBanner({
        type: 'error',
        title: 'Checkout Error',
        message: data?.message || 'Unable to start upgrade checkout.',
      })
    } catch (err) {
      setPaymentBanner({
        type: 'error',
        title: 'Checkout Error',
        message: err.response?.data?.message || 'Unable to start upgrade checkout.',
      })
    } finally {
      setUpgradeCheckoutLoading(false)
    }
  }

  const handleDiscontinueSubmit = async (reason) => {
    setRefundLoading(true)
    try {
      const { data } = await api.post('/refunds', { reason })
      setCurrentRefund(data)
      setDiscontinueModalOpen(false)
    } catch (err) {
      setPaymentBanner({
        type: 'error',
        title: 'Request Failed',
        message: err.response?.data?.message || 'Unable to submit refund request.',
      })
    } finally {
      setRefundLoading(false)
    }
  }

  const handleScheduleSubmit = async (slotValue) => {
    if (!currentRefund?.refundId) return
    setRefundLoading(true)
    try {
      const slot = new Date(slotValue).toISOString()
      const { data } = await api.post(`/refunds/${currentRefund.refundId}/slot`, { slot })
      setCurrentRefund(data)
      setScheduleModalOpen(false)
    } catch (err) {
      setPaymentBanner({
        type: 'error',
        title: 'Schedule Failed',
        message: err.response?.data?.message || 'Unable to confirm time slot.',
      })
    } finally {
      setRefundLoading(false)
    }
  }

  const handleBankDetailsSubmit = async (form) => {
    if (!currentRefund?.refundId) return
    setRefundLoading(true)
    try {
      const { data } = await api.post(`/refunds/${currentRefund.refundId}/bank-details`, form)
      setCurrentRefund(data)
      setBankModalOpen(false)
    } catch (err) {
      setPaymentBanner({
        type: 'error',
        title: 'Submission Failed',
        message: err.response?.data?.message || 'Unable to submit bank details.',
      })
    } finally {
      setRefundLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="subscriptions-page">
          <div className="loading-state">Loading plans...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="subscriptions-page">
        <main className="main-content">
          {paymentBanner && (
            <div className={`payment-banner payment-banner-${paymentBanner.type}`} role="alert">
              <i className={`fa-solid ${paymentBanner.type === 'error' ? 'fa-circle-xmark' : paymentBanner.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info'}`} />
              <div>
                <strong>{paymentBanner.title}</strong>
                <p>{paymentBanner.message}</p>
              </div>
            </div>
          )}

          <section className="pricing-header">
            <div className="pricing-badge">
              <i className="fa-solid fa-bolt"></i>
              Upgrade Your Dating Experience
            </div>
            <h1>Match Faster, Connect Deeper</h1>
            <p>Choose a membership plan to unlock tokens, media sharing, and high-visibility profile boosts designed to get you noticed.</p>

            {showSubscriptionBanner && currentSubscription && (
              <section className="current-subscription-banner">
                <div className="current-subscription-icon">
                  <i className="fa-solid fa-crown" />
                </div>
                <div className="current-subscription-details">
                  <span className="current-subscription-label">Your Active Membership</span>
                  <h2>{currentSubscription.planName}</h2>
                  <p>
                    Active until {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {' '}({formatDuration(currentSubscription.durationDays)})
                  </p>
                </div>
                <div className="current-subscription-actions">
                  <button
                    type="button"
                    className="btn-subscription-discontinue"
                    onClick={() => setDiscontinueModalOpen(true)}
                    disabled={hasActiveRefund || hasActiveUpgrade}
                  >
                    Discontinue Plan
                  </button>
                  <button
                    type="button"
                    className="btn-subscription-upgrade"
                    onClick={openUpgradeModal}
                    disabled={hasActiveRefund || hasActiveUpgrade || upgradeLoading}
                    title={hasActiveRefund
                      ? 'Upgrade unavailable while a refund is active'
                      : hasActiveUpgrade
                        ? 'An upgrade request is already in progress'
                        : 'Request a plan upgrade'}
                  >
                    {upgradeLoading ? 'Loading...' : 'Upgrade'}
                  </button>
                </div>
              </section>
            )}

            {showRefundTracker && (
              <RefundTracker
                refund={currentRefund}
                onScheduleSlot={() => setScheduleModalOpen(true)}
                onProvideBankDetails={() => setBankModalOpen(true)}
                onDismiss={dismissRefundTracker}
              />
            )}

            {showUpgradeTracker && (
              <UpgradeTracker
                upgrade={currentUpgrade}
                onCheckout={handleUpgradeCheckout}
                checkoutLoading={upgradeCheckoutLoading}
                onDismiss={dismissUpgradeTracker}
              />
            )}

            <div className="pricing-tabs">
              {['ALL', 'WEEKLY', 'MONTHLY', 'LONGTERM'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`plan-tab ${planFilter === tab ? 'active' : ''}`}
                  onClick={() => setPlanFilter(tab)}
                >
                  {tab === 'ALL' ? 'All Plans' : tab === 'WEEKLY' ? 'Weekly Passes' : tab === 'MONTHLY' ? 'Monthly' : '3 to 12 Months'}
                </button>
              ))}
            </div>
          </section>

          <section className="plans-grid">
            {error && (
              <div className="plan-error" role="alert" style={{gridColumn: '1/-1', textAlign: 'center', color: 'var(--color-slate-700)'}}>
                <strong>Unable to load plans:</strong> {error}
              </div>
            )}
            {filteredPlans.map((plan) => {
              const selected = plan.id === activePlanId
              const isCurrentPlan = showSubscriptionBanner && currentSubscription?.planId === plan.id
              const monthlyEquivalent = plan.durationDays ? (Number(plan.amount) / (Number(plan.durationDays) / 30)) : null
              const showPopular = Number(plan.durationDays || 0) >= 80 && Number(plan.durationDays || 0) <= 100

              return (
                <article
                  key={plan.id}
                  className={`plan-card ${selected ? 'glass-card-selected' : ''} ${isCurrentPlan ? 'plan-card-current' : ''} ${hasActiveSubscription && !isCurrentPlan ? 'plan-card-disabled' : ''}`}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isCurrentPlan && (
                    <div className="ribbon ribbon-current">CURRENT PLAN</div>
                  )}
                  {!isCurrentPlan && showPopular && (
                    <div className="ribbon">MOST POPULAR • SAVE 20%</div>
                  )}
                  <div className="plan-card-inner">
                    <div className="plan-card-header">
                      <span className="badge-tag badge-brand">{getLabel(plan)}</span>
                      <div className="plan-dot" aria-hidden>{selected ? <i className="fa-solid fa-circle" /> : <i className="fa-regular fa-circle" />}</div>
                    </div>

                    <h3 className="plan-title">{plan.planName}</h3>

                    <div className="price-row">
                      <div className="price-amount">{formatPrice(plan.amount)}</div>
                      <div className="price-duration">/ {formatDuration(plan.durationDays)}</div>
                    </div>

                    {monthlyEquivalent && (
                      <div className="price-tag">{`$${Number(monthlyEquivalent).toFixed(0)} / MONTH EQUIVALENT`}</div>
                    )}

                    <hr />

                    {renderFeatureList(plan.description)}

                    <div style={{height: 8}} />

                    <button
                      type="button"
                      className={`plan-button ${selected ? 'selected' : ''}`}
                      disabled={hasActiveSubscription && !isCurrentPlan}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectPlan(plan)
                      }}
                    >
                      {isCurrentPlan ? 'Current Plan' : hasActiveSubscription ? 'Unavailable' : selected ? 'Selected Plan' : 'Select Pass'}
                    </button>
                  </div>
                </article>
              )
            })}
          </section>

          <section className="feature-footer">
            <div className="feature-card">
              <div className="feature-icon feature-brand">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <h4>100% Safe & Confidential</h4>
              <p>Your privacy is protected with discrete billing and encrypted data security.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-amber">
                <i className="fa-solid fa-bolt"></i>
              </div>
              <h4>Instant Activation</h4>
              <p>Tokens and photo/video privileges are granted immediately upon purchase.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-emerald">
                <i className="fa-solid fa-rotate-left"></i>
              </div>
              <h4>Cancel Anytime</h4>
              <p>No long-term lock-in contracts. Manage your auto-renewal in account settings.</p>
            </div>
          </section>
        </main>

        <div className="sticky-bottom-bar">
          <div className="bottom-bar-inner">
            <div className="selected-plan-summary">
              <div>
                <span className="summary-label">Selected Plan:</span>
                <span className="summary-title">{activePlan?.planName || '-'}</span>
                <span className="summary-duration">({formatDuration(activePlan?.durationDays)})</span>
              </div>
              <div className="summary-price">{formatPrice(activePlan?.amount)}</div>
            </div>
            <button type="button" className="btn-checkout" onClick={openCheckoutModal} disabled={!activePlan || hasActiveSubscription}>
              <span>{hasActiveSubscription ? 'Plan Already Active' : 'Continue to Checkout'}</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>

        <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`}>
          <div className="modal-container">
            <button type="button" className="modal-close" onClick={closeCheckoutModal} disabled={checkoutLoading}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <div className="modal-header">
              <div className="modal-icon">
                <i className="fa-solid fa-heart"></i>
              </div>
              <h3>Confirm Your Subscription</h3>
              <p>Ready to start meeting amazing people?</p>
            </div>
            <div className="modal-summary">
              <div>
                <span>Plan Name</span>
                <strong>{activePlan?.planName || '-'}</strong>
              </div>
              <div>
                <span>Duration</span>
                <strong>{formatDuration(activePlan?.durationDays)}</strong>
              </div>
              <div className="modal-total">
                <span>Total Due Now</span>
                <strong>{formatPrice(activePlan?.amount)}</strong>
              </div>
            </div>
            <div className="modal-actions modal-actions-single">
              <button type="button" className="modal-button modal-button-primary" onClick={startStripeCheckout} disabled={checkoutLoading}>
                {checkoutLoading ? 'Redirecting...' : 'Confirm'}
                {!checkoutLoading && <i className="fa-solid fa-arrow-right"></i>}
              </button>
            </div>
            <p className="modal-disclaimer">By confirming, your account will be instantly upgraded. Subscriptions auto-renew depending on your chosen plan cycle. You can cancel anytime from your settings.</p>
          </div>
        </div>

        <div className={`modal-overlay receipt-modal-overlay ${receiptModal.open ? 'active' : ''}`}>
          <div className="receipt-modal-container">
            <div className="receipt-modal-header">
              <h3>Payment Receipt</h3>
              <button type="button" className="modal-close" onClick={closeReceiptModal} aria-label="Close receipt">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p className="receipt-modal-subtitle">Your payment was successful. Review your receipt below.</p>
            <div className="receipt-frame-wrapper">
              {receiptModal.data ? (
                <PaymentReceiptPreview ref={receiptPreviewRef} receipt={receiptModal.data} />
              ) : (
                <div className="receipt-frame-fallback">Receipt is not available.</div>
              )}
            </div>
            <div className="receipt-modal-actions">
              <button type="button" className="modal-button modal-button-secondary" onClick={downloadReceipt} disabled={!receiptModal.data || downloadingReceipt}>
                <i className="fa-solid fa-download"></i>
                {downloadingReceipt ? 'Generating PDF...' : 'Download Receipt'}
              </button>
              <button type="button" className="modal-button modal-button-primary" onClick={closeReceiptModal}>
                Close & View My Plan
              </button>
            </div>
          </div>
        </div>

        <DiscontinueModal
          open={discontinueModalOpen}
          onClose={() => setDiscontinueModalOpen(false)}
          onSubmit={handleDiscontinueSubmit}
          amount={currentSubscription?.amount || currentRefund?.amount}
          loading={refundLoading}
        />

        <ScheduleSlotModal
          open={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          onSubmit={handleScheduleSubmit}
          loading={refundLoading}
        />

        <BankDetailsModal
          open={bankModalOpen}
          onClose={() => setBankModalOpen(false)}
          onSubmit={handleBankDetailsSubmit}
          loading={refundLoading}
        />

        <UpgradeRequestModal
          open={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          onSubmit={handleUpgradeSubmit}
          plans={eligibleUpgradePlans}
          loading={upgradeLoading}
          error={upgradeModalError}
        />
      </div>
    <SiteFooter />
    </>
  )
}
