import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import ComingSoonPage from '@/pages/onboarding/ComingSoonPage'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

function renderStep(stepId) {
  return render(
    <MemoryRouter initialEntries={[`/onboarding/coming-soon/${stepId}`]}>
      <Routes>
        <Route path="/onboarding/coming-soon/:stepId" element={<ComingSoonPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ComingSoonPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
  })

  it('redirects known personality step and continues there', () => {
    renderStep('personality')
    expect(screen.getByText('Personality & Goals')).toBeInTheDocument()
    expect(navigateMock).toHaveBeenCalledWith('/onboarding/personality', { replace: true })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(navigateMock).toHaveBeenCalledWith('/onboarding/personality')
  })

  it('uses fallback copy for unknown steps and back navigates', () => {
    renderStep('unknown')
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(navigateMock).toHaveBeenCalledWith(-1)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(navigateMock).toHaveBeenCalledWith('/onboarding/identity')
  })
})
