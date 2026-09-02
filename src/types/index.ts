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

export type MaterialStatus = 'idle' | 'processing' | 'ready' | 'failed';

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

export interface MaterialSection {
  id: string;
  title: string;
  content: string;
  pageNumber?: number;
}

export interface ProcessedMaterial {
  title: string;
  summary: string;
  sections: MaterialSection[];
  concepts: ExtractedConcept[];
  keyTerms: KeyTerm[];
  sourceReferences: SourceReference[];
  suggestedLearningPath: string[];
}

export interface UploadedMaterial {
  id: string;
  studySpaceId?: string;
  title: string;
  originalFileName?: string;
  uploadedAt: Date;
  type: 'pdf' | 'txt' | 'pasted_text';
  rawContent: string;
  processingStatus: MaterialStatus;
  isDemoMode: boolean;
  processedContent?: ProcessedMaterial;
  version: number;
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
