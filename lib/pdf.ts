// Generate a PDF from a DOM node and hand it to the user. Rasterizes the node
// with html-to-image, which paints via an SVG <foreignObject> so the browser's
// own layout engine renders the text — Bengali conjuncts shape correctly
// (html2canvas draws text piecemeal and breaks complex-script shaping). The
// image is embedded in a jsPDF page; PDF text engines mangle complex scripts,
// so a raster image is the reliable route. Libs are dynamically imported to
// stay out of the initial bundle.
//
// Delivery: iOS installed PWA opens the share sheet (it can't download a blob);
// everywhere else does a direct file download.

export async function exportNodeToPdf(node: HTMLElement, filename: string, shareTitle: string): Promise<void> {
  const [{ toCanvas }, jspdf] = await Promise.all([
    import('html-to-image'),
    import('jspdf'),
  ])
  const JsPDF = jspdf.jsPDF

  const canvas = await toCanvas(node, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    cacheBust: true,
  })

  const pdf = new JsPDF({ unit: 'pt', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 24
  const contentW = pageW - margin * 2
  const contentH = pageH - margin * 2

  const fullImgH = (canvas.height / canvas.width) * contentW

  if (fullImgH <= contentH) {
    // Fits on one page.
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, contentW, fullImgH)
  } else {
    // Taller than a page → slice the source canvas into page-height strips.
    const pxPerPt = canvas.width / contentW
    const pageContentPx = Math.floor(contentH * pxPerPt)
    let srcY = 0
    let first = true
    while (srcY < canvas.height) {
      const sliceH = Math.min(pageContentPx, canvas.height - srcY)
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = sliceH
      const ctx = slice.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, slice.width, slice.height)
        ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
      }
      if (!first) pdf.addPage()
      pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, margin, contentW, sliceH / pxPerPt)
      srcY += sliceH
      first = false
    }
  }

  const blob = pdf.output('blob')
  await deliver(blob, filename, shareTitle)
}

// iOS installed PWA can't reliably download a blob (no Save dialog, <a download>
// is ignored) — the share sheet ("Save to Files") is the only way out there.
// Everywhere else (desktop, Android, iOS Safari tab) a direct download is what
// the user expects, so we do NOT hijack it with the share sheet.
function isIosStandalone(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOS = /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints ? navigator.maxTouchPoints > 1 : false)
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches)
  return iOS && standalone
}

async function deliver(blob: Blob, filename: string, title: string): Promise<void> {
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean
    share?: (data?: ShareData) => Promise<void>
  }
  const file = new File([blob], filename, { type: 'application/pdf' })

  // Only route through the share sheet on iOS installed PWA, where downloading
  // isn't possible. Elsewhere fall straight through to a real file download.
  if (isIosStandalone() && nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title })
      return
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      // Any other share failure → fall through to download.
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
