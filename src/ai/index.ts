import { DemoProvider } from './demo-provider';
import { LiveAIProvider } from './live-provider';
import type { AIProvider } from './types';

let _provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_provider) return _provider;
  const aiMode = import.meta.env.VITE_AI_PROVIDER ?? 'demo';
  _provider = aiMode === 'live' ? new LiveAIProvider() : new DemoProvider();
  return _provider;
}

export function isDemoMode(): boolean {
  return (import.meta.env.VITE_AI_PROVIDER ?? 'demo') !== 'live';
}

export type { AIProvider };
