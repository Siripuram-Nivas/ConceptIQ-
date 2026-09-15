import * as idb from 'idb-keyval';

const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
const memStore = new Map<string, any>();

async function get<T>(key: string): Promise<T | undefined> {
  if (isBrowser) return idb.get(key);
  return memStore.get(key) as T;
}

async function set(key: string, val: any): Promise<void> {
  if (isBrowser) return idb.set(key, val);
  memStore.set(key, val);
}
import type { 
  PersistedJobState, 
  RunLease, 
  SchedulerConfig, 
  SchedulerProfile,
  OperationPhase
} from './types';

const PROFILES: Record<SchedulerProfile, SchedulerConfig> = {
  conservative: {
    maxConcurrentRequests: 1,
    minRequestIntervalMs: 2000,
    maxRequestsPerWindow: 5,
    maxInputTokensPerWindow: 20000,
    maxTotalRunRequests: 100,
    extractionReserve: 70,
    aggregationReserve: 10,
    auditReserve: 10,
    recoveryReserve: 10,
  },
  normal: {
    maxConcurrentRequests: 3,
    minRequestIntervalMs: 500,
    maxRequestsPerWindow: 15,
    maxInputTokensPerWindow: 60000,
    maxTotalRunRequests: 200,
    extractionReserve: 150,
    aggregationReserve: 20,
    auditReserve: 10,
    recoveryReserve: 20,
  },
  aggressive: {
    maxConcurrentRequests: 5,
    minRequestIntervalMs: 100,
    maxRequestsPerWindow: 30,
    maxInputTokensPerWindow: 120000,
    maxTotalRunRequests: 500,
    extractionReserve: 400,
    aggregationReserve: 40,
    auditReserve: 20,
    recoveryReserve: 40,
  }
};

const MIN_RETRY_DELAY = 2000;
const MAX_RETRY_DELAY = 60000;
const MAX_CHUNK_RETRIES = 5;

// Active instances to ensure "One scheduler per run"
const activeSchedulers = new Map<string, ClientRequestScheduler>();

export class ClientRequestScheduler {
  private processingRunId: string;
  private config: SchedulerConfig;
  private isPaused = false;
  private isRunning = false;
  private ownerId: string;
  private activeRequests = 0;
  private totalRequests = 0;
  private lastRequestTime = 0;
  private providerCooldownUntil = 0;
  private onJobComplete?: (job: PersistedJobState, result: any) => void;
  private onJobFailed?: (job: PersistedJobState, isTerminal: boolean) => void;
  private onProgress?: (msg: string) => void;
  /** Stored so we can clear it in destroy() */
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private constructor(processingRunId: string, profile: SchedulerProfile = 'conservative') {
    this.processingRunId = processingRunId;
    this.config = PROFILES[profile] || PROFILES.conservative;
    // Each scheduler instance has a unique ID — used for lease ownership verification.
    this.ownerId = crypto.randomUUID();
  }

  static async getInstance(processingRunId: string, profile?: SchedulerProfile): Promise<ClientRequestScheduler> {
    // Return the in-memory scheduler if we already own it in this tab
    if (activeSchedulers.has(processingRunId)) {
      return activeSchedulers.get(processingRunId)!;
    }

    // Check if another tab/instance holds an unexpired lease for this run
    const lease = await get<RunLease>(`lease_${processingRunId}`);
    const now = Date.now();
    if (lease && lease.leaseUntil > now) {
      // Another owner holds the lease — this tab must not start a duplicate.
      // (The lease will expire after 15 s if the owning tab crashes.)
      throw new Error(
        `SCHEDULER_LEASE_CONFLICT: Processing run ${processingRunId} is already owned by ${lease.ownerId}. ` +
        `Lease expires in ${Math.ceil((lease.leaseUntil - now) / 1000)}s. ` +
        `If this tab is the intended owner (e.g. a resume), destroy the other scheduler first.`
      );
    }

    const scheduler = new ClientRequestScheduler(processingRunId, profile);
    activeSchedulers.set(processingRunId, scheduler);
    await scheduler.acquireLease();
    return scheduler;
  }

  setCallbacks(onJobComplete: any, onJobFailed: any, onProgress?: any) {
    this.onJobComplete = onJobComplete;
    this.onJobFailed = onJobFailed;
    this.onProgress = onProgress;
  }

  private async acquireLease() {
    const lease: RunLease = {
      processingRunId: this.processingRunId,
      ownerId: this.ownerId,
      acquiredAt: Date.now(),
      heartbeatAt: Date.now(),
      leaseUntil: Date.now() + 15000 // 15s lease
    };
    await set(`lease_${this.processingRunId}`, lease);
  }

  private async heartbeatLease() {
    await this.acquireLease();
  }

  private async getJobs(): Promise<PersistedJobState[]> {
    const jobs = await get<PersistedJobState[]>(`jobs_${this.processingRunId}`);
    return jobs || [];
  }

  private async saveJobs(jobs: PersistedJobState[]) {
    await set(`jobs_${this.processingRunId}`, jobs);
  }

  async enqueueJobs(newJobs: Omit<PersistedJobState, 'status' | 'attempt' | 'createdAt' | 'updatedAt'>[]) {
    const jobs = await this.getJobs();
    const now = Date.now();
    for (const j of newJobs) {
      if (!jobs.find(existing => existing.jobId === j.jobId)) {
        jobs.push({
          ...j,
          status: 'PENDING',
          attempt: 0,
          createdAt: now,
          updatedAt: now
        });
      }
    }
    await this.saveJobs(jobs);
  }

  pause() {
    this.isPaused = true;
    if (this.onProgress) this.onProgress('Scheduler paused.');
  }

  resume() {
    this.isPaused = false;
    if (this.onProgress) this.onProgress('Scheduler resumed.');
    this.tick();
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.tick();

    // Start heartbeat — stored so destroy() can clear it
    this.heartbeatTimer = setInterval(() => {
      if (this.isRunning && !this.isPaused) {
        this.heartbeatLease();
      }
    }, 5000);
  }

  private async tick() {
    if (this.isPaused || this.activeRequests >= this.config.maxConcurrentRequests) return;

    const now = Date.now();
    if (now - this.lastRequestTime < this.config.minRequestIntervalMs) {
      setTimeout(() => this.tick(), this.config.minRequestIntervalMs - (now - this.lastRequestTime));
      return;
    }

    const jobs = await this.getJobs();
    
    // Recover jobs stuck in PROCESSING (e.g. browser crash) using leased execution
    let jobsModified = false;
    for (const job of jobs) {
      if (job.status === 'PROCESSING' && job.leaseUntil && now > job.leaseUntil) {
        job.status = 'RETRYING';
        job.updatedAt = now;
        job.leaseOwnerId = undefined;
        job.leaseUntil = undefined;
        jobsModified = true;
      }
    }
    if (jobsModified) await this.saveJobs(jobs);

    // Filter executable jobs
    if (now < this.providerCooldownUntil) {
      setTimeout(() => this.tick(), this.providerCooldownUntil - now);
      return;
    }

    const executableJobs = jobs.filter(j => 
      (j.status === 'PENDING' || j.status === 'RETRYING' || j.status === 'RATE_LIMITED') &&
      (!j.nextAttemptAt || j.nextAttemptAt <= now)
    );

    if (executableJobs.length === 0) return;

    // Phase barriers logic
    const hasPendingChunks = jobs.some(j => j.operation === 'chunk' && (j.status === 'PENDING' || j.status === 'RETRYING' || j.status === 'PROCESSING'));
    const hasPendingAggregation = jobs.some(j => j.operation === 'aggregation' && (j.status === 'PENDING' || j.status === 'RETRYING' || j.status === 'PROCESSING'));
    const hasPendingAudit = jobs.some(j => j.operation === 'audit' && (j.status === 'PENDING' || j.status === 'RETRYING' || j.status === 'PROCESSING'));
    
    let allowedPhase: OperationPhase = 'chunk';
    if (!hasPendingChunks) allowedPhase = 'aggregation';
    if (!hasPendingChunks && !hasPendingAggregation) allowedPhase = 'audit';
    if (!hasPendingChunks && !hasPendingAggregation && !hasPendingAudit) allowedPhase = 'recovery';

    // Pick highest priority job matching the allowed phase
    const eligibleJobs = executableJobs.filter(j => j.operation === allowedPhase);
    if (eligibleJobs.length === 0) {
       // Wait for current phase to finish
       return; 
    }

    // Sort by priority (higher number = higher priority), then by attempt (retries go first)
    eligibleJobs.sort((a, b) => b.priority - a.priority || b.attempt - a.attempt);
    
    const job = eligibleJobs[0];
    
    // Check total budget limits loosely here
    if (this.totalRequests >= this.config.maxTotalRunRequests) {
      this.pause();
      if (this.onProgress) this.onProgress('Total run budget exhausted.');
      return;
    }

    // Dispatch
    this.activeRequests++;
    this.totalRequests++;
    this.lastRequestTime = Date.now();
    
    job.status = 'PROCESSING';
    job.attempt++;
    job.updatedAt = Date.now();
    job.lastAttemptAt = Date.now();
    job.leaseOwnerId = this.ownerId;
    job.leaseUntil = Date.now() + 60000; // 60s lease per operation
    await this.saveJobs(jobs);

    this.executeJob(job).finally(() => {
      this.activeRequests--;
      this.tick(); // Pump the queue
    });
    
    // Try to pump more if concurrency allows
    this.tick();
  }

  private async executeJob(job: PersistedJobState) {
    try {
      let result;
      // We route the actual API call based on the operation embedded in the payload
      if (job.operation === 'chunk') {
        result = await this.callBackend('extractChunkIntelligence', job.payload);
      } else if (job.operation === 'aggregation') {
        result = await this.callBackend('aggregateMaterial', job.payload);
      } else if (job.operation === 'audit') {
        result = await this.callBackend('auditCompleteness', job.payload);
      } else if (job.operation === 'recovery') {
        result = await this.callBackend('recoverMissingTopics', job.payload);
      } else {
        throw new Error('Unknown operation');
      }

      // Success!
      const jobs = await this.getJobs();
      const j = jobs.find(x => x.jobId === job.jobId);
      if (j) {
        j.status = 'COMPLETED';
        j.updatedAt = Date.now();
        await this.saveJobs(jobs);
      }
      if (this.onJobComplete) this.onJobComplete(job, result);

    } catch (err: any) {
      const isRateLimited = err?.code === 'RATE_LIMITED';
      const isRetryable = err?.isRetryable;
      
      const jobs = await this.getJobs();
      const j = jobs.find(x => x.jobId === job.jobId);
      if (!j) return;

      j.lastErrorCode = err?.code || 'UNKNOWN';
      j.lastRequestId = err?.requestId;

      if ((isRateLimited || isRetryable) && j.attempt < MAX_CHUNK_RETRIES) {
        j.status = isRateLimited ? 'RATE_LIMITED' : 'RETRYING';
        // Retry-After logic + Full Jitter
        let delay = err?.retryAfterMs;
        if (!delay || delay <= 0) {
           // Bounded Exponential backoff with full jitter
           const base = MIN_RETRY_DELAY * Math.pow(2, j.attempt - 1);
           const jitter = Math.random() * base; // full jitter
           delay = Math.min(base + jitter, MAX_RETRY_DELAY);
        }
        j.retryAfterMs = delay;
        j.nextAttemptAt = Date.now() + delay;
        
        if (isRateLimited) {
           this.providerCooldownUntil = Math.max(this.providerCooldownUntil, j.nextAttemptAt || 0);
        }
        
        await this.saveJobs(jobs);
        if (this.onJobFailed) this.onJobFailed(job, false);
      } else {
        j.status = (isRateLimited && j.attempt >= MAX_CHUNK_RETRIES) ? 'PROCESSING_PAUSED' : 'FAILED';
        j.retryAfterMs = undefined;
        j.nextAttemptAt = undefined;
        await this.saveJobs(jobs);
        if (this.onJobFailed) this.onJobFailed(job, true);
      }
      
      j.updatedAt = Date.now();
      await this.saveJobs(jobs);
    }
  }

  // Wrapper over generic fetch
  private async callBackend(method: string, payload: any) {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, payload }),
    });

    const data = await response.json();
    if (!response.ok) {
       throw data.error || { code: 'UNKNOWN', message: 'Unknown error', isRetryable: false };
    }
    return data;
  }

  public async waitForPhase(phase: OperationPhase, timeoutMs = 300000): Promise<void> {
    const start = Date.now();
    while (true) {
      if (Date.now() - start > timeoutMs) throw new Error(`Timeout waiting for phase ${phase}`);
      const jobs = await this.getJobs();
      const phaseJobs = jobs.filter(j => j.operation === phase);
      
      const hasUnfinished = phaseJobs.some(j => j.status === 'PENDING' || j.status === 'PROCESSING' || j.status === 'RETRYING');
      
      if (!hasUnfinished && phaseJobs.length > 0) return; // All finished
      
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  /**
   * Cleanly stops the scheduler:
   * - Clears the heartbeat timer (no orphaned setInterval)
   * - Marks the scheduler as not running
   * - Removes the in-memory instance so a new scheduler can be created for resume
   * Call this when the owning component unmounts or processing completes.
   */
  destroy() {
    this.isRunning = false;
    this.isPaused = true;
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    activeSchedulers.delete(this.processingRunId);
    if (this.onProgress) this.onProgress('Scheduler destroyed.');
  }

  /**
   * Force-acquire the lease for this scheduler instance.
   * Use this to take over from a crashed/stale scheduler (e.g. after lease expiry).
   * Only call when you are certain the previous owner is gone.
   */
  async forceAcquireLease() {
    await this.acquireLease();
  }
}
