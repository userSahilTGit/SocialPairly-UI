import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BrandMark, AuthCoupleScene, GoogleGlyph, AppleGlyph } from '@/components/AuthBrandAssets'

describe('AuthBrandAssets', () => {
  it('renders brand mark, scene, and glyphs', () => {
    const { container } = render(
      <>
        <BrandMark size={48} className="x" />
        <AuthCoupleScene className="y" />
        <GoogleGlyph size={16} />
        <AppleGlyph size={16} />
      </>,
    )
    expect(container.querySelector('.auth-brand-logo')).toBeTruthy()
    expect(container.querySelector('.auth-couple-scene')).toBeTruthy()
    expect(container.querySelectorAll('svg')).toHaveLength(2)
  })
})
