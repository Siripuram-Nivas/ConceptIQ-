import * as React from "react";
import { useState, useEffect } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../../auth/auth-provider";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={`w-full bg-white/[0.045] border border-white/[0.14] rounded-[12px] px-4 py-3 h-[52px] md:h-[56px] text-base text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-accent-yellow transition-shadow ${className || ""}`}
      {...props}
    />
  );
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);
  
  return (
    <div className="relative">
      <Input type={showPassword ? "text" : "password"} className="pe-12" {...props} />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        className="absolute inset-y-0 end-0 flex h-full w-12 items-center justify-center text-white/50 hover:text-white focus:outline-none"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}

// ─── SVG MAP NODE ─────────────────────────────────────────────────────────────
function ConceptNode({
  x, y, label, active
}: {
  x: number; y: number; label: string; active?: boolean;
}) {
  const w = 120;
  const h = 40;
  return (
    <g className="transition-all duration-1000">
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill="rgba(255,255,255,0.055)" stroke={active ? "#FFD24A" : "rgba(255,255,255,0.13)"} strokeWidth={1} rx={8} />
      <text
        x={x} y={y + 4}
        textAnchor="middle" fontSize={11} fontWeight="bold" fill={active ? "#FFD24A" : "#FFFFFF"}
        fontFamily="Arial, sans-serif" letterSpacing="0.05em"
      >
        {label}
      </text>
    </g>
  );
}

function SignInForm() {
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') ?? '/home';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); 
    clearError();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    
    try {
      await login(email, password);
      navigate(decodeURIComponent(next), { replace: true });
    } catch (err) {
      // handled by useAuth
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold uppercase tracking-widest text-accent-yellow">WELCOME BACK.</p>
        <h1 className="text-4xl font-display font-black uppercase tracking-tight text-white">LOG IN</h1>
        <p className="text-lg font-medium text-white/60">Continue building what you actually understand.</p>
      </div>
      
      {error && (
        <div className="bg-transparent text-white text-sm font-bold uppercase tracking-wide p-4 border-l-4 border-accent-red">
          {error}
        </div>
      )}

      <form onSubmit={handleSignIn} autoComplete="on" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-white/70">Email</label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" onChange={clearError} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-xs font-bold uppercase tracking-wide text-white/70">Password</label>
          <PasswordInput id="password" name="password" required autoComplete="current-password" placeholder="••••••••" onChange={clearError} />
        </div>
        <button type="submit" disabled={isSubmitting} className="mt-2 w-full h-[52px] md:h-[56px] rounded-[10px] bg-[#FFD24A] text-black font-bold uppercase tracking-widest text-sm hover:-translate-y-[1px] hover:bg-[#ffe07a] transition-all flex items-center justify-center disabled:opacity-70 disabled:hover:translate-y-0">
          {isSubmitting ? "LOGGING IN..." : "LOG IN"} <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </form>

    </div>
  );
}

function SignUpForm() {
  const { signup, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => { 
    event.preventDefault(); 
    clearError();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await signup(name, email, password);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      // error is handled by useAuth
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold uppercase tracking-widest text-accent-yellow">START UNDERSTANDING.</p>
        <p className="text-lg font-medium text-white/60 leading-relaxed">
          Bring your material.<br/>Explain what you know.<br/>Repair what you don't.
        </p>
      </div>
      
      {error && (
        <div className="bg-transparent text-white text-sm font-bold uppercase tracking-wide p-4 border-l-4 border-accent-red">
          {error}
        </div>
      )}

      <form onSubmit={handleSignUp} autoComplete="on" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-xs font-bold uppercase tracking-wide text-white/70">Full Name</label>
          <Input id="name" name="name" type="text" placeholder="Jane Doe" required autoComplete="name" onChange={clearError} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-white/70">Email</label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" onChange={clearError} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-xs font-bold uppercase tracking-wide text-white/70">Password</label>
          <PasswordInput id="password" name="password" required autoComplete="new-password" placeholder="••••••••" onChange={clearError} />
        </div>
        <button type="submit" disabled={isSubmitting} className="mt-2 w-full h-[52px] md:h-[56px] rounded-[10px] bg-[#FFD24A] text-black font-bold uppercase tracking-widest text-sm hover:-translate-y-[1px] hover:bg-[#ffe07a] transition-all flex items-center justify-center disabled:opacity-70 disabled:hover:translate-y-0">
          {isSubmitting ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"} <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </form>

    </div>
  );
}

export function AuthUI({ initialView = "signin" }: { initialView?: "signin" | "signup" }) {
  const [isSignIn, setIsSignIn] = useState(initialView === "signin");
  const toggleForm = () => setIsSignIn((prev) => !prev);
  const navigate = useNavigate();

  useEffect(() => {
    navigate(isSignIn ? '/login' : '/signup', { replace: true });
  }, [isSignIn, navigate]);

  return (
    <div className="w-full min-h-[100svh] flex flex-col md:flex-row bg-[#05070D] overflow-hidden">
      {/* Left Panel: Form */}
      <div className="w-full md:w-[48%] flex flex-col items-center justify-center p-6 sm:p-12 md:p-8 lg:p-12 relative z-10">
        <div className="w-full max-w-[440px] flex flex-col justify-center">
          <Link to="/" className="inline-block font-display font-black text-2xl uppercase tracking-tighter text-white mb-16 hover:text-accent-yellow transition-colors">
            CONCEPTIQ
          </Link>
          
          <div className="transition-all duration-300">
            {isSignIn ? <SignInForm /> : <SignUpForm />}
          </div>
          
          <div className="mt-12 text-sm font-bold text-white/60">
            {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={toggleForm} className="uppercase tracking-wide text-white hover:text-accent-yellow hover:underline underline-offset-4 ml-2 transition-colors">
              {isSignIn ? "CREATE ONE →" : "LOG IN →"}
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel: Manifesto & Visual (Hidden on small screens) */}
      <div className="hidden md:flex flex-1 flex-col items-start justify-center relative p-12 lg:p-24 overflow-hidden border-l border-white/[0.05]">
        {/* Subtle Background Lighting */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-[radial-gradient(circle,_#8B6CFF_0%,_transparent_60%)] opacity-10 mix-blend-screen pointer-events-none" />
        
        <div className="relative z-10 max-w-[600px] w-full flex flex-col gap-24">
          
          <h2 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-white" style={{ fontSize: 'clamp(56px, 5.8vw, 100px)' }}>
            {isSignIn ? (
              <>YOU DON'T<br/>HAVE TO<br/>STUDY<br/>MORE.</>
            ) : (
              <>DON'T JUST<br/>START<br/>STUDYING.</>
            )}
            <br/>
            <span className="text-[#FFD24A]">
              {isSignIn ? "UNDERSTAND\nBETTER." : "START\nUNDERSTANDING."}
            </span>
          </h2>
          
          <div className="relative h-[240px] w-full select-none pointer-events-none">
            {/* Knowledge Network Visual */}
            <svg viewBox="0 0 400 200" className="w-full h-full overflow-visible">
              {[ 
                [80, 40, 200, 40],
                [80, 40, 80, 100],
                [80, 100, 200, 100],
                [80, 100, 80, 160],
                [80, 160, 200, 160],
                [200, 100, 320, 160]
              ].map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
              ))}
              
              <ConceptNode x={80} y={40} label="CONCEPT" />
              <ConceptNode x={200} y={40} label="TEACHBACK" active={!isSignIn} />
              
              <ConceptNode x={80} y={100} label="EVIDENCE" />
              <ConceptNode x={200} y={100} label="DIAGNOSE" />
              
              <ConceptNode x={80} y={160} label="REPAIR" />
              <ConceptNode x={200} y={160} label="RE-EXPLAIN" />
              
              <ConceptNode x={320} y={160} label="MASTER" active={isSignIn} />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
