interface Props {
  stages?: string[];
  currentStage?: number;
  label?: string;
}

const DEFAULT_STAGES = [
  'Listening to your explanation...',
  'Analyzing reasoning...',
  'Mapping concepts...',
  'Checking for gaps...',
  'Preparing a challenge...',
];

export function LoadingState({ stages = DEFAULT_STAGES, currentStage = 0, label }: Props) {
  return (
    <div className="flex flex-col items-center gap-6 py-12" aria-live="polite" aria-busy="true">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-ai/20" />
        <div className="absolute inset-0 rounded-full border-2 border-ai border-t-transparent animate-spin" />
      </div>
      <div className="text-center space-y-2">
        <p className="font-medium text-fg">{label ?? stages[currentStage]}</p>
        <div className="flex gap-1 justify-center">
          {stages.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i <= currentStage ? 'bg-ai' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
