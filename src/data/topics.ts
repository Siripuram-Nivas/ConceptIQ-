import { TCP_TOPIC } from './demo/tcp-scenario';
import { DNA_TOPIC } from './demo/dna-scenario';
import type { Topic } from '../types';

export const ALL_TOPICS: Topic[] = [TCP_TOPIC, DNA_TOPIC];

export function getTopicBySlug(slug: string): Topic | undefined {
  return ALL_TOPICS.find((t) => t.slug === slug);
}
