import { useNavigate, Link } from 'react-router-dom';
import { useSessionStore } from '../store/session-store';
import { ALL_TOPICS } from '../data/topics';
import type { SessionAnalysis, ConceptEvidence } from '../types';

// ─── Outcome State Resolver ───────────────────────────────────────────────────
// Priority:
//   1. STRONG_FROM_START      — no repair needed, initial was mastered
//   2. MASTERED_AFTER_REPAIR  — repair occurred, final is mastered
//   3. GAP_REPAIRED           — repair occurred, final improved but not mastered
//   4. MISCONCEPTION_REMAINS  — final still shows potential_misconception
//   5. STILL_PARTIAL          — catch-all

type OutcomeState =
  | 'STRONG_FROM_START'
  | 'MASTERED_AFTER_REPAIR'
  | 'GAP_REPAIRED'
  | 'MISCONCEPTION_REMAINS'
  | 'STILL_PARTIAL';

function resolveOutcome(
  analysis: SessionAnalysis | undefined,
  finalAnalysis: SessionAnalysis | undefined,
): OutcomeState {
  const hadRepair = !!finalAnalysis;
  const initial = analysis?.overallStatus;
  const final = finalAnalysis?.overallStatus;
  if (!hadRepair && initial === 'mastered') return 'STRONG_FROM_START';
  if (hadRepair && final === 'mastered') return 'MASTERED_AFTER_REPAIR';
  if (hadRepair && (final === 'partial' || final === 'gap')) return 'GAP_REPAIRED';
  if (hadRepair && final === 'potential_misconception') return 'MISCONCEPTION_REMAINS';
  return 'STILL_PARTIAL';
}

interface OutcomeConfig {
  lines: string[];
  tagline: string;
  ctaVariant: 'primary' | 'outline' | 'accent';
}

const OUTCOME_CONFIG: Record<OutcomeState, OutcomeConfig> = {
  STRONG_FROM_START: {
    lines: ['STRONG', 'FROM THE', 'START.'],
    tagline: 'Your initial explanation demonstrated strong understanding.',
    ctaVariant: 'primary',
  },
  MASTERED_AFTER_REPAIR: {
    lines: ['YOU CAN', 'EXPLAIN IT', 'NOW.'],
    tagline: 'The identified gap was repaired and confirmed.',
    ctaVariant: 'primary',
  },
  GAP_REPAIRED: {
    lines: ['YOU REPAIRED', 'THE GAP.'],
    tagline: 'Your understanding improved. Some areas may still need attention.',
    ctaVariant: 'primary',
  },
  MISCONCEPTION_REMAINS: {
    lines: ["SOMETHING", "DOESN'T", 'ADD UP.'],
    tagline: 'A potential conflict between your explanation and the source remains.',
    ctaVariant: 'accent',
  },
  STILL_PARTIAL: {
    lines: ['NOT THERE', 'YET.'],
    tagline: 'Your understanding is developing. Keep working on the missing evidence.',
    ctaVariant: 'outline',
  },
};

// ─── Gap Stats ────────────────────────────────────────────────────────────────

function getGapStats(a: SessionAnalysis | undefined, f: SessionAnalysis | undefined) {
  const identified = a?.misconceptions.length ?? 0;
  const remaining = f?.misconceptions.length ?? identified;
  const repaired = Math.max(0, identified - remaining);
  return { identified, repaired, remaining };
}

// ─── Primary Gap (canonical misconception data — not independently generated) ─

function getPrimaryGap(analysis: SessionAnalysis) {
  const m = analysis.misconceptions[0];
  if (!m) return null;
  const cd = analysis.concepts.find((c) => c.concept === m.concept);
  return {
    concept: m.concept,
    gapDescription: m.evidence || 'A gap was identified in your explanation.',
    misconceptionEvidence: cd?.misconceptionEvidence ?? null,
  };
}

// ─── Labels ───────────────────────────────────────────────────────────────────

function overallStatusLabel(s: string) {
  if (s === 'mastered') return 'STRONG UNDERSTANDING';
  if (s === 'partial') return 'PARTIAL UNDERSTANDING';
  if (s === 'gap') return 'LEARNING GAP';
  if (s === 'potential_misconception') return 'UNCERTAIN';
  return 'DEVELOPING';
}

function conceptStatusLabel(s: string) {
  const map: Record<string, string> = {
    mastered: 'MASTERED', strong: 'STRONG', partial: 'PARTIAL',
    weak: 'WEAK', potential_misconception: 'UNCERTAIN', not_started: 'NOT STARTED',
  };
  return map[s] ?? s.toUpperCase().replace('_', ' ');
}

// ─── Concept Diffs ────────────────────────────────────────────────────────────
// Derives what changed by comparing status and missingEvidence arrays.
// IMPORTANT: Only compares canonical session state — does not re-evaluate.

interface ConceptDiff {
  concept: string;
  beforeStatus: string;
  afterStatus: string;
  repairedEvidence: string[];
  stillMissing: string[];
}

function getConceptDiffs(a: SessionAnalysis, f: SessionAnalysis): ConceptDiff[] {
  const diffs: ConceptDiff[] = [];
  for (const before of a.concepts) {
    const after = f.concepts.find((c) => c.concept === before.concept);
    if (!after) continue;
    const repairedEvidence = before.missingEvidence.filter(
      (e) => !after.missingEvidence.includes(e),
    );
    const stillMissing = after.missingEvidence;
    if (before.status === after.status && repairedEvidence.length === 0) continue;
    diffs.push({
      concept: before.concept,
      beforeStatus: before.status,
      afterStatus: after.status,
      repairedEvidence,
      stillMissing,
    });
  }
  return diffs;
}

// ─── Flat Student Evidence ────────────────────────────────────────────────────
// Uses studentEvidence ONLY. Never substitutes expectedEvidence.

interface FlatEvidence { index: number; conceptName: string; item: string; }

function flattenStudentEvidence(concepts: ConceptEvidence[]): FlatEvidence[] {
  const result: FlatEvidence[] = [];
  let idx = 1;
  for (const c of concepts) {
    for (const item of c.studentEvidence) {
      result.push({ index: idx++, conceptName: c.concept, item });
    }
  }
  return result;
}

// ─── Unresolved Concepts ──────────────────────────────────────────────────────

function getUnresolved(f: SessionAnalysis | undefined, a: SessionAnalysis | undefined): ConceptEvidence[] {
  const src = f ?? a;
  if (!src) return [];
  return src.concepts.filter(
    (c) =>
      c.status === 'weak' ||
      c.status === 'partial' ||
      c.status === 'not_started' ||
      c.status === 'potential_misconception',
  );
}

// ─── Source Lookup (canonical topics registry, no invented citations) ─────────

function lookupSource(topicId: string) {
  const t = ALL_TOPICS.find((t) => t.id === topicId);
  return t ? { subject: t.subject, title: t.title } : null;
}

function ctaClass(v: OutcomeConfig['ctaVariant']) {
  if (v === 'primary') return 'editorial-btn-primary';
  if (v === 'accent') return 'editorial-btn-accent';
  return 'editorial-btn-outline';
}

// ═════════════════════════════════════════════════════════════════════════════
// MasteryPage
//
// Information hierarchy (per product spec):
//   1. Hero headline (outcome-driven)
//   2. Concept name + repair summary
//   3. THE GAP YOU REPAIRED
//   4. BEFORE / AFTER evidence cards (student evidence only)
//   5. WHAT CHANGED (concept diff)
//   6. FINAL CONCEPT EVIDENCE (numbered, student-demonstrated)
//   7. SOURCE (canonical topics registry)
//   8. MASTERY INDEX (score subordinated to evidence narrative)
//   9. WHAT'S NEXT
// ═════════════════════════════════════════════════════════════════════════════

export function MasteryPage() {
  const navigate = useNavigate();
  const { session, resetSession, isDemo } = useSessionStore();

  if (!session) { navigate('/learn'); return null; }

  const analysis = session.analysis;
  const finalAnalysis = session.finalAnalysis;
  const hadRepair = !!finalAnalysis;
  const evidenceSource = finalAnalysis ?? analysis;

  const outcome = resolveOutcome(analysis, finalAnalysis);
  const config = OUTCOME_CONFIG[outcome];

  const masteryBefore = analysis?.masteryIndex.total ?? 0;
  const masteryAfter = finalAnalysis?.masteryIndex.total ?? masteryBefore;

  const gapStats = getGapStats(analysis, finalAnalysis);
  const primaryGap = analysis ? getPrimaryGap(analysis) : null;
  const conceptDiffs = analysis && finalAnalysis ? getConceptDiffs(analysis, finalAnalysis) : [];
  const finalEvidence = evidenceSource ? flattenStudentEvidence(evidenceSource.concepts) : [];
  const unresolved = getUnresolved(finalAnalysis, analysis);
  const sourceInfo = lookupSource(session.topicId);

  const repairSummaryLine =
    hadRepair && primaryGap
      ? `The missing understanding of ${primaryGap.concept.toLowerCase()} was identified and repaired.`
      : undefined;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1000px] mx-auto px-5 lg:px-10 pt-10 pb-32">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
              Session Result
            </p>
            {gapStats.identified > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="inline-block bg-fg text-bg px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  {gapStats.repaired === gapStats.identified
                    ? `${gapStats.repaired} Gap${gapStats.repaired !== 1 ? 's' : ''} Repaired`
                    : `${gapStats.repaired} of ${gapStats.identified} Gap${gapStats.identified !== 1 ? 's' : ''} Repaired`}
                </span>
                {gapStats.remaining > 0 && (
                  <span className="inline-block bg-warning text-bg px-3 py-1 text-xs font-bold uppercase tracking-wider">
                    {gapStats.remaining} Remain
                  </span>
                )}
              </div>
            )}
            {gapStats.identified === 0 && outcome === 'STRONG_FROM_START' && (
              <span className="inline-block border-2 border-accent-green text-accent-green px-3 py-1 text-xs font-bold uppercase tracking-wider">
                No Gaps Identified
              </span>
            )}
          </div>
          {isDemo && (
            <span className="shrink-0 px-3 py-1 bg-accent-yellow font-bold text-xs uppercase tracking-wider">
              Demo Mode
            </span>
          )}
        </div>

        {/* ── 1. HERO HEADLINE ───────────────────────────────────────────── */}
        <div className="mb-10">
          <h1 className="font-display font-bold text-display-xl text-fg leading-none mb-4">
            {config.lines.map((line, i) => (
              <span key={i} className="block">{line}</span>
            ))}
          </h1>
          <p className="text-base font-medium text-muted max-w-xl leading-relaxed">
            {config.tagline}
          </p>
        </div>

        {/* ── 2. CONCEPT NAME + REPAIR SUMMARY ──────────────────────────── */}
        {analysis && (
          <div className="border-l-4 border-fg pl-6 mb-16">
            <p className="font-display text-2xl font-bold uppercase tracking-tight text-fg mb-1">
              {analysis.topic}
            </p>
            {repairSummaryLine && (
              <p className="text-sm font-medium text-muted">{repairSummaryLine}</p>
            )}
          </div>
        )}

        {/* ── 3. THE GAP YOU REPAIRED ────────────────────────────────────── */}
        {hadRepair && primaryGap && (
          <section aria-labelledby="gap-heading" className="mb-16">
            <h2
              id="gap-heading"
              className="text-xs font-bold uppercase tracking-widest text-muted mb-4"
            >
              The Gap You Repaired
            </h2>
            <div className="border-4 border-fg bg-surface p-8 lg:p-10">
              <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Concept
              </p>
              <p className="font-display text-2xl font-bold uppercase tracking-tight text-fg mb-6">
                {primaryGap.concept}
              </p>
              <p className="text-lg font-medium text-fg leading-relaxed mb-8">
                {primaryGap.gapDescription}
              </p>
              {primaryGap.misconceptionEvidence && (
                <div className="border-l-4 border-fg pl-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                    Potential Misconception
                  </p>
                  <p className="text-base font-medium text-fg italic leading-relaxed mb-2">
                    {primaryGap.misconceptionEvidence}
                  </p>
                  <p className="text-xs text-muted">
                    Cautious interpretation — based on analysis of your explanation. Not a definitive conclusion.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── 4. BEFORE / AFTER ──────────────────────────────────────────── */}
        {analysis && (
          <section aria-label="Evidence before and after repair" className="mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
              Understanding Before {String.fromCharCode(8594)} After
            </h2>
            <div className="border-4 border-fg grid grid-cols-1 md:grid-cols-2">

              {/* BEFORE */}
              <div className="p-8 border-b-4 md:border-b-0 md:border-r-4 border-fg">
                <p className="text-xs font-bold uppercase tracking-widest text-muted mb-1">
                  Before
                </p>
                <p className="font-display text-xl font-bold uppercase tracking-tight text-fg mb-8">
                  {overallStatusLabel(analysis.overallStatus)}
                </p>

                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                    You Demonstrated
                  </p>
                  <ul className="space-y-2">
                    {analysis.concepts
                      .filter((c) => c.studentEvidence.length > 0)
                      .flatMap((c) =>
                        c.studentEvidence.map((e, i) => ({ key: `b-${c.concept}-${i}`, text: e })),
                      )
                      .map(({ key, text }) => (
                        <li key={key} className="flex gap-3 text-sm font-medium text-fg">
                          <span className="text-success font-bold shrink-0" aria-hidden="true">✓</span>
                          <span>{text}</span>
                        </li>
                      ))}
                    {analysis.concepts.every((c) => c.studentEvidence.length === 0) && (
                      <li className="text-sm text-muted italic">
                        No evidence demonstrated in initial explanation.
                      </li>
                    )}
                  </ul>
                </div>

                {analysis.concepts.some((c) => c.missingEvidence.length > 0) && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                      Missing
                    </p>
                    <ul className="space-y-2">
                      {analysis.concepts
                        .flatMap((c) =>
                          c.missingEvidence.map((e, i) => ({ key: `m-${c.concept}-${i}`, text: e })),
                        )
                        .map(({ key, text }) => (
                          <li key={key} className="flex gap-3 text-sm font-medium text-fg">
                            <span className="text-warning font-bold shrink-0" aria-hidden="true">{String.fromCharCode(8594)}</span>
                            <span>{text}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* AFTER */}
              {hadRepair && finalAnalysis ? (
                <div className="p-8">
                  {/* Green accent on label only — not the whole card */}
                  <p className="text-xs font-bold uppercase tracking-widest text-accent-green mb-1">
                    After
                  </p>
                  <p className="font-display text-xl font-bold uppercase tracking-tight text-fg mb-8">
                    {overallStatusLabel(finalAnalysis.overallStatus)}
                  </p>

                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                      Demonstrated After Repair
                    </p>
                    <ul className="space-y-2">
                      {finalAnalysis.concepts
                        .filter((c) => c.studentEvidence.length > 0)
                        .flatMap((c) =>
                          c.studentEvidence.map((e, i) => ({ key: `a-${c.concept}-${i}`, text: e })),
                        )
                        .map(({ key, text }) => (
                          <li key={key} className="flex gap-3 text-sm font-medium text-fg">
                            <span className="text-accent-green font-bold shrink-0" aria-hidden="true">✓</span>
                            <span>{text}</span>
                          </li>
                        ))}
                      {finalAnalysis.concepts.every((c) => c.studentEvidence.length === 0) && (
                        <li className="text-sm text-muted italic">No demonstrated evidence recorded.</li>
                      )}
                    </ul>
                  </div>

                  {finalAnalysis.concepts.some((c) => c.missingEvidence.length > 0) && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                        Still Missing
                      </p>
                      <ul className="space-y-2">
                        {finalAnalysis.concepts
                          .flatMap((c) =>
                            c.missingEvidence.map((e, i) => ({ key: `sm-${c.concept}-${i}`, text: e })),
                          )
                          .map(({ key, text }) => (
                            <li key={key} className="flex gap-3 text-sm font-medium text-fg">
                              <span className="text-warning font-bold shrink-0" aria-hidden="true">{String.fromCharCode(8594)}</span>
                              <span>{text}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 flex items-center justify-center min-h-[200px]">
                  <p className="text-muted text-sm font-medium italic text-center">
                    No re-explanation submitted yet.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── 5. WHAT CHANGED ────────────────────────────────────────────── */}
        {conceptDiffs.length > 0 && (
          <section aria-labelledby="what-changed-heading" className="mb-16">
            <h2
              id="what-changed-heading"
              className="text-xs font-bold uppercase tracking-widest text-muted mb-4"
            >
              What Changed
            </h2>
            <div className="border-4 border-fg bg-surface">
              {conceptDiffs.map((diff, i) => (
                <div
                  key={diff.concept}
                  className={`p-6 lg:p-8${i < conceptDiffs.length - 1 ? ' border-b-4 border-fg' : ''}`}
                >
                  <p className="font-display text-lg font-bold uppercase tracking-tight mb-5">
                    {diff.concept}
                  </p>

                  <div className="flex items-center gap-4 mb-5">
                    <div className="text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Before</p>
                      <p className="text-sm font-bold text-fg border-2 border-fg px-3 py-1">
                        {conceptStatusLabel(diff.beforeStatus)}
                      </p>
                    </div>
                    <span className="font-bold text-muted text-lg" aria-hidden="true">{String.fromCharCode(8594)}</span>
                    <div className="text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-accent-green mb-1">After</p>
                      <p className="text-sm font-bold text-fg border-2 border-accent-green px-3 py-1">
                        {conceptStatusLabel(diff.afterStatus)}
                      </p>
                    </div>
                  </div>

                  {diff.repairedEvidence.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                        Evidence Repaired
                      </p>
                      <ul className="space-y-1">
                        {diff.repairedEvidence.map((e, j) => (
                          <li key={j} className="flex gap-3 text-sm font-medium text-fg">
                            <span className="text-accent-green font-bold shrink-0" aria-hidden="true">+</span>
                            <span>{e}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {diff.stillMissing.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                        Still Unresolved
                      </p>
                      <ul className="space-y-1">
                        {diff.stillMissing.map((e, j) => (
                          <li key={j} className="flex gap-3 text-sm font-medium text-fg">
                            <span className="text-warning font-bold shrink-0" aria-hidden="true">{String.fromCharCode(8594)}</span>
                            <span>{e}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 6. FINAL CONCEPT EVIDENCE ──────────────────────────────────── */}
        {finalEvidence.length > 0 && (
          <section aria-labelledby="final-evidence-heading" className="mb-16">
            <div className="flex items-baseline justify-between mb-4">
              <h2
                id="final-evidence-heading"
                className="text-xs font-bold uppercase tracking-widest text-muted"
              >
                Final Concept Evidence
              </h2>
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                {hadRepair ? 'Demonstrated After Repair' : 'Demonstrated'}
              </span>
            </div>
            <div className="border-4 border-fg bg-surface divide-y-4 divide-fg">
              {finalEvidence.map((ev) => (
                <div key={ev.index} className="p-6 lg:p-8 flex gap-6 items-start">
                  <span
                    className="font-display text-4xl font-bold text-fg/20 shrink-0 leading-none select-none"
                    aria-hidden="true"
                  >
                    {String(ev.index).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1">
                      {ev.conceptName}
                    </p>
                    <p className="text-base font-medium text-fg leading-snug">{ev.item}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-3 pl-1">
              These items reflect what the student demonstrated — not what the source material expected.
            </p>
          </section>
        )}

        {/* ── 7. SOURCE ──────────────────────────────────────────────────── */}
        <section aria-labelledby="source-heading" className="mb-16 pt-8 border-t-4 border-fg">
          <h2
            id="source-heading"
            className="text-xs font-bold uppercase tracking-widest text-muted mb-4"
          >
            Source
          </h2>
          {sourceInfo ? (
            <div>
              <p className="font-display text-xl font-bold uppercase tracking-tight text-fg">
                {sourceInfo.subject}
              </p>
              <p className="text-sm font-medium text-muted mt-1">{sourceInfo.title}</p>
            </div>
          ) : (
            <p className="text-sm font-medium text-muted italic">Source reference unavailable.</p>
          )}
        </section>

        {/* ── 8. MASTERY INDEX — placed after evidence narrative ─────────── */}
        <section aria-labelledby="mastery-heading" className="mb-16">
          <h2
            id="mastery-heading"
            className="text-xs font-bold uppercase tracking-widest text-muted mb-4"
          >
            Mastery Index
          </h2>
          <div className="border-4 border-fg bg-surface p-8">
            <div
              className="flex items-baseline gap-6 mb-4"
              aria-label={`Mastery changed from ${masteryBefore} to ${masteryAfter}`}
            >
              <span className="font-display text-5xl font-bold text-fg/30">{masteryBefore}</span>
              <span className="font-display text-3xl font-bold text-fg" aria-hidden="true">{String.fromCharCode(8594)}</span>
              <span className="font-display text-5xl font-bold text-fg">{masteryAfter}</span>
            </div>
            <p className="text-xs font-medium text-muted max-w-md leading-relaxed">
              ConceptIQ Mastery Index — Prototype. Based on concept coverage,
              explanation quality, follow-up performance, and consistency.
              Not a standardized educational assessment.
            </p>
          </div>
        </section>

        {/* ── 9. WHAT'S NEXT ─────────────────────────────────────────────── */}
        <section aria-labelledby="next-heading" className="mb-16">
          <h2
            id="next-heading"
            className="text-xs font-bold uppercase tracking-widest text-muted mb-4"
          >
            {"What's Next?"}
          </h2>
          {unresolved.length > 0 ? (
            <div className="border-4 border-fg bg-surface p-8">
              <p className="font-display text-xl font-bold uppercase tracking-tight text-fg mb-2">
                {unresolved[0].concept}
              </p>
              <p className="text-sm font-medium text-muted mb-6">
                {unresolved.length} concept{unresolved.length !== 1 ? 's' : ''} still{' '}
                {unresolved.length === 1 ? 'needs' : 'need'} attention.
              </p>
              <button
                id="focus-next-btn"
                onClick={() => { resetSession(); navigate('/learn'); }}
                className={`${ctaClass(config.ctaVariant)} text-base`}
              >
                Focus Next
              </button>
            </div>
          ) : (
            <div className="border-4 border-fg bg-surface p-8">
              <p className="font-display text-xl font-bold uppercase tracking-tight text-fg mb-2">
                All Concepts Addressed
              </p>
              <p className="text-sm font-medium text-muted mb-6">
                Explore more materials or review your Knowledge Map.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/map" id="view-map-btn" className="editorial-btn-primary flex-1 text-center">
                  View Knowledge Map
                </Link>
                <button
                  id="teach-another-btn"
                  onClick={() => { resetSession(); navigate('/learn'); }}
                  className="editorial-btn-outline flex-1"
                >
                  Teach Another Concept
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Footer Actions ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t-4 border-fg">
          <Link to="/map" className="editorial-btn-outline flex-1 text-center">
            Knowledge Map
          </Link>
          <button
            onClick={() => { resetSession(); navigate('/learn'); }}
            className="editorial-btn-outline flex-1"
          >
            Teach Another Concept
          </button>
        </div>

      </div>
    </div>
  );
}
