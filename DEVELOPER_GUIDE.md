# Quick Start: Using "Bring Your Material"

## For Users (30-Second Experience)

### Step 1: Upload
```
Home → "Bring Your Material" button
  ↓
Choose upload method:
  • Drag PDF/TXT file
  • Click to select file
  • Or paste study notes
  ↓
Click "Analyze Material"
```

### Step 2: Review
```
See your material processing:
  ✓ Document title
  ✓ Summary of content
  ✓ Extracted concepts
  ✓ Key terms defined
  ✓ Related concepts shown
```

### Step 3: Learn
```
Pick a concept from the overview
  ↓
Click "Teach [Concept]"
  ↓
Explain what you understand
  ↓
Get AI feedback on gaps
  ↓
Fix weak areas
  ↓
See progress
```

---

## For Developers: Testing New Features

### Local Development
```bash
# Terminal 1: Start dev server
npm run dev

# Opens on http://localhost:5173
```

### Test Cases

#### 1. Material Upload
```javascript
// Test: Upload text file
Steps:
1. Click "Bring Your Material"
2. Drop a .txt file with 100+ words
3. Wait for processing (800ms)
4. Verify concepts extracted
5. Verify summary appears

Expected: No errors, instant processing
Demo Mode label should appear
```

#### 2. Paste Notes
```javascript
// Test: Paste study notes
Steps:
1. Click "Bring Your Material"
2. Paste this text:
   "Photosynthesis is the process plants use to convert light into chemical energy.
    It happens in chloroplasts. The light-dependent reactions occur in the thylakoid.
    The light-independent reactions (Calvin cycle) occur in the stroma."
3. Click "Analyze Material"
4. Wait for processing

Expected:
- Title: "Photosynthesis"
- Summary: Contains key steps
- Concepts: Photosynthesis, Chloroplasts, Thylakoid, Calvin cycle
- Key Terms: light-dependent, light-independent, stroma
```

#### 3. Full Learning Loop
```javascript
// Test: Material → Teach → Analyze → Repair → Mastery
Steps:
1. Upload material with 3+ concepts
2. Click "Teach a Concept" on first one
3. Write 50+ words explaining it
4. Submit → See analysis page
5. Review evidence breakdown
6. Answer follow-up question
7. See repair hints
8. Re-explain concept
9. View final mastery

Expected:
- No routing errors
- Evidence clearly shown
- Progress appears between steps
- Same as seeded topic flow
```

---

## Architecture for Developers

### Material Processing Flow
```
Raw Input (PDF/TXT/Text)
    ↓
MaterialProcessor.processText()
    ├─ Extract title (filename or first line)
    ├─ Split into sections
    ├─ Generate summary
    ├─ Extract concepts (capitalized terms)
    ├─ Extract key terms
    ├─ Build relationships
    └─ Create source references
    ↓
ProcessedMaterial object
    ↓
Store in useMaterialStore
    ↓
Display in MaterialOverviewPage
    ↓
Select concept → TeachMaterialPage
    ↓
Teach flow → Uses existing Learning Engine
```

### State Management
```
useMaterialStore (Zustand)
├─ materials[] — uploaded materials
├─ currentMaterialId — active material
├─ currentMaterial — full material object
└─ actions:
    ├─ addMaterial(file, text) → async process
    ├─ selectMaterial(id)
    ├─ deleteMaterial(id)
    └─ getMaterialById(id)
```

### Routing
```
/                          → HomePage
  ├─ "Bring Your Material" → /add-material
  ├─ "Explore Concepts"    → /learn
  └─ "View Knowledge Map"  → /map

/add-material
  → Upload/paste
  → Process (useMaterialStore.addMaterial)
  → Navigate to /material-overview

/material-overview
  → Display ProcessedMaterial
  → Select concept button
  → "Teach [Concept]" → /teach-material/:materialId?concept=X

/teach-material/:materialId
  → Reuse TeachBackRecorder
  → submitExplanation() → /analysis
  → Same as seeded topics from here
```

---

## Extending the System

### To Add Real PDF Parsing
```typescript
// In material-processor.ts, replace processText():
import * as pdfjsLib from 'pdfjs-dist';

async processPDF(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(it => it.str).join(' ');
  }
  return this.processText(text, file.name);
}
```

### To Add Live AI Processing
```typescript
// Create new class: AIProcessor
export class AIProcessor {
  async processMaterial(content: string) {
    const response = await fetch('/api/ai/process-material', {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    return response.json(); // ProcessedMaterial
  }
}

// In AddMaterialPage, switch processors:
const processor = isDemoMode() 
  ? new MaterialProcessor() 
  : new AIProcessor();
```

### To Add Material Library
```typescript
// Extend useMaterialStore:
interface MaterialStore {
  // ... existing
  savedMaterials: UploadedMaterial[];
  saveMaterial: (material: UploadedMaterial) => void;
  loadMaterials: () => Promise<void>;
}

// Add new page: /materials
// List all saved materials
// Download/share options
```

### To Add Voice Upload
```typescript
// New component: VoiceRecorder
export function VoiceRecorder() {
  const handleRecord = async () => {
    const mediaRecorder = new MediaRecorder(stream);
    // ... recording logic
    const blob = await stopRecording();
    const text = await transcribeWithWhisper(blob);
    await addMaterial(null, text);
  };
}
```

---

## Common Issues & Fixes

### Issue: Uploaded file not processing
**Cause:** File too large or encoding issue
**Fix:** MaterialProcessor has 500KB limit, restart if needed

### Issue: Concepts not extracted
**Cause:** Content doesn't have capitalized terms
**Fix:** Processor looks for capitalized words, add headers to notes

### Issue: "Go back" on MaterialOverviewPage breaks flow
**Cause:** currentMaterial not persisted
**Fix:** Use useMaterialStore.selectMaterial() to restore state

### Issue: Material lost on page refresh
**Cause:** Store is in-memory only
**Fix:** Add localStorage persistence (post-MVP)

---

## Demo Mode Guarantees

When `VITE_AI_PROVIDER=demo`:
- ✅ ProcessedMaterial always generated successfully
- ✅ Processing time: 800ms (deterministic)
- ✅ Same input → same output (repeatable)
- ✅ No network calls
- ✅ Works offline
- ✅ Labeled "Demo Mode" on UI

This ensures the demo always works for judges, even if you haven't implemented real API yet.

---

## Performance Notes

### Processing Time
- Small text (<5KB): ~800ms
- Medium text (5-50KB): ~800ms
- Large text (>50KB): ~800ms
(All artificial delay for UX realism)

### Concept Extraction Limits
- Max concepts: 8 (to keep list focused)
- Max key terms: 6
- Max source references: 3
- Prevents overwhelming UI

### Bundle Size Impact
- material-processor.ts: ~6KB
- material-store.ts: ~3KB
- 3 new pages: ~13KB
- Total: ~22KB (minified, reasonable for hackathon)

---

## Debugging

### Enable verbose logging
```typescript
// In material-store.ts:
async addMaterial(file, text) {
  console.log('[Material] Processing:', file?.name || 'pasted text');
  const processor = createMaterialProcessor();
  const processed = await processor.processText(text, file?.name);
  console.log('[Material] Result:', processed);
  // ...
}
```

### Check store state
```typescript
// In browser console:
import { useMaterialStore } from './store/material-store';
const store = useMaterialStore.getState();
console.log(store.materials);
console.log(store.currentMaterial);
```

### Verify routes
```bash
# Check all routes working
curl http://localhost:5173/
curl http://localhost:5173/add-material
curl http://localhost:5173/material-overview
curl http://localhost:5173/teach-material/test-id
```

---

## Production Checklist

Before shipping (post-hackathon):
- [ ] Add localStorage persistence
- [ ] Implement real PDF extraction
- [ ] Add live API provider
- [ ] User authentication
- [ ] Material sharing/library
- [ ] Analytics & tracking
- [ ] Error monitoring (Sentry)
- [ ] Progressive Web App
- [ ] Offline first (Service Workers)

---

**Status:** Ready for demo ✅
