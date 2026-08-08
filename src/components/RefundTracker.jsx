function formatRefundDate(dateValue) {
  if (!dateValue) return '—'
  return new Date(dateValue).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatRefundDateTime(dateValue) {
  if (!dateValue) return '—'
  return new Date(dateValue).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatAmount(amount) {
  if (amount == null) return '$0.00'
  return `$${parseFloat(amount).toFixed(2)}`
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Completed': return 'refund-badge-complete'
    case 'Rejected': return 'refund-badge-rejected'
    case 'In-Progress': return 'refund-badge-progress'
    default: return 'refund-badge-pending'
  }
}

export default function RefundTracker({ refund, onScheduleSlot, onProvideBankDetails }) {
  if (!refund || refund.active === false) return null

  const { status, action, formattedRefundId, createdAt, slot, amount, refundAmount } = refund
  const isRejected = status === 'Rejected' || action === 'Closed'
  const isCompleted = status === 'Completed'
  const isPendingReview = status === 'Initiated' && action === 'Requested'
  const isCallRequested = action === 'Requested a Call'
  const isSlotProvided = action === 'Provided Slot'
  const isApproved = action === 'Approved'
  const isBankDetailsProvided = action === 'Provided Bank Details'

  return (
    <section className="refund-tracker-card">
      <div className="refund-tracker-header">
        <div className="refund-tracker-title">
          <i className="fa-solid fa-clock-rotate-left" aria-hidden />
          <h3>Refund Status & History Tracker</h3>
        </div>
        <span className={`refund-status-badge ${getStatusBadgeClass(status)}`}>
          Status: {status || 'Pending'}
        </span>
      </div>

      <div className="refund-tracker-body">
        {isPendingReview && (
          <div className="refund-state-box refund-state-pending">
            <div className="refund-state-icon">
              <i className="fa-solid fa-paper-plane" />
            </div>
            <h4>Request Under Administrative Review</h4>
            <p>Your request has been submitted to the administration team and is currently undergoing review.</p>
            <div className="refund-state-meta">
              <span>Tracking ID: {formattedRefundId}</span>
              <span>Date Logged: {formatRefundDate(createdAt)}</span>
            </div>
          </div>
        )}

        {isCallRequested && (
          <div className="refund-state-box refund-state-call">
            <div className="refund-state-icon">
              <i className="fa-solid fa-headset" />
            </div>
            <h4>Consultation Requested by Support</h4>
            <p>An account specialist has requested a brief consultation regarding your discontinuation. Please schedule a convenient time window below.</p>
            <button type="button" className="btn-refund-action btn-refund-schedule" onClick={onScheduleSlot}>
              <i className="fa-solid fa-calendar-days" />
              Schedule Time Slot
            </button>
          </div>
        )}

        {isSlotProvided && (
          <div className="refund-state-box refund-state-slot">
            <div className="refund-state-icon">
              <i className="fa-solid fa-clock" />
            </div>
            <h4>Consultation Window Confirmed</h4>
            <p>Please be available on this time slot. We will reach out to you.</p>
            <div className="refund-slot-pill">
              Scheduled Window: {formatRefundDateTime(slot)}
            </div>
          </div>
        )}

        {isApproved && (
          <div className="refund-state-box refund-state-approved">
            <div className="refund-state-icon">
              <i className="fa-solid fa-file-invoice-dollar" />
            </div>
            <h4>Refund Approved — Action Required</h4>
            <p>Your refund request has been officially approved. Please provide your verified banking details to initiate payout settlement.</p>
            <button type="button" className="btn-refund-action btn-refund-bank" onClick={onProvideBankDetails}>
              <i className="fa-solid fa-building-columns" />
              Provide Banking Details
            </button>
          </div>
        )}

        {isBankDetailsProvided && !isCompleted && (
          <div className="refund-state-box refund-state-bank-confirmed">
            <div className="refund-state-icon">
              <i className="fa-solid fa-circle-check" />
            </div>
            <h4>Banking Information Confirmed</h4>
            <p>We have received your bank details, and your refund will be credited to your bank account within 10 to 15 business days.</p>
            <div className="refund-reference-pill">
              Payout Processing Reference (#{formattedRefundId})
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="refund-state-box refund-state-complete">
            <div className="refund-state-icon">
              <i className="fa-solid fa-check" />
            </div>
            <h4>Disbursement Complete</h4>
            <p>
              Your refund of {formatAmount(refundAmount || amount)} will be sent to your financial institution
              after deduction of applicable processing charges.
            </p>
          </div>
        )}

        {isRejected && (
          <div className="refund-state-box refund-state-rejected">
            <div className="refund-state-icon">
              <i className="fa-solid fa-xmark" />
            </div>
            <h4>Refund Request Declined</h4>
            <p>Sorry, we cannot process your refund at this time.</p>
            {refund.reason && (
              <div className="refund-rejected-reason">
                Submitted Reason: &ldquo;{refund.reason}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
