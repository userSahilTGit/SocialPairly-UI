import { useState, useEffect } from 'react'

function formatAmount(amount) {
  if (amount == null) return '$0.00'
  return `$${parseFloat(amount).toFixed(2)}`
}

export function DiscontinueModal({ open, onClose, onSubmit, amount, loading }) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) setReason('')
  }, [open])

  const handleSubmit = () => {
    if (!reason.trim()) return
    onSubmit(reason.trim())
  }

  const handleClose = () => {
    setReason('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-overlay active refund-modal-overlay">
      <div className="refund-modal-container">
        <button type="button" className="modal-close" onClick={handleClose} disabled={loading}>
          <i className="fa-solid fa-xmark" />
        </button>
        <div className="refund-modal-header">
          <div className="refund-modal-icon refund-modal-icon-purple">
            <i className="fa-solid fa-file-signature" />
          </div>
          <div>
            <h3>Raise a Request</h3>
            <p>Submit a formal request for subscription cancellation and refund.</p>
          </div>
        </div>
        <div className="refund-modal-body">
          <label htmlFor="discontinue-reason">Primary Reason for Discontinuation</label>
          <textarea
            id="discontinue-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide details regarding your decision to discontinue..."
            maxLength={100}
            rows={4}
          />
          <div className="refund-valuation-box">
            <span>Refund Valuation:</span>
            <strong>{formatAmount(amount)} USD</strong>
          </div>
        </div>
        <div className="refund-modal-footer">
          <button type="button" className="btn-refund-cancel" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-refund-submit"
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ScheduleSlotModal({ open, onClose, onSubmit, loading }) {
  const [slot, setSlot] = useState('')

  const handleSubmit = () => {
    if (!slot) return
    onSubmit(slot)
  }

  const handleClose = () => {
    setSlot('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-overlay active refund-modal-overlay">
      <div className="refund-modal-container">
        <button type="button" className="modal-close" onClick={handleClose} disabled={loading}>
          <i className="fa-solid fa-xmark" />
        </button>
        <div className="refund-modal-header">
          <div className="refund-modal-icon refund-modal-icon-orange">
            <i className="fa-solid fa-headset" />
          </div>
          <div>
            <h3>Schedule Consultation Window</h3>
            <p>An administrator has requested a brief consultation call.</p>
          </div>
        </div>
        <div className="refund-modal-body">
          <label htmlFor="consultation-slot">Select Preferred Date & Time</label>
          <input
            id="consultation-slot"
            type="datetime-local"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
          />
          <div className="refund-info-box">
            <i className="fa-solid fa-circle-info" />
            <span>A customer support representative will contact you directly during your selected window.</span>
          </div>
        </div>
        <div className="refund-modal-footer refund-modal-footer-single">
          <button
            type="button"
            className="btn-refund-schedule-confirm"
            onClick={handleSubmit}
            disabled={loading || !slot}
          >
            {loading ? 'Confirming...' : 'Confirm Time Slot'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function BankDetailsModal({ open, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    accountType: '',
    abaRoutingNumber: '',
    recipientsAddress: '',
  })

  useEffect(() => {
    if (!open) {
      setForm({
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        accountType: '',
        abaRoutingNumber: '',
        recipientsAddress: '',
      })
    }
  }, [open])

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const isValid = form.accountHolderName && form.bankName && form.accountNumber
    && form.accountType && form.abaRoutingNumber && form.recipientsAddress

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit(form)
  }

  const handleClose = () => {
    setForm({
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      accountType: '',
      abaRoutingNumber: '',
      recipientsAddress: '',
    })
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-overlay active refund-modal-overlay">
      <div className="refund-modal-container refund-modal-wide">
        <button type="button" className="modal-close" onClick={handleClose} disabled={loading}>
          <i className="fa-solid fa-xmark" />
        </button>
        <div className="refund-modal-header">
          <div className="refund-modal-icon refund-modal-icon-green">
            <i className="fa-solid fa-building-columns" />
          </div>
          <div>
            <h3>Settlement Account Details</h3>
            <p>Submit verified banking details to receive your approved disbursement.</p>
          </div>
        </div>
        <div className="refund-modal-body">
          <label htmlFor="account-holder">Account Holder Full Name</label>
          <input
            id="account-holder"
            type="text"
            value={form.accountHolderName}
            onChange={updateField('accountHolderName')}
            placeholder="e.g. Sahil Tanwar"
          />
          <label htmlFor="bank-name">Banking Institution Name</label>
          <input
            id="bank-name"
            type="text"
            value={form.bankName}
            onChange={updateField('bankName')}
            placeholder="e.g. Chase Bank / HDFC Bank"
          />
          <div className="refund-form-row">
            <div>
              <label htmlFor="account-number">Account Number</label>
              <input
                id="account-number"
                type="text"
                value={form.accountNumber}
                onChange={updateField('accountNumber')}
                placeholder="9876543210"
              />
            </div>
            <div>
              <label htmlFor="account-type">Account Type</label>
              <select
                id="account-type"
                value={form.accountType}
                onChange={updateField('accountType')}
              >
                <option value="">Select account type</option>
                <option value="Checking">Checking</option>
                <option value="Savings">Savings</option>
                <option value="Business Checking">Business Checking</option>
                <option value="Business Savings">Business Savings</option>
              </select>
            </div>
          </div>
          <label htmlFor="routing-code">IFSC / Routing Code</label>
          <input
            id="routing-code"
            type="text"
            value={form.abaRoutingNumber}
            onChange={updateField('abaRoutingNumber')}
            placeholder="CHAS000123"
          />
          <label htmlFor="recipients-address">Recipient&apos;s Address</label>
          <textarea
            id="recipients-address"
            value={form.recipientsAddress}
            onChange={updateField('recipientsAddress')}
            placeholder="Street address, city, state, ZIP / postal code"
            rows={3}
          />
        </div>
        <div className="refund-modal-footer refund-modal-footer-single">
          <button
            type="button"
            className="btn-refund-bank-submit"
            onClick={handleSubmit}
            disabled={loading || !isValid}
          >
            {loading ? 'Submitting...' : 'Submit Settlement Details'}
          </button>
        </div>
      </div>
    </div>
  )
}
