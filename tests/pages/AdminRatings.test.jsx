import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminRatings from '@/pages/AdminRatings'

vi.mock('@/components/Navbar', () => ({ default: () => <div data-testid="nav" /> }))
vi.mock('@/components/SiteFooter', () => ({ default: () => <div data-testid="footer" /> }))

const apiGet = vi.fn()
const apiPost = vi.fn()
vi.mock('@/api/axios', () => ({
  default: {
    get: (...args) => apiGet(...args),
    post: (...args) => apiPost(...args),
  },
}))

describe('AdminRatings page', () => {
  beforeEach(() => {
    apiGet.mockReset()
    apiPost.mockReset()
    apiPost.mockResolvedValue({ data: { markedRead: 1 } })
  })

  it('lists member ratings with stars and feedback for Super Admin', async () => {
    const user = userEvent.setup()
    apiGet.mockImplementation((url) => {
      if (url === '/admin/ratings/summary') {
        return Promise.resolve({
          data: {
            totalRatings: 1,
            averageStars: 5,
            countsByStars: { '5': 1, '4': 0, '3': 0, '2': 0, '1': 0 },
          },
        })
      }
      return Promise.resolve({
        data: [
          {
            id: 11,
            userName: 'Rahul Seena',
            userEmail: 'rahul@example.com',
            stars: 5,
            suggestion: 'Love the matching',
            createdAt: '2026-11-22T10:00:00',
          },
        ],
      })
    })

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AdminRatings />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Ratings' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Rahul Seena')).toBeInTheDocument()
    })
    expect(screen.getByText('rahul@example.com')).toBeInTheDocument()
    expect(screen.getByText('Love the matching')).toBeInTheDocument()
    expect(screen.getByLabelText(/5 out of 5 stars/i)).toBeInTheDocument()
    expect(apiGet).toHaveBeenCalledWith('/admin/ratings')
    expect(apiGet).toHaveBeenCalledWith('/admin/ratings/summary')
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/admin/ratings/notifications/mark-read')
    })

    await user.click(screen.getByRole('tab', { name: '4★' }))
    expect(screen.getByText(/no ratings with 4 stars/i)).toBeInTheDocument()
  })
})
