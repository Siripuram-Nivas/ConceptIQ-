import type { Topic, SessionAnalysis, RepairContent, AdaptiveQuestion } from '../../types';

export const DNA_TOPIC: Topic = {
  id: 'dna-replication',
  slug: 'dna-replication',
  title: 'DNA Replication',
  subject: 'Biology',
  difficulty: 'intermediate',
  estimatedMinutes: 4,
  concepts: ['Helicase', 'Primase', 'Primer', 'DNA Polymerase', 'Leading Strand', 'Lagging Strand', 'Okazaki Fragments'],
  description: 'How DNA copies itself before cell division.',
  referenceContent: {
    summary: 'DNA replication is the process by which a cell duplicates its DNA before division. It requires multiple enzymes working in a coordinated sequence.',
    keyConcepts: [
      { name: 'Helicase', definition: 'Unwinds and separates the double helix by breaking hydrogen bonds between base pairs.' },
      { name: 'Primase', definition: 'Synthesizes short RNA primers that provide a starting point for DNA Polymerase.' },
      { name: 'Primer', definition: "Short RNA sequence that provides the 3'-OH group DNA Polymerase needs to begin synthesis." },
      { name: 'DNA Polymerase', definition: 'Synthesizes new DNA strands by adding nucleotides — but CANNOT start from scratch; requires a primer.' },
      { name: 'Leading Strand', definition: "Synthesized continuously in the 5' to 3' direction toward the replication fork." },
      { name: 'Lagging Strand', definition: 'Synthesized discontinuously away from the replication fork, in Okazaki fragments.' },
      { name: 'Okazaki Fragments', definition: 'Short DNA fragments synthesized on the lagging strand, later joined by DNA Ligase.' },
    ],
    diagram: `5' ─────────────────────────────────── 3'
          ↑ Helicase unwinds
    Leading strand ──────────────────► (continuous)
    Lagging strand  ◄────  ◄────  ◄── (Okazaki fragments)`,
  },
};

export const DNA_CHALLENGE: AdaptiveQuestion = {
  question: "Why can't DNA polymerase begin a new strand from nothing? What does it need before it can start?",
  rationale: 'Common misconception: DNA polymerase can independently initiate synthesis. It requires a primer from Primase.',
  targetConcept: 'Primer / Primase',
};

export const DNA_MISCONCEPTION_SCENARIO: SessionAnalysis = {
  topic: 'DNA Replication',
  concepts: [
    {
      concept: 'Helicase',
      expectedEvidence: ['unwinds double helix', 'breaks hydrogen bonds'],
      studentEvidence: ['Helicase unwinds the DNA'],
      missingEvidence: [],
      status: 'mastered',
    },
    {
      concept: 'DNA Polymerase',
      expectedEvidence: ['adds nucleotides', 'requires primer to start', 'cannot initiate independently'],
      studentEvidence: ['DNA polymerase builds the new strand'],
      missingEvidence: ['requires primer', 'cannot start from nothing'],
      status: 'potential_misconception',
      confidence: 4,
      misconceptionEvidence: 'Student described DNA Polymerase as building the new strand but did not mention the requirement for a primer from Primase. High confidence without complete understanding.',
    },
    {
      concept: 'Primase / Primer',
      expectedEvidence: ['Primase creates RNA primers', 'primer provides starting point', "3'-OH group required"],
      studentEvidence: [],
      missingEvidence: ['Primase role entirely missing', 'primer concept missing'],
      status: 'not_started',
    },
  ],
  overallStatus: 'potential_misconception',
  misconceptions: [
    {
      concept: 'DNA Polymerase initiation',
      severity: 'high',
      type: 'incorrect',
      evidence: 'Student implied DNA Polymerase can independently begin synthesis. It cannot — it requires a primer synthesized by Primase.',
    },
  ],
  recommendedAction: 'repair',
  masteryIndex: {
    conceptCoverage: 14,
    explanationQuality: 12,
    followupPerformance: 10,
    consistency: 9,
    total: 45,
  },
};

export const DNA_REPAIR: RepairContent = {
  title: "Why DNA Polymerase Can't Start From Nothing",
  challenge: "Explain the role of Primase and why DNA Polymerase needs a primer to begin synthesis.",
  visualSteps: [
    {
      step: 1,
      type: 'visual',
      content: 'DNA Polymerase can only ADD to an existing strand:',
      diagram: `DNA Polymerase can do this:
  5' ──────────────► 3'
              ▲ adds here
              │
         needs a 3'-OH

DNA Polymerase CANNOT do this:
  5' ────────  (empty) → ERROR`,
    },
    {
      step: 2,
      type: 'explanation',
      content: "Primase is an RNA polymerase that CAN start from scratch. It synthesizes a short RNA primer (~10 nucleotides) that gives DNA Polymerase the 3'-OH group it needs to begin adding DNA nucleotides.",
    },
    {
      step: 3,
      type: 'analogy',
      content: "Think of Primase as the starter motor and DNA Polymerase as the engine. The engine is powerful but cannot start itself — it needs the starter motor to get it going.",
    },
    {
      step: 4,
      type: 'challenge',
      content: 'Why does this limitation of DNA Polymerase mean the lagging strand must be synthesized in fragments (Okazaki fragments)?',
    },
  ],
};
