function formatAmount(amount) {
  if (amount == null) return '$0.00'
  return `$${parseFloat(amount).toFixed(2)}`
}

function getStatusClass(status) {
  switch (status) {
    case 'Completed': return 'admin-refund-status-complete'
    case 'Rejected': return 'admin-refund-status-rejected'
    case 'InProgress': return 'admin-refund-status-progress'
    default: return 'admin-refund-status-pending'
  }
}

export default function AdminUpgradeInspectionModal({
  open,
  upgrade,
  onClose,
  onApprove,
  onReject,
  actionLoading,
}) {
  if (!open || !upgrade) return null

  const isCompleted = upgrade.status === 'Completed'
  const isRejected = upgrade.status === 'Rejected' || upgrade.action === 'Closed'
  const isApproved = upgrade.action === 'Approved'
  const canAct = !isCompleted && !isRejected && !isApproved

  return (
    <div className="modal-overlay active admin-refund-modal-overlay">
      <div className="admin-refund-modal">
        <button type="button" className="admin-refund-close" onClick={onClose} aria-label="Close">
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="admin-refund-modal-header">
          <div>
            <span className="admin-refund-label">Plan Upgrade Inspection</span>
            <h2>{upgrade.formattedUpgradeId}</h2>
          </div>
          <span className={`admin-refund-status-badge ${getStatusClass(upgrade.status)}`}>
            {upgrade.status}
          </span>
        </div>

        <div className="admin-refund-info-grid">
          <div>
            <span>Subscriber Name</span>
            <strong>{upgrade.userName}</strong>
          </div>
          <div>
            <span>Account Email</span>
            <strong>{upgrade.userEmail}</strong>
          </div>
          <div>
            <span>User ID</span>
            <strong>{upgrade.userId}</strong>
          </div>
          <div>
            <span>Existing Tokens</span>
            <strong>{upgrade.existingTokens ?? 0}</strong>
          </div>
          <div>
            <span>Current Plan</span>
            <strong>{upgrade.currentPlan}</strong>
          </div>
          <div>
            <span>Upgrade Plan</span>
            <strong>{upgrade.upgradePlan}</strong>
          </div>
          <div>
            <span>Action State</span>
            <strong>{upgrade.action || '—'}</strong>
          </div>
          {(isApproved || isCompleted) && (
            <>
              <div>
                <span>Extra Tokens</span>
                <strong>{upgrade.extraToken ?? 0}</strong>
              </div>
              <div>
                <span>Amount Due</span>
                <strong className="admin-refund-amount">{formatAmount(upgrade.extraAmount)}</strong>
              </div>
            </>
          )}
        </div>

        <div className="admin-refund-section">
          <span className="admin-refund-section-label">Upgrade Explanation</span>
          <div className="admin-refund-reason-box">
            <em>{upgrade.reason || 'No reason provided'}</em>
          </div>
        </div>

        {canAct && (
          <div className="admin-refund-actions-section">
            <span className="admin-refund-section-label">Administrative Actions</span>
            <div className="admin-refund-action-buttons">
              <button
                type="button"
                className="admin-refund-btn admin-refund-btn-approve"
                onClick={onApprove}
                disabled={actionLoading}
              >
                <i className="fa-solid fa-check" />
                Approve
              </button>
              <button
                type="button"
                className="admin-refund-btn admin-refund-btn-close"
                onClick={onReject}
                disabled={actionLoading}
              >
                <i className="fa-solid fa-xmark" />
                Decline & Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
