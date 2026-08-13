import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import GlassCard from '@/components/GlassCard'

describe('GlassCard', () => {
  it('renders children with default and extra classes', () => {
    render(<GlassCard className="extra">Hello</GlassCard>)
    const el = screen.getByText('Hello')
    expect(el).toHaveClass('glass-panel', 'extra')
  })
})
