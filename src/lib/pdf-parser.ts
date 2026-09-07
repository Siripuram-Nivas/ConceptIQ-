import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface PdfParseResult {
  title: string;
  totalPages: number;
  extractedText: string;
}

export async function parsePdf(file: File): Promise<PdfParseResult> {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;

  const totalPages = pdfDocument.numPages;
  let totalCharacters = 0;
  const pageChunks: string[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Join all text items with spaces, avoiding excessive spaces if possible
    let joinedPageText = '';
    for (let i = 0; i < textContent.items.length; i++) {
      const item = textContent.items[i] as any;
      joinedPageText += item.str + (item.hasEOL ? '\n' : ' ');
    }
    
    joinedPageText = joinedPageText.trim();
    totalCharacters += joinedPageText.length;

    // Use canonical formatting for the AI pipeline to easily identify pages
    const pageString = `--- PAGE ${pageNum} ---\n${joinedPageText}\n`;
    pageChunks.push(pageString);
  }

  const formattedText = pageChunks.join('\n');

  if (totalCharacters < 20) {
    throw new Error('No selectable text found. This may be a scanned image or a corrupted PDF. OCR is not currently supported.');
  }

  return {
    title: file.name.replace(/\.[^/.]+$/, ''),
    totalPages,
    extractedText: formattedText,
  };
}
