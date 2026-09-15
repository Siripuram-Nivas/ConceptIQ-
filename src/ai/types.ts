import type { SessionAnalysis, AdaptiveQuestion, RepairContent, LearningSession } from '../types';

export interface AIProvider {
  analyzeExplanation(session: LearningSession, explanation: string, materialContext: string): Promise<SessionAnalysis>;
  generateFollowUpQuestion(analysis: SessionAnalysis): Promise<AdaptiveQuestion>;
  detectMisconception(analysis: SessionAnalysis): Promise<SessionAnalysis>;
  generateRepair(analysis: SessionAnalysis): Promise<RepairContent>;
  evaluateReExplanation(session: LearningSession, reExplanation: string, materialContext: string): Promise<SessionAnalysis>;
}

/**
 * Normalized error codes — must exactly match the backend set in api/ai.ts.
 * NEVER add codes here that don't exist on the backend, and vice-versa.
 */
export type NormalizedErrorCode =
  | 'RATE_LIMITED'
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'AI_PROVIDER_TIMEOUT'
  | 'AI_MODEL_UNAVAILABLE'
  | 'INVALID_REQUEST'
  | 'INTERNAL_API_ERROR'
  | 'PAYLOAD_TOO_LARGE';

export interface NormalizedApiError {
  code: NormalizedErrorCode;
  message: string;
  retryAfterMs: number | null;
  requestId: string;
  operation: OperationPhase | string;
  /** isRetryable is the canonical field name on the frontend */
  isRetryable: boolean;
  /** retryable is the alias sent by the backend */
  retryable?: boolean;
}

export type SchedulerProfile = 'conservative' | 'normal' | 'aggressive';

export interface SchedulerConfig {
  maxConcurrentRequests: number;
  minRequestIntervalMs: number;
  maxRequestsPerWindow: number;
  maxInputTokensPerWindow: number;
  maxTotalRunRequests: number;
  extractionReserve: number;
  aggregationReserve: number;
  auditReserve: number;
  recoveryReserve: number;
}

export type OperationPhase = 'chunk' | 'aggregation' | 'audit' | 'recovery';
export type JobStatus = 'PENDING' | 'PROCESSING' | 'RATE_LIMITED' | 'RETRYING' | 'COMPLETED' | 'FAILED' | 'PAUSED' | 'PROCESSING_PAUSED';

export interface PersistedJobState {
  jobId: string;
  processingRunId: string;
  materialVersion: number;
  sourceFingerprint: string;
  operation: OperationPhase;
  priority: number;
  status: JobStatus;
  attempt: number;
  createdAt: number;
  updatedAt: number;
  lastAttemptAt?: number;
  nextAttemptAt?: number;
  retryAfterMs?: number;
  lastErrorCode?: string;
  lastRequestId?: string;
  estimatedInputTokens?: number;
  payload: any; // e.g. chunk data, topics for recovery, etc.
  leaseOwnerId?: string;
  leaseUntil?: number;
}

export interface RunLease {
  processingRunId: string;
  ownerId: string;
  acquiredAt: number;
  heartbeatAt: number;
  leaseUntil: number;
}

