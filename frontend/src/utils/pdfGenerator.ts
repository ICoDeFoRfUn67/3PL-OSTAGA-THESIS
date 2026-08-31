/**
 * High-performance PDF generator for Payslips and DOM Elements.
 * Uses standalone dynamic script loader to prevent Vite dev cache 504 issues.
 */

export const exportElementToPdf = async (element: HTMLElement, filename: string): Promise<void> => {
  if (!element) return;

  // 1. Ensure html2canvas is loaded
  let html2canvasFn: any = (window as any).html2canvas;
  if (!html2canvasFn) {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src*="html2canvas"]');
      if (existing) {
        existing.addEventListener('load', () => {
          html2canvasFn = (window as any).html2canvas;
          resolve();
        });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.onload = () => {
        html2canvasFn = (window as any).html2canvas;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load html2canvas'));
      document.head.appendChild(script);
    });
  }

  // 2. Ensure jsPDF is loaded
  let jsPDFFn: any = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
  if (!jsPDFFn) {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src*="jspdf"]');
      if (existing) {
        existing.addEventListener('load', () => {
          jsPDFFn = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
          resolve();
        });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        jsPDFFn = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load jsPDF'));
      document.head.appendChild(script);
    });
  }

  // 3. Render Canvas
  const canvas = await html2canvasFn(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgData = canvas.toDataURL('image/png');

  // 4. Generate A4 PDF
  const pdf = new jsPDFFn({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;

  const contentWidth = pageWidth - margin * 2;
  const imgHeightMm = (canvas.height * contentWidth) / canvas.width;

  if (imgHeightMm <= pageHeight - margin * 2) {
    pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeightMm);
  } else {
    // Multi-page slicing
    const pageContentHeightPx = ((pageHeight - margin * 2) / contentWidth) * canvas.width;
    let yOffset = 0;
    let pageNum = 0;

    while (yOffset < canvas.height) {
      const sliceHeight = Math.min(pageContentHeightPx, canvas.height - yOffset);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeight;
      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, -yOffset);
      }
      const sliceData = sliceCanvas.toDataURL('image/png');
      const sliceHeightMm = (sliceHeight * contentWidth) / canvas.width;

      if (pageNum > 0) pdf.addPage();
      pdf.addImage(sliceData, 'PNG', margin, margin, contentWidth, sliceHeightMm);
      yOffset += sliceHeight;
      pageNum++;
    }
  }

  pdf.save(filename);
};
