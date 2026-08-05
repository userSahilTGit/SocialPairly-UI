import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export async function downloadReceiptPdf(element, filename = 'receipt.pdf') {
  if (!element) {
    throw new Error('Receipt element is not available')
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 10
  const maxWidth = pageWidth - margin * 2
  const imgHeight = (canvas.height * maxWidth) / canvas.width

  let renderWidth = maxWidth
  let renderHeight = imgHeight

  if (renderHeight > pageHeight - margin * 2) {
    renderHeight = pageHeight - margin * 2
    renderWidth = (canvas.width * renderHeight) / canvas.height
  }

  const x = (pageWidth - renderWidth) / 2
  const y = margin

  pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight)
  pdf.save(filename)
}
