import { render, screen } from '@testing-library/react'
import { UpgradeRequestModal } from '@/components/UpgradeModals'

const plans = [
  {
    id: 5,
    planName: 'Pro 6-Month Pass',
    amount: 210,
    durationDays: 180,
    tokensIncluded: '150000',
    description: 'Includes 40,000 connection tokens and unlimited photo/video sharing.',
  },
  {
    id: 6,
    planName: 'Ultimate Unlimited Plus',
    amount: 399.99,
    durationDays: 365,
    tokensIncluded: null,
    description: 'Unlimited connection tokens, unlimited posts, and priority support.',
  },
]

describe('UpgradeRequestModal', () => {
  it('lists each higher plan with the token count shown on the card', () => {
    render(
      <UpgradeRequestModal
        open
        onClose={() => {}}
        onSubmit={() => {}}
        plans={plans}
        loading={false}
        error=""
      />,
    )

    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual([
      'Pro 6-Month Pass — $210.00 — 180 days — 40,000 tokens',
      'Ultimate Unlimited Plus — $399.99 — 365 days — Unlimited tokens',
    ])
  })
})
