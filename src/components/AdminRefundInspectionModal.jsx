function formatAmount(amount) {
  if (amount == null) return '$0.00'
  return `$${parseFloat(amount).toFixed(2)}`
}

function formatDateTime(dateValue) {
  if (!dateValue) return '—'
  return new Date(dateValue).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getStatusClass(status) {
  switch (status) {
    case 'Completed': return 'admin-refund-status-complete'
    case 'Rejected': return 'admin-refund-status-rejected'
    case 'In-Progress': return 'admin-refund-status-progress'
    default: return 'admin-refund-status-pending'
  }
}

export default function AdminRefundInspectionModal({
  open,
  refund,
  onClose,
  onRequestCall,
  onApprove,
  onCloseRefund,
  onCompletePayout,
  actionLoading,
}) {
  if (!open || !refund) return null

  const isCompleted = refund.status === 'Completed'
  const isRejected = refund.status === 'Rejected' || refund.action === 'Closed'
  const isCallRequested = refund.action === 'Requested a Call'
  const isApproved = refund.action === 'Approved'
  const hasBankDetails = !!refund.bankDetails
  const canFinalize = refund.action === 'Provided Bank Details' && !isCompleted

  const disableRequestCall = isCompleted || isRejected || isCallRequested || isApproved || hasBankDetails
    || refund.action === 'Provided Slot' || actionLoading
  const disableApproveClose = isCompleted || isRejected || isCallRequested || isApproved || hasBankDetails || actionLoading

  return (
    <div className="modal-overlay active admin-refund-modal-overlay">
      <div className="admin-refund-modal">
        <button type="button" className="admin-refund-close" onClick={onClose} aria-label="Close">
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="admin-refund-modal-header">
          <div>
            <span className="admin-refund-label">Refund Application Inspection</span>
            <h2>{refund.formattedRefundId}</h2>
          </div>
          <span className={`admin-refund-status-badge ${getStatusClass(refund.status)}`}>
            {refund.status}
          </span>
        </div>

        <div className="admin-refund-info-grid">
          <div>
            <span>Subscriber Name</span>
            <strong>{refund.userName}</strong>
          </div>
          <div>
            <span>Account Email</span>
            <strong>{refund.userEmail}</strong>
          </div>
          <div>
            <span>Claim Amount</span>
            <strong className="admin-refund-amount">{formatAmount(refund.claimAmount)}</strong>
          </div>
          <div>
            <span>Action State</span>
            <strong>{refund.action || '—'}</strong>
          </div>
        </div>

        <div className="admin-refund-section">
          <span className="admin-refund-section-label">Discontinuation Explanation</span>
          <div className="admin-refund-reason-box">
            <em>{refund.reason || 'No reason provided'}</em>
          </div>
        </div>

        {refund.slot && (
          <div className="admin-refund-section">
            <span className="admin-refund-section-label admin-refund-section-orange">User Schedule Call Window</span>
            <div className="admin-refund-slot-box">
              <i className="fa-solid fa-calendar-days" />
              {formatDateTime(refund.slot)}
            </div>
          </div>
        )}

        {hasBankDetails && (
          <div className="admin-refund-section">
            <span className="admin-refund-section-label admin-refund-section-green">Submitted Banking Information</span>
            <div className="admin-refund-bank-box">
              <div><span>Account Holder:</span> <strong>{refund.bankDetails.accountHolderName}</strong></div>
              <div><span>Institution:</span> <strong>{refund.bankDetails.bankName}</strong></div>
              <div><span>Account Number:</span> <strong>{refund.bankDetails.accountNumber}</strong></div>
              <div><span>Account Type:</span> <strong>{refund.bankDetails.accountType}</strong></div>
              <div><span>IFSC / Routing Code:</span> <strong>{refund.bankDetails.abaRoutingNumber}</strong></div>
              <div><span>Recipient&apos;s Address:</span> <strong>{refund.bankDetails.recipientsAddress}</strong></div>
            </div>
          </div>
        )}

        {!isCompleted && !isRejected && (
          <div className="admin-refund-actions-section">
            <span className="admin-refund-section-label">Administrative Actions</span>
            <div className="admin-refund-action-buttons">
              <button
                type="button"
                className="admin-refund-btn admin-refund-btn-call"
                onClick={onRequestCall}
                disabled={disableRequestCall}
              >
                <i className="fa-solid fa-phone" />
                Request Call
              </button>
              <button
                type="button"
                className="admin-refund-btn admin-refund-btn-approve"
                onClick={onApprove}
                disabled={disableApproveClose}
              >
                <i className="fa-solid fa-check" />
                Approve
              </button>
              <button
                type="button"
                className="admin-refund-btn admin-refund-btn-close"
                onClick={onCloseRefund}
                disabled={disableApproveClose}
              >
                <i className="fa-solid fa-xmark" />
                Decline & Close
              </button>
            </div>
          </div>
        )}

        {canFinalize && (
          <button
            type="button"
            className="admin-refund-finalize-btn"
            onClick={onCompletePayout}
            disabled={actionLoading}
          >
            <i className="fa-solid fa-check-double" />
            {actionLoading ? 'Processing...' : 'Finalize Refund Payout'}
          </button>
        )}
      </div>
    </div>
  )
}
