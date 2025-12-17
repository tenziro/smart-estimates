import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const createPDF = async (containerId: string): Promise<jsPDF> => {
  const container = document.getElementById(containerId);
  if (!container) throw new Error("Element not found");

  // Find all elements marked as pages
  const pages = container.querySelectorAll('.a4-page-export');
  if (pages.length === 0) throw new Error("No pages found");

  // A4 size in mm
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] as HTMLElement;
    
    // Capture the page
    const canvas = await html2canvas(page, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    // Calculate aspect ratio to fit width
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // Add new page if not the first one
    if (i > 0) pdf.addPage();

    // Add image with explicit dimensions to ensure padding is respected (the padding is inside the captured image)
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
  }
  
  return pdf;
};

export const downloadPDF = async (elementId: string, fileName: string) => {
  try {
    const pdf = await createPDF(elementId);
    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error("PDF Generation failed", error);
    throw error; // Rethrow to be handled by the UI
  }
};

export const getPDFBlob = async (elementId: string): Promise<Blob> => {
    const pdf = await createPDF(elementId);
    return pdf.output('blob');
};