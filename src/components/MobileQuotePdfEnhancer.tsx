import { useEffect } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const text = (root: ParentNode, selector: string, fallback = '') =>
  root.querySelector<HTMLElement>(selector)?.textContent?.trim() || fallback

const cleanMoney = (value: string) => value.replace(/[^0-9.,-]/g, '')

function buildPdf(app: HTMLElement) {
  const preview = app.querySelector<HTMLElement>('.professional-quote-document')
  if (!preview) throw new Error('Quote preview is not available yet.')

  const quoteNumber = text(preview, '.proposal-meta strong', 'Freight quotation')
  const customer = text(preview, '.proposal-customer-grid .proposal-block:first-child h3', 'Customer')
  const customerEmail = text(preview, '.proposal-customer-grid .proposal-block:first-child > p')
  const customerReference = text(preview, '.proposal-reference p')
  const route = text(preview, '.proposal-route', 'Origin → Destination')
  const currency = text(preview, '.proposal-meta-grid span:nth-child(3) b', 'USD')
  const status = text(preview, '.proposal-status', 'Draft')
  const issued = text(preview, '.proposal-meta-grid span:nth-child(1) b', 'To be confirmed')
  const validity = text(preview, '.proposal-meta-grid span:nth-child(2) b', 'To be confirmed')

  const serviceItems = Array.from(preview.querySelectorAll<HTMLElement>('.proposal-service-grid span')).map(item => ({
    label: text(item, 'small'),
    value: text(item, 'b', 'To be confirmed'),
  }))
  const cargoItems = Array.from(preview.querySelectorAll<HTMLElement>('.proposal-cargo-grid span')).map(item => ({
    label: text(item, 'small'),
    value: text(item, 'b'),
  }))
  const commercialItems = Array.from(preview.querySelectorAll<HTMLElement>('.proposal-commercial-grid span')).map(item => ({
    label: text(item, 'small'),
    value: text(item, 'b', 'To be confirmed'),
  }))

  const rows = Array.from(preview.querySelectorAll<HTMLTableRowElement>('.proposal-pricing-table tbody tr')).map(row => {
    const cells = Array.from(row.querySelectorAll<HTMLElement>('td')).map(cell => cell.textContent?.trim() || '')
    return [cells[0] || '', cells[1] || '', cells[2] || '', cells[3] || '', cells[4] || '']
  })

  const total = text(preview, '.proposal-total-box strong', `${currency} 0.00`)
  const copyBlocks = Array.from(preview.querySelectorAll<HTMLElement>('.proposal-copy')).map(node => node.textContent?.trim() || '').filter(Boolean)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 46
  const blue: [number, number, number] = [48, 102, 225]
  const navy: [number, number, number] = [17, 24, 39]
  const gray: [number, number, number] = [103, 112, 128]
  const line: [number, number, number] = [220, 224, 230]

  const footer = () => {
    const page = doc.getCurrentPageInfo().pageNumber
    doc.setDrawColor(...line)
    doc.line(margin, pageHeight - 42, pageWidth - margin, pageHeight - 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...navy)
    doc.text('MIP Cargo Express', margin, pageHeight - 25)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gray)
    doc.text(`${quoteNumber}  ·  Page ${page}`, pageWidth - margin, pageHeight - 25, { align: 'right' })
  }

  const sectionTitle = (label: string, y: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...blue)
    doc.text(label.toUpperCase(), margin, y)
  }

  doc.setFillColor(...navy)
  doc.rect(0, 0, pageWidth, 116, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.text('MIP CARGO EXPRESS', margin, 39)
  doc.setFontSize(27)
  doc.text('Freight quotation', margin, 72)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(205, 213, 226)
  doc.text('Responsive freight solutions with transparent pricing and dedicated support.', margin, 92)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text(status.toUpperCase(), pageWidth - margin, 34, { align: 'right' })
  doc.setFontSize(8)
  doc.setTextColor(163, 190, 255)
  doc.text('QUOTE NUMBER', pageWidth - margin, 55, { align: 'right' })
  doc.setFontSize(15)
  doc.setTextColor(255, 255, 255)
  doc.text(quoteNumber, pageWidth - margin, 76, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(205, 213, 226)
  doc.text(`Issued ${issued}  ·  Valid ${validity}  ·  ${currency}`, pageWidth - margin, 94, { align: 'right' })

  let y = 146
  sectionTitle('Prepared for', y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...navy)
  doc.text(customer, margin, y + 23)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  if (customerEmail) doc.text(customerEmail, margin, y + 39)
  if (customerReference) doc.text(`Reference: ${customerReference}`, margin, y + 55)

  const rightX = 326
  sectionTitle('Shipment summary', y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...navy)
  doc.text(route, rightX, y + 23)
  serviceItems.slice(0, 4).forEach((item, index) => {
    const column = index % 2
    const row = Math.floor(index / 2)
    const x = rightX + column * 118
    const itemY = y + 47 + row * 31
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.text(item.label.toUpperCase(), x, itemY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...navy)
    doc.text(doc.splitTextToSize(item.value, 104), x, itemY + 12)
  })

  y = 244
  doc.setDrawColor(...line)
  doc.line(margin, y - 12, pageWidth - margin, y - 12)
  sectionTitle('Cargo summary', y)
  const boxWidth = (pageWidth - margin * 2) / Math.max(cargoItems.length, 1)
  cargoItems.forEach((item, index) => {
    const x = margin + index * boxWidth
    doc.setDrawColor(...line)
    doc.rect(x, y + 14, boxWidth, 54)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.text(item.label.toUpperCase(), x + 10, y + 31)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...navy)
    doc.text(item.value, x + 10, y + 51)
  })

  sectionTitle('Freight charges', y + 92)
  autoTable(doc, {
    startY: y + 105,
    head: [['Description', 'Basis', 'Qty', 'Unit rate', 'Amount']],
    body: rows.length ? rows : [['No charges added', '', '', '', '']],
    margin: { left: margin, right: margin, bottom: 62 },
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.5, textColor: navy, cellPadding: 7, lineColor: line, lineWidth: { bottom: 0.45 } },
    headStyles: { fontStyle: 'bold', fontSize: 7.5, textColor: gray, fillColor: [247, 248, 250], lineColor: line, lineWidth: { top: 0.8, bottom: 0.8 } },
    columnStyles: { 0: { cellWidth: 190 }, 1: { cellWidth: 85 }, 2: { halign: 'right', cellWidth: 55 }, 3: { halign: 'right', cellWidth: 82 }, 4: { halign: 'right', cellWidth: 90, fontStyle: 'bold' } },
    didDrawPage: footer,
  })

  const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 160
  y = tableEnd + 25
  if (y > pageHeight - 200) {
    doc.addPage()
    y = 58
  }

  doc.setFillColor(247, 248, 250)
  doc.roundedRect(pageWidth - margin - 214, y, 214, 72, 4, 4, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...gray)
  doc.text('TOTAL FREIGHT CHARGES', pageWidth - margin - 198, y + 21)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...navy)
  doc.text(currency, pageWidth - margin - 16, y + 21, { align: 'right' })
  doc.setFontSize(22)
  doc.text(total, pageWidth - margin - 16, y + 52, { align: 'right' })

  y += 98
  sectionTitle('Commercial details', y)
  commercialItems.forEach((item, index) => {
    const x = margin + index * 172
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.text(item.label.toUpperCase(), x, y + 18)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...navy)
    doc.text(doc.splitTextToSize(item.value, 154), x, y + 33)
  })

  y += 69
  copyBlocks.forEach((block, index) => {
    const title = index === 0 ? 'Notes' : 'Terms & conditions'
    const lines = doc.splitTextToSize(block, pageWidth - margin * 2)
    const needed = 30 + lines.length * 11
    if (y + needed > pageHeight - 62) {
      footer()
      doc.addPage()
      y = 58
    }
    sectionTitle(title, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...gray)
    doc.text(lines, margin, y + 18)
    y += needed
  })

  footer()
  const filename = `${quoteNumber.replace(/[^a-z0-9_-]+/gi, '-') || 'freight-quotation'}.pdf`
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
      button.textContent = 'Generating PDF…'
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
