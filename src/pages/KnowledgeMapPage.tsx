import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSessionStore } from '../store/session-store';

interface MapNode {
  id: string;
  label: string;
  status: 'mastered' | 'partial' | 'potential_misconception' | 'missing' | 'unvisited';
  evidence?: string[];
  missing?: string[];
  parentId?: string;
  level: number;
}

const TCP_NODES: MapNode[] = [
  { id: 'networks', label: 'Computer Networks', status: 'unvisited', level: 0 },
  { id: 'tcp-ip', label: 'TCP/IP', status: 'unvisited', level: 1, parentId: 'networks' },
  { id: 'tcp', label: 'TCP', status: 'unvisited', level: 2, parentId: 'tcp-ip' },
  { id: 'handshake', label: 'Three-Way Handshake', status: 'unvisited', level: 3, parentId: 'tcp' },
  { id: 'syn', label: 'SYN', status: 'unvisited', level: 4, parentId: 'handshake' },
  { id: 'syn-ack', label: 'SYN-ACK', status: 'unvisited', level: 4, parentId: 'handshake' },
  { id: 'ack', label: 'Final ACK', status: 'unvisited', level: 4, parentId: 'handshake' },
];

export function KnowledgeMapPage() {
  const { session } = useSessionStore();
  const [selected, setSelected] = useState<string | null>(null);

  // Derive node statuses from session
  const nodeMap = TCP_NODES.map((node) => {
    if (!session?.analysis) return node;
    const allAnalyses = [session.analysis, session.finalAnalysis].filter(Boolean);
    const latest = allAnalyses[allAnalyses.length - 1];
    const conceptMatch = latest?.concepts.find(
      (c) => c.concept.toLowerCase().includes(node.label.toLowerCase()) ||
        node.label.toLowerCase().includes(c.concept.toLowerCase())
    );
    if (conceptMatch) {
      return { ...node, status: conceptMatch.status as MapNode['status'], evidence: conceptMatch.studentEvidence, missing: conceptMatch.missingEvidence };
    }
    return node;
  });

  const selectedNode = nodeMap.find((n) => n.id === selected);

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 pt-8 md:pt-16 pb-32 w-full">
        <div className="mb-12 border-b border-white/[0.05] pb-10">
          <p className="text-sm font-bold uppercase tracking-widest text-accent-yellow mb-4">Learning Progress</p>
          <h1 className="font-display font-black text-[3.5rem] md:text-[5rem] lg:text-[6rem] leading-[0.85] uppercase tracking-tighter text-white mb-6">KNOWLEDGE <br/><span className="text-white/40">MAP</span></h1>
          <p className="text-xl font-bold uppercase tracking-wide text-white/60 mb-8 max-w-3xl">
            See exactly how concepts connect, what you've mastered, and where you have gaps.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <div className="space-y-3 mb-10 lg:mb-0">
              {nodeMap.map((node) => (
                <button
                  key={node.id}
                  onClick={() => setSelected(selected === node.id ? null : node.id)}
                  style={{ marginLeft: `${node.level * 24}px` }}
                  className={`flex items-center justify-between w-[calc(100%-${node.level * 24}px)] px-6 py-4 border-2 transition-all hover:translate-x-2 ${node.status === 'mastered' ? 'bg-success text-bg border-success' :
                      node.status === 'partial' ? 'bg-accent-yellow text-fg border-accent-yellow' :
                        node.status === 'potential_misconception' || node.status === 'missing' ? 'bg-warning text-bg border-warning' :
                          'bg-surface text-fg border-fg'
                    } ${selected === node.id ? 'shadow-glass border-fg' : ''}`}
                >
                  <span className="font-bold text-lg">{node.label}</span>
                  <span className="text-sm font-bold uppercase opacity-80">{node.status.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            {selectedNode ? (
              <div className="glass-panel p-8 shadow-glass sticky top-10">
                <div className="mb-6 pb-4 border-b border-border/20">
                  <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider mb-3 ${selectedNode.status === 'mastered' ? 'bg-success text-bg' :
                      selectedNode.status === 'partial' ? 'bg-accent-yellow text-fg' :
                        selectedNode.status === 'potential_misconception' || selectedNode.status === 'missing' ? 'bg-warning text-bg' :
                          'bg-fg text-bg'
                    }`}>
                    {selectedNode.status.replace('_', ' ')}
                  </span>
                  <h2 className="font-display text-3xl font-bold text-fg">{selectedNode.label}</h2>
                </div>

                {selectedNode.evidence && selectedNode.evidence.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-bold uppercase tracking-wider text-muted mb-3">Evidence Found</p>
                    <ul className="space-y-2">
                      {selectedNode.evidence.map((e, i) => (
                        <li key={i} className="flex gap-2 text-fg font-medium">
                          <span className="text-success font-bold">✓</span> {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedNode.missing && selectedNode.missing.length > 0 && (
                  <div className="mb-8">
                    <p className="text-sm font-bold uppercase tracking-wider text-muted mb-3">Missing Elements</p>
                    <ul className="space-y-2">
                      {selectedNode.missing.map((e, i) => (
                        <li key={i} className="flex gap-2 text-fg font-medium">
                          <span className="text-warning font-bold">→</span> {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedNode.status !== 'mastered' && (
                  <Link
                    to="/learn"
                    className="editorial-btn-primary w-full text-center"
                  >
                    Practice This Concept
                  </Link>
                )}
              </div>
            ) : (
              <div className="border-4 border-fg border-dashed bg-bg p-8 text-center sticky top-10">
                <p className="font-bold text-muted uppercase tracking-wider">Select a concept to see details</p>
              </div>
            )}
          </div>
        </div>

        {!session && (
          <div className="mt-16 pt-8 border-t border-border text-center">
            <p className="text-xl font-medium text-fg mb-4">Complete a TeachBack session to see your concept map.</p>
            <Link to="/learn" className="editorial-btn-outline inline-block">Start Learning</Link>
          </div>
        )}
      </div>
    </div>
  );
}
