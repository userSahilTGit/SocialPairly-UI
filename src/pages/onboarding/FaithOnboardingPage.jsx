import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Church, HeartHandshake } from 'lucide-react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { readCompletionPercentage } from '../../utils/profileCompletion'
import OnboardingShell from '../../components/onboarding/OnboardingShell'
import AccordionSection from '../../components/onboarding/AccordionSection'

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
const ALL_SECTIONS = ['myFaith', 'preferredFaith']

/**
 * Faith / Religion step — stores on user_profiles_details via personality API
 * (same columns: religion, preferred_religion). Does not wipe personality fields.
 */
export default function FaithOnboardingPage() {
  const navigate = useNavigate()
  const { refreshUser, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [religion, setReligion] = useState('')
  const [preferredReligion, setPreferredReligion] = useState('')
  const [religionOptions, setReligionOptions] = useState(RELIGION_OPTIONS)
  const [preferredReligionOptions, setPreferredReligionOptions] = useState(PREFERRED_RELIGION_OPTIONS)
  const [personalitySnapshot, setPersonalitySnapshot] = useState(null)
  const [openSections, setOpenSections] = useState(() => new Set(['myFaith', 'preferredFaith']))
  const [completionPct, setCompletionPct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const editMode = !!user?.identityPage1Complete

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [personalityRes, completionRes] = await Promise.all([
        api.get('/onboarding/personality'),
        api.get('/profile/completion').catch(() => ({ data: null })),
      ])
      const data = personalityRes.data
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
      setCompletionPct(readCompletionPercentage(completionRes))
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
      navigate(editMode ? '/profile' : '/', { replace: true })
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
      navigate('/profile', { replace: true })
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to save. Please try again.')
    } finally {
      setSaving(false)
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
  const isOpen = (id) => openSections.has(id)
  const expandAll = () => setOpenSections(new Set(ALL_SECTIONS))
  const collapseAll = () => setOpenSections(new Set())
  const sectionVisible = (id, keywords = []) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return [id, ...keywords].some((k) => String(k).toLowerCase().includes(q))
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
      editMode={editMode}
      onSaveLater={handleSaveLater}
      onBack={() => navigate('/onboarding/personality')}
      onContinue={handleContinue}
      continueLabel="Save & Continue"
      saveLaterLabel={editMode ? 'Cancel' : 'Save & continue later'}
      saving={saving}
      completionPct={completionPct}
      jumpLinks={[
        { id: 'myFaith', label: 'My Faith', status: 'ok' },
        { id: 'preferredFaith', label: 'Preferred Faith', status: 'active' },
      ]}
      onJump={(id) => setOpenSections((prev) => new Set([...prev, id]))}
      searchEnabled
      searchQuery={searchQuery}
      onSearch={setSearchQuery}
      searchMatchCount={ALL_SECTIONS.filter((id) => sectionVisible(id, [id])).length}
      expandAll={expandAll}
      collapseAll={collapseAll}
    >
      {formError && <div className="error ob-form-error" role="alert">{formError}</div>}

      <AccordionSection
        id="myFaith"
        title="My Faith"
        icon={Church}
        iconTone="violet"
        subtitle="Your religion or spiritual tradition."
        badge={{ label: 'Optional', tone: 'slate' }}
        summary={religion || 'Not selected'}
        open={isOpen('myFaith')}
        onToggle={toggleSection}
        hidden={!sectionVisible('myFaith', ['my faith', 'religion', 'belief'])}
      >
        <label className="ob-field">
          <span>My religion</span>
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
        </label>
        <p className="ob-hint">You control whether this appears on your public profile.</p>
      </AccordionSection>

      <AccordionSection
        id="preferredFaith"
        title="Preferred Faith in a Match"
        icon={HeartHandshake}
        iconTone="indigo"
        subtitle="What faith background you hope to share with a partner."
        badge={{ label: 'Matching Preference', tone: 'indigo' }}
        summary={preferredReligion || 'Open'}
        open={isOpen('preferredFaith')}
        onToggle={toggleSection}
        hidden={!sectionVisible('preferredFaith', ['preferred', 'looking for', 'match'])}
      >
        <label className="ob-field">
          <span>Preferred religion (looking for)</span>
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
        </label>
      </AccordionSection>
    </OnboardingShell>
  )
}
