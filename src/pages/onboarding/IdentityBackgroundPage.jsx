import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth, IDENTITY_CONTINUE_LATER_KEY } from '../../context/AuthContext'
import OnboardingShell from '../../components/onboarding/OnboardingShell'
import AccordionSection from '../../components/onboarding/AccordionSection'
import ConsentTermsModal from '../../components/onboarding/ConsentTermsModal'
import {
  BEST_TIMES,
  CONTACT_METHODS,
  EMPTY_EDUCATION,
  EMPTY_IDENTITY_FORM,
  EMPTY_LANGUAGE,
  EMPTY_PREVIOUS_ADDRESS,
  GENDER_OPTIONS,
  GENDER_VISIBILITY,
  NAME_PREFIXES,
  NAME_SUFFIXES,
  PRONOUN_OPTIONS,
  buildIdentityPayload,
  calcAge,
  formatSsnInput,
  humanizeEnum,
  mapIdentityResponseToForm,
  residenceDurationLabel,
  validateIdentityForm,
} from '../../utils/identityValidation'

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
  'relationship.maritalStatus': 'relationship',
  'nationality.additionalNationalities': 'nationality',
  backgroundConsent: 'consent',
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
    if (key === 'backgroundConsent' || key.startsWith('consent')) return 'consent'
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
  const [openSection, setOpenSection] = useState('legal')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [editMode, setEditMode] = useState(!!user?.identityPage1Complete)
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentModalOpen, setConsentModalOpen] = useState(false)
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [locationDraft, setLocationDraft] = useState('')

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
    try {
      const [identityRes, refRes] = await Promise.all([
        api.get('/onboarding/identity'),
        api.get('/onboarding/identity/reference-data'),
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
      setConsentChecked(!!mapped.backgroundConsent?.accepted)
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Could not load Identity & Background. Please try again.')
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

  const addPreferredLocation = () => {
    const label = locationDraft.trim()
    if (!label) return
    setForm((prev) => ({
      ...prev,
      currentResidence: {
        ...prev.currentResidence,
        preferredFutureLocations: [...(prev.currentResidence.preferredFutureLocations || []), label],
      },
    }))
    setLocationDraft('')
  }

  const removePreferredLocation = (idx) => {
    setForm((prev) => ({
      ...prev,
      currentResidence: {
        ...prev.currentResidence,
        preferredFutureLocations: prev.currentResidence.preferredFutureLocations.filter((_, i) => i !== idx),
      },
    }))
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
      rows[index] = { ...rows[index], [field]: value }
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

  const inputA11y = (name) => ({
    'aria-invalid': fieldErrors[name] ? true : undefined,
    'aria-describedby': fieldErrors[name] ? `${name.replace(/\./g, '-')}-error` : undefined,
  })

  const FieldError = ({ name }) => (
    fieldErrors[name]
      ? <em id={`${name.replace(/\./g, '-')}-error`}>{fieldErrors[name]}</em>
      : null
  )

  const CountrySelect = ({ name, value, onChange: onSel, required = false, errorKey }) => (
    <label className={fieldClass(errorKey || name)}>
      <span>{required ? 'Country *' : 'Country'}</span>
      <select name={name} value={value} onChange={onSel} {...inputA11y(errorKey || name)}>
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
        {...inputA11y(errorKey || (section ? `${section}.${name}` : name))}
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
    if (!form.backgroundConsent?.accepted) {
      setFormError('Background screening consent is required before saving.')
      setFieldErrors({ backgroundConsent: 'Consent is required' })
      setOpenSection('consent')
      setConsentModalOpen(true)
      return
    }
    const errors = validateIdentityForm(form, action, refData)
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      setFormError('Please fix the highlighted fields before continuing.')
      setOpenSection(openSectionForErrors(errors))
      return
    }

    setSaving(true)
    try {
      await api.put('/onboarding/identity', buildIdentityPayload(form, action))
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
      const msg = err.response?.data?.message || 'Unable to save. Please try again.'
      const fields = err.response?.data?.fields
      if (fields && typeof fields === 'object') setFieldErrors(fields)
      setFormError(msg)
      if (String(msg).toLowerCase().includes('consent')) {
        setOpenSection('consent')
        setConsentModalOpen(true)
      }
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

  const startVerification = async () => {
    setVerifyBusy(true)
    setFormError('')
    try {
      const { data } = await api.post('/onboarding/identity/verification/start')
      setForm((prev) => ({
        ...prev,
        verificationSummary: {
          ...(prev.verificationSummary || {}),
          ...data,
          overallStatus: data.overallStatus || data.status || 'IN_PROGRESS',
        },
      }))
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to start verification.')
    } finally {
      setVerifyBusy(false)
    }
  }

  const uploadDocument = async (file, docPurpose) => {
    if (!file) return null
    const body = new FormData()
    body.append('file', file)
    body.append('docPurpose', docPurpose)
    const { data } = await api.post('/onboarding/identity/documents', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  const onDocUpload = async (e, docPurpose) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setVerifyBusy(true)
    setFormError('')
    try {
      const uploaded = await uploadDocument(file, docPurpose)
      if (docPurpose === 'SELFIE' && uploaded?.id) {
        const { data } = await api.post('/onboarding/identity/verification/selfie', {
          documentId: uploaded.id,
        })
        setForm((prev) => ({
          ...prev,
          verificationSummary: {
            ...(prev.verificationSummary || {}),
            ...data,
          },
        }))
      } else if ((docPurpose === 'DL_FRONT' || docPurpose === 'DL_BACK') && uploaded?.id) {
        setForm((prev) => ({
          ...prev,
          verificationSummary: {
            ...(prev.verificationSummary || {}),
            ...(docPurpose === 'DL_FRONT'
              ? { dlFrontDocumentId: uploaded.id }
              : { dlBackDocumentId: uploaded.id }),
          },
        }))
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Document upload failed.')
    } finally {
      setVerifyBusy(false)
    }
  }

  const openConsentModal = (e) => {
    e?.preventDefault?.()
    if (form.backgroundConsent?.accepted || consentChecked) return
    setConsentModalOpen(true)
  }

  const acceptConsentFromModal = async () => {
    setVerifyBusy(true)
    setFormError('')
    try {
      const documentVersion = refData?.backgroundConsentDocumentVersion
      const { data } = await api.post('/onboarding/identity/background-consent', {
        accepted: true,
        documentVersion,
      })
      setForm((prev) => ({
        ...prev,
        backgroundConsent: {
          accepted: true,
          documentVersion: data.documentVersion || documentVersion,
          acceptedAt: data.acceptedAt || null,
        },
      }))
      setConsentChecked(true)
      setConsentModalOpen(false)
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.backgroundConsent
        return next
      })
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to record consent.')
    } finally {
      setVerifyBusy(false)
    }
  }

  const toggleSection = (id) => setOpenSection((prev) => (prev === id ? '' : id))

  if (loading) {
    return (
      <div className="ob-state-screen">
        <div className="ob-state-card">
          <div className="ob-spinner" aria-hidden="true" />
          <h2>Loading Identity & Background</h2>
          <p>Fetching your registration details…</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="ob-state-screen">
        <div className="ob-state-card">
          <h2>Something went wrong</h2>
          <p>{loadError}</p>
          <button type="button" className="btn auth-primary-btn" onClick={load}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  const vs = form.verificationSummary

  return (
    <OnboardingShell
      currentStepId="identity"
      saving={saving}
      editMode={editMode}
      continueLabel={editMode ? 'Save changes' : 'Save & Continue'}
      saveLaterLabel={editMode ? 'Cancel' : 'Save & continue later'}
      onBack={handleBack}
      onSaveLater={handleCancelOrLater}
      onContinue={() => submit('CONTINUE')}
    >
      {formError && <div className="error ob-form-error" role="alert">{formError}</div>}

      <AccordionSection id="legal" title="Legal identity" open={openSection === 'legal'} onToggle={toggleSection}>
        <div className="ob-grid ob-grid-4">
          <label className={fieldClass('namePrefix')}>
            <span>Prefix</span>
            <select name="namePrefix" value={form.namePrefix} onChange={onChange}>
              {NAME_PREFIXES.map((p) => (
                <option key={p || 'none'} value={p}>{p || 'Select'}</option>
              ))}
            </select>
          </label>
          <label className={fieldClass('firstName')}>
            <span>First name *</span>
            <input name="firstName" value={form.firstName} onChange={onChange} autoComplete="given-name" {...inputA11y('firstName')} />
            <FieldError name="firstName" />
          </label>
          <label className={fieldClass('middleName')}>
            <span>Middle name</span>
            <input name="middleName" value={form.middleName} onChange={onChange} autoComplete="additional-name" {...inputA11y('middleName')} />
            <FieldError name="middleName" />
          </label>
          <label className={fieldClass('lastName')}>
            <span>Last name *</span>
            <input name="lastName" value={form.lastName} onChange={onChange} autoComplete="family-name" {...inputA11y('lastName')} />
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
      </AccordionSection>

      <AccordionSection id="preferred" title="Preferred name" open={openSection === 'preferred'} onToggle={toggleSection}>
        <div className="ob-grid">
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

      <AccordionSection id="dob" title="Date of birth" open={openSection === 'dob'} onToggle={toggleSection}>
        <div className="ob-grid">
          <label className={fieldClass('dateOfBirth')}>
            <span>Date of birth *</span>
            <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange} {...inputA11y('dateOfBirth')} />
            <FieldError name="dateOfBirth" />
          </label>
          <div className="ob-age-preview">
            <span>Calculated age</span>
            <strong>{age != null ? `${age} years` : '—'}</strong>
          </div>
        </div>
        <p className="ob-hint">Exact date of birth is never shown on member-facing profiles—only approved age information.</p>
      </AccordionSection>

      <AccordionSection id="gender" title="Pronouns & gender identity" open={openSection === 'gender'} onToggle={toggleSection}>
        <div className="ob-grid">
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

      <AccordionSection id="contact" title="Contact details" open={openSection === 'contact'} onToggle={toggleSection}>
        <div className="ob-grid">
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

      <AccordionSection id="address" title="Current residence" open={openSection === 'address'} onToggle={toggleSection}>
        <p className="ob-hint">Your exact address is never shown publicly—only city and country may appear.</p>
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
            <span>Postal code *</span>
            <input name="postalCode" value={form.currentResidence.postalCode} onChange={onSectionChange('currentResidence')} autoComplete="postal-code" {...inputA11y('currentResidence.postalCode')} />
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
              type="number"
              min="1950"
              max={new Date().getFullYear()}
              value={form.currentResidence.moveInYear}
              onChange={onSectionChange('currentResidence')}
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
            <span>Event travel radius (km)</span>
            <input
              name="eventTravelRadiusKm"
              type="number"
              min="0"
              value={form.currentResidence.eventTravelRadiusKm}
              onChange={onSectionChange('currentResidence')}
            />
          </label>
        </div>
        <div className="ob-field" style={{ marginTop: 12 }}>
          <span>Preferred future locations</span>
          <div className="ob-chip-row">
            {(form.currentResidence.preferredFutureLocations || []).map((loc, idx) => (
              <button key={`${loc}-${idx}`} type="button" className="ob-status-chip" onClick={() => removePreferredLocation(idx)}>
                {loc} ×
              </button>
            ))}
          </div>
          <div className="ob-row-actions">
            <input
              value={locationDraft}
              onChange={(e) => setLocationDraft(e.target.value)}
              placeholder="City or region, then Add"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addPreferredLocation()
                }
              }}
            />
            <button type="button" className="btn ob-secondary" onClick={addPreferredLocation}>Add</button>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection id="previousAddresses" title="Previous addresses" open={openSection === 'previousAddresses'} onToggle={toggleSection}>
        {(form.previousAddresses || []).map((row, idx) => (
          <div key={row.id || idx} className="ob-repeat-card">
            <div className="ob-grid">
              <label className="ob-field">
                <span>City</span>
                <input value={row.city} onChange={(e) => updatePreviousAddress(idx, 'city', e.target.value)} />
              </label>
              <label className="ob-field">
                <span>State / region</span>
                <input value={row.stateRegion} onChange={(e) => updatePreviousAddress(idx, 'stateRegion', e.target.value)} />
              </label>
              <label className="ob-field">
                <span>Postal code</span>
                <input value={row.postalCode} onChange={(e) => updatePreviousAddress(idx, 'postalCode', e.target.value)} {...inputA11y(`previousAddresses.${idx}.postalCode`)} />
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
                <span>From month</span>
                <select value={String(row.fromMonth ?? '')} onChange={(e) => updatePreviousAddress(idx, 'fromMonth', e.target.value)}>
                  {MONTHS.map((m) => (
                    <option key={m.value || 'none'} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>
              <label className="ob-field">
                <span>From year</span>
                <input type="number" value={row.fromYear} onChange={(e) => updatePreviousAddress(idx, 'fromYear', e.target.value)} />
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
                <input type="number" value={row.toYear} onChange={(e) => updatePreviousAddress(idx, 'toYear', e.target.value)} />
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
            onClick={() => setForm((prev) => ({
              ...prev,
              previousAddresses: [...prev.previousAddresses, { ...EMPTY_PREVIOUS_ADDRESS }],
            }))}
          >
            Add previous address
          </button>
        </div>
      </AccordionSection>

      <AccordionSection id="nationality" title="Nationality & languages" open={openSection === 'nationality'} onToggle={toggleSection}>
        <div className="ob-grid">
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

      <AccordionSection id="immigration" title="Immigration (optional)" open={openSection === 'immigration'} onToggle={toggleSection}>
        <div className="ob-grid">
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

      <AccordionSection id="relationship" title="Relationship history" open={openSection === 'relationship'} onToggle={toggleSection}>
        <div className="ob-grid">
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
                <input type="number" min="0" name="previousMarriagesCount" value={form.relationship.previousMarriagesCount} onChange={onSectionChange('relationship')} />
              </label>
              <label className="ob-field">
                <span>Divorces</span>
                <input type="number" min="0" name="divorcesCount" value={form.relationship.divorcesCount} onChange={onSectionChange('relationship')} />
              </label>
              <label className="ob-field">
                <span>Annulments</span>
                <input type="number" min="0" name="annulmentsCount" value={form.relationship.annulmentsCount} onChange={onSectionChange('relationship')} />
              </label>
              <label className="ob-field">
                <span>Most recent divorce year</span>
                <input type="number" name="mostRecentDivorceYear" value={form.relationship.mostRecentDivorceYear} onChange={onSectionChange('relationship')} />
              </label>
              <label className="ob-field">
                <span>
                  <input type="checkbox" name="currentlySeparated" checked={!!form.relationship.currentlySeparated} onChange={onSectionChange('relationship')} />
                  {' '}Currently separated
                </span>
              </label>
              <label className="ob-field">
                <span>
                  <input type="checkbox" name="divorceFinalized" checked={!!form.relationship.divorceFinalized} onChange={onSectionChange('relationship')} />
                  {' '}Divorce finalized
                </span>
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

      <AccordionSection id="family" title="Family" open={openSection === 'family'} onToggle={toggleSection}>
        <p className="ob-hint">Do not enter children’s names. Age ranges only.</p>
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
                <input type="number" min="0" name="childrenCount" value={form.family.childrenCount} onChange={onSectionChange('family')} />
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

      <AccordionSection id="education" title="Education" open={openSection === 'education'} onToggle={toggleSection}>
        {(form.educations || []).map((edu, idx) => (
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
              <label className="ob-field">
                <span>Degree</span>
                <input value={edu.degree} onChange={(e) => updateEducation(idx, 'degree', e.target.value)} />
              </label>
              <label className="ob-field">
                <span>Field of study</span>
                <input value={edu.fieldOfStudy} onChange={(e) => updateEducation(idx, 'fieldOfStudy', e.target.value)} />
              </label>
              <label className="ob-field">
                <span>Institution</span>
                <input value={edu.institution} onChange={(e) => updateEducation(idx, 'institution', e.target.value)} />
              </label>
              <label className="ob-field">
                <span>City</span>
                <input value={edu.city} onChange={(e) => updateEducation(idx, 'city', e.target.value)} />
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
              <label className="ob-field">
                <span>Start year</span>
                <input type="number" value={edu.startYear} onChange={(e) => updateEducation(idx, 'startYear', e.target.value)} />
              </label>
              <label className={fieldClass(`educations.${idx}.graduationYear`)}>
                <span>Graduation year</span>
                <input type="number" value={edu.graduationYear} onChange={(e) => updateEducation(idx, 'graduationYear', e.target.value)} {...inputA11y(`educations.${idx}.graduationYear`)} />
                <FieldError name={`educations.${idx}.graduationYear`} />
              </label>
              <label className="ob-field">
                <span>
                  <input type="checkbox" checked={!!edu.currentlyStudying} onChange={(e) => updateEducation(idx, 'currentlyStudying', e.target.checked)} />
                  {' '}Currently studying
                </span>
              </label>
              <label className="ob-field">
                <span>Honors</span>
                <input value={edu.honors} onChange={(e) => updateEducation(idx, 'honors', e.target.value)} />
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

      <AccordionSection id="career" title="Career" open={openSection === 'career'} onToggle={toggleSection}>
        <div className="ob-grid">
          <EnumSelect
            label="Employment status"
            name="employmentStatus"
            value={form.career.employmentStatus}
            options={refData?.employmentStatuses}
            onChange={onSectionChange('career')}
            section="career"
          />
          <label className="ob-field">
            <span>Job function</span>
            <input name="jobFunction" value={form.career.jobFunction} onChange={onSectionChange('career')} />
          </label>
          <label className="ob-field">
            <span>Industry</span>
            <input name="industry" value={form.career.industry} onChange={onSectionChange('career')} />
          </label>
          <label className="ob-field">
            <span>Employer name</span>
            <input name="employerName" value={form.career.employerName} onChange={onSectionChange('career')} />
          </label>
          <label className="ob-field">
            <span>
              <input
                type="checkbox"
                name="showEmployerPublicly"
                checked={!!form.career.showEmployerPublicly}
                onChange={onSectionChange('career')}
              />
              {' '}Show employer publicly
            </span>
          </label>
          <p className="ob-hint">Employer is private by default unless you check this box.</p>
          <label className="ob-field">
            <span>Years in profession</span>
            <input type="number" min="0" name="yearsInProfession" value={form.career.yearsInProfession} onChange={onSectionChange('career')} />
          </label>
          <label className="ob-field">
            <span>Career ambitions</span>
            <input name="careerAmbitions" value={form.career.careerAmbitions} onChange={onSectionChange('career')} />
          </label>
        </div>
      </AccordionSection>

      <AccordionSection id="financial" title="Financial lifestyle" open={openSection === 'financial'} onToggle={toggleSection}>
        <div className="ob-grid">
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

      <AccordionSection id="safety" title="Safety disclosure" open={openSection === 'safety'} onToggle={toggleSection}>
        <div className="ob-private-banner" role="note">
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
                <input type="number" name="approxYear" value={form.safety.approxYear} onChange={onSectionChange('safety')} />
              </label>
              <label className="ob-field">
                <span>
                  <input type="checkbox" name="caseResolved" checked={!!form.safety.caseResolved} onChange={onSectionChange('safety')} />
                  {' '}Case resolved
                </span>
              </label>
              <label className="ob-field">
                <span>Explanation</span>
                <textarea name="explanation" rows={3} value={form.safety.explanation} onChange={onSectionChange('safety')} />
              </label>
            </>
          )}
        </div>
      </AccordionSection>

      <AccordionSection id="civil" title="Civil judgment" open={openSection === 'civil'} onToggle={toggleSection}>
        <div className="ob-grid">
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
              <label className="ob-field">
                <span>Approx. year</span>
                <input type="number" name="approxYear" value={form.civilJudgment.approxYear} onChange={onSectionChange('civilJudgment')} />
              </label>
              <label className="ob-field">
                <span>
                  <input type="checkbox" name="resolved" checked={!!form.civilJudgment.resolved} onChange={onSectionChange('civilJudgment')} />
                  {' '}Resolved
                </span>
              </label>
              <label className="ob-field">
                <span>Explanation</span>
                <textarea name="explanation" rows={3} value={form.civilJudgment.explanation} onChange={onSectionChange('civilJudgment')} />
              </label>
            </>
          )}
        </div>
      </AccordionSection>

      <AccordionSection id="verification" title="Identity verification" open={openSection === 'verification'} onToggle={toggleSection}>
        <div className="ob-chip-row" style={{ marginBottom: 12 }}>
          <span className="ob-status-chip">Overall: {humanizeEnum(vs?.overallStatus) || 'Not started'}</span>
          <span className="ob-status-chip">Name: {humanizeEnum(vs?.nameStatus) || '—'}</span>
          <span className="ob-status-chip">Age: {humanizeEnum(vs?.ageStatus) || '—'}</span>
          <span className="ob-status-chip">Photo: {humanizeEnum(vs?.photoStatus) || '—'}</span>
        </div>
        <div className="ob-row-actions">
          <button type="button" className="btn auth-primary-btn" onClick={startVerification} disabled={verifyBusy}>
            {verifyBusy ? 'Working…' : 'Start verification'}
          </button>
        </div>
        <div className="ob-grid" style={{ marginTop: 14 }}>
          <label className={fieldClass('ssn')}>
            <span>Social Security Number (SSN)</span>
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
          <label className="ob-field">
            <span>DL front {vs?.dlFrontDocumentId ? '(Uploaded)' : ''}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onDocUpload(e, 'DL_FRONT')} disabled={verifyBusy} />
          </label>
          <label className="ob-field">
            <span>DL back {vs?.dlBackDocumentId ? '(Uploaded)' : ''}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onDocUpload(e, 'DL_BACK')} disabled={verifyBusy} />
          </label>
          <label className="ob-field">
            <span>Selfie</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onDocUpload(e, 'SELFIE')} disabled={verifyBusy} />
          </label>
        </div>
        <p className="ob-hint">SSN is stored privately and returned masked. DL images are never shown on public profiles.</p>
      </AccordionSection>

      <AccordionSection id="consent" title="Background screening consent" open={openSection === 'consent'} onToggle={toggleSection}>
        <div className="ob-private-banner" role="note">
          You must accept the background screening terms before saving Identity &amp; Background.
          Consent document version:{' '}
          <strong>{refData?.backgroundConsentDocumentVersion || '—'}</strong>.
          {form.backgroundConsent?.accepted && (
            <> Accepted{form.backgroundConsent.acceptedAt ? ` on ${form.backgroundConsent.acceptedAt}` : ''}.</>
          )}
        </div>
        <label className={fieldClass('backgroundConsent')} style={{ marginTop: 12 }}>
          <span>
            <input
              type="checkbox"
              checked={consentChecked || !!form.backgroundConsent?.accepted}
              readOnly
              onClick={openConsentModal}
              onChange={() => {}}
              aria-checked={consentChecked || !!form.backgroundConsent?.accepted}
            />
            {' '}I have read and agree to the background screening disclosure.
          </span>
          <FieldError name="backgroundConsent" />
        </label>
        {!form.backgroundConsent?.accepted && (
          <div className="ob-row-actions">
            <button type="button" className="btn auth-primary-btn" onClick={() => setConsentModalOpen(true)} disabled={verifyBusy}>
              Review &amp; accept terms
            </button>
          </div>
        )}
      </AccordionSection>

      <ConsentTermsModal
        open={consentModalOpen}
        documentVersion={refData?.backgroundConsentDocumentVersion}
        busy={verifyBusy}
        onAgree={acceptConsentFromModal}
        onCancel={() => setConsentModalOpen(false)}
      />
    </OnboardingShell>
  )
}
