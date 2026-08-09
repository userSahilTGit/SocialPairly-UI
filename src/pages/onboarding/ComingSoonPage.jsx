import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Construction } from 'lucide-react'

const LABELS = {
  personality: {
    title: 'Personality & Goals',
    blurb: 'Personality is available now — opening that step.',
    redirect: '/onboarding/personality',
  },
  faith: {
    title: 'Religion & Culture',
    blurb: 'Faith preferences are available now — opening that step.',
    redirect: '/onboarding/faith',
  },
}

export default function ComingSoonPage() {
  const navigate = useNavigate()
  const { stepId } = useParams()
  const meta = LABELS[stepId] || {
    title: 'Coming soon',
    blurb: 'This part of registration is not available yet.',
  }

  useEffect(() => {
    if (meta.redirect) {
      navigate(meta.redirect, { replace: true })
    }
  }, [meta.redirect, navigate])

  return (
    <div className="ob-state-screen">
      <div className="ob-state-card" style={{ maxWidth: 440, textAlign: 'center' }}>
        <Construction size={36} color="#6949ed" aria-hidden="true" />
        <h2 style={{ marginTop: 16 }}>{meta.title}</h2>
        <p>{meta.blurb}</p>
        <p className="ob-hint">We will notify you when this step is ready.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          <button type="button" className="btn ob-secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
          <button
            type="button"
            className="btn auth-primary-btn"
            onClick={() => navigate(meta.redirect || '/onboarding/identity')}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
