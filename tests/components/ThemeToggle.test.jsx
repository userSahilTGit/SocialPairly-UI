import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ThemeToggle from '@/components/ThemeToggle'

const toggleTheme = vi.fn()
const themeState = { isDark: false }

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ isDark: themeState.isDark, toggleTheme }),
}))

describe('ThemeToggle', () => {
  it('renders light-mode label and toggles', () => {
    themeState.isDark = false
    render(<ThemeToggle className="extra" />)
    const button = screen.getByRole('button', { name: /switch to dark mode/i })
    expect(button).toHaveClass('theme-toggle', 'extra')
    expect(screen.getByText('Dark')).toBeInTheDocument()
    fireEvent.click(button)
    expect(toggleTheme).toHaveBeenCalled()
  })

  it('renders dark-mode label', () => {
    themeState.isDark = true
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument()
    expect(screen.getByText('Light')).toBeInTheDocument()
  })
})
