import { create } from 'zustand';
import type { UploadedMaterial } from '../types';
import { createMaterialProcessor } from '../ai/material-processor';

interface MaterialStore {
  materials: UploadedMaterial[];
  currentMaterialId: string | null;
  currentMaterial: UploadedMaterial | null;

  addMaterial: (file: File | null, text: string) => Promise<void>;
  selectMaterial: (materialId: string) => void;
  deleteMaterial: (materialId: string) => void;
  getMaterialById: (id: string) => UploadedMaterial | null;
}

export const useMaterialStore = create<MaterialStore>((set, get) => ({
  materials: [],
  currentMaterialId: null,
  currentMaterial: null,

  async addMaterial(file, text) {
    const materialId = crypto.randomUUID();
    const title = file?.name.replace(/\.[^/.]+$/, '') || 'Pasted Content';
    const rawContent = text;

    // Add material with processing state
    set((state) => ({
      materials: [
        ...state.materials,
        {
          id: materialId,
          title,
          originalFileName: file?.name,
          uploadedAt: new Date(),
          type: file ? (file.name.endsWith('.pdf') ? 'pdf' : 'txt') : 'pasted_text',
          rawContent,
          processingStatus: 'processing',
          isDemoMode: true,
          processedContent: undefined,
          version: 1,
        },
      ],
      currentMaterialId: materialId,
    }));

    // Process asynchronously
    try {
      const processor = createMaterialProcessor();
      const processed = await processor.processText(rawContent, file?.name);

      set((state) => ({
        materials: state.materials.map((m) =>
          m.id === materialId
            ? {
                ...m,
                processingStatus: 'ready',
                processedContent: processed,
              }
            : m
        ),
        currentMaterial: state.currentMaterialId === materialId
          ? {
              ...get().materials.find((m) => m.id === materialId)!,
              processingStatus: 'ready',
              processedContent: processed,
            }
          : state.currentMaterial,
      }));
    } catch (error) {
      console.error('Material processing failed:', error);
      set((state) => ({
        materials: state.materials.map((m) =>
          m.id === materialId
            ? { ...m, processingStatus: 'failed' }
            : m
        ),
      }));
    }
  },

  selectMaterial(materialId) {
    const material = get().materials.find((m) => m.id === materialId);
    set({
      currentMaterialId: materialId,
      currentMaterial: material || null,
    });
  },

  deleteMaterial(materialId) {
    set((state) => {
      const materials = state.materials.filter((m) => m.id !== materialId);
      return {
        materials,
        currentMaterialId: state.currentMaterialId === materialId ? null : state.currentMaterialId,
        currentMaterial: state.currentMaterialId === materialId ? null : state.currentMaterial,
      };
    });
  },

  getMaterialById(id) {
    return get().materials.find((m) => m.id === id) || null;
  },
}));
