import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, ArrowLeft } from 'lucide-react';
import { useStudySpaceStore } from '../store/study-space-store';

export function AddMaterialPage() {
  const navigate = useNavigate();
  const { spaceId } = useParams<{ spaceId?: string }>();
  const { createStudySpace, addMaterialToSpace } = useStudySpaceStore();
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getOrCreateSpaceId = (title: string) => {
    if (spaceId) return spaceId;
    return createStudySpace(title, `Created from ${title}`);
  };

  const navigateToMaterial = (materialId: string) => {
    navigate(`/material-overview/${materialId}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const targetSpaceId = getOrCreateSpaceId(file.name.replace(/\.[^/.]+$/, ''));

      await addMaterialToSpace(targetSpaceId, file, text);
      const newMaterials = useStudySpaceStore.getState().materials;
      const latestMaterial = newMaterials[newMaterials.length - 1];
      navigateToMaterial(latestMaterial.id);
    } catch (error) {
      console.error('Failed to read file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = async () => {
    if (!pastedText.trim()) return;
    setIsLoading(true);
    try {
      const title = pastedText.substring(0, 30).replace(/\n/g, ' ') + '...';
      const targetSpaceId = getOrCreateSpaceId(title);
      await addMaterialToSpace(targetSpaceId, null, pastedText);
      const newMaterials = useStudySpaceStore.getState().materials;
      const latestMaterial = newMaterials[newMaterials.length - 1];
      navigateToMaterial(latestMaterial.id);
    } catch (error) {
      console.error('Failed to process pasted text:', error);
    } finally {
      setIsLoading(false);
    }
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
              PDFs. Notes. Lecture material. <br />
              Give ConceptIQ something real to understand.
            </p>

            <div className="space-y-12">
              {/* UPLOAD BLOCK */}
              <section>
                <div className="editorial-card p-6 lg:p-10 border-4 border-fg bg-surface relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent-yellow rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                  <label className="relative block cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.txt,.text"
                      onChange={handleFileUpload}
                      disabled={isLoading}
                      className="hidden"
                    />
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                      <div className="w-16 h-16 bg-fg text-bg rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-accent-blue transition-colors">
                        <Upload size={28} />
                      </div>
                      <div>
                        <h2 className="font-display text-3xl font-bold text-fg mb-1">UPLOAD PDF OR TEXT</h2>
                        <p className="text-fg/80 font-medium">Select a file from your device to begin processing.</p>
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
                <div className="editorial-card p-6 lg:p-10 border-4 border-fg bg-accent-pink">
                  <h2 className="font-display text-3xl font-bold text-fg mb-4">PASTE NOTES</h2>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    disabled={isLoading}
                    placeholder="Paste your study notes, article text, or lecture transcript here..."
                    className="w-full h-48 px-6 py-4 border-2 border-fg bg-surface text-fg text-lg font-medium resize-none focus:outline-none focus:ring-4 focus:ring-fg transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] mb-6"
                  />
                  <button
                    onClick={handlePaste}
                    disabled={!pastedText.trim() || isLoading}
                    className="editorial-btn-primary w-full md:w-auto text-xl"
                  >
                    {isLoading ? 'Processing Material...' : 'Analyze Pasted Material'}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
