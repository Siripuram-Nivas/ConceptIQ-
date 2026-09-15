import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, ArrowLeft, FileText, Presentation, AlertTriangle, CheckCircle } from 'lucide-react';
import { useStudySpaceStore } from '../store/study-space-store';
import { validatePptx } from '../lib/pptx-parser';

type ProcessingStage =
  | 'idle'
  | 'reading'
  | 'extracting'
  | 'analyzing'
  | 'building'
  | 'ready'
  | 'error';

const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: '',
  reading: 'Reading file…',
  extracting: 'Extracting content…',
  analyzing: 'Finding concepts…',
  building: 'Building learning model…',
  ready: 'Ready to learn.',
  error: 'Processing failed.',
};

export function AddMaterialPage() {
  const navigate = useNavigate();
  const { spaceId } = useParams<{ spaceId?: string }>();
  const { createStudySpace, addMaterialToSpace } = useStudySpaceStore();
  const [pastedText, setPastedText] = useState('');
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = stage !== 'idle' && stage !== 'ready' && stage !== 'error';

  const getOrCreateSpaceId = (title: string) => {
    if (spaceId) return spaceId;
    return createStudySpace(title, `Created from ${title}`);
  };

  const navigateToMaterial = (materialId: string) => {
    navigate(`/material-overview/${materialId}`);
  };

  const processFile = async (file: File) => {
    setErrorMessage('');
    const isPptx = file.name.toLowerCase().endsWith('.pptx');

    // Validate PPTX before anything
    if (isPptx) {
      setStage('reading');
      const validation = await validatePptx(file);
      if (!validation.valid) {
        setStage('error');
        setErrorMessage(validation.error || 'Invalid PowerPoint file.');
        return;
      }
      setStage('extracting');
    } else {
      setStage('reading');
    }

    try {
      // For TXT we still need to read as text for the store's backward-compat path
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      const text = (isPptx || isPdf) ? '' : await file.text();
      const title = file.name.replace(/\.[^/.]+$/, '');
      const targetSpaceId = getOrCreateSpaceId(title);

      setStage('analyzing');

      // addMaterialToSpace handles the PPTX branching internally
      await addMaterialToSpace(targetSpaceId, file, text);

      setStage('building');
      // Brief pause so the building stage is visible
      await new Promise((r) => setTimeout(r, 400));

      const newMaterials = useStudySpaceStore.getState().materials;
      const latestMaterial = newMaterials[newMaterials.length - 1];

      if (latestMaterial.processingStatus === 'failed') {
        const errMsg = latestMaterial.pptxWarnings?.[0] || 'Material could not be processed.';
        setStage('error');
        setErrorMessage(errMsg);
        return;
      }

      setStage('ready');
      await new Promise((r) => setTimeout(r, 600));
      navigateToMaterial(latestMaterial.id);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setStage('error');
      setErrorMessage(msg);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-uploaded after error
    e.currentTarget.value = '';
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handlePaste = async () => {
    if (!pastedText.trim()) return;
    setStage('reading');
    setErrorMessage('');
    try {
      const title = pastedText.substring(0, 30).replace(/\n/g, ' ') + '...';
      const targetSpaceId = getOrCreateSpaceId(title);
      setStage('analyzing');
      await addMaterialToSpace(targetSpaceId, null, pastedText);
      setStage('building');
      await new Promise((r) => setTimeout(r, 400));
      const newMaterials = useStudySpaceStore.getState().materials;
      const latestMaterial = newMaterials[newMaterials.length - 1];
      setStage('ready');
      await new Promise((r) => setTimeout(r, 500));
      navigateToMaterial(latestMaterial.id);
    } catch (error) {
      setStage('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process pasted text.');
    }
  };

  const resetError = () => {
    setStage('idle');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 pt-10 pb-32">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide hover:translate-x-1 hover:text-accent-purple transition-all mb-12"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8">
            <h1 className="font-display text-display-lg text-fg leading-none mb-6">
              BRING WHAT YOU'RE <br /><span className="text-accent-blue">STUDYING.</span>
            </h1>
            <p className="text-xl font-medium text-fg max-w-xl leading-relaxed mb-16 border-l-4 border-fg pl-6 py-2">
              PDFs. PowerPoints. Notes. Lectures.<br />
              Give ConceptIQ something real to understand.
            </p>

            {/* PROCESSING STATE */}
            {isLoading && (
              <div className="editorial-card p-8 glass-panel mb-10 flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-accent-yellow border-t-transparent animate-spin" />
                <div>
                  <p className="font-display text-2xl font-bold text-fg mb-1">
                    {STAGE_LABELS[stage]}
                  </p>
                  <p className="text-muted text-sm font-medium">
                    ConceptIQ is reading your material — not just storing it.
                  </p>
                </div>
              </div>
            )}

            {/* SUCCESS STATE */}
            {stage === 'ready' && (
              <div className="editorial-card p-8 glass-panel mb-10 flex items-start gap-6 border border-accent-green/40">
                <CheckCircle className="text-accent-green flex-shrink-0 mt-1" size={28} />
                <div>
                  <p className="font-display text-2xl font-bold text-fg mb-1">Ready to learn.</p>
                  <p className="text-muted text-sm font-medium">Taking you to your material…</p>
                </div>
              </div>
            )}

            {/* ERROR STATE */}
            {stage === 'error' && (
              <div className={`editorial-card p-8 glass-panel mb-10 flex items-start gap-6 border ${errorMessage?.includes('RATE_LIMIT') ? 'border-accent-yellow/40' : 'border-accent-red/40'}`}>
                <AlertTriangle className={errorMessage?.includes('RATE_LIMIT') ? 'text-accent-yellow flex-shrink-0 mt-1' : 'text-accent-red flex-shrink-0 mt-1'} size={28} />
                <div className="flex-1">
                  <p className="font-display text-2xl font-bold text-fg mb-1">
                    {errorMessage?.includes('RATE_LIMIT_RETRY_EXHAUSTED') ? 'AI SERVICE RATE LIMITED' : 'Couldn\'t process that file.'}
                  </p>
                  <p className="text-fg/80 text-sm font-medium mb-4">
                    {errorMessage?.includes('RATE_LIMIT_RETRY_EXHAUSTED') ? errorMessage.replace('Error: RATE_LIMIT_RETRY_EXHAUSTED: AI SERVICE RATE LIMITED.', '').trim() : errorMessage}
                  </p>
                  
                  {!errorMessage?.includes('RATE_LIMIT') && (
                    <p className="text-muted text-xs mb-4">
                      Try exporting the presentation again as .pptx, or upload a PDF/TXT version.
                    </p>
                  )}
                  
                  <button onClick={resetError} className="editorial-btn-outline text-sm">
                    {errorMessage?.includes('RATE_LIMIT') ? 'Resume Processing' : 'Try Again'}
                  </button>
                </div>
              </div>
            )}

            {!isLoading && stage !== 'ready' && (
              <div className="space-y-12">
                {/* UPLOAD BLOCK */}
                <section>
                  <div
                    className={`editorial-card p-6 lg:p-10 glass-panel relative overflow-hidden group transition-all ${
                      isDragging ? 'ring-2 ring-accent-yellow scale-[1.01]' : ''
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent-yellow rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                    <label className="relative block cursor-pointer">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt,.text,.pptx"
                        onChange={handleFileUpload}
                        disabled={isLoading}
                        className="hidden"
                      />
                      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <div className="w-16 h-16 bg-fg text-bg rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-accent-blue transition-colors">
                          <Upload size={28} />
                        </div>
                        <div>
                          <h2 className="font-display text-3xl font-bold text-fg mb-1">
                            UPLOAD MATERIAL
                          </h2>
                          <p className="text-fg/80 font-medium">
                            PDF, PowerPoint (.pptx), or TXT — drop a file or click to browse.
                          </p>
                          <div className="flex gap-3 mt-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-fg/10 rounded text-xs font-bold text-fg/70 uppercase tracking-wide">
                              <FileText size={10} /> PDF
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent-yellow/20 rounded text-xs font-bold text-accent-yellow uppercase tracking-wide">
                              <Presentation size={10} /> PPTX
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-fg/10 rounded text-xs font-bold text-fg/70 uppercase tracking-wide">
                              <FileText size={10} /> TXT
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                </section>

                <div className="flex items-center gap-6">
                  <div className="flex-1 h-0.5 bg-fg/20" />
                  <span className="font-display font-bold text-2xl uppercase text-fg/40">OR</span>
                  <div className="flex-1 h-0.5 bg-fg/20" />
                </div>

                {/* PASTE BLOCK */}
                <section>
                  <div className="editorial-card p-6 lg:p-10 glass-panel">
                    <h2 className="font-display text-3xl font-bold text-fg mb-4">PASTE YOUR MATERIAL.</h2>
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      disabled={isLoading}
                      placeholder="Paste notes, lecture content, an article, or a transcript…"
                      className="w-full h-48 px-6 py-4 glass-subtle text-fg text-lg font-medium resize-none focus:outline-none focus:ring-4 focus:ring-accent-yellow transition-all mb-6"
                    />
                    <button
                      onClick={handlePaste}
                      disabled={!pastedText.trim() || isLoading}
                      className="editorial-btn-primary w-full md:w-auto text-xl"
                    >
                      {isLoading ? 'Processing Material…' : 'ANALYZE MATERIAL'}
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* SIDEBAR: format guide */}
          <div className="lg:col-span-4">
            <div className="glass-strong p-6 lg:p-8 sticky top-10">
              <h2 className="font-display text-xl font-bold uppercase tracking-tight mb-6 text-accent-yellow">
                Supported Formats
              </h2>
              <ul className="space-y-4 text-sm font-medium">
                <li className="flex items-start gap-3">
                  <span className="text-accent-yellow font-bold text-xs uppercase tracking-wide mt-0.5">PPTX</span>
                  <span className="text-fg/80">PowerPoint lecture slides. ConceptIQ reads each slide, extracts concepts, and grounds them to specific slide numbers.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fg/50 font-bold text-xs uppercase tracking-wide mt-0.5">PDF</span>
                  <span className="text-fg/80">Lecture notes, papers, textbook chapters.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fg/50 font-bold text-xs uppercase tracking-wide mt-0.5">TXT</span>
                  <span className="text-fg/80">Plain-text study notes or transcripts.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-fg/50 font-bold text-xs uppercase tracking-wide mt-0.5">PASTE</span>
                  <span className="text-fg/80">Any text you can copy — articles, notes, summaries.</span>
                </li>
              </ul>
              <div className="mt-8 border-t border-border/30 pt-6">
                <p className="text-xs text-muted font-medium leading-relaxed">
                  <span className="text-accent-yellow font-bold">Note:</span> Legacy .ppt files are not supported. 
                  Export your presentation as .pptx from PowerPoint first.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
