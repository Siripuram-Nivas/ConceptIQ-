import { DemoProvider } from './src/ai/demo-provider';
import type { LearningSession } from './src/types';

async function run() {
  const provider = new DemoProvider();
  
  const dummySession = {
    topicId: 'tcp-three-way-handshake',
  } as LearningSession;

  console.log("--- INPUT A ---");
  const resA = await provider.analyzeExplanation(dummySession, "TCP uses SYN, SYN-ACK and ACK to establish a connection.");
  console.log(JSON.stringify(resA, null, 2));

  console.log("--- INPUT B ---");
  const resB = await provider.analyzeExplanation(dummySession, "TCP is a protocol for storing database records.");
  console.log(JSON.stringify(resB, null, 2));

  console.log("--- INPUT C ---");
  const resC = await provider.analyzeExplanation(dummySession, "TCP uses DNS to translate domain names.");
  console.log(JSON.stringify(resC, null, 2));
}

run().catch(console.error);
