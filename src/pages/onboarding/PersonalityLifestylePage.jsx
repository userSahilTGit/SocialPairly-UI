import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import OnboardingShell from '../../components/onboarding/OnboardingShell'
import AccordionSection from '../../components/onboarding/AccordionSection'

const TRAIT_OPTIONS = [
  'Warm', 'Ambitious', 'Playful', 'Grounded', 'Adventurous',
  'Thoughtful', 'Creative', 'Family-oriented', 'Independent', 'Spiritual',
]

const PROUD_OPTIONS = [
  '',
  'Overcoming challenges and growing every day',
  'Building meaningful relationships',
  'Career and personal achievements',
  'Helping others and giving back',
  'Staying true to my values',
]

const PHILOSOPHY_OPTIONS = [
  '',
  'Be kind, work hard, stay humble',
  'Live with purpose and gratitude',
  'Faith, family, and personal growth',
  'Adventure and lifelong learning',
  'Balance ambition with compassion',
]

const EMPTY = {
  headline: '',
  aboutStory: '',
  friendDescriptors: [],
  proudOf: '',
  lifePhilosophy: '',
  personalityTraits: [],
  interestsHobbies: '',
  lifestyleNotes: '',
  relationshipGoals: '',
  firstDatePrefs: '',
  idealPartner: '',
  extendedFamily: '',
  // Kept in payload (not shown) so saves do not clear Faith fields
  religion: '',
  preferredReligion: '',
}

const MAX_ABOUT = 500
const MAX_FRIEND_WORDS = 3

export default function PersonalityLifestylePage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [openSection, setOpenSection] = useState('about')
  const [form, setForm] = useState(EMPTY)
  const [tagDraft, setTagDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const aboutLen = form.aboutStory?.length || 0

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const { data } = await api.get('/onboarding/personality')
      setForm({
        headline: data.headline || '',
        aboutStory: data.aboutStory || '',
        friendDescriptors: data.friendDescriptors || [],
        proudOf: data.proudOf || '',
        lifePhilosophy: data.lifePhilosophy || '',
        personalityTraits: data.personalityTraits || [],
        interestsHobbies: data.interestsHobbies || '',
        lifestyleNotes: data.lifestyleNotes || '',
        relationshipGoals: data.relationshipGoals || '',
        firstDatePrefs: data.firstDatePrefs || '',
        idealPartner: data.idealPartner || '',
        extendedFamily: data.extendedFamily || '',
        religion: data.religion || '',
        preferredReligion: data.preferredReligion || '',
      })
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Could not load Personality & Lifestyle.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const toggleSection = (id) => {
    setOpenSection((prev) => (prev === id ? '' : id))
  }

  const validateContinue = () => {
    const errors = {}
    if (!form.headline.trim()) errors.headline = 'Short headline is required'
    if (!form.aboutStory.trim()) errors.aboutStory = 'Please tell us about yourself'
    if (form.aboutStory.length > MAX_ABOUT) {
      errors.aboutStory = `Maximum ${MAX_ABOUT} characters`
    }
    return errors
  }

  const buildPayload = (action) => ({
    action,
    headline: form.headline.trim() || null,
    aboutStory: form.aboutStory.trim() || null,
    friendDescriptors: form.friendDescriptors,
    proudOf: form.proudOf || null,
    lifePhilosophy: form.lifePhilosophy || null,
    personalityTraits: form.personalityTraits,
    interestsHobbies: form.interestsHobbies.trim() || null,
    lifestyleNotes: form.lifestyleNotes.trim() || null,
    relationshipGoals: form.relationshipGoals.trim() || null,
    firstDatePrefs: form.firstDatePrefs.trim() || null,
    idealPartner: form.idealPartner.trim() || null,
    extendedFamily: form.extendedFamily.trim() || null,
    religion: form.religion || null,
    preferredReligion: form.preferredReligion || null,
  })

  const persist = async (action) => {
    await api.put('/onboarding/personality', buildPayload(action))
    await refreshUser()
  }

  const handleSaveLater = async () => {
    setFormError('')
    setFieldErrors({})
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
    const errors = validateContinue()
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      setFormError('Please complete About You before continuing.')
      setOpenSection('about')
      return
    }
    setSaving(true)
    try {
      await persist('CONTINUE')
      navigate('/onboarding/faith', { replace: true })
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const addFriendWord = () => {
    const word = tagDraft.trim()
    if (!word || form.friendDescriptors.length >= MAX_FRIEND_WORDS) return
    if (form.friendDescriptors.some((w) => w.toLowerCase() === word.toLowerCase())) {
      setTagDraft('')
      return
    }
    setField('friendDescriptors', [...form.friendDescriptors, word])
    setTagDraft('')
  }

  const removeFriendWord = (word) => {
    setField('friendDescriptors', form.friendDescriptors.filter((w) => w !== word))
  }

  const toggleTrait = (trait) => {
    const has = form.personalityTraits.includes(trait)
    setField(
      'personalityTraits',
      has ? form.personalityTraits.filter((t) => t !== trait) : [...form.personalityTraits, trait],
    )
  }

  if (loading) {
    return (
      <div className="ob-state-screen">
        <div className="ob-state-card">
          <div className="ob-spinner" aria-hidden="true" />
          <h2>Loading Personality & Lifestyle</h2>
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
      currentStepId="personality"
      saving={saving}
      onBack={() => navigate('/onboarding/identity')}
      onSaveLater={handleSaveLater}
      onContinue={handleContinue}
      continueLabel="Save & Continue"
      saveLaterLabel="Save & continue later"
    >
      {formError && <div className="error ob-form-error" role="alert">{formError}</div>}

      <AccordionSection
        id="about"
        title="A. About You"
        open={openSection === 'about'}
        onToggle={toggleSection}
      >
        <div className="form-group">
          <label htmlFor="p-headline">Short headline</label>
          <input
            id="p-headline"
            value={form.headline}
            onChange={(e) => setField('headline', e.target.value)}
            placeholder="Adventurous soul looking for a meaningful connection"
            maxLength={200}
            aria-invalid={!!fieldErrors.headline}
          />
          {fieldErrors.headline && <em className="field-error">{fieldErrors.headline}</em>}
        </div>

        <div className="form-group">
          <label htmlFor="p-about">Tell us about yourself</label>
          <textarea
            id="p-about"
            value={form.aboutStory}
            onChange={(e) => setField('aboutStory', e.target.value.slice(0, MAX_ABOUT))}
            rows={4}
            placeholder="I love hiking on weekends, cooking new recipes, and deep conversations…"
            aria-invalid={!!fieldErrors.aboutStory}
          />
          <small style={{ display: 'block', textAlign: 'right', color: '#6b7280' }}>
            {aboutLen}/{MAX_ABOUT}
          </small>
          {fieldErrors.aboutStory && <em className="field-error">{fieldErrors.aboutStory}</em>}
        </div>

        <div className="form-group">
          <label>Three words friends use to describe you</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {form.friendDescriptors.map((word) => (
              <button
                key={word}
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => removeFriendWord(word)}
                aria-label={`Remove ${word}`}
              >
                {word} <X size={13} />
              </button>
            ))}
            {form.friendDescriptors.length < MAX_FRIEND_WORDS && (
              <>
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addFriendWord()
                    }
                  }}
                  placeholder="Type a word"
                  maxLength={40}
                  style={{ flex: '1 1 140px', minWidth: 120 }}
                />
                <button type="button" className="btn btn-sm btn-secondary" onClick={addFriendWord}>
                  <Plus size={15} /> Add
                </button>
              </>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="p-proud">What makes you proud?</label>
          <select
            id="p-proud"
            value={form.proudOf}
            onChange={(e) => setField('proudOf', e.target.value)}
          >
            {PROUD_OPTIONS.map((o) => (
              <option key={o || 'none'} value={o}>{o || 'Select'}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="p-philosophy">Life philosophy</label>
          <select
            id="p-philosophy"
            value={form.lifePhilosophy}
            onChange={(e) => setField('lifePhilosophy', e.target.value)}
          >
            {PHILOSOPHY_OPTIONS.map((o) => (
              <option key={o || 'none'} value={o}>{o || 'Select'}</option>
            ))}
          </select>
        </div>
      </AccordionSection>

      <AccordionSection
        id="personality"
        title="B. Personality"
        open={openSection === 'personality'}
        onToggle={toggleSection}
      >
        <p style={{ marginTop: 0, color: '#6b7280' }}>Select traits that fit you best.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TRAIT_OPTIONS.map((trait) => {
            const selected = form.personalityTraits.includes(trait)
            return (
              <button
                key={trait}
                type="button"
                className={`btn btn-sm ${selected ? '' : 'btn-secondary'}`}
                onClick={() => toggleTrait(trait)}
              >
                {trait}
              </button>
            )
          })}
        </div>
      </AccordionSection>

      <AccordionSection
        id="interests"
        title="C. Interests & Hobbies"
        open={openSection === 'interests'}
        onToggle={toggleSection}
      >
        <div className="form-group">
          <label htmlFor="p-interests">Interests & hobbies</label>
          <textarea
            id="p-interests"
            rows={5}
            value={form.interestsHobbies}
            onChange={(e) => setField('interestsHobbies', e.target.value)}
            placeholder="Travel, cooking, volunteering, sports, music..."
          />
        </div>
      </AccordionSection>

      <AccordionSection
        id="lifestyle"
        title="D. Lifestyle"
        open={openSection === 'lifestyle'}
        onToggle={toggleSection}
      >
        <div className="form-group">
          <label htmlFor="p-lifestyle">Lifestyle</label>
          <textarea
            id="p-lifestyle"
            rows={5}
            value={form.lifestyleNotes}
            onChange={(e) => setField('lifestyleNotes', e.target.value)}
            placeholder="Daily routines, fitness, social habits, work-life balance..."
          />
        </div>
      </AccordionSection>

      <AccordionSection
        id="goals"
        title="E. Relationship Goals"
        open={openSection === 'goals'}
        onToggle={toggleSection}
      >
        <div className="form-group">
          <label htmlFor="p-goals">Relationship goals</label>
          <textarea
            id="p-goals"
            rows={5}
            value={form.relationshipGoals}
            onChange={(e) => setField('relationshipGoals', e.target.value)}
            placeholder="Marriage timeline, relationship type, shared values..."
          />
        </div>
      </AccordionSection>

      <AccordionSection
        id="firstDate"
        title="F. First Date"
        open={openSection === 'firstDate'}
        onToggle={toggleSection}
      >
        <div className="form-group">
          <label htmlFor="p-first-date">First date preferences</label>
          <textarea
            id="p-first-date"
            rows={5}
            value={form.firstDatePrefs}
            onChange={(e) => setField('firstDatePrefs', e.target.value)}
            placeholder="Coffee, walk in the park, dinner — what feels comfortable?"
          />
        </div>
      </AccordionSection>

      <AccordionSection
        id="partner"
        title="G. Ideal Partner"
        open={openSection === 'partner'}
        onToggle={toggleSection}
      >
        <div className="form-group">
          <label htmlFor="p-partner">Ideal partner</label>
          <textarea
            id="p-partner"
            rows={5}
            value={form.idealPartner}
            onChange={(e) => setField('idealPartner', e.target.value)}
            placeholder="Qualities, values, and lifestyle preferences you hope to share."
          />
        </div>
      </AccordionSection>

      <AccordionSection
        id="family"
        title="H. Extended Family"
        open={openSection === 'family'}
        onToggle={toggleSection}
      >
        <div className="form-group">
          <label htmlFor="p-family">Extended family expectations</label>
          <textarea
            id="p-family"
            rows={5}
            value={form.extendedFamily}
            onChange={(e) => setField('extendedFamily', e.target.value)}
            placeholder="Family involvement, traditions, boundaries you value..."
          />
        </div>
      </AccordionSection>
    </OnboardingShell>
  )
}
