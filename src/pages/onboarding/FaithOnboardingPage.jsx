import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import OnboardingShell from '../../components/onboarding/OnboardingShell'

const RELIGION_OPTIONS = [
  'Christianity',
  'Catholicism',
  'Protestantism',
  'Orthodox Christianity',
  'Islam',
  'Hinduism',
  'Buddhism',
  'Sikhism',
  'Judaism',
  'Jainism',
  'Bahai',
  'Spiritual but not religious',
  'Agnostic',
  'Atheist',
  'Prefer not to say',
  'Other',
]

const PREFERRED_RELIGION_OPTIONS = ['Open to all', ...RELIGION_OPTIONS]

/**
 * Faith / Religion step — stores on user_profiles_details via personality API
 * (same columns: religion, preferred_religion). Does not wipe personality fields.
 */
export default function FaithOnboardingPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [religion, setReligion] = useState('')
  const [preferredReligion, setPreferredReligion] = useState('')
  const [religionOptions, setReligionOptions] = useState(RELIGION_OPTIONS)
  const [preferredReligionOptions, setPreferredReligionOptions] = useState(PREFERRED_RELIGION_OPTIONS)
  /** Snapshot of personality payload so we do not clear lifestyle fields on save */
  const [personalitySnapshot, setPersonalitySnapshot] = useState(null)

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const { data } = await api.get('/onboarding/personality')
      setReligion(data.religion || '')
      setPreferredReligion(data.preferredReligion || '')
      if (Array.isArray(data.religionOptions) && data.religionOptions.length) {
        setReligionOptions(data.religionOptions)
      }
      if (Array.isArray(data.preferredReligionOptions) && data.preferredReligionOptions.length) {
        setPreferredReligionOptions(data.preferredReligionOptions)
      }
      setPersonalitySnapshot({
        headline: data.headline || null,
        aboutStory: data.aboutStory || null,
        friendDescriptors: data.friendDescriptors || [],
        proudOf: data.proudOf || null,
        lifePhilosophy: data.lifePhilosophy || null,
        personalityTraits: data.personalityTraits || [],
        interestsHobbies: data.interestsHobbies || null,
        lifestyleNotes: data.lifestyleNotes || null,
        relationshipGoals: data.relationshipGoals || null,
        firstDatePrefs: data.firstDatePrefs || null,
        idealPartner: data.idealPartner || null,
        extendedFamily: data.extendedFamily || null,
      })
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Could not load Faith preferences.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const persist = async (action) => {
    await api.put('/onboarding/personality', {
      action,
      ...(personalitySnapshot || {}),
      religion: religion || null,
      preferredReligion: preferredReligion || null,
    })
    await refreshUser()
  }

  const handleSaveLater = async () => {
    setFormError('')
    setSaving(true)
    try {
      await persist('SAVE_LATER')
      navigate('/', { replace: true })
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleContinue = async () => {
    setFormError('')
    setSaving(true)
    try {
      await persist('SAVE_LATER')
      navigate('/profile/media', { replace: true })
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="ob-state-screen">
        <div className="ob-state-card">
          <div className="ob-spinner" aria-hidden="true" />
          <h2>Loading Faith preferences</h2>
          <p>Fetching your details…</p>
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

  return (
    <OnboardingShell
      currentStepId="faith"
      onSaveLater={handleSaveLater}
      onBack={() => navigate('/onboarding/personality')}
      onContinue={handleContinue}
      continueLabel="Save & Continue"
      saving={saving}
    >
      {formError && <div className="error ob-form-error" role="alert">{formError}</div>}

      <div className="form-group">
        <label htmlFor="faith-religion">My religion</label>
        <select
          id="faith-religion"
          value={religion}
          onChange={(e) => setReligion(e.target.value)}
        >
          <option value="">-- Select --</option>
          {religionOptions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="faith-preferred">Preferred religion (looking for)</label>
        <select
          id="faith-preferred"
          value={preferredReligion}
          onChange={(e) => setPreferredReligion(e.target.value)}
        >
          <option value="">-- Select --</option>
          {preferredReligionOptions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
    </OnboardingShell>
  )
}
