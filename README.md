# ConceptIQ

**Understand. Explain. Master.**

ConceptIQ is a phone-first conceptual learning platform where the student teaches the AI. Instead of selecting correct answers, students explain concepts — and the AI analyzes their reasoning, detects misconceptions through evidence, and guides targeted repair.

## Core Learning Loop

```
BRING MATERIAL → EXPLAIN → CHALLENGE → DIAGNOSE → REPAIR → RE-EXPLAIN → MASTERY
```

## Features

### 📚 Bring Your Material
Upload your own PDF, text files, or paste study notes. ConceptIQ analyzes and extracts:
- Material summary
- Key concepts with definitions
- Concept relationships
- Source references
- Suggested learning path

### 🎯 Evidence-Based Learning
Instead of scoring, ConceptIQ shows:
- ✓ What you demonstrated correctly
- ⚠ What's missing
- ⚠ What needs repair

### 🏫 Adaptive Challenges
The AI asks follow-up questions based on your explanation to detect misconceptions and missing understanding.

### 🔧 Targeted Repair
Get 60-second focused repair sessions on specific knowledge gaps.

### 📊 Knowledge Map
Visual concept hierarchy showing your progress across related ideas.

## Quick Start

```bash
npm install
npm run dev
```

Then open: `http://localhost:5173`

### User Flow

**Entry A: Bring Your Material**
```
Home → Upload/Paste → Material Overview → Select Concept → TeachBack
```

**Entry B: Explore Pre-Built Concepts**
```
Home → Explore Concepts → Topic → TeachBack
```

Both paths merge into the same learning engine.

## Demo Mode

Visit `http://localhost:5173/demo` for a complete deterministic hero demo:

1. TCP Three-Way Handshake preloaded
2. Demo explanation auto-filled
3. AI challenge: "Why is the final ACK necessary?"
4. Confidence rating
5. Misconception detected with evidence
6. 60-second repair
7. Re-explanation
8. Mastery progress shown

The demo works **without any API key, microphone, or internet connection**.

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_AI_PROVIDER` | `demo` | Use `demo` (offline) or `live` (requires API key) |
| `VITE_GEMINI_API_KEY` | — | Only required when `VITE_AI_PROVIDER=live` |

> ⚠️ Never commit `.env.local`. It is gitignored.

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (mobile-first)
- Zustand (session state machine + material store)
- React Router v6
- Lucide icons
- Space Grotesk + Inter fonts

## Architecture

```
React UI
  → Zustand (session store + material store)
  → Learning Engine (evidence, mastery)
  → AIProvider
      → DemoProvider (offline, deterministic)
      → LiveAIProvider (calls /api/ai proxy)
  → MaterialProcessor (extract concepts from user material)
```

## Learning Engine

### Evidence-Based Analysis
Instead of random scoring, the AI analyzes explanations for:

```javascript
{
  concept: "TCP Three-Way Handshake",
  expectedEvidence: [
    "initiates SYN packet",
    "server responds with SYN-ACK",
    "client completes with ACK"
  ],
  studentEvidence: [
    "identified SYN",
    "identified ACK"
  ],
  missingEvidence: [
    "purpose of SYN-ACK"
  ],
  status: "partial"
}
```

### Mastery Index

Weights:
- Concept Coverage: 35%
- Explanation Quality: 25%
- Follow-up Performance: 20%
- Consistency: 20%

Evidence is always shown before and alongside any numerical score.

## Pages

- **Home** — Primary entry points: "Bring Your Material" or "Explore Concepts"
- **Add Material** — Upload PDF/TXT or paste study notes
- **Material Overview** — Display processed content, concepts, key terms, sources
- **Teach Material** — Explain a concept from uploaded material
- **Learn** — Browse pre-built topics (TCP, DNA, etc.)
- **Teach** — Explain a seeded concept
- **Analysis** — AI misconception detection with evidence
- **Repair** — Targeted 60-second concept repair
- **Mastery** — Before/after progress with evidence
- **Knowledge Map** — Visual concept hierarchy and status
- **Profile** — Learning history and progress
- **Demo** — Guided walkthrough of the complete hero experience

## Scripts

```bash
npm run dev       # Development server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint
npm run typecheck # TypeScript check
```

## Design Principles

1. **Reliability first** — Deterministic demo mode always works offline
2. **Evidence-based** — Show reasoning, not just scores
3. **Mobile-first** — Designed for phone learning
4. **User material** — Bring your own study content
5. **Adaptive** — Questions adjust based on what students show/don't show

## What ConceptIQ Is NOT

- Not a PDF summarizer
- Not a generic chatbot
- Not a flashcard app
- Not a ChatGPT wrapper
- Not focused on gamification or badges
- Not requiring camera, microphone, or OCR for MVP
