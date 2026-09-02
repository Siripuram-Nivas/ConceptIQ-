import type { Topic, SessionAnalysis, RepairContent, AdaptiveQuestion } from '../../types';

export const TCP_TOPIC: Topic = {
  id: 'tcp-three-way-handshake',
  slug: 'tcp-handshake',
  title: 'TCP Three-Way Handshake',
  subject: 'Computer Networks',
  difficulty: 'intermediate',
  estimatedMinutes: 3,
  concepts: ['SYN', 'SYN-ACK', 'ACK', 'Sequence Numbers', 'Connection Establishment', 'Final ACK Purpose'],
  description: 'How TCP establishes a reliable connection between client and server.',
  referenceContent: {
    summary: 'The TCP three-way handshake is a procedure used to establish a connection between a client and server before data transmission begins. It ensures both parties are ready to communicate and synchronizes sequence numbers.',
    keyConcepts: [
      {
        name: 'SYN',
        definition: 'Synchronize — the client initiates connection by sending a SYN packet with its initial sequence number.',
        relationships: ['sent by client first', 'contains ISN (Initial Sequence Number)'],
      },
      {
        name: 'SYN-ACK',
        definition: 'Synchronize-Acknowledge — the server acknowledges the client SYN and sends its own SYN.',
        relationships: ['acknowledges client SYN', 'server sends its own ISN', 'server is now in SYN-RECEIVED state'],
      },
      {
        name: 'Final ACK',
        definition: 'Acknowledge — the client acknowledges the server SYN-ACK, completing the handshake and establishing the connection.',
        relationships: [
          'confirms client received SYN-ACK',
          'tells server client is ready',
          'completes connection-establishment exchange',
          'server moves to ESTABLISHED state',
        ],
      },
      {
        name: 'Sequence Numbers',
        definition: 'Numbers used to track the order of bytes sent, enabling reliable in-order delivery and loss detection.',
        relationships: ['synchronized during handshake', 'basis of TCP reliability'],
      },
      {
        name: 'Connection Establishment',
        definition: 'The three-way handshake establishes a connection but does NOT itself guarantee reliable data transfer — that comes from subsequent ACKs during data exchange.',
        relationships: ['prerequisite to data transfer', 'bidirectional communication'],
      },
    ],
    diagram: `Client          Server
  │               │
  │──── SYN ─────►│  (Step 1: Client sends SYN)
  │               │
  │◄── SYN-ACK ───│  (Step 2: Server replies SYN-ACK)
  │               │
  │──── ACK ─────►│  (Step 3: Client sends ACK)
  │               │
  CONNECTION ESTABLISHED`,
  },
};

// The demo explanation the student gives (simulated)
export const DEMO_EXPLANATION = `The TCP three-way handshake works like this:
First, the client sends a SYN packet to the server to initiate a connection.
Then the server responds with a SYN-ACK, acknowledging the client's request and sending its own synchronization.
Finally, the client sends an ACK back to complete the handshake.
This establishes the connection so data can flow between client and server.`;

// The challenge question
export const DEMO_CHALLENGE: AdaptiveQuestion = {
  question: 'Why is the final ACK necessary? What would happen if the client just started sending data after receiving the SYN-ACK?',
  rationale: 'The student correctly identified all three packets but did not explain the purpose of the final ACK. This question targets that specific gap.',
  targetConcept: 'Final ACK Purpose',
};

// The student's follow-up answer (incomplete — triggers misconception)
export const DEMO_FOLLOW_UP_ANSWER = `To acknowledge the SYN-ACK from the server. It lets the server know the client received it.`;

// Initial analysis (BEFORE repair) — 72, 1 misconception
export const DEMO_INITIAL_ANALYSIS: SessionAnalysis = {
  topic: 'TCP Three-Way Handshake',
  concepts: [
    {
      concept: 'SYN',
      expectedEvidence: [
        'client initiates connection',
        'SYN packet sent first',
        'contains initial sequence number',
      ],
      studentEvidence: [
        'client sends SYN to initiate connection',
        'SYN packet identified as first step',
      ],
      missingEvidence: ['Initial Sequence Number (ISN) purpose'],
      status: 'mastered',
    },
    {
      concept: 'SYN-ACK',
      expectedEvidence: [
        'server acknowledges client SYN',
        'server sends its own synchronization',
        'server enters SYN-RECEIVED state',
      ],
      studentEvidence: [
        'server responds with SYN-ACK',
        'acknowledges client request and sends own synchronization',
      ],
      missingEvidence: [],
      status: 'mastered',
    },
    {
      concept: 'Final ACK',
      expectedEvidence: [
        'confirms client received SYN-ACK',
        'tells server the client is ready to communicate',
        'completes connection-establishment exchange',
        'server moves to ESTABLISHED state',
      ],
      studentEvidence: [
        'client sends ACK to complete handshake',
      ],
      missingEvidence: [
        'WHY the final ACK is needed — what it communicates to the server',
        'server state transition to ESTABLISHED',
        'consequence if final ACK is never received',
      ],
      status: 'potential_misconception',
      confidence: 5,
      misconceptionEvidence:
        'Student identified the ACK packet but did not explain its purpose or what it communicates. With confidence 5/5, this indicates a high-confidence incomplete understanding — the student believes they understand but the reasoning evidence is incomplete.',
    },
    {
      concept: 'Connection Establishment',
      expectedEvidence: [
        'handshake is prerequisite to data transfer',
        'establishes bidirectional communication',
        'handshake itself does not guarantee reliable data transfer',
      ],
      studentEvidence: [
        'connection established after handshake',
        'data can flow between client and server',
      ],
      missingEvidence: [
        'distinction between connection establishment and reliable data transfer',
      ],
      status: 'partial',
    },
  ],
  overallStatus: 'potential_misconception',
  misconceptions: [
    {
      concept: 'Final ACK',
      severity: 'medium',
      type: 'missing_relationship',
      evidence:
        'The student described the packet sequence correctly but did not establish why the final ACK is necessary or what it communicates to the server.',
      repair: undefined,
    },
  ],
  recommendedAction: 'repair',
  masteryIndex: {
    conceptCoverage: 25,
    explanationQuality: 18,
    followupPerformance: 13,
    consistency: 16,
    total: 72,
  },
};

// Final analysis (AFTER repair) — 91, 0 misconceptions
export const DEMO_FINAL_ANALYSIS: SessionAnalysis = {
  topic: 'TCP Three-Way Handshake',
  concepts: [
    {
      concept: 'SYN',
      expectedEvidence: [
        'client initiates connection',
        'SYN packet sent first',
        'contains initial sequence number',
      ],
      studentEvidence: [
        'client sends SYN to initiate connection',
        'SYN packet identified as first step',
      ],
      missingEvidence: [],
      status: 'mastered',
    },
    {
      concept: 'SYN-ACK',
      expectedEvidence: [
        'server acknowledges client SYN',
        'server sends its own synchronization',
      ],
      studentEvidence: [
        'server responds with SYN-ACK',
        'acknowledges client and synchronizes',
      ],
      missingEvidence: [],
      status: 'mastered',
    },
    {
      concept: 'Final ACK',
      expectedEvidence: [
        'confirms client received SYN-ACK',
        'tells server the client is ready',
        'completes connection-establishment exchange',
        'server moves to ESTABLISHED state',
      ],
      studentEvidence: [
        'client sends ACK to confirm receipt of SYN-ACK',
        'tells the server the client is ready',
        'server needs this to move to ESTABLISHED state',
        'without it server stays in SYN-RECEIVED and may timeout',
      ],
      missingEvidence: [],
      status: 'mastered',
    },
    {
      concept: 'Connection Establishment',
      expectedEvidence: [
        'handshake is prerequisite to data transfer',
        'establishes bidirectional communication',
      ],
      studentEvidence: [
        'both sides synchronized after handshake',
        'bidirectional communication established',
        'prerequisite for data transfer',
      ],
      missingEvidence: [],
      status: 'mastered',
    },
  ],
  overallStatus: 'mastered',
  misconceptions: [],
  recommendedAction: 'mastered',
  masteryIndex: {
    conceptCoverage: 33,
    explanationQuality: 23,
    followupPerformance: 19,
    consistency: 16,
    total: 91,
  },
};

// 60-second repair content
export const TCP_REPAIR_CONTENT: RepairContent = {
  title: 'Why the Final ACK Completes the Handshake',
  challenge: "Now explain: what does the final ACK tell the server, and why can't the server assume the client is ready without it?",
  visualSteps: [
    {
      step: 1,
      type: 'visual',
      content: "The three-way handshake from the server's perspective:",
      diagram: `Client          Server
  │               │
  │──── SYN ─────►│  Server knows: "Client wants to connect"
  │               │  Server state: SYN-RECEIVED
  │◄── SYN-ACK ───│  Server sends its own SYN
  │               │  Server is waiting...
  │──── ACK ─────►│  Server knows: "Client got my SYN-ACK"
  │               │  Server state: ESTABLISHED ✓`,
    },
    {
      step: 2,
      type: 'explanation',
      content:
        "After sending SYN-ACK, the server is in SYN-RECEIVED state — it has committed resources but does NOT yet know if the client received its SYN-ACK. The server cannot move to ESTABLISHED without proof that its SYN-ACK arrived.",
    },
    {
      step: 3,
      type: 'analogy',
      content:
        "Think of it like a phone call: you dial (SYN), the other person picks up and says 'hello?' (SYN-ACK). Without you saying 'hello, I can hear you' (ACK), they don't know if you heard them — the call isn't truly connected yet.",
    },
    {
      step: 4,
      type: 'challenge',
      content:
        "What happens if the final ACK is lost in transit? The server stays in SYN-RECEIVED state and will eventually time out and retry the SYN-ACK — the connection cannot be established until the ACK arrives.",
    },
  ],
};
