import JSZip from 'jszip';

// ============================================================
// TYPES
// ============================================================

export interface SlideElement {
  type: 'text' | 'table' | 'image' | 'chart' | 'unknown';
  text?: string;
  rows?: string[][];  // for tables
}

export interface SlideContent {
  slideNumber: number;
  title: string;
  text: string;
  elements: SlideElement[];
  hasVisualOnlyContent: boolean;
  speakerNotes?: string;
}

export interface PptxParseResult {
  slides: SlideContent[];
  totalSlides: number;
  title: string;
  warnings: string[];
}

// ============================================================
// VALIDATION
// ============================================================

export async function validatePptx(file: File): Promise<{ valid: boolean; error?: string }> {
  if (!file || file.size === 0) {
    return { valid: false, error: 'The file is empty.' };
  }

  const name = file.name || '';
  if (!name.toLowerCase().endsWith('.pptx')) {
    return { valid: false, error: 'Only .pptx files are supported. Please export your presentation as .pptx.' };
  }

  // Try to open as ZIP to rule out renamed non-PPTX files
  try {
    const zip = await JSZip.loadAsync(file);
    const hasPresentationXml = zip.file('ppt/presentation.xml') !== null;
    if (!hasPresentationXml) {
      return {
        valid: false,
        error: "That file doesn't appear to be a valid PowerPoint presentation. (Missing presentation.xml)",
      };
    }
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: "That file doesn't appear to be a valid PowerPoint presentation. It may be corrupted or renamed.",
    };
  }
}

// ============================================================
// SLIDE ORDER — resolved from relationships
// ============================================================

async function resolveSlideOrder(zip: JSZip): Promise<string[]> {
  // Read presentation.xml.rels to find the ordered slide list
  const relsFile = zip.file('ppt/_rels/presentation.xml.rels');
  if (!relsFile) {
    // Fallback: sort numerically by filename
    return fallbackSlideOrder(zip);
  }

  const relsXml = await relsFile.async('text');
  const parser = new DOMParser();
  const relsDoc = parser.parseFromString(relsXml, 'application/xml');

  // Build a map: rId → target path
  const relMap: Record<string, string> = {};
  const relationships = relsDoc.querySelectorAll('Relationship');
  relationships.forEach((rel) => {
    const type = rel.getAttribute('Type') || '';
    const id = rel.getAttribute('Id') || '';
    const target = rel.getAttribute('Target') || '';
    if (type.endsWith('/slide') && id && target) {
      relMap[id] = target.startsWith('/ppt/') ? target.slice(1) : `ppt/${target}`;
    }
  });

  // Read presentation.xml sldIdLst for ordered rId references
  const presFile = zip.file('ppt/presentation.xml');
  if (!presFile) return fallbackSlideOrder(zip);

  const presXml = await presFile.async('text');
  const presDoc = parser.parseFromString(presXml, 'application/xml');

  const sldIdNodes = presDoc.querySelectorAll('sldIdLst sldId');
  const orderedPaths: string[] = [];

  sldIdNodes.forEach((node) => {
    const rId = node.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
      || node.getAttribute('r:id');
    if (rId && relMap[rId]) {
      orderedPaths.push(relMap[rId]);
    }
  });

  if (orderedPaths.length === 0) {
    return fallbackSlideOrder(zip);
  }

  return orderedPaths;
}

function fallbackSlideOrder(zip: JSZip): string[] {
  const slideFiles: string[] = [];
  zip.forEach((relativePath) => {
    if (/^ppt\/slides\/slide\d+\.xml$/.test(relativePath)) {
      slideFiles.push(relativePath);
    }
  });
  return slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || '0');
    const numB = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || '0');
    return numA - numB;
  });
}

// ============================================================
// INDIVIDUAL SLIDE PARSING
// ============================================================

function extractSlideTitle(doc: Document): string {
  // Strategy 1: Find title placeholder (type="ctrTitle" or "title", or idx="0")
  const allShapes = doc.querySelectorAll('sp');
  for (const sp of Array.from(allShapes)) {
    const ph = sp.querySelector('ph');
    if (ph) {
      const phType = ph.getAttribute('type');
      const phIdx = ph.getAttribute('idx');
      if (phType === 'title' || phType === 'ctrTitle' || phIdx === '0') {
        const text = extractTextFromShape(sp).trim();
        if (text) return text;
      }
    }
  }

  // Strategy 2: First shape with meaningful short text (likely a title)
  for (const sp of Array.from(allShapes)) {
    const ph = sp.querySelector('ph');
    if (!ph) continue; // Only look at placeholders
    const text = extractTextFromShape(sp).trim();
    if (text && text.length < 120) return text;
  }

  // Strategy 3: First non-empty short text anywhere
  for (const sp of Array.from(allShapes)) {
    const text = extractTextFromShape(sp).trim();
    if (text && text.length < 120) return text;
  }

  return ''; // fallback applied in caller
}

function extractTextFromShape(sp: Element): string {
  const textRuns = sp.querySelectorAll('t');
  const lines: string[] = [];
  let currentPara: string[] = [];

  // Walk paragraphs to preserve line structure
  const paragraphs = sp.querySelectorAll('p');
  paragraphs.forEach((para) => {
    const runs = para.querySelectorAll('t');
    if (runs.length === 0) {
      if (currentPara.length > 0) {
        lines.push(currentPara.join(''));
        currentPara = [];
      }
      return;
    }
    const paraText = Array.from(runs).map((t) => t.textContent || '').join('');
    if (paraText.trim()) lines.push(paraText);
  });

  if (textRuns.length > 0 && lines.length === 0) {
    // Fallback: just concat all text nodes
    lines.push(Array.from(textRuns).map((t) => t.textContent || '').join(' '));
  }

  return lines.join('\n');
}

function extractSlideText(doc: Document, excludeTitle: boolean, titleText: string): string {
  const shapes = doc.querySelectorAll('sp');
  const sections: string[] = [];
  let titleSeen = false;

  shapes.forEach((sp) => {
    const ph = sp.querySelector('ph');
    const phType = ph?.getAttribute('type');
    const phIdx = ph?.getAttribute('idx');

    // Skip body of the title placeholder once
    if ((phType === 'title' || phType === 'ctrTitle' || phIdx === '0') && !titleSeen) {
      titleSeen = true;
      if (excludeTitle) return;
    }

    // Skip slide notes placeholder
    if (phType === 'dt' || phType === 'ftr' || phType === 'sldNum') return;

    const text = extractTextFromShape(sp).trim();
    if (text && text !== titleText) {
      sections.push(text);
    }
  });

  return sections.join('\n\n');
}

function extractTables(doc: Document): SlideElement[] {
  const tables: SlideElement[] = [];
  const tblElements = doc.querySelectorAll('tbl');

  tblElements.forEach((tbl) => {
    const rows: string[][] = [];
    const trElements = tbl.querySelectorAll('tr');
    trElements.forEach((tr) => {
      const cells: string[] = [];
      const tcElements = tr.querySelectorAll('tc');
      tcElements.forEach((tc) => {
        const text = Array.from(tc.querySelectorAll('t'))
          .map((t) => t.textContent || '')
          .join('')
          .trim();
        cells.push(text);
      });
      if (cells.some((c) => c.length > 0)) rows.push(cells);
    });

    if (rows.length > 0) {
      // Convert to text representation
      const tableText = rows.map((row) => row.join(' | ')).join('\n');
      tables.push({ type: 'table', rows, text: tableText });
    }
  });

  return tables;
}

function detectVisualOnlyContent(doc: Document): boolean {
  // Check for picture elements or chart references
  const hasPic = doc.querySelectorAll('pic').length > 0;
  const hasChart = doc.querySelectorAll('graphicFrame').length > 0;
  // Only flag if there's little or no text
  const allText = Array.from(doc.querySelectorAll('t'))
    .map((t) => t.textContent || '')
    .join('')
    .trim();
  return (hasPic || hasChart) && allText.length < 30;
}

async function extractSpeakerNotes(zip: JSZip, slidePath: string): Promise<string | undefined> {
  try {
    // Derive notes path: ppt/notesSlides/notesSlideN.xml via relationships
    const slideRelsPath = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
    const relsFile = zip.file(slideRelsPath);
    if (!relsFile) return undefined;

    const relsXml = await relsFile.async('text');
    const relsDoc = new DOMParser().parseFromString(relsXml, 'application/xml');
    let notesPath: string | undefined;

    relsDoc.querySelectorAll('Relationship').forEach((rel) => {
      if ((rel.getAttribute('Type') || '').endsWith('/notesSlide')) {
        const target = rel.getAttribute('Target') || '';
        notesPath = target.startsWith('/ppt/') ? target.slice(1) : `ppt/slides/${target}`;
        notesPath = notesPath.replace(/\/\//g, '/');
      }
    });

    if (!notesPath) return undefined;
    const notesFile = zip.file(notesPath);
    if (!notesFile) return undefined;

    const notesXml = await notesFile.async('text');
    const notesDoc = new DOMParser().parseFromString(notesXml, 'application/xml');

    // Skip the first sp which is usually the slide placeholder
    const shapes = Array.from(notesDoc.querySelectorAll('sp'));
    const noteTexts: string[] = [];
    shapes.forEach((sp, i) => {
      if (i === 0) return; // skip slide content placeholder
      const text = extractTextFromShape(sp).trim();
      if (text) noteTexts.push(text);
    });

    return noteTexts.join('\n').trim() || undefined;
  } catch {
    return undefined;
  }
}

async function parseSlide(
  zip: JSZip,
  slidePath: string,
  slideNumber: number,
  warnings: string[]
): Promise<SlideContent> {
  const slideFile = zip.file(slidePath);
  if (!slideFile) {
    warnings.push(`Slide ${slideNumber}: file not found at path "${slidePath}"`);
    return {
      slideNumber,
      title: `Slide ${slideNumber}`,
      text: '',
      elements: [],
      hasVisualOnlyContent: false,
    };
  }

  let doc: Document;
  try {
    const xml = await slideFile.async('text');
    doc = new DOMParser().parseFromString(xml, 'application/xml');
  } catch {
    warnings.push(`Slide ${slideNumber}: failed to parse XML`);
    return {
      slideNumber,
      title: `Slide ${slideNumber}`,
      text: '',
      elements: [],
      hasVisualOnlyContent: false,
    };
  }

  const rawTitle = extractSlideTitle(doc);
  const title = rawTitle.trim() || `Slide ${slideNumber}`;
  const bodyText = extractSlideText(doc, true, rawTitle);
  const tables = extractTables(doc);
  const hasVisualOnlyContent = detectVisualOnlyContent(doc);
  const speakerNotes = await extractSpeakerNotes(zip, slidePath);

  const elements: SlideElement[] = [];

  if (bodyText.trim()) {
    elements.push({ type: 'text', text: bodyText });
  }

  elements.push(...tables);

  if (hasVisualOnlyContent) {
    warnings.push(`Slide ${slideNumber}: contains visual content that was not interpreted.`);
  }

  return {
    slideNumber,
    title,
    text: bodyText,
    elements,
    hasVisualOnlyContent,
    speakerNotes,
  };
}

// ============================================================
// MAIN EXPORT
// ============================================================

export async function parsePptx(file: File): Promise<PptxParseResult> {
  const warnings: string[] = [];

  // Validate first
  const validation = await validatePptx(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Open ZIP
  const zip = await JSZip.loadAsync(file);

  // Resolve presentation title from file name
  const presentationTitle = file.name.replace(/\.pptx$/i, '').trim();

  // Resolve correct slide order
  const slidePaths = await resolveSlideOrder(zip);

  if (slidePaths.length === 0) {
    throw new Error(
      "This PowerPoint doesn't contain any readable slides. Please try exporting the presentation again as .pptx."
    );
  }

  // Parse each slide
  const slides: SlideContent[] = [];
  for (let i = 0; i < slidePaths.length; i++) {
    const slideContent = await parseSlide(zip, slidePaths[i], i + 1, warnings);
    slides.push(slideContent);
  }

  // Check if there's any usable text at all
  const totalText = slides.map((s) => s.title + s.text).join('').trim();
  if (totalText.replace(/Slide \d+/g, '').trim().length < 20) {
    warnings.push(
      "Very little text was extracted. The presentation may rely heavily on images or have restricted content."
    );
  }

  return {
    slides,
    totalSlides: slides.length,
    title: presentationTitle,
    warnings,
  };
}

// ============================================================
// CONVERT SLIDES → STRUCTURED TEXT for existing MaterialProcessor
// ============================================================

export function slidesToCanonicalText(slides: SlideContent[]): string {
  return slides
    .map((slide) => {
      const parts: string[] = [];

      parts.push(`--- SLIDE ${slide.slideNumber} ---`);
      parts.push(`TITLE: ${slide.title}`);

      if (slide.text.trim()) {
        parts.push(slide.text);
      }

      // Include table text with structure markers
      slide.elements
        .filter((el) => el.type === 'table' && el.rows)
        .forEach((el) => {
          parts.push('[TABLE]');
          parts.push(el.text || '');
          parts.push('[/TABLE]');
        });

      if (slide.hasVisualOnlyContent) {
        parts.push('[Visual content detected — text extraction not available for this slide]');
      }

      return parts.join('\n');
    })
    .join('\n\n');
}
