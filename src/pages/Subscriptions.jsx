import { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import './Subscriptions.css'

export default function Subscriptions() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePlanId, setActivePlanId] = useState(null)
  const [activePlan, setActivePlan] = useState(null)
  const [planFilter, setPlanFilter] = useState('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data } = await api.get('/api/plans')
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
  }, [])

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
    // split common separators into feature lines
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

  const completePurchase = () => {
    setIsModalOpen(false)
    setShowToast(true)
    window.setTimeout(() => setShowToast(false), 3500)
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
              const monthlyEquivalent = plan.durationDays ? (Number(plan.amount) / (Number(plan.durationDays) / 30)) : null
              const showPopular = Number(plan.durationDays || 0) >= 80 && Number(plan.durationDays || 0) <= 100

              return (
                <article
                  key={plan.id}
                  className={`plan-card ${selected ? 'glass-card-selected' : ''}`}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {showPopular && (
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
                      {selected ? 'Selected Plan' : 'Select Pass'}
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
            <button type="button" className="modal-close" onClick={closeCheckoutModal}>
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
            <div className="modal-actions">
              <button type="button" className="modal-button modal-button-secondary" onClick={completePurchase}>
                <i className="fa-brands fa-apple"></i>
                Pay with Apple Pay
              </button>
              <button type="button" className="modal-button modal-button-primary" onClick={completePurchase}>
                <i className="fa-solid fa-credit-card"></i>
                Pay with Credit / Debit Card
              </button>
            </div>
            <p className="modal-disclaimer">By clicking pay, your account will be instantly upgraded. Subscriptions auto-renew depending on your chosen plan cycle. You can cancel anytime from your settings.</p>
          </div>
        </div>

        <div className={`toast-notification ${showToast ? 'show' : ''}`}>
          <i className="fa-solid fa-circle-check"></i>
          <div>
            <h5>Subscription Activated!</h5>
            <p>Your account has been successfully upgraded.</p>
          </div>
        </div>
      </div>
    </>
  )
}
