import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AuthHeroPanel from '@/components/AuthHeroPanel'

describe('AuthHeroPanel', () => {
  it('renders headline and benefits without learn more when no handler', () => {
    render(<AuthHeroPanel />)
    expect(screen.getByText(/Where real values/i)).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /learn more/i })).not.toBeInTheDocument()
  })

  it('calls privacy handler from Learn More', () => {
    const onPrivacyClick = vi.fn()
    render(<AuthHeroPanel onPrivacyClick={onPrivacyClick} />)
    fireEvent.click(screen.getByRole('button', { name: /learn more/i }))
    expect(onPrivacyClick).toHaveBeenCalled()
  })
})
