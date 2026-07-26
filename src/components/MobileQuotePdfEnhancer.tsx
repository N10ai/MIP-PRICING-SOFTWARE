import { useEffect } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const text = (root: ParentNode, selector: string, fallback = '') =>
  root.querySelector<HTMLElement>(selector)?.textContent?.trim() || fallback

const pdfSafe = (value = '') => value
  .replace(/[→➜➝➞⟶]/g, ' to ')
  .replace(/[•·]/g, ' - ')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/[–—]/g, '-')
  .replace(/…/g, '...')
  .replace(/[^\x20-\x7E\n]/g, '')
  .replace(/\s+/g, ' ')
  .trim()

function buildPdf(app: HTMLElement) {
  const preview = app.querySelector<HTMLElement>('.professional-quote-document')
  if (!preview) throw new Error('Quote preview is not available yet.')

  const quoteNumber = pdfSafe(text(preview, '.proposal-meta strong', 'Quote'))
  const customer = pdfSafe(text(preview, '.proposal-customer-grid .proposal-block:first-child h3', 'Customer'))
  const customerEmail = pdfSafe(text(preview, '.proposal-customer-grid .proposal-block:first-child > p'))
  const customerReference = pdfSafe(text(preview, '.proposal-reference p'))
  const route = pdfSafe(text(preview, '.proposal-route', 'Origin to Destination'))
  const currency = pdfSafe(text(preview, '.proposal-meta-grid span:nth-child(3) b', 'USD'))
  const status = pdfSafe(text(preview, '.proposal-status', 'Draft'))
  const issued = pdfSafe(text(preview, '.proposal-meta-grid span:nth-child(1) b', 'To be confirmed'))
  const validity = pdfSafe(text(preview, '.proposal-meta-grid span:nth-child(2) b', 'To be confirmed'))

  const serviceItems = Array.from(preview.querySelectorAll<HTMLElement>('.proposal-service-grid span')).map(item => ({
    label: pdfSafe(text(item, 'small')),
    value: pdfSafe(text(item, 'b', 'To be confirmed')),
  }))
  const cargoItems = Array.from(preview.querySelectorAll<HTMLElement>('.proposal-cargo-grid span')).map(item => ({
    label: pdfSafe(text(item, 'small')),
    value: pdfSafe(text(item, 'b')),
  }))
  const commercialItems = Array.from(preview.querySelectorAll<HTMLElement>('.proposal-commercial-grid span')).map(item => ({
    label: pdfSafe(text(item, 'small')),
    value: pdfSafe(text(item, 'b', 'To be confirmed')),
  }))

  const rows = Array.from(preview.querySelectorAll<HTMLTableRowElement>('.proposal-pricing-table tbody tr')).map(row => {
    const cells = Array.from(row.querySelectorAll<HTMLElement>('td')).map(cell => pdfSafe(cell.textContent?.trim() || ''))
    return [cells[0] || '', cells[1] || '', cells[2] || '', cells[3] || '', cells[4] || '']
  })

  const total = pdfSafe(text(preview, '.proposal-total-box strong', `${currency} 0.00`))
  const copyBlocks = Array.from(preview.querySelectorAll<HTMLElement>('.proposal-copy')).map(node => pdfSafe(node.textContent?.trim() || '')).filter(Boolean)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 42
  const blue: [number, number, number] = [47, 106, 229]
  const navy: [number, number, number] = [17, 24, 39]
  const gray: [number, number, number] = [101, 112, 133]
  const line: [number, number, number] = [221, 226, 234]
  const soft: [number, number, number] = [247, 249, 252]

  const footer = () => {
    const page = doc.getCurrentPageInfo().pageNumber
    doc.setDrawColor(...blue)
    doc.setLineWidth(0.8)
    doc.line(0, pageHeight - 54, pageWidth, pageHeight - 54)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...blue)
    doc.text('MIP Cargo Express', margin, pageHeight - 31)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...gray)
    doc.text('Managed, Integrated & Precise', margin, pageHeight - 18)
    doc.text('sales@mipcargo.com  |  www.mipcargo.com', pageWidth / 2, pageHeight - 25, { align: 'center' })
    doc.text(`${quoteNumber}  |  Page ${page}`, pageWidth - margin, pageHeight - 25, { align: 'right' })
  }

  const sectionTitle = (label: string, y: number, x = margin) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...blue)
    doc.text(pdfSafe(label).toUpperCase(), x, y)
  }

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
  doc.setFillColor(...blue)
  doc.rect(0, 0, pageWidth, 4, 'F')

  // Subtle professional logo treatment.
  doc.setDrawColor(202, 211, 224)
  doc.setLineWidth(1)
  doc.circle(margin + 27, 55, 25)
  doc.setFillColor(235, 247, 255)
  doc.circle(margin + 27, 55, 20, 'F')
  doc.setFillColor(45, 169, 232)
  doc.roundedRect(margin + 16, 46, 22, 16, 3, 3, 'F')
  doc.setFillColor(...navy)
  doc.rect(margin + 12, 60, 30, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...navy)
  doc.setFontSize(13)
  doc.text('MIP', margin + 27, 58, { align: 'center' })

  doc.setDrawColor(...line)
  doc.line(margin + 62, 28, margin + 62, 82)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...navy)
  doc.setFontSize(25)
  doc.text('QUOTE', margin + 78, 47)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.7)
  doc.setTextColor(...gray)
  doc.text('Responsive freight solutions with transparent pricing and dedicated support.', margin + 78, 66)

  const metaX = pageWidth - 214
  const metaValueX = pageWidth - margin
  const metaRows = [
    ['Quote Number', quoteNumber],
    ['Status', status.toUpperCase()],
    ['Issued', issued],
    ['Valid Until', validity],
    ['Currency', currency],
  ]
  metaRows.forEach((item, index) => {
    const rowY = 28 + index * 14
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...navy)
    doc.text(item[0], metaX, rowY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(index < 2 ? blue[0] : navy[0], index < 2 ? blue[1] : navy[1], index < 2 ? blue[2] : navy[2])
    doc.text(item[1], metaValueX, rowY, { align: 'right' })
  })

  doc.setDrawColor(...line)
  doc.line(margin, 98, pageWidth - margin, 98)

  let y = 126
  const rightX = 286
  sectionTitle('Prepared for', y, margin)
  sectionTitle('Shipment summary', y, rightX)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...navy)
  doc.text(customer, margin, y + 22)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  if (customerEmail) doc.text(customerEmail, margin, y + 39)
  if (customerReference) {
    doc.setDrawColor(...line)
    doc.line(margin, y + 56, 232, y + 56)
    sectionTitle('Customer reference', y + 78, margin)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...navy)
    doc.text(customerReference, margin, y + 98)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...navy)
  doc.text(route, rightX, y + 27)
  serviceItems.slice(0, 4).forEach((item, index) => {
    const column = index % 2
    const row = Math.floor(index / 2)
    const x = rightX + column * 128
    const itemY = y + 55 + row * 40
    doc.setDrawColor(156, 188, 255)
    doc.circle(x + 12, itemY - 4, 11)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...blue)
    doc.text(String(index + 1), x + 12, itemY - 1.5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.text(item.label.toUpperCase(), x + 30, itemY - 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...navy)
    doc.text(doc.splitTextToSize(item.value, 91), x + 30, itemY + 7)
  })

  y = 264
  sectionTitle('Cargo summary', y)
  const boxWidth = (pageWidth - margin * 2) / Math.max(cargoItems.length, 1)
  cargoItems.forEach((item, index) => {
    const x = margin + index * boxWidth
    doc.setFillColor(...soft)
    doc.setDrawColor(...line)
    doc.roundedRect(x, y + 12, boxWidth, 60, 3, 3, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.text(item.label.toUpperCase(), x + 12, y + 35)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...navy)
    doc.text(item.value, x + 12, y + 55)
  })

  sectionTitle('Freight charges', y + 96)
  autoTable(doc, {
    startY: y + 108,
    head: [['Description', 'Basis', 'Qty', 'Unit rate', `Amount (${currency})`]],
    body: rows.length ? rows : [['No charges added', '', '', '', '']],
    margin: { left: margin, right: margin, bottom: 72 },
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.5, textColor: navy, cellPadding: 7, lineColor: line, lineWidth: { bottom: 0.45 } },
    headStyles: { fontStyle: 'bold', fontSize: 7.5, textColor: navy, fillColor: soft, lineColor: line, lineWidth: { top: 0.7, bottom: 0.7 } },
    columnStyles: { 0: { cellWidth: 188 }, 1: { cellWidth: 88 }, 2: { halign: 'right', cellWidth: 52 }, 3: { halign: 'right', cellWidth: 78 }, 4: { halign: 'right', cellWidth: 92, fontStyle: 'bold' } },
    didDrawPage: footer,
  })

  const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 164
  y = tableEnd + 20
  if (y > pageHeight - 210) {
    doc.addPage()
    y = 52
  }

  doc.setFillColor(...soft)
  doc.setDrawColor(...line)
  doc.roundedRect(pageWidth - margin - 220, y, 220, 74, 5, 5, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...blue)
  doc.text('TOTAL FREIGHT CHARGES', pageWidth - margin - 204, y + 22)
  doc.text(currency, pageWidth - margin - 16, y + 22, { align: 'right' })
  doc.setDrawColor(...blue)
  doc.line(pageWidth - margin - 204, y + 31, pageWidth - margin - 16, y + 31)
  doc.setFontSize(22)
  doc.setTextColor(...navy)
  doc.text(total, pageWidth - margin - 16, y + 59, { align: 'right' })

  y += 102
  sectionTitle('Commercial details', y)
  commercialItems.forEach((item, index) => {
    const x = margin + index * 172
    doc.setDrawColor(...line)
    if (index > 0) doc.line(x - 12, y + 10, x - 12, y + 48)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.text(item.label.toUpperCase(), x, y + 18)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...navy)
    doc.text(doc.splitTextToSize(item.value, 150), x, y + 34)
  })

  y += 68
  copyBlocks.forEach((block, index) => {
    const title = index === 0 ? 'Notes' : 'Terms & conditions'
    const lines = doc.splitTextToSize(block, pageWidth - margin * 2)
    const needed = 29 + lines.length * 11
    if (y + needed > pageHeight - 70) {
      footer()
      doc.addPage()
      y = 52
    }
    sectionTitle(title, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.4)
    doc.setTextColor(...gray)
    doc.text(lines, margin, y + 18)
    y += needed
  })

  footer()
  const filename = `${quoteNumber.replace(/[^a-z0-9_-]+/gi, '-') || 'quote'}.pdf`
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIOS) {
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(url), 60000)
  } else {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10000)
  }
}

export function MobileQuotePdfEnhancer() {
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const button = target.closest<HTMLButtonElement>('.mobile-quote-menu button')
      if (!button || !/create pdf/i.test(button.textContent || '')) return
      const app = button.closest<HTMLElement>('.mobile-quote-app')
      if (!app) return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      const original = button.textContent || 'Create PDF'
      button.disabled = true
      button.textContent = 'Generating PDF...'
      window.setTimeout(() => {
        try {
          buildPdf(app)
        } catch (error) {
          console.error(error)
          window.alert(error instanceof Error ? error.message : 'Unable to generate PDF.')
        } finally {
          button.disabled = false
          button.textContent = original
        }
      }, 0)
    }

    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [])

  return null
}
