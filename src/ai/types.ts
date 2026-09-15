import type { SessionAnalysis, AdaptiveQuestion, RepairContent, LearningSession } from '../types';

export interface AIProvider {
  analyzeExplanation(session: LearningSession, explanation: string, materialContext: string): Promise<SessionAnalysis>;
  generateFollowUpQuestion(analysis: SessionAnalysis): Promise<AdaptiveQuestion>;
  detectMisconception(analysis: SessionAnalysis): Promise<SessionAnalysis>;
  generateRepair(analysis: SessionAnalysis): Promise<RepairContent>;
  evaluateReExplanation(session: LearningSession, reExplanation: string, materialContext: string): Promise<SessionAnalysis>;
}

export type NormalizedErrorCode = 
  | 'RATE_LIMITED' 
  | 'INVALID_SCHEMA' 
  | 'PAYLOAD_TOO_LARGE'
  | 'SERVER_ERROR'
  | 'UNAUTHORIZED'
  | 'UNKNOWN';

export interface NormalizedApiError {
  code: NormalizedErrorCode;
  message: string;
  retryAfterMs: number | null;
  requestId?: string;
  operation?: string;
  isRetryable: boolean;
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
