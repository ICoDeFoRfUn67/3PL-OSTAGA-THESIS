/**
 * High-performance PDF generator for Payslips and DOM Elements.
 * Features:
 * - Hides elements tagged with data-pdf-hide="true" before capture
 * - Renders at full A4 width — content fills the page properly
 * - 4× scale capture for crisp, high-resolution text
 * - Splits across multiple A4 pages cleanly if content is longer than one page
 */

export const exportElementToPdf = async (element: HTMLElement, filename: string): Promise<void> => {
  if (!element) return;

  // ── 1. Load html2canvas ──────────────────────────────────────────────────────
  let html2canvasFn: any = (window as any).html2canvas;
  if (!html2canvasFn) {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src*="html2canvas"]');
      if (existing) {
        existing.addEventListener('load', () => { html2canvasFn = (window as any).html2canvas; resolve(); });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.onload = () => { html2canvasFn = (window as any).html2canvas; resolve(); };
      script.onerror = () => reject(new Error('Failed to load html2canvas'));
      document.head.appendChild(script);
    });
  }

  // ── 2. Load jsPDF ────────────────────────────────────────────────────────────
  let jsPDFFn: any = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
  if (!jsPDFFn) {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src*="jspdf"]');
      if (existing) {
        existing.addEventListener('load', () => { jsPDFFn = (window as any).jspdf?.jsPDF || (window as any).jsPDF; resolve(); });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => { jsPDFFn = (window as any).jspdf?.jsPDF || (window as any).jsPDF; resolve(); };
      script.onerror = () => reject(new Error('Failed to load jsPDF'));
      document.head.appendChild(script);
    });
  }

  // ── 3. Hide [data-pdf-hide] elements ─────────────────────────────────────────
  const hiddenElements: Array<{ el: HTMLElement; prevDisplay: string }> = [];
  element.querySelectorAll<HTMLElement>('[data-pdf-hide="true"]').forEach((el) => {
    hiddenElements.push({ el, prevDisplay: el.style.display });
    el.style.display = 'none';
  });

  // ── 4. Fix width to match A4 at 96dpi (794px) for consistent layout ──────────
  const originalWidth    = element.style.width;
  const originalMaxWidth = element.style.maxWidth;
  const originalOverflow = element.style.overflow;
  const originalMinWidth = element.style.minWidth;

  element.style.width    = '794px';
  element.style.minWidth = '794px';
  element.style.maxWidth = '794px';
  element.style.overflow = 'visible';

  // Wait for layout reflow
  await new Promise((r) => setTimeout(r, 100));

  // ── 5. Render at 4× scale for crisp, high-resolution output ──────────────────
  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvasFn(element, {
      scale: 4,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      letterRendering: true,
      windowWidth: 794,
      windowHeight: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });
  } finally {
    // Restore hidden elements and styles immediately after capture
    hiddenElements.forEach(({ el, prevDisplay }) => { el.style.display = prevDisplay; });
    element.style.width    = originalWidth;
    element.style.minWidth = originalMinWidth;
    element.style.maxWidth = originalMaxWidth;
    element.style.overflow = originalOverflow;
  }

  // ── 6. Build A4 PDF — multi-page with clean slicing ──────────────────────────
  const pdf = new jsPDFFn({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidthMm  = pdf.internal.pageSize.getWidth();   // 210 mm
  const pageHeightMm = pdf.internal.pageSize.getHeight();  // 297 mm
  const margin = 8; // mm on each side

  const contentWidthMm  = pageWidthMm  - margin * 2;  // 194 mm
  const contentHeightMm = pageHeightMm - margin * 2;  // 281 mm

  // How tall (in mm) would the full canvas be if we render it at full A4 content width?
  const totalImgHeightMm = (canvas.height / canvas.width) * contentWidthMm;

  if (totalImgHeightMm <= contentHeightMm) {
    // ── Single page: fits exactly — vertically center it ──────────────────────
    const topOffset = margin + (contentHeightMm - totalImgHeightMm) / 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, topOffset, contentWidthMm, totalImgHeightMm);
  } else {
    // ── Multi-page: slice canvas row by row ───────────────────────────────────
    // px height of canvas that corresponds to one A4 content page
    const pageContentHeightPx = Math.floor((contentHeightMm / contentWidthMm) * canvas.width);

    let yOffsetPx = 0;
    let pageNum = 0;

    while (yOffsetPx < canvas.height) {
      const sliceHeightPx = Math.min(pageContentHeightPx, canvas.height - yOffsetPx);

      // Create a slice canvas
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width  = canvas.width;
      sliceCanvas.height = sliceHeightPx;

      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        // White background for partial last slice
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(canvas, 0, -yOffsetPx);
      }

      const sliceData       = sliceCanvas.toDataURL('image/png');
      const sliceHeightMm   = (sliceHeightPx / canvas.width) * contentWidthMm;

      if (pageNum > 0) pdf.addPage();
      pdf.addImage(sliceData, 'PNG', margin, margin, contentWidthMm, sliceHeightMm);

      yOffsetPx += sliceHeightPx;
      pageNum++;
    }
  }

  pdf.save(filename);
};
