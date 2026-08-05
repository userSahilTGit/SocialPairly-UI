import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import PaymentReceiptPreview from '../components/PaymentReceiptPreview'
import api from '../api/axios'
import { downloadReceiptPdf } from '../utils/downloadReceiptPdf'
import './Subscriptions.css'

export default function Subscriptions() {
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
  const receiptPreviewRef = useRef(null)

  const paymentResult = searchParams.get('payment')
  const sessionId = searchParams.get('session_id')

  const fetchCurrentSubscription = useCallback(async () => {
    try {
      const { data } = await api.get('/subscriptions/current')
      if (data && data.active === false) {
        return null
      }
      return data
    } catch (err) {
      console.error('Failed to load current subscription', err)
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
      console.error('Failed to load payment status', err)
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
      console.error('Failed to download receipt PDF', err)
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
    const fetchPlans = async () => {
      try {
        const { data } = await api.get('/plans')
        setPlans(data)
        if (data.length > 0) {
          setActivePlanId(data[0].id)
          setActivePlan(data[0])
        }
      } catch (err) {
        console.error('Failed to load subscription plans', err)
        setError(err.response?.data?.message || err.message || 'Failed to load plans')
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()

    if (paymentResult !== 'success') {
      fetchCurrentSubscription().then((subscription) => {
        if (subscription) {
          setCurrentSubscription(subscription)
          setShowSubscriptionBanner(true)
        }
      })
    }
  }, [fetchCurrentSubscription, paymentResult])

  useEffect(() => {
    if (paymentResult !== 'success' || !sessionId) return

    const confirmPaymentSession = async () => {
      setPaymentBanner(null)
      setShowSubscriptionBanner(false)

      try {
        const { data } = await api.post('/payment/confirm-session', { sessionId })

        if (data?.subscription) {
          setPendingSubscription(data.subscription)
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
        console.error('Failed to confirm checkout session', err)
        setPaymentBanner({
          type: 'error',
          title: 'Payment Confirmation Failed',
          message: err.response?.data?.message || err.message || 'Unable to confirm your payment. Please contact support.',
        })
      }

      searchParams.delete('payment')
      searchParams.delete('session_id')
      setSearchParams(searchParams, { replace: true })
    }

    confirmPaymentSession()
  }, [paymentResult, sessionId, searchParams, setSearchParams])

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

  const openCheckoutModal = () => setIsModalOpen(true)
  const closeCheckoutModal = () => setIsModalOpen(false)

  const startStripeCheckout = async () => {
    if (!activePlan) return

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
      console.error('Checkout failed', err)
      setPaymentBanner({
        type: 'error',
        title: 'Checkout Error',
        message: err.response?.data?.message || err.message || 'Unable to start checkout.',
      })
    } finally {
      setCheckoutLoading(false)
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

          {showSubscriptionBanner && currentSubscription && (
            <section className="current-subscription-banner">
              <div className="current-subscription-icon">
                <i className="fa-solid fa-crown" />
              </div>
              <div className="current-subscription-details">
                <span className="current-subscription-label">Your Current Plan</span>
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
            </section>
          )}

          <section className="pricing-header">
            <div className="pricing-badge">
              <i className="fa-solid fa-bolt"></i>
              Upgrade Your Dating Experience
            </div>
            <h1>Match Faster, Connect Deeper</h1>
            <p>Choose a membership plan to unlock tokens, media sharing, and high-visibility profile boosts designed to get you noticed.</p>
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
                  className={`plan-card ${selected ? 'glass-card-selected' : ''} ${isCurrentPlan ? 'plan-card-current' : ''}`}
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectPlan(plan)
                      }}
                    >
                      {isCurrentPlan ? 'Current Plan' : selected ? 'Selected Plan' : 'Select Pass'}
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
            <button type="button" className="btn-checkout" onClick={openCheckoutModal} disabled={!activePlan}>
              <span>Continue to Checkout</span>
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
      </div>
    </>
  )
}
