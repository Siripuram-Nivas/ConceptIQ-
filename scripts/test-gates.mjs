import http from 'node:http';

const API_PORT = 5174;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- RUNNING TEST GATES ---');
  
  // 1. API Health
  try {
    const res = await request('GET', '/api/health');
    if (res.status === 200 && res.data?.ready) {
      console.log('PASS: API health check');
    } else {
      console.log('FAIL: API health check', res);
      process.exit(1);
    }
  } catch(e) {
    console.log('FAIL: API health check (network)', e.message);
    process.exit(1);
  }

  // 2. Tiny AI request
  try {
    const res = await request('POST', '/api/ai', {
      method: 'extractChunkIntelligence',
      payload: { materialText: 'This is a tiny test sentence. The sky is blue.', materialTitle: 'Test' }
    });
    if (res.status === 200 && res.data?.concepts) {
      console.log('PASS: Tiny AI chunk extraction');
    } else {
      console.log('FAIL: Tiny AI chunk extraction', res);
      process.exit(1);
    }
  } catch(e) {
    console.log('FAIL: Tiny AI chunk extraction (network)', e.message);
    process.exit(1);
  }

  // 3. 1-page PDF equivalent (2000 chars)
  try {
    const text = 'This is a 1-page equivalent. '.repeat(100);
    const res = await request('POST', '/api/ai', {
      method: 'extractChunkIntelligence',
      payload: { materialText: text, materialTitle: '1-Page Test' }
    });
    if (res.status === 200 && res.data?.concepts) {
      console.log('PASS: 1-page AI chunk extraction');
    } else {
      console.log('FAIL: 1-page AI chunk extraction', res);
      process.exit(1);
    }
  } catch(e) {
    console.log('FAIL: 1-page AI chunk extraction (network)', e.message);
    process.exit(1);
  }
  
  // 4. Aggregation test
  try {
    const res = await request('POST', '/api/ai', {
      method: 'aggregateMaterial',
      payload: {
        materialTitle: 'Aggregation Test',
        chunks: [
          { chunkIndex: 0, concepts: ['Sky'], keyIdeas: [], importantResults: [] },
          { chunkIndex: 1, concepts: ['Blue'], keyIdeas: [], importantResults: [] }
        ]
      }
    });
    if (res.status === 200 && res.data?.summary) {
      console.log('PASS: Aggregation');
    } else {
      console.log('FAIL: Aggregation', res);
      process.exit(1);
    }
  } catch(e) {
    console.log('FAIL: Aggregation (network)', e.message);
    process.exit(1);
  }

  console.log('ALL LOCAL TESTS PASS');
}

runTests();
