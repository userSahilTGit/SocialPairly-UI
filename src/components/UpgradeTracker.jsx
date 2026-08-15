function formatAmount(amount) {
  if (amount == null) return '$0.00'
  return `$${parseFloat(amount).toFixed(2)}`
}

function formatDate(dateValue) {
  if (!dateValue) return '—'
  return new Date(dateValue).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Completed': return 'refund-badge-complete'
    case 'Rejected': return 'refund-badge-rejected'
    case 'InProgress': return 'refund-badge-progress'
    default: return 'refund-badge-pending'
  }
}

export default function UpgradeTracker({ upgrade, onCheckout, checkoutLoading, onDismiss }) {
  if (!upgrade || upgrade.active === false) return null

  const {
    status,
    action,
    formattedUpgradeId,
    createdAt,
    currentPlan,
    upgradePlan,
    extraToken,
    extraAmount,
    reason,
  } = upgrade

  const isRejected = status === 'Rejected' || (action === 'Closed' && status !== 'Completed')
  const isCompleted = status === 'Completed'
  const isPendingReview = status === 'Started' && action === 'Requested'
  const isApproved = status === 'InProgress' && action === 'Approved'
  const canDismiss = isCompleted || isRejected

  return (
    <section className="refund-tracker-card">
      <div className="refund-tracker-header">
        <div className="refund-tracker-title">
          <i className="fa-solid fa-arrow-trend-up" aria-hidden />
          <h3>Upgrade Status & History Tracker</h3>
        </div>
        <div className="refund-tracker-header-actions">
          <span className={`refund-status-badge ${getStatusBadgeClass(status)}`}>
            Status: {status || 'Pending'}
          </span>
          {canDismiss && (
            <button
              type="button"
              className="btn-tracker-dismiss"
              onClick={onDismiss}
              aria-label="Close tracker"
              title="Close"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
      </div>

      <div className="refund-tracker-body">
        {isPendingReview && (
          <div className="refund-state-box refund-state-pending">
            <div className="refund-state-icon">
              <i className="fa-solid fa-paper-plane" />
            </div>
            <h4>Upgrade Request Under Review</h4>
            <p>
              Your request to upgrade from <strong>{currentPlan}</strong> to{' '}
              <strong>{upgradePlan}</strong> has been submitted and is awaiting admin approval.
            </p>
            <div className="refund-state-meta">
              <span>Tracking ID: {formattedUpgradeId}</span>
              <span>Date Logged: {formatDate(createdAt)}</span>
            </div>
          </div>
        )}

        {isApproved && (
          <div className="refund-state-box refund-state-approved">
            <div className="refund-state-icon">
              <i className="fa-solid fa-check" />
            </div>
            <h4>Upgrade Approved — Complete Payment</h4>
            <p>
              Your upgrade to <strong>{upgradePlan}</strong> was approved. Pay the prorated amount
              below to activate your new plan and receive the additional tokens.
            </p>
            <div className="upgrade-cost-summary">
              <div>
                <span>Extra Tokens</span>
                <strong>{extraToken ?? 0}</strong>
              </div>
              <div>
                <span>Amount Due</span>
                <strong>{formatAmount(extraAmount)}</strong>
              </div>
            </div>
            <button
              type="button"
              className="btn-refund-action btn-refund-schedule"
              onClick={onCheckout}
              disabled={checkoutLoading}
              style={{ marginTop: '1rem' }}
            >
              <i className="fa-solid fa-credit-card" />
              {checkoutLoading ? 'Redirecting...' : 'Checkout'}
            </button>
            <div className="refund-state-meta">
              <span>Tracking ID: {formattedUpgradeId}</span>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="refund-state-box refund-state-complete">
            <div className="refund-state-icon">
              <i className="fa-solid fa-circle-check" />
            </div>
            <h4>Upgrade Complete</h4>
            <p>
              Your plan has been upgraded to <strong>{upgradePlan}</strong>. Extra tokens and the
              new membership are now active on your account.
            </p>
            <div className="refund-state-meta">
              <span>Tracking ID: {formattedUpgradeId}</span>
              <span>Completed: {formatDate(createdAt)}</span>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="refund-state-box refund-state-rejected">
            <div className="refund-state-icon">
              <i className="fa-solid fa-circle-xmark" />
            </div>
            <h4>Upgrade Request Declined</h4>
            <p>Your upgrade request was reviewed and closed by the administration team.</p>
            {reason && (
              <div className="refund-rejected-reason">Submitted reason: {reason}</div>
            )}
            <div className="refund-state-meta">
              <span>Tracking ID: {formattedUpgradeId}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
