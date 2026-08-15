import { useEffect, useState } from 'react'

export function UpgradeRequestModal({ open, onClose, onSubmit, plans, loading, error }) {
  const [upgradePlanId, setUpgradePlanId] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) {
      setUpgradePlanId('')
      setReason('')
    }
  }, [open])

  useEffect(() => {
    if (open && plans.length > 0 && !upgradePlanId) {
      setUpgradePlanId(String(plans[0].id))
    }
  }, [open, plans, upgradePlanId])

  const handleSubmit = () => {
    if (!upgradePlanId || !reason.trim()) return
    onSubmit({ upgradePlanId: Number(upgradePlanId), reason: reason.trim() })
  }

  if (!open) return null

  return (
    <div className="modal-overlay active refund-modal-overlay">
      <div className="refund-modal-container">
        <button type="button" className="modal-close" onClick={onClose} disabled={loading}>
          <i className="fa-solid fa-xmark" />
        </button>
        <div className="refund-modal-header">
          <div className="refund-modal-icon refund-modal-icon-purple">
            <i className="fa-solid fa-arrow-up" />
          </div>
          <div>
            <h3>Request Plan Upgrade</h3>
            <p>Select a higher plan and tell us why you want to upgrade.</p>
          </div>
        </div>
        <div className="refund-modal-body">
          <label htmlFor="upgrade-plan-select">Upgrade Plan</label>
          <select
            id="upgrade-plan-select"
            value={upgradePlanId}
            onChange={(e) => setUpgradePlanId(e.target.value)}
            disabled={loading || plans.length === 0}
          >
            {plans.length === 0 ? (
              <option value="">No eligible plans available</option>
            ) : (
              plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.planName} — ${parseFloat(plan.amount).toFixed(2)} ({plan.tokensIncluded || 0} tokens)
                </option>
              ))
            )}
          </select>

          <label htmlFor="upgrade-reason" style={{ marginTop: '1rem', display: 'block' }}>
            Reason for Upgrade
          </label>
          <textarea
            id="upgrade-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please share why you would like to upgrade your plan..."
            maxLength={500}
            rows={4}
            disabled={loading}
          />
          {error && (
            <div className="refund-info-box" style={{ marginTop: '0.75rem', color: '#b91c1c' }}>
              <i className="fa-solid fa-circle-exclamation" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <div className="refund-modal-footer">
          <button type="button" className="btn-refund-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-refund-submit"
            onClick={handleSubmit}
            disabled={loading || !upgradePlanId || !reason.trim() || plans.length === 0}
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  )
}
