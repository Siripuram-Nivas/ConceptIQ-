import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MaterialProcessor } from '../src/ai/material-processor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  try {
    const content = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch { /* file not found */ }
}
loadEnv();

const globalFetch = global.fetch;
global.fetch = async (url, options) => {
  if (typeof url === 'string' && url.startsWith('/api/ai')) {
    const body = JSON.parse(options.body);
    const method = body.method;

    // Simulate network delay
    await new Promise(r => setTimeout(r, 100));

    // KILL CRITIC: Simulate a failure on the second chunk extraction request
    if (method === 'extractChunkIntelligence') {
      if (body.payload.materialText.includes('Page 2') || body.payload.materialText.includes('PAGE 2')) {
        console.log('💥 KILL CRITIC: Simulating fatal chunk failure on chunk containing Page 2');
        return new Response(JSON.stringify({ error: { message: 'Simulated chunk crash' } }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        concepts: [{ name: 'Test Concept', explanation: 'Mocked.' }],
        keyTerms: [],
        keyIdeas: [],
        importantResults: [],
        relationships: [],
        formulas: [],
        visualLimitations: [],
        tableNotes: [],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'discoverChunkTopics') {
      return new Response(JSON.stringify({
        localTopics: [{ title: 'Mock Topic', importance: 'high' }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'mergeTopicCandidates') {
      return new Response(JSON.stringify({
        documentOutline: [{ title: 'Mock Topic', level: 1, confidence: 0.9, sourceNodes: [] }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'aggregateMaterial') {
      return new Response(JSON.stringify({
        topicExplanations: [{ topic: 'Mock Topic', explanation: 'Mocked.', sourceChunks: [] }],
        relationships: [],
        formulas: [],
        documentOutline: [{ title: 'Mock Topic', level: 1, confidence: 0.9, sourceNodes: [] }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'auditCompleteness') {
      return new Response(JSON.stringify({
        coverageMatrix: [],
        omissions: [{ topic: 'Page 2 content', reason: 'extraction_failed', severity: 'high', recoverable: true }],
        isComplete: false
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return globalFetch(url, options);
};

async function run() {
  console.log('🚨 Starting Kill-Critic Integration Test...\n');
  
  const testContent = `
# TCP Three-Way Handshake
--- PAGE 1 ---
The TCP three-way handshake is used to establish a reliable connection between a client and server.
Step 1: The client sends a SYN (synchronize) packet.
${' filler text to make the chunk bigger and force a split. '.repeat(200)}

--- PAGE 2 ---
Step 2: The server receives the SYN and sends back a SYN-ACK (synchronize-acknowledge) packet.
${' more filler text to force the next chunk to be created on page 2. '.repeat(200)}

--- PAGE 3 ---
Step 3: The client receives the SYN-ACK and sends an ACK (acknowledge) packet.
The connection is now fully established.
${' even more filler text to force the final chunk on page 3. '.repeat(200)}
`;

  const processor = new MaterialProcessor();
  
  try {
    console.log('⏳ Processing material (simulating network failure on chunk 2)...');
    const result = await processor.processText(testContent, 'tcp-handshake.txt', {
      materialId: 'test-kill-critic',
      onProgress: (manifest) => {
        console.log(`[Progress] Chunk Processing: ${manifest.chunkProcessingStatus}, Completed: ${manifest.completedChunks}, Failed: ${manifest.failedChunks}`);
      }
    });

    console.log('\n✅ Kill-Critic Test Complete!');
    console.log(`- Final Aggregation Status: ${result.manifest.aggregationStatus}`);
    console.log(`- Partial Flag: ${result.manifest.isPartial}`);
    console.log(`- Omissions Recoverable: ${result.processed.omissions.some(o => o.recoverable)}`);
    console.log(`- Omissions Count: ${result.processed.omissions.length}`);
    
    if (result.manifest.isPartial && result.manifest.aggregationStatus !== 'failed') {
      console.log('\n🔥 SUCCESS: Architecture survived targeted chunk failure and built partial intelligence!');
      process.exit(0);
    } else {
      console.error('\n❌ FAILURE: Architecture did not handle partial failure correctly.');
      process.exit(1);
    }

  } catch (err) {
    console.error('\n❌ FATAL PIPELINE CRASH:', err);
    process.exit(1);
  }
}

run();
