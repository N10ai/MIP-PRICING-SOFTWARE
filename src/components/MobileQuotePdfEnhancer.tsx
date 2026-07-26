import { useEffect } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const LOGO_URL = 'https://static.wixstatic.com/media/b572e1_fbf841487b044ed39fc0bcfaeb17f41d~mv2.png/v1/fill/w_246,h_164,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/IMG_2032.png'

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

async function imageData(url: string) {
  try {
    const response = await fetch(url, { mode: 'cors' })
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function buildPdf(app: HTMLElement) {
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
  const margin = 46
  const blue: [number, number, number] = [47, 106, 229]
  const navy: [number, number, number] = [17, 24, 39]
  const gray: [number, number, number] = [103, 112, 128]
  const line: [number, number, number] = [220, 224, 230]
  const soft: [number, number, number] = [247, 248, 250]
  const logo = await imageData(LOGO_URL)

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
    doc.text(`${quoteNumber}  -  Page ${page}`, pageWidth - margin, pageHeight - 25, { align: 'right' })
  }

  const sectionTitle = (label: string, y: number, x = margin) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...blue)
    doc.text(pdfSafe(label).toUpperCase(), x, y)
  }

  doc.setFillColor(...navy)
  doc.rect(0, 0, pageWidth, 104, 'F')

  const logoCx = margin + 30
  const logoCy = 52
  doc.setFillColor(255, 255, 255)
  doc.circle(logoCx, logoCy, 29, 'F')
  doc.setDrawColor(216, 224, 236)
  doc.setLineWidth(0.8)
  doc.circle(logoCx, logoCy, 29)
  if (logo) doc.addImage(logo, 'PNG', logoCx - 23, logoCy - 18, 46, 36, undefined, 'FAST')

  const titleX = margin + 78
  doc.setDrawColor(...blue)
  doc.setLineWidth(1.2)
  doc.line(titleX - 14, 24, titleX - 14, 76)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.text('QUOTE', titleX, 49)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(200, 208, 222)
  doc.text('MIP Cargo Express', titleX, 67)

  const metaX = pageWidth - 206
  const metaValueX = pageWidth - margin
  ;[
    ['Quote Number', quoteNumber],
    ['Status', status.toUpperCase()],
    ['Issued', issued],
    ['Valid Until', validity],
    ['Currency', currency],
  ].forEach((item, index) => {
    const rowY = 25 + index * 14
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(220, 225, 235)
    doc.text(item[0], metaX, rowY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(index < 2 ? blue[0] : 255, index < 2 ? blue[1] : 255, index < 2 ? blue[2] : 255)
    doc.text(item[1], metaValueX, rowY, { align: 'right' })
  })

  let y = 132
  const rightX = 306
  sectionTitle('Prepared for', y, margin)
  sectionTitle('Shipment summary', y, rightX)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...navy)
  doc.text(customer, margin, y + 23)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  if (customerEmail) doc.text(customerEmail, margin, y + 40)
  if (customerReference) doc.text(`Reference: ${customerReference}`, margin, y + 57)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...navy)
  doc.text(route, rightX, y + 24)
  serviceItems.slice(0, 4).forEach((item, index) => {
    const column = index % 2
    const row = Math.floor(index / 2)
    const x = rightX + column * 126
    const itemY = y + 55 + row * 40
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.text(item.label.toUpperCase(), x, itemY - 5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...navy)
    doc.text(doc.splitTextToSize(item.value, 110), x, itemY + 8)
  })

  y = 246
  doc.setDrawColor(...line)
  doc.line(margin, y - 12, pageWidth - margin, y - 12)
  sectionTitle('Cargo summary', y)
  const boxWidth = (pageWidth - margin * 2) / Math.max(cargoItems.length, 1)
  cargoItems.forEach((item, index) => {
    const x = margin + index * boxWidth
    doc.setFillColor(...soft)
    doc.setDrawColor(...line)
    doc.rect(x, y + 14, boxWidth, 54, 'FD')
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
    head: [['Description', 'Basis', 'Qty', 'Unit rate', `Amount (${currency})`]],
    body: rows.length ? rows : [['No charges added', '', '', '', '']],
    margin: { left: margin, right: margin, bottom: 62 },
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.5, textColor: navy, cellPadding: 7, lineColor: line, lineWidth: { bottom: 0.45 } },
    headStyles: { fontStyle: 'bold', fontSize: 7.5, textColor: gray, fillColor: soft, lineColor: line, lineWidth: { top: 0.8, bottom: 0.8 } },
    columnStyles: { 0: { cellWidth: 190 }, 1: { cellWidth: 85 }, 2: { halign: 'right', cellWidth: 55 }, 3: { halign: 'right', cellWidth: 82 }, 4: { halign: 'right', cellWidth: 90, fontStyle: 'bold' } },
    didDrawPage: footer,
  })

  const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 160
  y = tableEnd + 25
  if (y > pageHeight - 200) {
    doc.addPage()
    y = 58
  }

  doc.setFillColor(...soft)
  doc.roundedRect(pageWidth - margin - 214, y, 214, 72, 4, 4, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...gray)
  doc.text('TOTAL FREIGHT CHARGES', pageWidth - margin - 198, y + 21)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...navy)
  doc.text(currency, pageWidth - margin - 16, y + 21, { align: 'right' })
  doc.setFontSize(22)
  doc.text(total, pageWidth - margin - 16, y + 52, { align: 'right' })

  y += 98
  sectionTitle('Commercial details', y)
  commercialItems.forEach((item, index) => {
    const x = margin + index * 172
    if (index > 0) {
      doc.setDrawColor(...line)
      doc.line(x - 12, y + 10, x - 12, y + 46)
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.text(item.label.toUpperCase(), x, y + 21)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...navy)
    doc.text(doc.splitTextToSize(item.value, 150), x, y + 37)
  })

  y += 68
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
  const filename = `${quoteNumber.replace(/[^a-z0-9_-]+/gi, '-') || 'quote'}.pdf`
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
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
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.mobile-quote-menu button')
      if (!button || !/create pdf/i.test(button.textContent || '')) return
      const app = button.closest<HTMLElement>('.mobile-quote-app')
      if (!app) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      const original = button.textContent || 'Create PDF'
      button.disabled = true
      button.textContent = 'Generating PDF...'
      void buildPdf(app).catch(error => {
        console.error(error)
        window.alert(error instanceof Error ? error.message : 'Unable to generate PDF.')
      }).finally(() => {
        button.disabled = false
        button.textContent = original
      })
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [])
  return null
}
