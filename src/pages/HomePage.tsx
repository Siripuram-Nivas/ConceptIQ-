import { Link } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';
import { isDemoMode } from '../ai';
import { useStudySpaceStore } from '../store/study-space-store';

export function HomePage() {
  const demo = isDemoMode();
  const { studySpaces, materials, knowledgeMaps } = useStudySpaceStore();

  // Show most recent study space if available
  const recentSpace = studySpaces.length > 0
    ? [...studySpaces].sort((a, b) => new Date(b.lastStudiedAt || b.updatedAt).getTime() - new Date(a.lastStudiedAt || a.updatedAt).getTime())[0]
    : null;

  // Recent materials
  const recentMaterials = [...materials]
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 4);

  // Recent learning history
  const recentHistory = studySpaces
    .flatMap(space => space.history || [])
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  // Focus Next (find weak or partial concepts)
  let focusNext = null;
  for (const map of knowledgeMaps) {
    const nextNode = map.nodes.find(n => ['weak', 'partial', 'potential_misconception'].includes(n.status));
    if (nextNode) {
      const space = studySpaces.find(s => s.id === map.studySpaceId);
      if (space) {
        focusNext = { space, node: nextNode };
        break;
      }
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 pt-10 pb-32">
        {demo && (
          <div className="mb-6">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-fg bg-surface text-fg font-bold text-xs uppercase tracking-wide hover:-translate-y-0.5 hover:shadow-editorial transition-all"
            >
              Run Hero Demo
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* HERO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-20 lg:mb-32">
          <div className="lg:col-span-8">
            <h1 className="font-display text-display-xl text-surface bg-fg p-6 lg:p-10 -ml-5 lg:-ml-10 rounded-r-3xl leading-none shadow-editorial mb-8 inline-block">
              DON'T JUST <br />
              READ IT. <br />
              <span className="text-accent-yellow">EXPLAIN IT.</span>
            </h1>
            <p className="text-lg lg:text-xl font-medium text-fg max-w-xl leading-relaxed mb-10 border-l-4 border-fg pl-6 py-2">
              ConceptIQ turns your study material into a living knowledge system — then tests whether you actually understand it.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/add-material" className="editorial-btn-primary text-lg">
                Bring Your Material
              </Link>
              <Link to="/study-spaces" className="editorial-btn-outline text-lg">
                Explore Your Knowledge
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* MAIN COLUMN (LEFT) */}
          <div className="lg:col-span-8 space-y-16">

            {/* CONTINUE LEARNING */}
            {recentSpace && (
              <section>
                <h2 className="font-display text-2xl font-bold uppercase tracking-tight mb-4">Continue Where You Left Off</h2>
                <div className="editorial-card p-6 lg:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-4 border-fg">
                  <div>
                    <span className="inline-block px-3 py-1 bg-fg text-bg text-xs font-bold uppercase tracking-wider mb-3">Study Space</span>
                    <h3 className="font-display text-3xl font-bold text-fg mb-2">{recentSpace.title}</h3>
                    <p className="text-muted font-medium">
                      {recentSpace.progress.conceptsMastered} concepts mastered • {recentSpace.progress.conceptsWeak} need attention
                    </p>
                  </div>
                  <Link to={`/study-space/${recentSpace.id}`} className="editorial-btn-accent whitespace-nowrap w-full md:w-auto">
                    Continue Learning
                  </Link>
                </div>
              </section>
            )}

            {/* FOCUS NEXT */}
            {focusNext && (
              <section>
                <div className="border-4 border-fg bg-accent-pink p-6 lg:p-10 shadow-editorial">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                      <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-fg mb-2">Focus Next</h2>
                      <h3 className="text-xl font-bold text-fg mb-2">{focusNext.node.label}</h3>
                      <p className="text-fg/80 font-medium">
                        You're close, but this concept is currently marked as <span className="uppercase font-bold">{focusNext.node.status.replace('_', ' ')}</span> in your Knowledge Map.
                      </p>
                    </div>
                    <Link to={`/teach-material/${focusNext.space.materialIds?.[0] || 'unknown'}?concept=${encodeURIComponent(focusNext.node.label)}`} className="editorial-btn-primary whitespace-nowrap bg-bg text-fg border-fg hover:bg-bg/90">
                      Practice Now
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* RECENT MATERIALS */}
            {recentMaterials.length > 0 && (
              <section>
                <h2 className="font-display text-2xl font-bold uppercase tracking-tight mb-4 flex items-center justify-between">
                  <span>Your Material</span>
                  <Link to="/add-material" className="text-sm font-bold underline hover:text-accent-purple transition-colors">Add New</Link>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentMaterials.map((material) => (
                    <Link key={material.id} to={`/material-overview/${material.id}`} className="group editorial-card border-4 border-fg p-5 flex flex-col justify-between min-h-[160px]">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <FileText size={16} className="text-accent-purple" />
                          <span className="text-xs font-bold text-muted uppercase tracking-wide">Document</span>
                        </div>
                        <h3 className="font-display text-xl font-bold text-fg group-hover:text-accent-purple transition-colors line-clamp-2">{material.title}</h3>
                      </div>
                      <div className="flex justify-between items-end mt-4">
                        <p className="text-xs font-bold text-muted uppercase">
                          {material.processedContent?.concepts?.length || 0} Concepts
                        </p>
                        <ArrowRight size={20} className="text-fg group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* SIDEBAR (RIGHT) */}
          <div className="lg:col-span-4 space-y-16">

            {/* YOUR KNOWLEDGE */}
            <section>
              <div className="editorial-card border-4 border-fg bg-fg text-bg p-6 lg:p-8">
                <h2 className="font-display text-2xl font-bold uppercase tracking-tight mb-6 text-accent-yellow">Your Knowledge</h2>
                <div className="space-y-6">
                  <div className="flex items-end justify-between border-b border-bg/20 pb-4">
                    <span className="text-sm font-medium uppercase tracking-wide">Study Spaces</span>
                    <span className="font-display text-3xl font-bold leading-none">{studySpaces.length}</span>
                  </div>
                  <div className="flex items-end justify-between border-b border-bg/20 pb-4">
                    <span className="text-sm font-medium uppercase tracking-wide">Concepts Mastered</span>
                    <span className="font-display text-3xl font-bold leading-none text-success">
                      {studySpaces.reduce((acc, space) => acc + space.progress.conceptsMastered, 0)}
                    </span>
                  </div>
                </div>
                <Link to="/map" className="editorial-btn-accent w-full mt-8">
                  View Knowledge Map
                </Link>
              </div>
            </section>

            {/* LEARNING HISTORY */}
            {recentHistory.length > 0 && (
              <section>
                <h2 className="font-display text-xl font-bold uppercase tracking-tight mb-6">Learning Journal</h2>
                <div className="border-l-4 border-fg pl-6 space-y-8 py-2">
                  {recentHistory.map((activity) => (
                    <div key={activity.id} className="relative">
                      <div className="absolute -left-[32px] top-1 w-4 h-4 bg-fg rounded-full" />
                      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">
                        {new Date(activity.timestamp).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} • {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="font-bold text-fg text-base">{activity.title}</p>
                      <p className="text-sm text-fg/80 mt-1">{activity.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
