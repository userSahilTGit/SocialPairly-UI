import { useDeferredValue, useEffect, useMemo, useRef, useState, startTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck, Briefcase, Calendar, Check, Eye, Globe2, Info,
  MapPin, PhoneCall, ShieldAlert, ShieldCheck, Sparkles, UserCheck, Users,
  Home, Landmark, HeartHandshake, Wallet, Scale, Baby,
} from 'lucide-react'
import api from '../../api/axios'
import { useAuth, IDENTITY_CONTINUE_LATER_KEY } from '../../context/AuthContext'
import { readCompletionPercentage } from '../../utils/profileCompletion'
import OnboardingShell from '../../components/onboarding/OnboardingShell'
import AccordionSection from '../../components/onboarding/AccordionSection'
import PreferredFutureLocations from '../../components/onboarding/PreferredFutureLocations'
import {
  BEST_TIMES,
  CONTACT_METHODS,
  EMPTY_EDUCATION,
  EMPTY_IDENTITY_FORM,
  EMPTY_LANGUAGE,
  EMPTY_PREVIOUS_ADDRESS,
  MAX_PREVIOUS_ADDRESSES,
  GENDER_OPTIONS,
  GENDER_VISIBILITY,
  NAME_PREFIXES,
  NAME_SUFFIXES,
  PRONOUN_OPTIONS,
  buildIdentityPayload,
  calcAge,
  formatEducationCity,
  formatEducationText,
  formatEducationYear,
  formatAlphanumericText,
  formatEmploymentTypeText,
  formatUnsignedDigits,
  blockInvalidNumberKeys,
  formatSsnInput,
  humanizeEnum,
  mapIdentityResponseToForm,
  residenceDurationLabel,
  validateIdentityForm,
  formatZipInput,
  US_ZIP_REGEX,
} from '../../utils/identityValidation'
import {
  identityRequestConfig,
  isTimeoutError,
  markIdentityEnd,
  markIdentityStart,
  readServerDuration,
} from '../../utils/identityPerf'

const MONTHS = [
  { value: '', label: 'Month' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i, 1).toLocaleString('en', { month: 'long' }),
  })),
]

const SECTION_FOR_ERROR = {
  firstName: 'legal',
  lastName: 'legal',
  middleName: 'legal',
  preferredName: 'preferred',
  dateOfBirth: 'dob',
  secondaryEmail: 'contact',
  primaryPhone: 'contact',
  secondaryPhone: 'contact',
  homePhone: 'contact',
  'currentResidence.line1': 'address',
  'currentResidence.city': 'address',
  'currentResidence.stateRegion': 'address',
  'currentResidence.postalCode': 'address',
  'currentResidence.countryCode': 'address',
  'currentResidence.preferredFutureLocations': 'address',
  'relationship.maritalStatus': 'relationship',
  'nationality.additionalNationalities': 'nationality',
  ssn: 'verification',
}

function enumOptions(list) {
  return (list || []).map((value) => ({ value, label: humanizeEnum(value) }))
}

function openSectionForErrors(errors) {
  const keys = Object.keys(errors)
  for (const key of keys) {
    if (SECTION_FOR_ERROR[key]) return SECTION_FOR_ERROR[key]
    if (key.startsWith('currentResidence')) return 'address'
    if (key.startsWith('previousAddresses')) return 'previousAddresses'
    if (key.startsWith('nationality')) return 'nationality'
    if (key.startsWith('relationship')) return 'relationship'
    if (key.startsWith('educations')) return 'education'
    if (key.startsWith('family')) return 'family'
    if (key.startsWith('career')) return 'career'
    if (key.startsWith('financial')) return 'financial'
    if (key.startsWith('safety')) return 'safety'
    if (key.startsWith('civil')) return 'civil'
    if (key === 'ssn' || key.startsWith('verification')) return 'verification'
  }
  return 'legal'
}

export default function IdentityBackgroundPage() {
  const navigate = useNavigate()
  const { refreshUser, user } = useAuth()
  const [form, setForm] = useState(() => ({
    ...EMPTY_IDENTITY_FORM,
    currentResidence: { ...EMPTY_IDENTITY_FORM.currentResidence },
    nationality: {
      ...EMPTY_IDENTITY_FORM.nationality,
      additionalNationalities: [],
      languages: [],
    },
    immigration: {
      ...EMPTY_IDENTITY_FORM.immigration,
      preferredFutureCountries: [],
    },
    relationship: { ...EMPTY_IDENTITY_FORM.relationship },
    family: { ...EMPTY_IDENTITY_FORM.family, childAgeRanges: [] },
    career: { ...EMPTY_IDENTITY_FORM.career },
    financial: { ...EMPTY_IDENTITY_FORM.financial },
    safety: { ...EMPTY_IDENTITY_FORM.safety },
    civilJudgment: { ...EMPTY_IDENTITY_FORM.civilJudgment },
  }))
  const [refData, setRefData] = useState(null)
  const ALL_SECTIONS = [
    'legal', 'preferred', 'dob', 'gender', 'contact', 'address', 'previousAddresses',
    'nationality', 'immigration', 'relationship', 'family', 'education', 'career',
    'financial', 'safety', 'civil', 'verification',
  ]
  const [openSections, setOpenSections] = useState(() => new Set(['legal']))
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [editMode, setEditMode] = useState(!!user?.identityPage1Complete)
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState({})
  const [completionPct, setCompletionPct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [showPreview, setShowPreview] = useState(false)
  const formErrorRef = useRef(null)
  const workspaceTopRef = useRef(null)

  const age = useMemo(() => calcAge(form.dateOfBirth), [form.dateOfBirth])
  const durationLabel = useMemo(
    () => residenceDurationLabel(form.currentResidence.moveInMonth, form.currentResidence.moveInYear),
    [form.currentResidence.moveInMonth, form.currentResidence.moveInYear],
  )

  const countries = refData?.countries || []
  const showRelationshipCounts = ['DIVORCED', 'SEPARATED', 'WIDOWED', 'MARRIED'].includes(
    form.relationship.maritalStatus,
  )
  const showSafetyDetails = [
    form.safety.criminalConviction,
    form.safety.pendingCriminalCases,
    form.safety.protectiveRestrainingOrder,
    form.safety.dvStalkingSexualOffense,
    form.safety.governmentOffenderRegistry,
  ].some((v) => v === 'YES' || v === 'PREFER_PRIVATE_DISCUSSION')
  const showCivilDetails = form.civilJudgment.hasJudgment === 'YES'
    || form.civilJudgment.hasJudgment === 'PREFER_PRIVATE_DISCUSSION'
  const showFamilyChildren = form.family.hasChildren === 'YES'

  const load = async () => {
    setLoading(true)
    setLoadError('')
    const started = markIdentityStart('pageLoad')
    try {
      const cfg = identityRequestConfig()
      const [identityRes, refRes, completionRes] = await Promise.all([
        api.get('/onboarding/identity', cfg),
        api.get('/onboarding/identity/reference-data', cfg),
        api.get('/profile/completion', cfg).catch(() => ({ data: null })),
      ])
      const data = identityRes.data
      const mapped = mapIdentityResponseToForm(data)
      const country = (refRes.data?.countries || []).find(
        (c) => c.code === mapped.currentResidence.countryCode,
      )
      if (country?.postalRegex) mapped._countryPostalRegex = country.postalRegex
      setRefData(refRes.data || {})
      setEditMode(!!data.identityPage1Complete)
      setForm(mapped)
      setCompletionPct(readCompletionPercentage(completionRes))
      markIdentityEnd('pageLoad', started, {
        serverIdentityMs: readServerDuration(identityRes),
        serverReferenceMs: readServerDuration(refRes),
      })
    } catch (err) {
      markIdentityEnd('pageLoad', started, { error: true })
      if (isTimeoutError(err)) {
        setLoadError('Identity & Background is taking too long to load. Check your connection and try again.')
      } else {
        setLoadError(err.response?.data?.message || 'Could not load Identity & Background. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const patchSection = (section, patch) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...patch },
    }))
  }

  const onSectionChange = (section) => (e) => {
    const { name, value, type, checked } = e.target
    patchSection(section, { [name]: type === 'checkbox' ? checked : value })
  }

  const onApproxYearChange = (section) => (e) => {
    const raw = e.target.value
    if (raw === '') {
      patchSection(section, { approxYear: '' })
      return
    }
    // Digits only — block minus / decimals / letters
    if (!/^\d{0,4}$/.test(raw)) return
    const year = Number(raw)
    const maxYear = new Date().getFullYear()
    if (year < 0) return
    if (raw.length === 4 && (year < 1900 || year > maxYear)) return
    patchSection(section, { approxYear: raw })
  }

  const onCountryChange = (e) => {
    const countryCode = e.target.value
    const country = countries.find((c) => c.code === countryCode)
    setForm((prev) => ({
      ...prev,
      currentResidence: { ...prev.currentResidence, countryCode },
      _countryPostalRegex: country?.postalRegex || '',
    }))
  }

  const toggleArrayValue = (section, field, value) => {
    setForm((prev) => {
      const current = prev[section][field] || []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [section]: { ...prev[section], [field]: next } }
    })
  }

  const updatePreferredFutureLocations = (locations) => {
    setForm((prev) => ({
      ...prev,
      currentResidence: {
        ...prev.currentResidence,
        preferredFutureLocations: locations,
      },
    }))
    setFieldErrors((prev) => {
      if (!prev['currentResidence.preferredFutureLocations']) return prev
      const next = { ...prev }
      delete next['currentResidence.preferredFutureLocations']
      return next
    })
  }

  const updatePreviousAddress = (index, field, value) => {
    setForm((prev) => {
      const rows = [...prev.previousAddresses]
      rows[index] = { ...rows[index], [field]: value }
      return { ...prev, previousAddresses: rows }
    })
  }

  const updateEducation = (index, field, value) => {
    setForm((prev) => {
      const rows = [...prev.educations]
      const next = { ...rows[index], [field]: value }
      if (field === 'currentlyStudying' && value) {
        next.graduationMonth = ''
        next.graduationYear = ''
      }
      rows[index] = next
      return { ...prev, educations: rows }
    })
  }

  const updateLanguage = (index, field, value) => {
    setForm((prev) => {
      const rows = [...(prev.nationality.languages || [])]
      rows[index] = { ...rows[index], [field]: value }
      return {
        ...prev,
        nationality: { ...prev.nationality, languages: rows },
      }
    })
  }

  const fieldClass = (name) => (fieldErrors[name] ? 'ob-field has-error' : 'ob-field')

  const focusFirstError = (errors) => {
    const firstKey = Object.keys(errors || {})[0]
    if (!firstKey) {
      formErrorRef.current?.focus?.()
      return
    }
    const sectionId = openSectionForErrors(errors)
    setOpenSections(new Set([sectionId]))
    window.setTimeout(() => {
      const safe = firstKey.replace(/\./g, '-')
      const byDescribed = document.getElementById(`${safe}-error`)
      const field = byDescribed?.closest('.ob-field')?.querySelector('input, select, textarea, button')
        || document.querySelector(`[name="${firstKey}"]`)
        || document.querySelector(`[name="${firstKey.split('.').pop()}"]`)
      if (field && typeof field.focus === 'function') {
        field.focus({ preventScroll: false })
        field.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        formErrorRef.current?.focus?.()
      }
    }, 80)
  }

  const inputA11y = (name, { required = false } = {}) => ({
    'aria-invalid': fieldErrors[name] ? true : undefined,
    'aria-required': required || undefined,
    'aria-describedby': fieldErrors[name] ? `${name.replace(/\./g, '-')}-error` : undefined,
  })

  const FieldError = ({ name }) => (
    fieldErrors[name]
      ? (
        <em id={`${name.replace(/\./g, '-')}-error`} className="ob-field-error" role="alert">
          {fieldErrors[name]}
        </em>
      )
      : null
  )

  const CountrySelect = ({ name, value, onChange: onSel, required = false, errorKey }) => (
    <label className={fieldClass(errorKey || name)}>
      <span>{required ? 'Country *' : 'Country'}</span>
      <select
        name={name}
        value={value}
        onChange={onSel}
        {...inputA11y(errorKey || name, { required })}
      >
        <option value="">Select</option>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>
      <FieldError name={errorKey || name} />
    </label>
  )

  const EnumSelect = ({
    label,
    name,
    value,
    options,
    onChange: onSel,
    section,
    required = false,
    errorKey,
  }) => (
    <label className={fieldClass(errorKey || (section ? `${section}.${name}` : name))}>
      <span>{required ? `${label} *` : label}</span>
      <select
        name={name}
        value={value}
        onChange={onSel}
        {...inputA11y(errorKey || (section ? `${section}.${name}` : name), { required })}
      >
        <option value="">Select</option>
        {enumOptions(options).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <FieldError name={errorKey || (section ? `${section}.${name}` : name)} />
    </label>
  )

  const submit = async (action) => {
    setFormError('')
    const errors = validateIdentityForm(form, action, refData)
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      setFormError('Please fix the highlighted fields before continuing.')
      setOpenSections(new Set([openSectionForErrors(errors)]))
      focusFirstError(errors)
      return
    }

    setSaving(true)
    const started = markIdentityStart(action === 'SAVE_LATER' ? 'saveLater' : 'saveContinue')
    try {
      const response = await api.put(
        '/onboarding/identity',
        buildIdentityPayload(form, action),
        identityRequestConfig(),
      )
      markIdentityEnd(action === 'SAVE_LATER' ? 'saveLater' : 'saveContinue', started, {
        serverMs: readServerDuration(response),
        action,
      })
      await refreshUser()
      if (editMode) {
        navigate('/profile', { replace: true })
        return
      }
      if (action === 'SAVE_LATER') {
        sessionStorage.setItem(IDENTITY_CONTINUE_LATER_KEY, '1')
        navigate('/', { replace: true })
      } else {
        sessionStorage.removeItem(IDENTITY_CONTINUE_LATER_KEY)
        navigate('/onboarding/personality', { replace: true })
      }
    } catch (err) {
      markIdentityEnd(action === 'SAVE_LATER' ? 'saveLater' : 'saveContinue', started, {
        error: true,
        action,
      })
      if (isTimeoutError(err)) {
        setFormError('Save is taking too long. Your connection may be slow — please try again. The form was not submitted.')
      } else {
        const msg = err.response?.data?.message || 'Unable to save. Please try again.'
        const fields = err.response?.data?.fields
        if (fields && typeof fields === 'object') setFieldErrors(fields)
        setFormError(msg)
      }
      window.setTimeout(() => formErrorRef.current?.focus?.(), 50)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelOrLater = () => {
    if (editMode) {
      navigate('/profile')
      return
    }
    submit('SAVE_LATER')
  }

  const handleBack = () => {
    if (editMode) {
      navigate('/profile')
      return
    }
    navigate(-1)
  }

  const uploadDocument = async (file, docPurpose) => {
    if (!file) return null
    const body = new FormData()
    body.append('file', file)
    body.append('docPurpose', docPurpose)
    // Let the browser set multipart Content-Type (with boundary).
    const { data } = await api.post('/onboarding/identity/documents', body)
    return data
  }

  const purposeForSide = (side) => {
    if (form.idDocumentType === 'PASSPORT') return 'PASSPORT'
    if (form.idDocumentType === 'STATE_ID') return side === 'back' ? 'ID_BACK' : 'ID_FRONT'
    return side === 'back' ? 'DL_BACK' : 'DL_FRONT'
  }

  const onDocUpload = async (e, side) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!form.idDocumentType) {
      setFormError('Select a document type (Driver’s License, State ID, or Passport) before uploading.')
      return
    }
    const docPurpose = purposeForSide(side)
    setVerifyBusy(true)
    setFormError('')
    try {
      const uploaded = await uploadDocument(file, docPurpose)
      if (!uploaded?.id) {
        setFormError('Document upload failed. Please try again.')
        return
      }
      setUploadFeedback((prev) => ({
        ...prev,
        [uploaded.docPurpose || docPurpose]: { id: uploaded.id, name: file.name },
      }))
      setForm((prev) => {
        const vs = { ...(prev.verificationSummary || {}) }
        const purpose = uploaded.docPurpose || docPurpose
        if (purpose === 'DL_FRONT' || purpose === 'ID_FRONT') {
          vs.dlFrontDocumentId = uploaded.id
        }
        if (purpose === 'DL_BACK' || purpose === 'ID_BACK') {
          vs.dlBackDocumentId = uploaded.id
        }
        if (purpose === 'PASSPORT') {
          vs.passportDocumentId = uploaded.id
        }
        return { ...prev, verificationSummary: vs }
      })
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Document upload failed.')
    } finally {
      setVerifyBusy(false)
    }
  }

  const toggleSection = (id) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => setOpenSections(new Set(ALL_SECTIONS))
  const collapseAll = () => setOpenSections(new Set())

  const sectionVisible = (id, keywords = []) => {
    const q = deferredSearchQuery.trim().toLowerCase()
    if (!q) return true
    return [id, ...keywords].some((k) => String(k).toLowerCase().includes(q))
  }

  const isOpen = (id) => openSections.has(id)

  if (loading) {
    return (
      <div className="ob-state-screen" role="status" aria-live="polite" aria-busy="true">
        <div className="ob-state-card">
          <div className="ob-spinner" aria-hidden="true" />
          <h1>Loading Identity & Background</h1>
          <p>Fetching your registration details…</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="ob-state-screen" role="alert">
        <div className="ob-state-card">
          <h1>Something went wrong</h1>
          <p>{loadError}</p>
          <button type="button" className="btn auth-primary-btn" onClick={load}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  const vs = form.verificationSummary
  const displayName = form.preferredName || form.firstName || 'Member'
  const locationSummary = [
    form.currentResidence?.city,
    form.currentResidence?.stateRegion,
  ].filter(Boolean).join(', ') || 'Location not set'
  const jumpLinks = [
    { id: 'legal', label: 'Legal Identity', icon: 'lock' },
    { id: 'address', label: 'Contact & Location', status: 'ok' },
    { id: 'nationality', label: 'Languages & Citizenship', status: 'active' },
    { id: 'career', label: 'Career Background', status: 'muted' },
    { id: 'verification', label: 'Identity Documents', icon: 'badge' },
  ]
  const searchMatchCount = ALL_SECTIONS.filter((id) => sectionVisible(id, [id])).length

  return (
    <OnboardingShell
      currentStepId="identity"
      saving={saving}
      editMode={editMode}
      continueLabel={editMode ? 'Save changes' : 'Save & Continue to Step 2'}
      saveLaterLabel={editMode ? 'Cancel' : 'Save & continue later'}
      onBack={handleBack}
      onSaveLater={handleCancelOrLater}
      onContinue={() => submit('CONTINUE')}
      completionPct={completionPct}
      jumpLinks={jumpLinks}
      onJump={(id) => setOpenSections((prev) => new Set([...prev, id]))}
      onPreview={() => setShowPreview(true)}
      searchEnabled
      searchQuery={searchQuery}
      onSearch={(value) => startTransition(() => setSearchQuery(value))}
      searchMatchCount={searchMatchCount}
      expandAll={expandAll}
      collapseAll={collapseAll}
    >
      <div ref={workspaceTopRef} tabIndex={-1} className="sr-only">Identity and background form</div>
      {formError && (
        <div
          ref={formErrorRef}
          className="error ob-form-error"
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
        >
          {formError}
        </div>
      )}

      <AccordionSection
        id="legal"
        title="Legal Identity"
        icon={UserCheck}
        iconTone="indigo"
        subtitle="Your official full name for identity verification and account trust."
        badge={{ label: 'Strictly Confidential', tone: 'amber' }}
        summary={form.firstName && form.lastName ? 'Details Saved' : 'Required'}
        tone="confidential"
        open={isOpen('legal')}
        onToggle={toggleSection}
        hidden={!sectionVisible('legal', ['legal identity', 'first name', 'last name', 'prefix', 'suffix'])}
      >        <div className="ob-grid ob-grid-4">
          <label className={fieldClass('namePrefix')}>
            <span>Prefix</span>
            <select name="namePrefix" value={form.namePrefix} onChange={onChange}>
              {NAME_PREFIXES.map((p) => (
                <option key={p || 'none'} value={p}>{p || 'Select'}</option>
              ))}
            </select>
          </label>
          <label className={fieldClass('firstName')}>
            <span>First name <span className="ob-required-marker" aria-hidden="true">*</span><span className="sr-only">(required)</span></span>
            <input name="firstName" value={form.firstName} onChange={onChange} autoComplete="given-name" {...inputA11y('firstName', { required: true })} />
            <FieldError name="firstName" />
          </label>
          <label className={fieldClass('middleName')}>
            <span>Middle name</span>
            <input name="middleName" value={form.middleName} onChange={onChange} autoComplete="additional-name" {...inputA11y('middleName')} />
            <FieldError name="middleName" />
          </label>
          <label className={fieldClass('lastName')}>
            <span>Last name <span className="ob-required-marker" aria-hidden="true">*</span><span className="sr-only">(required)</span></span>
            <input name="lastName" value={form.lastName} onChange={onChange} autoComplete="family-name" {...inputA11y('lastName', { required: true })} />
            <FieldError name="lastName" />
          </label>
          <label className={fieldClass('nameSuffix')}>
            <span>Suffix</span>
            <select name="nameSuffix" value={form.nameSuffix} onChange={onChange}>
              {NAME_SUFFIXES.map((p) => (
                <option key={p || 'none'} value={p}>{p || 'Select'}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="ob-hint">Legal name is stored privately and is not shown to other members.</p>
        <div className="ob-info-callout">
          <Info className="w-4 h-4" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Legal names are verified against government IDs and stored securely. Other members will only see your chosen <strong>Preferred Display Name</strong>.
          </span>
        </div>
      </AccordionSection>

      <AccordionSection
        id="preferred"
        title="Preferred Display Name"
        icon={Sparkles}
        iconTone="purple"
        subtitle="How your matches will see your name on Socialpairly."
        badge={{ label: 'Public Display', tone: 'purple' }}
        summary={form.preferredName || form.firstName || '—'}
        open={isOpen('preferred')}
        onToggle={toggleSection}
        hidden={!sectionVisible('preferred', ['preferred name', 'nickname', 'display'])}
      >        <div className="ob-grid">
          <label className={fieldClass('preferredName')}>
            <span>Preferred name</span>
            <input name="preferredName" value={form.preferredName} onChange={onChange} placeholder="How should we greet you?" {...inputA11y('preferredName')} />
            <FieldError name="preferredName" />
          </label>
        </div>
        <p className="ob-hint">
          Preferred name does not overwrite your legal first name. Clear it anytime to fall back to your legal first name.
        </p>
      </AccordionSection>

      <AccordionSection
        id="dob"
        title="Date of Birth & Age Privacy"
        icon={Calendar}
        iconTone="pink"
        subtitle="Your birthdate determines age calculation and star signs."
        summary={age != null ? `${form.dateOfBirth || ''} (${age} yrs)` : 'Required'}
        open={isOpen('dob')}
        onToggle={toggleSection}
        hidden={!sectionVisible('dob', ['date of birth', 'age', 'birthday'])}
      >        <div className="ob-grid">
          <label className={fieldClass('dateOfBirth')}>
            <span>Date of birth <span className="ob-required-marker" aria-hidden="true">*</span><span className="sr-only">(required)</span></span>
            <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange} {...inputA11y('dateOfBirth', { required: true })} />
            <FieldError name="dateOfBirth" />
          </label>
          <div className="ob-age-preview">
            <span>Calculated age</span>
            <strong>{age != null ? `${age} years` : '—'}</strong>
          </div>
        </div>
        <p className="ob-hint">Exact date of birth is never shown on member-facing profiles—only approved age information.</p>
      </AccordionSection>

      <AccordionSection
        id="gender"
        title="Pronouns & Gender Identity"
        icon={Users}
        iconTone="blue"
        subtitle="How you identify and prefer to be addressed."
        summary={[form.pronouns, form.gender].filter(Boolean).join(' • ') || '—'}
        open={isOpen('gender')}
        onToggle={toggleSection}
        hidden={!sectionVisible('gender', ['pronouns', 'gender identity'])}
      >        <div className="ob-grid">
          <label className="ob-field">
            <span>Pronouns</span>
            <select name="pronouns" value={form.pronouns} onChange={onChange}>
              {PRONOUN_OPTIONS.map((p) => (
                <option key={p || 'none'} value={p}>{p || 'Select'}</option>
              ))}
            </select>
          </label>
          <label className="ob-field">
            <span>Gender identity</span>
            <select name="gender" value={form.gender} onChange={onChange}>
              {GENDER_OPTIONS.map((p) => (
                <option key={p || 'none'} value={p}>{p || 'Select'}</option>
              ))}
            </select>
          </label>
          <label className="ob-field">
            <span>Show gender to potential matches</span>
            <select name="genderShownToMatches" value={form.genderShownToMatches} onChange={onChange}>
              {GENDER_VISIBILITY.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
      </AccordionSection>

      <AccordionSection
        id="contact"
        title="Contact Details"
        icon={PhoneCall}
        iconTone="teal"
        subtitle="Used for security notifications and match request updates."
        badge={{ label: 'Private', tone: 'slate' }}
        summary={form.emailVerified || form.phoneVerified ? 'Verified contact' : 'Contact info'}
        open={isOpen('contact')}
        onToggle={toggleSection}
        hidden={!sectionVisible('contact', ['email', 'phone', 'contact'])}
      >        <div className="ob-grid">
          <label className="ob-field">
            <span>Primary email</span>
            <input value={form.primaryEmail} readOnly disabled />
            <small className={`ob-badge ${form.emailVerified ? 'ok' : 'warn'}`}>
              {form.emailVerified ? 'Verified' : 'Unverified'}
            </small>
          </label>
          <label className={fieldClass('secondaryEmail')}>
            <span>Secondary email</span>
            <input name="secondaryEmail" value={form.secondaryEmail} onChange={onChange} {...inputA11y('secondaryEmail')} />
            <FieldError name="secondaryEmail" />
          </label>
          <label className={fieldClass('primaryPhone')}>
            <span>Primary contact number</span>
            <input name="primaryPhone" value={form.primaryPhone} onChange={onChange} {...inputA11y('primaryPhone')} />
            <small className={`ob-badge ${form.phoneVerified ? 'ok' : 'warn'}`}>
              {form.phoneVerified ? 'Verified' : 'Unverified — changing number requires re-verification'}
            </small>
            <FieldError name="primaryPhone" />
          </label>
          <label className={fieldClass('secondaryPhone')}>
            <span>Secondary contact number</span>
            <input name="secondaryPhone" value={form.secondaryPhone} onChange={onChange} {...inputA11y('secondaryPhone')} />
            <FieldError name="secondaryPhone" />
          </label>
          <label className={fieldClass('homePhone')}>
            <span>Home phone (optional)</span>
            <input name="homePhone" value={form.homePhone} onChange={onChange} {...inputA11y('homePhone')} />
            <FieldError name="homePhone" />
          </label>
          <label className="ob-field">
            <span>Preferred contact method</span>
            <select name="preferredContactMethod" value={form.preferredContactMethod} onChange={onChange}>
              {CONTACT_METHODS.map((o) => (
                <option key={o.value || 'none'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="ob-field">
            <span>Best time to contact</span>
            <select name="bestTimeToContact" value={form.bestTimeToContact} onChange={onChange}>
              {BEST_TIMES.map((o) => (
                <option key={o.value || 'none'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="ob-hint">Contact details never appear on public event or member profiles.</p>
      </AccordionSection>

      <AccordionSection
        id="address"
        title="Current Residence & Location"
        icon={MapPin}
        iconTone="orange"
        subtitle="Where you currently live and previous hometowns."
        summary={locationSummary}
        open={isOpen('address')}
        onToggle={toggleSection}
        hidden={!sectionVisible('address', ['residence', 'location', 'city', 'address'])}
      >        <p className="ob-hint">Your exact address is never shown publicly—only city and country may appear.</p>
        <div className="ob-grid">
          <label className={fieldClass('currentResidence.line1')}>
            <span>Address line 1 *</span>
            <input
              name="line1"
              value={form.currentResidence.line1}
              onChange={onSectionChange('currentResidence')}
              autoComplete="address-line1"
              {...inputA11y('currentResidence.line1')}
            />
            <FieldError name="currentResidence.line1" />
          </label>
          <label className="ob-field">
            <span>Address line 2</span>
            <input name="line2" value={form.currentResidence.line2} onChange={onSectionChange('currentResidence')} autoComplete="address-line2" />
          </label>
          <label className="ob-field">
            <span>Unit / apt</span>
            <input name="unit" value={form.currentResidence.unit} onChange={onSectionChange('currentResidence')} />
          </label>
          <label className={fieldClass('currentResidence.city')}>
            <span>City *</span>
            <input name="city" value={form.currentResidence.city} onChange={onSectionChange('currentResidence')} autoComplete="address-level2" {...inputA11y('currentResidence.city')} />
            <FieldError name="currentResidence.city" />
          </label>
          <label className={fieldClass('currentResidence.stateRegion')}>
            <span>State / region *</span>
            <input name="stateRegion" value={form.currentResidence.stateRegion} onChange={onSectionChange('currentResidence')} autoComplete="address-level1" {...inputA11y('currentResidence.stateRegion')} />
            <FieldError name="currentResidence.stateRegion" />
          </label>
          <label className={fieldClass('currentResidence.postalCode')}>
            <span>Zip code <span className="ob-required-marker" aria-hidden="true">*</span><span className="sr-only">(required)</span></span>
            <input
              name="postalCode"
              value={form.currentResidence.postalCode}
              onChange={(e) => patchSection('currentResidence', { postalCode: formatZipInput(e.target.value) })}
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={10}
              placeholder="12345 or 12345-6789"
              aria-label="Zip code"
              {...inputA11y('currentResidence.postalCode', { required: true })}
            />
            <FieldError name="currentResidence.postalCode" />
          </label>
          <CountrySelect
            name="countryCode"
            value={form.currentResidence.countryCode}
            onChange={onCountryChange}
            required
            errorKey="currentResidence.countryCode"
          />
          <EnumSelect
            label="Residence type"
            name="residenceType"
            value={form.currentResidence.residenceType}
            options={refData?.residenceTypes}
            onChange={onSectionChange('currentResidence')}
            section="currentResidence"
          />
          <label className="ob-field">
            <span>Moved in (month)</span>
            <select name="moveInMonth" value={String(form.currentResidence.moveInMonth ?? '')} onChange={onSectionChange('currentResidence')}>
              {MONTHS.map((m) => (
                <option key={m.value || 'none'} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="ob-field">
            <span>Moved in (year)</span>
            <input
              name="moveInYear"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={form.currentResidence.moveInYear}
              onChange={(e) => patchSection('currentResidence', { moveInYear: formatUnsignedDigits(e.target.value, 4) })}
              onKeyDown={blockInvalidNumberKeys}
            />
          </label>
          <div className="ob-age-preview">
            <span>Time at residence</span>
            <strong>{durationLabel || '—'}</strong>
          </div>
          <EnumSelect
            label="Willing to relocate"
            name="willingToRelocate"
            value={form.currentResidence.willingToRelocate}
            options={refData?.relocatePrefs}
            onChange={onSectionChange('currentResidence')}
            section="currentResidence"
          />
          <label className="ob-field">
            <span>Event travel radius (Miles)</span>
            <input
              name="eventTravelRadiusMiles"
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={form.currentResidence.eventTravelRadiusMiles}
              onChange={(e) => patchSection('currentResidence', {
                eventTravelRadiusMiles: formatUnsignedDigits(e.target.value, 5),
              })}
              onKeyDown={blockInvalidNumberKeys}
              placeholder="e.g. 25"
              aria-label="Event travel radius in miles"
            />
          </label>
        </div>
        <div className={fieldClass('currentResidence.preferredFutureLocations')} style={{ marginTop: 12 }}>
          <PreferredFutureLocations
            locations={form.currentResidence.preferredFutureLocations}
            countryCode={form.currentResidence.countryCode}
            onChange={updatePreferredFutureLocations}
            error={fieldErrors['currentResidence.preferredFutureLocations'] || ''}
          />
        </div>
      </AccordionSection>

      <AccordionSection
        id="previousAddresses"
        title="Previous Addresses"
        icon={Home}
        iconTone="slate"
        subtitle="Earlier residences for background consistency."
        open={isOpen('previousAddresses')}
        onToggle={toggleSection}
        hidden={!sectionVisible('previousAddresses', ['previous addresses', 'prior residence'])}
      >        <p className="ob-hint">
          Use the same address details as current residence (door number, street, unit, city, etc.).
          You can add up to {MAX_PREVIOUS_ADDRESSES} previous addresses.
        </p>
        {(form.previousAddresses || []).map((row, idx) => (
          <div key={row.id || idx} className="ob-repeat-card">
            <div className="ob-grid">
              <label className="ob-field">
                <span>Address line 1</span>
                <input
                  value={row.line1}
                  onChange={(e) => updatePreviousAddress(idx, 'line1', e.target.value)}
                  placeholder="Door number and street name"
                  autoComplete="address-line1"
                  aria-label={`Previous address ${idx + 1} address line 1`}
                />
              </label>
              <label className="ob-field">
                <span>Address line 2</span>
                <input
                  value={row.line2}
                  onChange={(e) => updatePreviousAddress(idx, 'line2', e.target.value)}
                  autoComplete="address-line2"
                  aria-label={`Previous address ${idx + 1} address line 2`}
                />
              </label>
              <label className="ob-field">
                <span>Unit / apt</span>
                <input
                  value={row.unit}
                  onChange={(e) => updatePreviousAddress(idx, 'unit', e.target.value)}
                  aria-label={`Previous address ${idx + 1} unit or apartment`}
                />
              </label>
              <label className="ob-field">
                <span>City</span>
                <input value={row.city} onChange={(e) => updatePreviousAddress(idx, 'city', e.target.value)} />
              </label>
              <label className="ob-field">
                <span>State / region</span>
                <input value={row.stateRegion} onChange={(e) => updatePreviousAddress(idx, 'stateRegion', e.target.value)} />
              </label>
              <label className="ob-field">
                <span>Zip code</span>
                <input
                  value={row.postalCode}
                  onChange={(e) => updatePreviousAddress(idx, 'postalCode', formatZipInput(e.target.value))}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="12345 or 12345-6789"
                  aria-label={`Previous address ${idx + 1} zip code`}
                  {...inputA11y(`previousAddresses.${idx}.postalCode`)}
                />
                <FieldError name={`previousAddresses.${idx}.postalCode`} />
              </label>
              <label className="ob-field">
                <span>Country</span>
                <select value={row.countryCode} onChange={(e) => updatePreviousAddress(idx, 'countryCode', e.target.value)}>
                  <option value="">Select</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="ob-field">
                <span>Residence type</span>
                <select
                  value={row.residenceType}
                  onChange={(e) => updatePreviousAddress(idx, 'residenceType', e.target.value)}
                  aria-label={`Previous address ${idx + 1} residence type`}
                >
                  <option value="">Select</option>
                  {(refData?.residenceTypes || []).map((value) => (
                    <option key={value} value={value}>{humanizeEnum(value)}</option>
                  ))}
                </select>
              </label>
              <label className="ob-field">
                <span>From month</span>
                <select value={String(row.fromMonth ?? '')} onChange={(e) => updatePreviousAddress(idx, 'fromMonth', e.target.value)}>
                  {MONTHS.map((m) => (
                    <option key={m.value || 'none'} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>
              <label className="ob-field">
                <span>From year</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={row.fromYear}
                  onChange={(e) => updatePreviousAddress(idx, 'fromYear', formatUnsignedDigits(e.target.value, 4))}
                  onKeyDown={blockInvalidNumberKeys}
                />
              </label>
              <label className="ob-field">
                <span>To month</span>
                <select value={String(row.toMonth ?? '')} onChange={(e) => updatePreviousAddress(idx, 'toMonth', e.target.value)}>
                  {MONTHS.map((m) => (
                    <option key={m.value || 'none'} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>
              <label className="ob-field">
                <span>To year</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={row.toYear}
                  onChange={(e) => updatePreviousAddress(idx, 'toYear', formatUnsignedDigits(e.target.value, 4))}
                  onKeyDown={blockInvalidNumberKeys}
                />
              </label>
              <label className="ob-field">
                <span>Reason for moving</span>
                <input value={row.reasonForMoving} onChange={(e) => updatePreviousAddress(idx, 'reasonForMoving', e.target.value)} />
              </label>
            </div>
            <FieldError name={`previousAddresses.${idx}`} />
            <div className="ob-row-actions">
              <button
                type="button"
                className="btn ob-secondary"
                onClick={() => setForm((prev) => ({
                  ...prev,
                  previousAddresses: prev.previousAddresses.filter((_, i) => i !== idx),
                }))}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <div className="ob-row-actions">
          <button
            type="button"
            className="btn ob-secondary"
            disabled={(form.previousAddresses || []).length >= MAX_PREVIOUS_ADDRESSES}
            onClick={() => setForm((prev) => {
              if ((prev.previousAddresses || []).length >= MAX_PREVIOUS_ADDRESSES) return prev
              return {
                ...prev,
                previousAddresses: [...prev.previousAddresses, { ...EMPTY_PREVIOUS_ADDRESS }],
              }
            })}
          >
            Add previous address
          </button>
          <span className="ob-age-preview">
            {(form.previousAddresses || []).length} / {MAX_PREVIOUS_ADDRESSES}
          </span>
        </div>
        {fieldErrors.previousAddresses && (
          <p className="ob-field-error" role="alert">{fieldErrors.previousAddresses}</p>
        )}
      </AccordionSection>

      <AccordionSection
        id="nationality"
        title="Nationality, Citizenship & Languages"
        icon={Globe2}
        iconTone="cyan"
        subtitle="Cultural origins and languages spoken fluently."
        summary={(form.nationality?.languages || []).map((l) => l.language).filter(Boolean).slice(0, 2).join(', ') || '—'}
        open={isOpen('nationality')}
        onToggle={toggleSection}
        hidden={!sectionVisible('nationality', ['nationality', 'languages', 'citizenship', 'culture'])}
      >        <div className="ob-grid">
          <label className="ob-field">
            <span>Country of birth</span>
            <select name="countryOfBirth" value={form.nationality.countryOfBirth} onChange={onSectionChange('nationality')}>
              <option value="">Select</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="ob-field">
            <span>Primary nationality</span>
            <select name="primaryNationality" value={form.nationality.primaryNationality} onChange={onSectionChange('nationality')}>
              <option value="">Select</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="ob-field">
            <span>Country of citizenship</span>
            <select name="countryOfCitizenship" value={form.nationality.countryOfCitizenship} onChange={onSectionChange('nationality')}>
              <option value="">Select</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="ob-field" style={{ marginTop: 12 }}>
          <span>Additional nationalities</span>
          <div className="ob-chip-row">
            {countries.map((c) => (
              <label key={c.code} className="ob-status-chip" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={(form.nationality.additionalNationalities || []).includes(c.code)}
                  onChange={() => toggleArrayValue('nationality', 'additionalNationalities', c.code)}
                  style={{ marginRight: 6 }}
                />
                {c.name}
              </label>
            ))}
          </div>
          <FieldError name="nationality.additionalNationalities" />
        </div>
        <div style={{ marginTop: 14 }}>
          <span className="ob-hint">Languages</span>
          {(form.nationality.languages || []).map((lang, idx) => (
            <div key={idx} className="ob-repeat-card">
              <div className="ob-grid">
                <label className="ob-field">
                  <span>Language</span>
                  <select value={lang.languageCode} onChange={(e) => updateLanguage(idx, 'languageCode', e.target.value)}>
                    <option value="">Select</option>
                    {(refData?.languages || []).map((l) => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </label>
                <label className="ob-field">
                  <span>Proficiency</span>
                  <input value={lang.proficiency} onChange={(e) => updateLanguage(idx, 'proficiency', e.target.value)} placeholder="e.g. Fluent" />
                </label>
              </div>
              <div className="ob-row-actions">
                <button
                  type="button"
                  className="btn ob-secondary"
                  onClick={() => setForm((prev) => ({
                    ...prev,
                    nationality: {
                      ...prev.nationality,
                      languages: prev.nationality.languages.filter((_, i) => i !== idx),
                    },
                  }))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div className="ob-row-actions">
            <button
              type="button"
              className="btn ob-secondary"
              onClick={() => setForm((prev) => ({
                ...prev,
                nationality: {
                  ...prev.nationality,
                  languages: [...(prev.nationality.languages || []), { ...EMPTY_LANGUAGE }],
                },
              }))}
            >
              Add language
            </button>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        id="immigration"
        title="Immigration (Optional)"
        icon={Landmark}
        iconTone="blue"
        subtitle="Optional immigration and relocation preferences."
        open={isOpen('immigration')}
        onToggle={toggleSection}
        hidden={!sectionVisible('immigration', ['immigration', 'visa', 'status'])}
      >        <div className="ob-grid">
          <label className="ob-field">
            <span>Current country of residence</span>
            <select name="currentCountryOfResidence" value={form.immigration.currentCountryOfResidence} onChange={onSectionChange('immigration')}>
              <option value="">Select</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </label>
          <EnumSelect
            label="Residency category"
            name="residencyCategory"
            value={form.immigration.residencyCategory}
            options={refData?.residencyCategories}
            onChange={onSectionChange('immigration')}
            section="immigration"
          />
          <EnumSelect
            label="Open to international relocation"
            name="internationalRelocationPref"
            value={form.immigration.internationalRelocationPref}
            options={refData?.yesNoPrefer}
            onChange={onSectionChange('immigration')}
            section="immigration"
          />
          <EnumSelect
            label="Future sponsorship required"
            name="futureSponsorshipRequired"
            value={form.immigration.futureSponsorshipRequired}
            options={refData?.yesNoPrefer}
            onChange={onSectionChange('immigration')}
            section="immigration"
          />
          <EnumSelect
            label="Open to partner abroad"
            name="openToPartnerAbroad"
            value={form.immigration.openToPartnerAbroad}
            options={refData?.yesNoPrefer}
            onChange={onSectionChange('immigration')}
            section="immigration"
          />
        </div>
        <p className="ob-hint">You may select Prefer not to say for any immigration field.</p>
      </AccordionSection>

      <AccordionSection
        id="relationship"
        title="Relationship History"
        icon={HeartHandshake}
        iconTone="rose"
        subtitle="Marital status and relationship background."
        summary={form.relationship?.maritalStatus ? humanizeEnum(form.relationship.maritalStatus) : '—'}
        open={isOpen('relationship')}
        onToggle={toggleSection}
        hidden={!sectionVisible('relationship', ['relationship', 'marital', 'divorced'])}
      >        <div className="ob-grid">
          <EnumSelect
            label="Marital status"
            name="maritalStatus"
            value={form.relationship.maritalStatus}
            options={refData?.maritalStatuses}
            onChange={onSectionChange('relationship')}
            section="relationship"
            required
            errorKey="relationship.maritalStatus"
          />
          {showRelationshipCounts && (
            <>
              <label className="ob-field">
                <span>Previous marriages</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  name="previousMarriagesCount"
                  value={form.relationship.previousMarriagesCount}
                  onChange={(e) => patchSection('relationship', {
                    previousMarriagesCount: formatUnsignedDigits(e.target.value, 3),
                  })}
                  onKeyDown={blockInvalidNumberKeys}
                />
              </label>
              <label className="ob-field">
                <span>Divorces</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  name="divorcesCount"
                  value={form.relationship.divorcesCount}
                  onChange={(e) => patchSection('relationship', {
                    divorcesCount: formatUnsignedDigits(e.target.value, 3),
                  })}
                  onKeyDown={blockInvalidNumberKeys}
                />
              </label>
              <label className="ob-field">
                <span>Annulments</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  name="annulmentsCount"
                  value={form.relationship.annulmentsCount}
                  onChange={(e) => patchSection('relationship', {
                    annulmentsCount: formatUnsignedDigits(e.target.value, 3),
                  })}
                  onKeyDown={blockInvalidNumberKeys}
                />
              </label>
              <label className="ob-field">
                <span>Most recent divorce year</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  name="mostRecentDivorceYear"
                  value={form.relationship.mostRecentDivorceYear}
                  onChange={(e) => patchSection('relationship', {
                    mostRecentDivorceYear: formatUnsignedDigits(e.target.value, 4),
                  })}
                  onKeyDown={blockInvalidNumberKeys}
                />
              </label>
              <label className="ob-check-field">
                <input type="checkbox" name="currentlySeparated" checked={!!form.relationship.currentlySeparated} onChange={onSectionChange('relationship')} />
                <span>Currently separated</span>
              </label>
              <label className="ob-check-field">
                <input type="checkbox" name="divorceFinalized" checked={!!form.relationship.divorceFinalized} onChange={onSectionChange('relationship')} />
                <span>Divorce finalized</span>
              </label>
            </>
          )}
          <label className="ob-field">
            <span>Co-parenting</span>
            <input name="coParenting" value={form.relationship.coParenting} onChange={onSectionChange('relationship')} />
          </label>
          <label className="ob-field">
            <span>Unresolved commitments</span>
            <input name="unresolvedCommitments" value={form.relationship.unresolvedCommitments} onChange={onSectionChange('relationship')} />
          </label>
          <label className="ob-field">
            <span>Relationship model preference</span>
            <input name="relationshipModelPref" value={form.relationship.relationshipModelPref} onChange={onSectionChange('relationship')} />
          </label>
        </div>
      </AccordionSection>

      <AccordionSection
        id="family"
        title="Family"
        icon={Baby}
        iconTone="pink"
        subtitle="Family structure and children details."
        open={isOpen('family')}
        onToggle={toggleSection}
        hidden={!sectionVisible('family', ['family', 'children', 'kids'])}
      >        <p className="ob-hint">Do not enter children’s names. Age ranges only.</p>
        <div className="ob-grid">
          <EnumSelect
            label="Has children"
            name="hasChildren"
            value={form.family.hasChildren}
            options={refData?.yesNoPrefer}
            onChange={onSectionChange('family')}
            section="family"
          />
          {showFamilyChildren && (
            <>
              <label className="ob-field">
                <span>Number of children</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  name="childrenCount"
                  value={form.family.childrenCount}
                  onChange={(e) => patchSection('family', {
                    childrenCount: formatUnsignedDigits(e.target.value, 3),
                  })}
                  onKeyDown={blockInvalidNumberKeys}
                />
              </label>
              <div className="ob-field">
                <span>Children age ranges</span>
                <div className="ob-chip-row">
                  {(refData?.childAgeRanges || []).map((code) => (
                    <label key={code} className="ob-status-chip" style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={(form.family.childAgeRanges || []).includes(code)}
                        onChange={() => toggleArrayValue('family', 'childAgeRanges', code)}
                        style={{ marginRight: 6 }}
                      />
                      {humanizeEnum(code)}
                    </label>
                  ))}
                </div>
              </div>
              <EnumSelect
                label="Children live with you"
                name="childrenLiveWithUser"
                value={form.family.childrenLiveWithUser}
                options={refData?.yesNoPrefer}
                onChange={onSectionChange('family')}
                section="family"
              />
              <label className="ob-field">
                <span>Custody arrangement</span>
                <input name="custodyArrangement" value={form.family.custodyArrangement} onChange={onSectionChange('family')} />
              </label>
            </>
          )}
          <EnumSelect
            label="Want children in future"
            name="futureChildrenPref"
            value={form.family.futureChildrenPref}
            options={refData?.yesNoPrefer}
            onChange={onSectionChange('family')}
            section="family"
          />
          <EnumSelect
            label="Open to partner with children"
            name="openToPartnerWithChildren"
            value={form.family.openToPartnerWithChildren}
            options={refData?.yesNoPrefer}
            onChange={onSectionChange('family')}
            section="family"
          />
          <label className="ob-field">
            <span>Other dependents</span>
            <input name="otherDependents" value={form.family.otherDependents} onChange={onSectionChange('family')} />
          </label>
          <label className="ob-field">
            <span>Pets</span>
            <input name="petsInfo" value={form.family.petsInfo} onChange={onSectionChange('family')} />
          </label>
        </div>
      </AccordionSection>

      <AccordionSection
        id="education"
        title="Education"
        icon={Landmark}
        iconTone="violet"
        subtitle="Schools, degrees, and fields of study."
        open={isOpen('education')}
        onToggle={toggleSection}
        hidden={!sectionVisible('education', ['education', 'degree', 'school', 'university'])}
      >        {(form.educations || []).map((edu, idx) => (
          <div key={edu.id || idx} className="ob-repeat-card">
            <div className="ob-grid">
              <label className="ob-field">
                <span>Level</span>
                <select value={edu.educationLevel} onChange={(e) => updateEducation(idx, 'educationLevel', e.target.value)}>
                  <option value="">Select</option>
                  {enumOptions(refData?.educationLevels).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className={fieldClass(`educations.${idx}.degree`)}>
                <span>Degree</span>
                <input
                  value={edu.degree}
                  onChange={(e) => updateEducation(idx, 'degree', formatEducationText(e.target.value))}
                  {...inputA11y(`educations.${idx}.degree`)}
                />
                <FieldError name={`educations.${idx}.degree`} />
              </label>
              <label className={fieldClass(`educations.${idx}.fieldOfStudy`)}>
                <span>Field of study</span>
                <input
                  value={edu.fieldOfStudy}
                  onChange={(e) => updateEducation(idx, 'fieldOfStudy', formatEducationText(e.target.value))}
                  {...inputA11y(`educations.${idx}.fieldOfStudy`)}
                />
                <FieldError name={`educations.${idx}.fieldOfStudy`} />
              </label>
              <label className={fieldClass(`educations.${idx}.institution`)}>
                <span>Institution</span>
                <input
                  value={edu.institution}
                  onChange={(e) => updateEducation(idx, 'institution', formatEducationText(e.target.value))}
                  {...inputA11y(`educations.${idx}.institution`)}
                />
                <FieldError name={`educations.${idx}.institution`} />
              </label>
              <label className={fieldClass(`educations.${idx}.city`)}>
                <span>City</span>
                <input
                  value={edu.city}
                  onChange={(e) => updateEducation(idx, 'city', formatEducationCity(e.target.value))}
                  {...inputA11y(`educations.${idx}.city`)}
                />
                <FieldError name={`educations.${idx}.city`} />
              </label>
              <label className="ob-field">
                <span>Country</span>
                <select value={edu.countryCode} onChange={(e) => updateEducation(idx, 'countryCode', e.target.value)}>
                  <option value="">Select</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className={fieldClass(`educations.${idx}.startMonth`)}>
                <span>Start month</span>
                <select
                  value={String(edu.startMonth ?? '')}
                  onChange={(e) => updateEducation(idx, 'startMonth', e.target.value)}
                  {...inputA11y(`educations.${idx}.startMonth`)}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value || 'none'} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <FieldError name={`educations.${idx}.startMonth`} />
              </label>
              <label className={fieldClass(`educations.${idx}.startYear`)}>
                <span>Start year</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  placeholder="YYYY"
                  value={edu.startYear}
                  onChange={(e) => updateEducation(idx, 'startYear', formatEducationYear(e.target.value))}
                  {...inputA11y(`educations.${idx}.startYear`)}
                />
                <FieldError name={`educations.${idx}.startYear`} />
              </label>
              <label className={fieldClass(`educations.${idx}.graduationMonth`)}>
                <span>Graduation month</span>
                <select
                  value={edu.currentlyStudying ? '' : String(edu.graduationMonth ?? '')}
                  onChange={(e) => updateEducation(idx, 'graduationMonth', e.target.value)}
                  disabled={!!edu.currentlyStudying}
                  aria-disabled={!!edu.currentlyStudying}
                  {...inputA11y(`educations.${idx}.graduationMonth`)}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value || 'none'} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <FieldError name={`educations.${idx}.graduationMonth`} />
              </label>
              <label className={fieldClass(`educations.${idx}.graduationYear`)}>
                <span>Graduation year</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  placeholder="YYYY"
                  value={edu.currentlyStudying ? '' : edu.graduationYear}
                  onChange={(e) => updateEducation(idx, 'graduationYear', formatEducationYear(e.target.value))}
                  disabled={!!edu.currentlyStudying}
                  aria-disabled={!!edu.currentlyStudying}
                  {...inputA11y(`educations.${idx}.graduationYear`)}
                />
                <FieldError name={`educations.${idx}.graduationYear`} />
              </label>
              <label className="ob-check-field">
                <input
                  type="checkbox"
                  checked={!!edu.currentlyStudying}
                  onChange={(e) => updateEducation(idx, 'currentlyStudying', e.target.checked)}
                />
                <span>Currently studying</span>
              </label>
              <label className={fieldClass(`educations.${idx}.honors`)}>
                <span>Honors</span>
                <input
                  value={edu.honors}
                  onChange={(e) => updateEducation(idx, 'honors', formatEducationText(e.target.value))}
                  {...inputA11y(`educations.${idx}.honors`)}
                />
                <FieldError name={`educations.${idx}.honors`} />
              </label>
            </div>
            <div className="ob-row-actions">
              <button
                type="button"
                className="btn ob-secondary"
                onClick={() => setForm((prev) => ({
                  ...prev,
                  educations: prev.educations.filter((_, i) => i !== idx),
                }))}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <div className="ob-row-actions">
          <button
            type="button"
            className="btn ob-secondary"
            onClick={() => setForm((prev) => ({
              ...prev,
              educations: [...prev.educations, { ...EMPTY_EDUCATION }],
            }))}
          >
            Add education
          </button>
        </div>
      </AccordionSection>

      <AccordionSection
        id="career"
        title="Career Background"
        icon={Briefcase}
        iconTone="violet"
        subtitle="Your profession, employer type, and career stage."
        summary={form.career?.jobFunction || form.career?.employerName || '—'}
        open={isOpen('career')}
        onToggle={toggleSection}
        hidden={!sectionVisible('career', ['career', 'job', 'occupation', 'work', 'employer'])}
      >        <div className="ob-grid">
          <EnumSelect
            label="Employment status"
            name="employmentStatus"
            value={form.career.employmentStatus}
            options={refData?.employmentStatuses}
            onChange={onSectionChange('career')}
            section="career"
          />
          <label className={fieldClass('career.employmentType')}>
            <span>Employment type</span>
            <input
              name="employmentType"
              value={form.career.employmentType}
              onChange={(e) => patchSection('career', { employmentType: formatEmploymentTypeText(e.target.value) })}
              placeholder="e.g. OPT, CPT, Intern, H1B"
              {...inputA11y('career.employmentType')}
            />
            <FieldError name="career.employmentType" />
          </label>
          <label className={fieldClass('career.jobFunction')}>
            <span>Job function</span>
            <input
              name="jobFunction"
              value={form.career.jobFunction}
              onChange={(e) => patchSection('career', { jobFunction: formatAlphanumericText(e.target.value) })}
              {...inputA11y('career.jobFunction')}
            />
            <FieldError name="career.jobFunction" />
          </label>
          <label className={fieldClass('career.industry')}>
            <span>Industry</span>
            <input
              name="industry"
              value={form.career.industry}
              onChange={(e) => patchSection('career', { industry: formatAlphanumericText(e.target.value) })}
              {...inputA11y('career.industry')}
            />
            <FieldError name="career.industry" />
          </label>
          <div className="ob-field-with-check">
            <label className={fieldClass('career.employerName')}>
              <span>Employer name</span>
              <input
                name="employerName"
                value={form.career.employerName}
                onChange={(e) => patchSection('career', { employerName: formatAlphanumericText(e.target.value) })}
                {...inputA11y('career.employerName')}
              />
              <FieldError name="career.employerName" />
            </label>
            <label className="ob-check-field">
              <input
                type="checkbox"
                name="showEmployerPublicly"
                checked={!!form.career.showEmployerPublicly}
                onChange={onSectionChange('career')}
              />
              <span>Show employer publicly</span>
            </label>
          </div>
          <label className={fieldClass('career.yearsInProfession')}>
            <span>Years in profession</span>
            <input
              type="text"
              inputMode="numeric"
              name="yearsInProfession"
              maxLength={3}
              value={form.career.yearsInProfession}
              onChange={(e) => patchSection('career', { yearsInProfession: formatUnsignedDigits(e.target.value, 3) })}
              onKeyDown={blockInvalidNumberKeys}
              {...inputA11y('career.yearsInProfession')}
            />
            <FieldError name="career.yearsInProfession" />
          </label>
          <label className={fieldClass('career.careerAmbitions')} style={{ gridColumn: '1 / -1' }}>
            <span>Career ambitions</span>
            <input
              name="careerAmbitions"
              value={form.career.careerAmbitions}
              onChange={(e) => patchSection('career', { careerAmbitions: formatAlphanumericText(e.target.value) })}
              {...inputA11y('career.careerAmbitions')}
            />
            <FieldError name="career.careerAmbitions" />
          </label>
        </div>
      </AccordionSection>

      <AccordionSection
        id="financial"
        title="Financial Lifestyle"
        icon={Wallet}
        iconTone="amber"
        subtitle="Optional financial lifestyle preferences."
        open={isOpen('financial')}
        onToggle={toggleSection}
        hidden={!sectionVisible('financial', ['financial', 'income', 'money'])}
      >        <div className="ob-grid">
          <EnumSelect label="Income range" name="incomeRange" value={form.financial.incomeRange} options={refData?.incomeRanges} onChange={onSectionChange('financial')} section="financial" />
          <EnumSelect label="Credit score range" name="creditScoreRange" value={form.financial.creditScoreRange} options={refData?.creditScoreRanges} onChange={onSectionChange('financial')} section="financial" />
          <EnumSelect label="Savings range" name="savingsRange" value={form.financial.savingsRange} options={refData?.savingsRanges} onChange={onSectionChange('financial')} section="financial" />
          <EnumSelect label="Housing status" name="housingStatus" value={form.financial.housingStatus} options={refData?.housingStatuses} onChange={onSectionChange('financial')} section="financial" />
          <EnumSelect label="General debt range" name="generalDebtRange" value={form.financial.generalDebtRange} options={refData?.debtRanges} onChange={onSectionChange('financial')} section="financial" />
          <EnumSelect label="Student loan range" name="studentLoanRange" value={form.financial.studentLoanRange} options={refData?.debtRanges} onChange={onSectionChange('financial')} section="financial" />
          <EnumSelect
            label="Income share preference"
            name="incomeRangeSharePreference"
            value={form.incomeRangeSharePreference}
            options={refData?.sharePreferences}
            onChange={onChange}
          />
          <label className="ob-field">
            <span>Financial goals</span>
            <input name="financialGoals" value={form.financial.financialGoals} onChange={onSectionChange('financial')} />
          </label>
          <label className="ob-field">
            <span>Spending style</span>
            <input name="spendingStyle" value={form.financial.spendingStyle} onChange={onSectionChange('financial')} />
          </label>
        </div>
      </AccordionSection>

      <AccordionSection
        id="safety"
        title="Safety Disclosure"
        icon={ShieldAlert}
        iconTone="rose"
        subtitle="Safety and criminal history disclosures."
        open={isOpen('safety')}
        onToggle={toggleSection}
        hidden={!sectionVisible('safety', ['safety', 'criminal', 'disclosure'])}
      >        <div className="ob-private-banner" role="note">
          These answers are private and reviewed only by authorized staff. They are never shown on your public profile.
        </div>
        <div className="ob-grid">
          <EnumSelect label="Criminal conviction" name="criminalConviction" value={form.safety.criminalConviction} options={refData?.safetyAnswers} onChange={onSectionChange('safety')} section="safety" />
          <EnumSelect label="Pending criminal cases" name="pendingCriminalCases" value={form.safety.pendingCriminalCases} options={refData?.safetyAnswers} onChange={onSectionChange('safety')} section="safety" />
          <EnumSelect label="Protective / restraining order" name="protectiveRestrainingOrder" value={form.safety.protectiveRestrainingOrder} options={refData?.safetyAnswers} onChange={onSectionChange('safety')} section="safety" />
          <EnumSelect label="DV / stalking / sexual offense" name="dvStalkingSexualOffense" value={form.safety.dvStalkingSexualOffense} options={refData?.safetyAnswers} onChange={onSectionChange('safety')} section="safety" />
          <EnumSelect label="Government offender registry" name="governmentOffenderRegistry" value={form.safety.governmentOffenderRegistry} options={refData?.safetyAnswers} onChange={onSectionChange('safety')} section="safety" />
          {showSafetyDetails && (
            <>
              <label className="ob-field">
                <span>Jurisdiction</span>
                <input name="jurisdiction" value={form.safety.jurisdiction} onChange={onSectionChange('safety')} />
              </label>
              <label className="ob-field">
                <span>Approx. year</span>
                <input
                  type="text"
                  inputMode="numeric"
                  name="approxYear"
                  maxLength={4}
                  value={form.safety.approxYear}
                  onChange={onApproxYearChange('safety')}
                  onKeyDown={blockInvalidNumberKeys}
                />
              </label>
              <label className="ob-check-field">
                <input type="checkbox" name="caseResolved" checked={!!form.safety.caseResolved} onChange={onSectionChange('safety')} />
                <span>Case resolved</span>
              </label>
              <label className="ob-field">
                <span>Explanation</span>
                <textarea name="explanation" rows={3} value={form.safety.explanation} onChange={onSectionChange('safety')} />
              </label>
            </>
          )}
        </div>
      </AccordionSection>

      <AccordionSection
        id="civil"
        title="Civil Judgment"
        icon={Scale}
        iconTone="slate"
        subtitle="Civil judgments and related disclosures."
        open={isOpen('civil')}
        onToggle={toggleSection}
        hidden={!sectionVisible('civil', ['civil', 'judgment', 'court'])}
      >        <div className="ob-grid">
          <EnumSelect
            label="Has civil judgment"
            name="hasJudgment"
            value={form.civilJudgment.hasJudgment}
            options={refData?.yesNoPrefer}
            onChange={onSectionChange('civilJudgment')}
            section="civilJudgment"
          />
          {showCivilDetails && (
            <>
              <label className="ob-field">
                <span>Categories</span>
                <input name="categories" value={form.civilJudgment.categories} onChange={onSectionChange('civilJudgment')} />
              </label>
              <label className="ob-field">
                <span>Jurisdiction</span>
                <input name="jurisdiction" value={form.civilJudgment.jurisdiction} onChange={onSectionChange('civilJudgment')} />
              </label>
              <label className={fieldClass('civilJudgment.approxYear')}>
                <span>Approx. year</span>
                <input
                  type="text"
                  inputMode="numeric"
                  name="approxYear"
                  maxLength={4}
                  value={form.civilJudgment.approxYear}
                  onChange={onApproxYearChange('civilJudgment')}
                  onKeyDown={blockInvalidNumberKeys}
                  aria-label="Approximate year of civil judgment"
                  {...inputA11y('civilJudgment.approxYear')}
                />
                <FieldError name="civilJudgment.approxYear" />
              </label>
              <label className="ob-check-field">
                <input type="checkbox" name="resolved" checked={!!form.civilJudgment.resolved} onChange={onSectionChange('civilJudgment')} />
                <span>Resolved</span>
              </label>
              <label className="ob-field">
                <span>Explanation</span>
                <textarea name="explanation" rows={3} value={form.civilJudgment.explanation} onChange={onSectionChange('civilJudgment')} />
              </label>
            </>
          )}
        </div>
      </AccordionSection>

      <AccordionSection
        id="verification"
        title="Identity Documents"
        icon={BadgeCheck}
        iconTone="emerald"
        subtitle="Choose a government ID type and upload the matching document image(s)."
        badge={{ label: 'Documents', tone: 'emerald' }}
        summary={form.idDocumentType
          ? ({ DRIVER_LICENSE: "Driver's License", STATE_ID: 'State ID', PASSPORT: 'Passport' }[form.idDocumentType] || form.idDocumentType)
          : 'Select document type'}
        tone="verified"
        open={isOpen('verification')}
        onToggle={toggleSection}
        hidden={!sectionVisible('verification', ['verification', 'id', 'document', 'ssn', 'passport', 'license', 'dl'])}
      >
        <div className="ob-grid" style={{ marginTop: 14 }}>
          <label className="ob-field">
            <span>Document type</span>
            <select
              value={form.idDocumentType || ''}
              onChange={(e) => {
                const nextType = e.target.value
                setForm((prev) => ({
                  ...prev,
                  idDocumentType: nextType,
                  idDocumentNumber: '',
                }))
                setUploadFeedback({})
              }}
              aria-label="Identity document type"
            >
              <option value="">Select</option>
              <option value="DRIVER_LICENSE">Driver&apos;s License</option>
              <option value="STATE_ID">State ID</option>
              <option value="PASSPORT">Passport</option>
            </select>
          </label>
          <label className="ob-field">
            <span>
              {form.idDocumentType === 'PASSPORT'
                ? 'Passport number'
                : form.idDocumentType === 'STATE_ID'
                  ? 'State ID number'
                  : form.idDocumentType === 'DRIVER_LICENSE'
                    ? "Driver's license number"
                    : 'Document number'}
            </span>
            <input
              type="text"
              value={form.idDocumentNumber || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, idDocumentNumber: e.target.value }))}
              placeholder={form.idDocumentType ? 'Enter number on the document' : 'Select a document type first'}
              disabled={!form.idDocumentType}
              autoComplete="off"
              aria-label="Identity document number"
            />
          </label>
          <label className={fieldClass('ssn')}>
            <span>Social Security Number (SSN) <em className="ob-optional">(optional)</em></span>
            <input
              name="ssn"
              inputMode="numeric"
              autoComplete="off"
              placeholder="XXX-XX-XXXX"
              value={form.ssn || ''}
              onChange={(e) => {
                const next = formatSsnInput(e.target.value)
                setForm((prev) => ({ ...prev, ssn: next }))
              }}
              {...inputA11y('ssn')}
            />
            <FieldError name="ssn" />
          </label>
        </div>

        {form.idDocumentType === 'PASSPORT' && (
          <div className="ob-grid" style={{ marginTop: 14 }}>
            <label className="ob-field">
              <span>
                Passport photo page
                {uploadFeedback.PASSPORT || vs?.passportDocumentId || vs?.dlFrontDocumentId ? ' (Uploaded)' : ''}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Upload passport photo page"
                onChange={(e) => onDocUpload(e, 'front')}
                disabled={verifyBusy || !form.idDocumentType}
              />
              {(uploadFeedback.PASSPORT?.name) && (
                <span className="ob-hint">{uploadFeedback.PASSPORT.name}</span>
              )}
            </label>
          </div>
        )}

        {(form.idDocumentType === 'DRIVER_LICENSE' || form.idDocumentType === 'STATE_ID') && (
          <div className="ob-grid" style={{ marginTop: 14 }}>
            <label className="ob-field">
              <span>
                {form.idDocumentType === 'STATE_ID' ? 'State ID front' : 'DL front'}
                {(uploadFeedback.ID_FRONT || uploadFeedback.DL_FRONT || vs?.dlFrontDocumentId) ? ' (Uploaded)' : ''}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={`Upload ${form.idDocumentType === 'STATE_ID' ? 'state ID' : 'driver license'} front image`}
                onChange={(e) => onDocUpload(e, 'front')}
                disabled={verifyBusy || !form.idDocumentType}
              />
              {(uploadFeedback.ID_FRONT?.name || uploadFeedback.DL_FRONT?.name) && (
                <span className="ob-hint">{uploadFeedback.ID_FRONT?.name || uploadFeedback.DL_FRONT?.name}</span>
              )}
            </label>
            <label className="ob-field">
              <span>
                {form.idDocumentType === 'STATE_ID' ? 'State ID back' : 'DL back'}
                {(uploadFeedback.ID_BACK || uploadFeedback.DL_BACK || vs?.dlBackDocumentId) ? ' (Uploaded)' : ''}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={`Upload ${form.idDocumentType === 'STATE_ID' ? 'state ID' : 'driver license'} back image`}
                onChange={(e) => onDocUpload(e, 'back')}
                disabled={verifyBusy || !form.idDocumentType}
              />
              {(uploadFeedback.ID_BACK?.name || uploadFeedback.DL_BACK?.name) && (
                <span className="ob-hint">{uploadFeedback.ID_BACK?.name || uploadFeedback.DL_BACK?.name}</span>
              )}
            </label>
          </div>
        )}

        {verifyBusy && (
          <p className="ob-hint" style={{ marginTop: 10 }} role="status">Uploading…</p>
        )}

        <p className="ob-hint" style={{ marginTop: 12 }}>
          SSN and ID images are stored privately and are never shown on public profiles.
          Upload JPEG, PNG, or WebP images up to 5MB.
        </p>
      </AccordionSection>

      {showPreview && (
        <div className="ob-preview-overlay" role="presentation" onClick={() => setShowPreview(false)}>
          <div className="ob-preview-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="ob-preview-head">
              <div className="ob-preview-head-left">
                <div className="ob-preview-head-icon"><Eye className="w-4 h-4" /></div>
                <div>
                  <h3>Public Profile View Preview</h3>
                  <p>What prospective matches see on your card</p>
                </div>
              </div>
              <button type="button" className="ob-preview-close" onClick={() => setShowPreview(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="ob-preview-body">
              <div className="ob-preview-profile">
                <div className="ob-preview-avatar">
                  {(displayName?.[0] || 'S').toUpperCase()}
                  {user?.verified && (
                    <span className="ok"><Check className="w-3 h-3" /></span>
                  )}
                </div>
                <div>
                  <h4>
                    {displayName}
                    {age != null && <span>{age} yrs</span>}
                  </h4>
                  <p>
                    {[form.career?.jobFunction, locationSummary !== 'Location not set' ? locationSummary : null]
                      .filter(Boolean)
                      .join(' • ') || 'Complete your profile to preview'}
                  </p>
                  <div className="ob-preview-tags">
                    {form.pronouns && <span>{form.pronouns}</span>}
                    {(user?.verified || vs?.overallStatus === 'VERIFIED') && (
                      <span className="verified">Verified Identity</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="ob-preview-note">
                <ShieldCheck className="w-4 h-4" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Notice: Your legal full name, phone, exact birth date, and background reports are <strong>strictly hidden</strong>.
                </span>
              </div>
            </div>
            <div className="ob-preview-foot">
              <button type="button" onClick={() => setShowPreview(false)}>Got it, Close</button>
            </div>
          </div>
        </div>
      )}
    </OnboardingShell>
  )
}
