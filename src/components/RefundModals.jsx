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

const EMPTY_BANK_FORM = {
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  accountType: '',
  abaRoutingNumber: '',
  recipientsAddress: '',
}

const ACCOUNT_TYPE_OPTIONS = ['Checking', 'Savings', 'Business Checking', 'Business Savings']

function validateBankDetailsForm(form) {
  const errors = {}
  const accountHolderName = form.accountHolderName.trim()
  const bankName = form.bankName.trim()
  const accountNumber = form.accountNumber.trim()
  const accountType = form.accountType.trim()
  const abaRoutingNumber = form.abaRoutingNumber.trim().toUpperCase()
  const recipientsAddress = form.recipientsAddress.trim()

  if (!accountHolderName) {
    errors.accountHolderName = 'Account holder full name is required'
  } else if (!/^[A-Za-z][A-Za-z .'-]{1,253}$/.test(accountHolderName)) {
    errors.accountHolderName = 'Enter a valid name using letters only'
  }

  if (!bankName) {
    errors.bankName = 'Banking institution name is required'
  } else if (bankName.length < 2) {
    errors.bankName = 'Enter a valid banking institution name'
  }

  if (!accountNumber) {
    errors.accountNumber = 'Account number is required'
  } else if (!/^\d{6,18}$/.test(accountNumber)) {
    errors.accountNumber = 'Account number must be 6 to 18 digits'
  }

  if (!accountType) {
    errors.accountType = 'Account type is required'
  } else if (!ACCOUNT_TYPE_OPTIONS.includes(accountType)) {
    errors.accountType = 'Select a valid account type'
  }

  if (!abaRoutingNumber) {
    errors.abaRoutingNumber = 'IFSC / routing code is required'
  } else if (!/^[A-Z0-9]{6,20}$/.test(abaRoutingNumber)) {
    errors.abaRoutingNumber = 'Enter a valid IFSC or routing code (6–20 letters/numbers)'
  }

  if (!recipientsAddress) {
    errors.recipientsAddress = "Recipient's address is required"
  } else if (recipientsAddress.length < 10) {
    errors.recipientsAddress = 'Enter a complete address including city and postal code'
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    cleaned: {
      accountHolderName,
      bankName,
      accountNumber,
      accountType,
      abaRoutingNumber,
      recipientsAddress,
    },
  }
}

export function BankDetailsModal({ open, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({ ...EMPTY_BANK_FORM })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm({ ...EMPTY_BANK_FORM })
      setErrors({})
      setTouched(false)
    }
  }, [open])

  const updateField = (field) => (e) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    if (touched) {
      setErrors(validateBankDetailsForm({ ...form, [field]: value }).errors)
    }
  }

  const { isValid } = validateBankDetailsForm(form)

  const handleSubmit = () => {
    setTouched(true)
    const result = validateBankDetailsForm(form)
    setErrors(result.errors)
    if (!result.isValid) return
    onSubmit(result.cleaned)
  }

  const handleClose = () => {
    setForm({ ...EMPTY_BANK_FORM })
    setErrors({})
    setTouched(false)
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
            <p>Submit verified banking details to receive your approved disbursement. All fields are required.</p>
          </div>
        </div>
        <div className="refund-modal-body">
          <label htmlFor="account-holder">Account Holder Full Name <span className="refund-required-marker" aria-hidden="true">*</span></label>
          <input
            id="account-holder"
            type="text"
            value={form.accountHolderName}
            onChange={updateField('accountHolderName')}
            placeholder="e.g. Sahil Tanwar"
            aria-required="true"
            aria-invalid={!!errors.accountHolderName}
            className={errors.accountHolderName ? 'refund-input-error' : undefined}
            maxLength={255}
          />
          {errors.accountHolderName && <span className="field-error">{errors.accountHolderName}</span>}

          <label htmlFor="bank-name">Banking Institution Name <span className="refund-required-marker" aria-hidden="true">*</span></label>
          <input
            id="bank-name"
            type="text"
            value={form.bankName}
            onChange={updateField('bankName')}
            placeholder="e.g. Chase Bank / HDFC Bank"
            aria-required="true"
            aria-invalid={!!errors.bankName}
            className={errors.bankName ? 'refund-input-error' : undefined}
            maxLength={100}
          />
          {errors.bankName && <span className="field-error">{errors.bankName}</span>}

          <div className="refund-form-row">
            <div>
              <label htmlFor="account-number">Account Number <span className="refund-required-marker" aria-hidden="true">*</span></label>
              <input
                id="account-number"
                type="text"
                inputMode="numeric"
                value={form.accountNumber}
                onChange={updateField('accountNumber')}
                placeholder="9876543210"
                aria-required="true"
                aria-invalid={!!errors.accountNumber}
                className={errors.accountNumber ? 'refund-input-error' : undefined}
                maxLength={18}
              />
              {errors.accountNumber && <span className="field-error">{errors.accountNumber}</span>}
            </div>
            <div>
              <label htmlFor="account-type">Account Type <span className="refund-required-marker" aria-hidden="true">*</span></label>
              <select
                id="account-type"
                value={form.accountType}
                onChange={updateField('accountType')}
                aria-required="true"
                aria-invalid={!!errors.accountType}
                className={errors.accountType ? 'refund-input-error' : undefined}
              >
                <option value="">Select account type</option>
                {ACCOUNT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.accountType && <span className="field-error">{errors.accountType}</span>}
            </div>
          </div>

          <label htmlFor="routing-code">IFSC / Routing Code <span className="refund-required-marker" aria-hidden="true">*</span></label>
          <input
            id="routing-code"
            type="text"
            value={form.abaRoutingNumber}
            onChange={updateField('abaRoutingNumber')}
            placeholder="CHAS000123"
            aria-required="true"
            aria-invalid={!!errors.abaRoutingNumber}
            className={errors.abaRoutingNumber ? 'refund-input-error' : undefined}
            maxLength={20}
          />
          {errors.abaRoutingNumber && <span className="field-error">{errors.abaRoutingNumber}</span>}

          <label htmlFor="recipients-address">Recipient&apos;s Address <span className="refund-required-marker" aria-hidden="true">*</span></label>
          <textarea
            id="recipients-address"
            value={form.recipientsAddress}
            onChange={updateField('recipientsAddress')}
            placeholder="Street address, city, state, ZIP / postal code"
            rows={3}
            aria-required="true"
            aria-invalid={!!errors.recipientsAddress}
            className={errors.recipientsAddress ? 'refund-input-error' : undefined}
          />
          {errors.recipientsAddress && <span className="field-error">{errors.recipientsAddress}</span>}
        </div>
        <div className="refund-modal-footer refund-modal-footer-single">
          <button
            type="button"
            className="btn-refund-bank-submit"
            onClick={handleSubmit}
            disabled={loading || (touched && !isValid)}
          >
            {loading ? 'Submitting...' : 'Submit Settlement Details'}
          </button>
        </div>
      </div>
    </div>
  )
}
