import { describe, it, expect, vi, beforeEach } from 'vitest'

const save = vi.fn()
const addImage = vi.fn()
const html2canvas = vi.fn()

vi.mock('html2canvas', () => ({
  default: (...args) => html2canvas(...args),
}))

vi.mock('jspdf', () => ({
  jsPDF: class {
    constructor() {
      this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } }
    }
    addImage(...args) { addImage(...args) }
    save(...args) { save(...args) }
  },
}))

describe('downloadReceiptPdf', () => {
  beforeEach(() => {
    save.mockReset()
    addImage.mockReset()
    html2canvas.mockReset()
  })

  it('throws when element is missing', async () => {
    const { downloadReceiptPdf } = await import('@/utils/downloadReceiptPdf')
    await expect(downloadReceiptPdf(null)).rejects.toThrow('Receipt element is not available')
  })

  it('fits a tall canvas onto the page and saves', async () => {
    html2canvas.mockResolvedValue({
      width: 100,
      height: 4000,
      toDataURL: () => 'data:image/png;base64,xx',
    })
    const { downloadReceiptPdf } = await import('@/utils/downloadReceiptPdf')
    await downloadReceiptPdf(document.createElement('div'), 'custom.pdf')
    expect(addImage).toHaveBeenCalled()
    expect(save).toHaveBeenCalledWith('custom.pdf')
    const renderHeight = addImage.mock.calls[0][5]
    expect(renderHeight).toBeLessThanOrEqual(297 - 20)
  })

  it('uses default filename and full width when short', async () => {
    html2canvas.mockResolvedValue({
      width: 1000,
      height: 200,
      toDataURL: () => 'data:image/png;base64,xx',
    })
    const { downloadReceiptPdf } = await import('@/utils/downloadReceiptPdf')
    await downloadReceiptPdf(document.createElement('div'))
    expect(save).toHaveBeenCalledWith('receipt.pdf')
  })
})
