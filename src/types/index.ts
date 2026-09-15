export type SessionState =
  | 'IDLE'
  | 'EXPLAINING'
  | 'PROCESSING'
  | 'ANALYSIS'
  | 'CHALLENGE'
  | 'CONFIDENCE'
  | 'DIAGNOSIS'
  | 'REPAIR'
  | 'RE_EXPLAIN'
  | 'MASTERY';

export type ConceptStatus = 'mastered' | 'strong' | 'partial' | 'weak' | 'potential_misconception' | 'not_started';

// 'partial' = some chunks failed, intelligence is incomplete but persisted
// 'text_complete' = all text processed; visual/OCR content was not analyzed
export type MaterialStatus = 'idle' | 'processing' | 'ready' | 'failed' | 'partial' | 'text_complete' | 'rate_limited' | 'paused';

export interface ConceptEvidence {
  concept: string;
  expectedEvidence: string[];
  studentEvidence: string[];
  missingEvidence: string[];
  status: ConceptStatus;
  confidence?: number;
  misconceptionEvidence?: string;
}

export interface MasteryBreakdown {
  conceptCoverage: number;      // 0–35
  explanationQuality: number;   // 0–25
  followupPerformance: number;  // 0–20
  consistency: number;          // 0–20
  total: number;                // 0–100
}

export interface SessionAnalysis {
  topic: string;
  concepts: ConceptEvidence[];
  overallStatus: 'mastered' | 'partial' | 'gap' | 'potential_misconception';
  misconceptions: Misconception[];
  recommendedAction: 'continue' | 'challenge' | 'repair' | 'mastered';
  masteryIndex: MasteryBreakdown;
  adaptiveQuestion?: AdaptiveQuestion;
}

export interface Misconception {
  concept: string;
  severity: 'low' | 'medium' | 'high';
  type: 'missing_relationship' | 'incorrect' | 'incomplete' | 'overconfident';
  evidence: string;
  repair?: RepairContent;
}

export interface AdaptiveQuestion {
  question: string;
  rationale: string;
  targetConcept: string;
}

export interface RepairContent {
  title: string;
  visualSteps: RepairStep[];
  challenge: string;
}

export interface RepairStep {
  step: number;
  type: 'visual' | 'explanation' | 'analogy' | 'challenge';
  content: string;
  diagram?: string; // ASCII or simple text diagram
}

export interface Topic {
  id: string;
  slug: string;
  title: string;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  concepts: string[];
  description: string;
  referenceContent: ReferenceContent;
}

export interface ReferenceContent {
  summary: string;
  keyConcepts: KeyConcept[];
  diagram?: string;
}

export interface KeyConcept {
  name: string;
  definition: string;
  relationships?: string[];
}

export interface LearningSession {
  id: string;
  topicId: string;
  materialId?: string;
  materialVersion?: number;
  state: SessionState;
  explanation: string;
  transcript?: string;
  confidence?: number;
  followUpAnswer?: string;
  followUpConfidence?: number;
  analysis?: SessionAnalysis;
  challenge?: AdaptiveQuestion;
  repair?: RepairContent;
  reExplanation?: string;
  finalAnalysis?: SessionAnalysis;
  startedAt: Date;
  isDemoMode: boolean;
}

export interface KnowledgeMapNode {
  id: string;
  label: string;
  status: ConceptStatus;
  mastery?: number;
  evidence?: string[];
  missingEvidence?: string[];
  prerequisites?: string[];
  lastReviewed?: Date;
}

export interface UserProgress {
  userId: string;
  knowledgeMap: Record<string, KnowledgeMapNode>;
  sessions: LearningSession[];
  conceptsMastered: number;
  misconceptionsResolved: number;
}

// ==================================================
// MATERIAL & STUDY SPACE TYPES
// ==================================================

export interface SourceReference {
  id: string;
  location: string; // e.g., "Page 4", "Section 2.1"
  content: string;
  conceptsReferenced: string[];
}

export interface ExtractedConcept {
  id: string;
  name: string;
  canonicalName?: string;
  aliases: string[];
  definition: string;
  relatedConcepts: string[];
  sourceReference?: string;
  keyPoints: string[];
  masteryStatus?: ConceptStatus;
  evidence?: string[];
  missingEvidence?: string[];
}

export interface KeyTerm {
  term: string;
  definition: string;
  context?: string;
}

export interface KeyIdea {
  idea: string;
  explanation: string;
  sourceReferences: string[];
}

export interface ImportantResult {
  result: string;
  significance: string;
  sourceReferences: string[];
}

export interface GroundedClaim {
  claim: string;
  type: 'fact' | 'interpretation' | 'inference';
  sourceReferences: string[];
}

export interface SourceAwareInsight {
  insight: string;
  sourceReferences: string[];
}

export interface MaterialSection {
  id: string;
  title: string;
  content: string;
  pageNumber?: number;
}

// ==================================================
// NEW DOCUMENT INTELLIGENCE TYPES (§6–§37)
// ==================================================

/**
 * A mathematical or logical formula extracted from the source.
 * Formulas are first-class citizens — never flattened to "a formula exists".
 */
export interface Formula {
  expression: string;        // Exact expression, e.g. "Y = −0.947 + 2.448X"
  variables: string[];       // Variable definitions, e.g. ["Y: predicted value", "X: independent variable"]
  significance: string;      // What this formula represents in context
  sourceReferences: string[]; // e.g. ["Page 7"]
}

/**
 * One entry in the document's logical table of contents.
 * Each item represents a major topic with its discovered subtopics.
 */
export interface DocumentOutlineItem {
  id: string;
  order: number;
  title: string;
  subtopics: string[];
  sourceUnits: string[];   // e.g. ["Page 3", "Page 4"]
  importance: 'high' | 'medium' | 'low';
}

/**
 * A tiered explanation for one topic, at three depth levels (§27, §28).
 * Level 1 = quickExplanation
 * Level 2 = detailedExplanation
 * Level 3 = deepDive
 */
export interface TopicExplanation {
  topicId: string;
  topicName: string;
  sourceUnits: string[];
  quickExplanation: string;      // 1–2 sentences
  detailedExplanation: string;   // Full paragraph with context
  deepDive: string;              // Technical depth: definitions, formulas, examples, conditions
  relatedTopics: string[];
}

/**
 * Tracks a piece of content that could NOT be represented in the final intelligence.
 * Zero Silent Omission Policy (§34): every omission must be documented.
 */
export interface DocumentOmission {
  omissionId: string;
  topic: string;
  reason:
    | 'ocr_unavailable'
    | 'parser_limitation'
    | 'ai_failure'
    | 'context_budget'
    | 'visual_unavailable'
    | 'aggregation_loss'
    | 'table_extraction_failed'
    | 'unknown';
  severity: 'low' | 'medium' | 'high';
  recoverable: boolean;
  sourceReference?: string;
}

/**
 * One row in the Coverage Matrix (§30).
 * Tracks each important topic/subtopic through all pipeline stages.
 */
export interface CoverageEntry {
  topic: string;
  subtopic?: string;
  sourceUnits: string[];
  extracted: boolean;
  processed: boolean;
  represented: boolean;
  explained: boolean;
  provenance: boolean;
  status:
    | 'DISCOVERED'
    | 'SOURCE_FOUND'
    | 'EXTRACTED'
    | 'PROCESSED'
    | 'EXPLAINED'
    | 'PROVENANCE'
    | 'VERIFIED'
    | 'FAILED'
    | 'OMITTED';
}

export interface RetrievalResponse {
  status: 'success' | 'insufficient_context';
  sections: MaterialSection[];
  sourceReferences: string[];
  reason?: string;
}

// ==================================================
// PROCESSED MATERIAL (full document intelligence)
// ==================================================

export interface ProcessedMaterial {
  title: string;

  // ── Synthesis ──────────────────────────────────────────────────────────
  summary: string;

  // Tiered explanations (§27) — Level 1, 2, 3
  quickExplanation: string;      // Level 1: 1 paragraph overview
  detailedExplanation: string;   // Level 2: topic-by-topic narrative
  deepDive: string;              // Level 3: full technical depth

  // Legacy field (backward compat — same value as detailedExplanation)
  explanation: string;

  // ── Document Structure (§10, §11) ─────────────────────────────────────
  documentOutline: DocumentOutlineItem[];
  topicExplanations: TopicExplanation[];

  // ── Extracted Intelligence ──────────────────────────────────────────────
  sections: MaterialSection[];
  concepts: ExtractedConcept[];
  keyTerms: KeyTerm[];
  keyIdeas: KeyIdea[];
  importantResults: ImportantResult[];
  formulas: Formula[];              // NEW — formula first-class (§18)
  groundedClaims: GroundedClaim[];
  sourceAwareInsights: SourceAwareInsight[];
  sourceReferences: SourceReference[];
  suggestedLearningPath: string[];

  // ── Conclusions ───────────────────────────────────────────────────────
  conclusions: string[];            // NEW

  // ── Completeness (§29–§37) ───────────────────────────────────────────
  omissions: DocumentOmission[];        // NEW — zero silent omission
  coverageMatrix: CoverageEntry[];      // NEW — machine-readable coverage
  completenessAuditPassed: boolean;     // NEW — was the audit satisfied?
  visualLimitationsNoted: boolean;      // NEW — TEXT_COMPLETE vs VISUALLY_COMPLETE
}

// ==================================================
// PROCESSING PIPELINE TYPES
// ==================================================

export type ProcessingState = 'pending' | 'processing' | 'succeeded' | 'failed' | 'retrying' | 'partial';

export interface ProcessingManifest {
  processingRunId: string;
  sourceFingerprint: string;
  materialVersion: number;
  promptVersion: string;
  modelVersion: string;
  schemaVersion: string;
  processorVersion: string;

  // Pipeline stage states
  sourceExtractionStatus: ProcessingState;
  chunkProcessingStatus: ProcessingState;
  aggregationStatus: ProcessingState;
  indexingStatus: ProcessingState;
  knowledgeMapStatus: ProcessingState;
  completenessAuditStatus: ProcessingState;  // NEW

  // Counts
  totalPages: number;
  totalChunks: number;
  completedChunks: number;
  failedChunks: number;
  failedChunkIndices: number[];   // NEW — which specific chunks failed

  // Completeness audit results
  auditCycles: number;            // NEW — how many audit cycles ran (max 2)
  topicsDiscovered: number;       // NEW — from document outline
  topicsRepresented: number;      // NEW — covered in final intelligence
  isPartial: boolean;             // NEW — true if some chunks failed
}

export interface ChunkIntelligence {
  processingRunId: string;
  materialId: string;
  materialVersion: number;
  chunkId: string;
  chunkHash: string;
  chunkIndex: number;
  pageStart: number;
  pageEnd: number;

  concepts: ExtractedConcept[];
  keyTerms: KeyTerm[];
  keyIdeas: KeyIdea[];
  importantResults: ImportantResult[];
  relationships: any[];
  groundedClaims: GroundedClaim[];
  sourceReferences: SourceReference[];
}

export interface UploadedMaterial {
  id: string;
  studySpaceId?: string;
  title: string;
  originalFileName?: string;
  uploadedAt: Date;
  type: 'pdf' | 'txt' | 'pptx' | 'pasted_text';
  rawContent: string;
  processingStatus: MaterialStatus;
  isDemoMode: boolean;
  processedContent?: ProcessedMaterial;
  manifest?: ProcessingManifest;
  version: number;
  slideCount?: number;       // populated for pptx / pdf
  pptxWarnings?: string[];   // non-fatal parse warnings
}

export type ActivityType = 'material_added' | 'teachback_completed' | 'concept_repaired' | 'misconception_detected';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  conceptId?: string;
  materialId?: string;
  previousMastery?: number;
  newMastery?: number;
}

export interface StudySpace {
  id: string;
  title: string;
  description?: string;
  materialIds: string[];
  conceptIds: string[];
  history: Activity[];
  mapVersion: number;
  createdAt: Date;
  updatedAt: Date;
  lastStudiedAt?: Date;
  progress: {
    conceptsMastered: number;
    conceptsPartial: number;
    conceptsWeak: number;
    misconceptionsDetected: number;
  };
}

export interface KnowledgeMap {
  id: string;
  studySpaceId: string;
  version: number;
  nodes: KnowledgeMapNode[];
  edges: Array<{ from: string; to: string; relationship: string }>;
  status: 'ready' | 'updating' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  sourceCount: number;
}
