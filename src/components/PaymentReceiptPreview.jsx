import { forwardRef } from 'react'
import './PaymentReceiptPreview.css'

function formatCurrency(amount, currency = 'USD') {
  const value = Number(amount)
  if (Number.isNaN(value)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'USD').toUpperCase(),
  }).format(value)
}

function formatPaidAt(paidAt) {
  if (!paidAt) return '-'
  const date = new Date(paidAt)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

const PaymentReceiptPreview = forwardRef(function PaymentReceiptPreview({ receipt }, ref) {
  if (!receipt) return null

  const merchantLabel = receipt.merchantName || 'SocialPairly'
  const receiptLabel = receipt.receiptNumber ? `Receipt #${receipt.receiptNumber}` : 'Payment Receipt'
  const supportEmail = receipt.supportEmail || 'sahil.t@socialpairly.com'

  return (
    <div className="payment-receipt-preview" ref={ref}>
      <div className="receipt-preview-banner" aria-hidden>
        <span className="receipt-preview-banner-dark" />
        <span className="receipt-preview-banner-light" />
      </div>

      <div className="receipt-preview-body">
        <h2 className="receipt-preview-title">Receipt from {merchantLabel}</h2>
        <p className="receipt-preview-number">{receiptLabel}</p>

        <div className="receipt-preview-meta">
          <div>
            <span className="receipt-preview-meta-label">AMOUNT PAID</span>
            <strong>{formatCurrency(receipt.amount, receipt.currency)}</strong>
          </div>
          <div>
            <span className="receipt-preview-meta-label">DATE PAID</span>
            <strong>{formatPaidAt(receipt.paidAt)}</strong>
          </div>
        </div>

        <div className="receipt-preview-summary">
          <span className="receipt-preview-summary-label">SUMMARY</span>
          <div className="receipt-preview-summary-box">
            <div className="receipt-preview-line">
              <span>{receipt.planName} × 1</span>
              <span>{formatCurrency(receipt.amount, receipt.currency)}</span>
            </div>
            <hr />
            <div className="receipt-preview-line receipt-preview-total">
              <span>Amount paid</span>
              <span>{formatCurrency(receipt.amount, receipt.currency)}</span>
            </div>
          </div>
        </div>

        <p className="receipt-preview-contact">
          If you have any questions, contact us at{' '}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>

        {receipt.receiptUrl && (
          <p className="receipt-preview-footer-note">
            View the original Stripe receipt at{' '}
            <a href={receipt.receiptUrl} target="_blank" rel="noopener noreferrer">
              Stripe
            </a>.
          </p>
        )}
      </div>
    </div>
  )
})

export default PaymentReceiptPreview
