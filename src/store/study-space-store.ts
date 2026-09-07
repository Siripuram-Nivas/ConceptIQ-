import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StudySpace, UploadedMaterial, KnowledgeMap, KnowledgeMapNode, ConceptStatus, Activity } from '../types';
import { createMaterialProcessor } from '../ai/material-processor';
import { isDemoMode } from '../ai';
import { idbStorage } from '../lib/idb-storage';
import { parsePptx, slidesToCanonicalText } from '../lib/pptx-parser';
import { parsePdf } from '../lib/pdf-parser';

interface StudySpaceStore {
  // Study Spaces
  studySpaces: StudySpace[];
  currentSpaceId: string | null;
  currentSpace: StudySpace | null;

  // Materials within space
  materials: UploadedMaterial[];

  // Knowledge Maps
  knowledgeMaps: KnowledgeMap[];
  currentMap: KnowledgeMap | null;

  // Actions
  createStudySpace: (title: string, description?: string) => string;
  selectStudySpace: (spaceId: string) => void;
  updateSpaceProgress: (spaceId: string, updates: Partial<StudySpace['progress']>) => void;
  updateStudySpaceLastActive: (spaceId: string) => void;
  addActivity: (spaceId: string, activity: Omit<Activity, 'id' | 'timestamp'>) => void;

  addMaterialToSpace: (spaceId: string, file: File | null, text: string) => Promise<void>;
  getMaterialById: (id: string) => UploadedMaterial | null;
  deleteMaterial: (materialId: string) => void;

  getKnowledgeMapForSpace: (spaceId: string) => KnowledgeMap | null;
  updateMapNode: (spaceId: string, nodeId: string, updates: Partial<KnowledgeMapNode>) => void;
  mergeConceptsToMap: (spaceId: string, concepts: any[], edges?: Array<{ from: string; to: string; relationship: string }>) => void;
  syncSessionToMap: (materialId: string, analysis: any) => void;
}

const STORAGE_KEY = 'conceptiq-study-space-store';

export const useStudySpaceStore = create<StudySpaceStore>()(
  persist(
    (set, get) => ({
      studySpaces: [],
      currentSpaceId: null,
      currentSpace: null,
      materials: [],
      knowledgeMaps: [],
      currentMap: null,

      createStudySpace(title, description) {
        const spaceId = crypto.randomUUID();
        const newSpace: StudySpace = {
          id: spaceId,
          title,
          description,
          materialIds: [],
          conceptIds: [],
          history: [],
          mapVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          progress: {
            conceptsMastered: 0,
            conceptsPartial: 0,
            conceptsWeak: 0,
            misconceptionsDetected: 0,
          },
        };

        set((state) => ({
          studySpaces: [...state.studySpaces, newSpace],
          currentSpaceId: spaceId,
          currentSpace: newSpace,
        }));

        return spaceId;
      },

      selectStudySpace(spaceId) {
        const space = get().studySpaces.find((s) => s.id === spaceId);
        const map = get().knowledgeMaps.find((m) => m.studySpaceId === spaceId);

        set({
          currentSpaceId: spaceId,
          currentSpace: space || null,
          currentMap: map || null,
        });
      },

      updateSpaceProgress(spaceId, updates) {
        set((state) => ({
          studySpaces: state.studySpaces.map((s) =>
            s.id === spaceId ? { ...s, progress: { ...s.progress, ...updates } } : s
          ),
        }));

      },

      updateStudySpaceLastActive(spaceId) {
        set((state) => ({
          studySpaces: state.studySpaces.map((s) =>
            s.id === spaceId ? { ...s, lastStudiedAt: new Date() } : s
          ),
        }));
      },

      addActivity(spaceId, activity) {
        const newActivity: Activity = {
          ...activity,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        };
        set((state) => ({
          studySpaces: state.studySpaces.map((s) =>
            s.id === spaceId ? { ...s, history: [newActivity, ...(s.history || [])] } : s
          ),
        }));
      },

      async addMaterialToSpace(spaceId, file, text) {
        const space = get().studySpaces.find((s) => s.id === spaceId);
        if (!space) throw new Error('Study space not found');

        const materialId = crypto.randomUUID();
        const title = file?.name.replace(/\.[^/.]+$/, '') || 'Pasted Content';

        const isPptx = !!(file && file.name.toLowerCase().endsWith('.pptx'));

        // Create material with processing state
        const newMaterial: UploadedMaterial = {
          id: materialId,
          studySpaceId: spaceId,
          title,
          originalFileName: file?.name,
          uploadedAt: new Date(),
          type: isPptx ? 'pptx' : file ? (file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt') : 'pasted_text',
          rawContent: text,
          processingStatus: 'processing',
          isDemoMode: isDemoMode(),
          version: 1,
        };

        set((state) => ({
          materials: [...state.materials, newMaterial],
          studySpaces: state.studySpaces.map((s) =>
            s.id === spaceId ? { ...s, materialIds: [...s.materialIds, materialId] } : s
          ),
        }));

        // Process material
        try {
          let contentToProcess = text;
          let slideCount: number | undefined;
          let pageCount: number | undefined;
          let pptxWarnings: string[] | undefined;

          if (isPptx && file) {
            // ── PPTX BRANCH ──────────────────────────────────────────
            const parseResult = await parsePptx(file);
            slideCount = parseResult.totalSlides;
            pptxWarnings = parseResult.warnings.length > 0 ? parseResult.warnings : undefined;

            // Convert slides to canonical text for the existing processor
            contentToProcess = slidesToCanonicalText(parseResult.slides);

            // Store slideCount on material immediately so UI can show it
            set((state) => ({
              materials: state.materials.map((m) =>
                m.id === materialId ? { ...m, slideCount, pptxWarnings } : m
              ),
            }));
          } else if (file && file.name.toLowerCase().endsWith('.pdf')) {
            // ── PDF BRANCH ───────────────────────────────────────────
            const parseResult = await parsePdf(file);
            pageCount = parseResult.totalPages;
            
            // Set content to extracted text instead of raw PDF binary
            contentToProcess = parseResult.extractedText;

            set((state) => ({
              materials: state.materials.map((m) =>
                m.id === materialId ? { ...m, slideCount: pageCount } : m // Reuse slideCount field for page counts in UI
              ),
            }));
          }

          const processor = createMaterialProcessor();
          const processed = await processor.processText(contentToProcess, file?.name);

          // For PPTX, update source references to say "Slide N" not "Page N"
          if (isPptx) {
            processed.sections = processed.sections.map((section, idx) => ({
              ...section,
              pageNumber: undefined,
              // Encode slide number in section id for downstream use
              id: section.id.startsWith('slide-') ? section.id : `slide-${idx + 1}`,
            }));
            processed.sourceReferences = processed.sourceReferences.map((ref, idx) => ({
              ...ref,
              location: `Slide ${idx + 1}`,
            }));
            // Patch concept sourceReferences to say Slide N
            processed.concepts = processed.concepts.map((concept) => ({
              ...concept,
              sourceReference: concept.sourceReference
                ? concept.sourceReference.replace(/Page (\d+)/i, 'Slide $1').replace(/Section \d+/i, (m) => {
                    const num = m.match(/\d+/)?.[0];
                    return num ? `Slide ${num}` : m;
                  })
                : undefined,
            }));
          }

          set((state) => ({
            materials: state.materials.map((m) =>
              m.id === materialId
                ? {
                  ...m,
                  processingStatus: 'ready',
                  processedContent: processed,
                  rawContent: contentToProcess,
                }
                : m
            ),
          }));

          // Merge concepts + relationships into space's knowledge map (or create one)
          const relationships = (processed as any).relationships ?? [];
          get().mergeConceptsToMap(spaceId, processed.concepts, relationships);

          // Record activity
          const materialDesc = isPptx && slideCount !== undefined
            ? `Added "${title}" (${slideCount} slides) and extracted ${processed.concepts.length} concepts.`
            : `Added "${title}" and extracted ${processed.concepts.length} concepts.`;

          get().addActivity(spaceId, {
            type: 'material_added',
            title: 'Material Added',
            description: materialDesc,
            materialId: materialId,
          });

        } catch (error) {
          console.error('Material processing failed:', error);
          const errMsg = error instanceof Error ? error.message : 'Processing failed';
          set((state) => ({
            materials: state.materials.map((m) =>
              m.id === materialId ? { ...m, processingStatus: 'failed', pptxWarnings: [errMsg] } : m
            ),
          }));
        }
      },

      getMaterialById(id) {
        return get().materials.find((m) => m.id === id) || null;
      },

      deleteMaterial(materialId) {
        const material = get().materials.find((m) => m.id === materialId);
        if (!material) return;

        set((state) => ({
          materials: state.materials.filter((m) => m.id !== materialId),
          studySpaces: state.studySpaces.map((s) =>
            s.id === material.studySpaceId
              ? { ...s, materialIds: s.materialIds.filter((id) => id !== materialId) }
              : s
          ),
        }));


      },

      getKnowledgeMapForSpace(spaceId) {
        return get().knowledgeMaps.find((m) => m.studySpaceId === spaceId) || null;
      },

      updateMapNode(spaceId, nodeId, updates) {
        set((state) => ({
          knowledgeMaps: state.knowledgeMaps.map((m) =>
            m.studySpaceId === spaceId
              ? {
                ...m,
                nodes: m.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
                updatedAt: new Date(),
              }
              : m
          ),
        }));

      },

      mergeConceptsToMap(spaceId, concepts, edges = []) {
        let existingMap = get().knowledgeMaps.find((m) => m.studySpaceId === spaceId);

        if (!existingMap) {
          // Create new map
          existingMap = {
            id: crypto.randomUUID(),
            studySpaceId: spaceId,
            version: 1,
            nodes: [],
            edges: [],
            status: 'ready',
            createdAt: new Date(),
            updatedAt: new Date(),
            sourceCount: 1,
          };
          set((state) => ({
            knowledgeMaps: [...state.knowledgeMaps, existingMap!],
          }));
        }

        // Convert concepts to map nodes
        const newNodes: KnowledgeMapNode[] = concepts.map((concept) => ({
          id: concept.id || concept.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          label: concept.name,
          status: 'not_started' as ConceptStatus,
          evidence: [],
          missingEvidence: [],
        }));

        // Merge with existing nodes (avoid duplicates by id)
        const mergedNodes = [...existingMap.nodes];
        newNodes.forEach((newNode) => {
          if (!mergedNodes.find((n) => n.id === newNode.id)) {
            mergedNodes.push(newNode);
          }
        });

        // Merge edges (avoid duplicates)
        const mergedEdges = [...(existingMap.edges ?? [])];
        edges.forEach((edge) => {
          const fromId = edge.from.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const toId = edge.to.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const already = mergedEdges.find(e => e.from === fromId && e.to === toId);
          if (!already) {
            mergedEdges.push({ from: fromId, to: toId, relationship: edge.relationship });
          }
        });

        // Update map
        set((state) => ({
          knowledgeMaps: state.knowledgeMaps.map((m) =>
            m.studySpaceId === spaceId
              ? {
                ...m,
                nodes: mergedNodes,
                edges: mergedEdges,
                version: m.version + 1,
                updatedAt: new Date(),
                sourceCount: (m.sourceCount || 0) + 1,
              }
              : m
          ),
        }));
      },
      syncSessionToMap(materialId, analysis) {
        const material = get().materials.find(m => m.id === materialId);
        if (!material || !material.studySpaceId) return;

        const spaceId = material.studySpaceId;
        let existingMap = get().knowledgeMaps.find(m => m.studySpaceId === spaceId);
        if (!existingMap) return;

        let updatedNodes = [...existingMap.nodes];
        let improvedCount = 0;

        for (const ce of analysis.concepts) {
          const nodeId = ce.concept.toLowerCase().replace(/\s+/g, '-');
          const nodeIndex = updatedNodes.findIndex(n => n.id === nodeId || n.label.toLowerCase() === ce.concept.toLowerCase());
          if (nodeIndex >= 0) {
            if (updatedNodes[nodeIndex].status !== 'mastered' && ce.status === 'mastered') {
              improvedCount++;
            }
            updatedNodes[nodeIndex] = {
              ...updatedNodes[nodeIndex],
              status: ce.status,
              evidence: Array.from(new Set([...(updatedNodes[nodeIndex].evidence || []), ...ce.studentEvidence])),
              missingEvidence: ce.missingEvidence,
              lastReviewed: new Date()
            };
          } else {
            // If the concept isn't in the map, add it
            updatedNodes.push({
              id: nodeId,
              label: ce.concept,
              status: ce.status,
              evidence: ce.studentEvidence,
              missingEvidence: ce.missingEvidence,
              lastReviewed: new Date()
            });
            if (ce.status === 'mastered') improvedCount++;
          }
        }

        // Recalculate progress
        const progress = {
          conceptsMastered: updatedNodes.filter(n => n.status === 'mastered' || n.status === 'strong').length,
          conceptsPartial: updatedNodes.filter(n => n.status === 'partial').length,
          conceptsWeak: updatedNodes.filter(n => n.status === 'weak' || n.status === 'not_started').length,
          misconceptionsDetected: updatedNodes.filter(n => n.status === 'potential_misconception').length,
        };

        // Save map and progress
        set((state) => ({
          knowledgeMaps: state.knowledgeMaps.map((m) =>
            m.id === existingMap!.id
              ? { ...m, nodes: updatedNodes, version: m.version + 1, updatedAt: new Date() }
              : m
          ),
          studySpaces: state.studySpaces.map(s =>
            s.id === spaceId ? { ...s, progress, updatedAt: new Date(), lastStudiedAt: new Date() } : s
          )
        }));

        // Record activity
        const activityType = analysis.overallStatus === 'mastered' ? 'teachback_completed' : 'concept_repaired';
        get().addActivity(spaceId, {
          type: activityType,
          title: 'TeachBack Completed',
          description: `Practiced "${analysis.topic}". ${improvedCount > 0 ? `Improved ${improvedCount} concept(s).` : 'Keep practicing!'}`,
          materialId
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        studySpaces: state.studySpaces,
        materials: state.materials,
        knowledgeMaps: state.knowledgeMaps,
      }),
      version: 1,
    }
  )
);
