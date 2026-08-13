import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'

function Probe() {
  const { theme, isDark, toggleTheme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="dark">{String(isDark)}</span>
      <button type="button" onClick={toggleTheme}>toggle</button>
      <button type="button" onClick={() => setTheme('dark')}>force-dark</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('throws outside provider', () => {
    expect(() => render(<Probe />)).toThrow(/useTheme must be used within ThemeProvider/)
  })

  it('reads stored theme and toggles light/dark', () => {
    localStorage.setItem('sp_theme', 'dark')
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    expect(screen.getByTestId('dark')).toHaveTextContent('true')
    fireEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    fireEvent.click(screen.getByText('force-dark'))
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('falls back to light when stored value is unknown', () => {
    localStorage.setItem('sp_theme', 'neon')
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
  })
})
