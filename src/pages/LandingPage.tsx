import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { CinematicFooter } from '../components/ui/motion-footer';
import { LandingNav } from '../components/LandingNav';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ─── SVG MAP NODE ─────────────────────────────────────────────────────────────
function MapNode({
  x, y, label, status, statusColor,
}: {
  x: number; y: number; label: string; status: string; statusColor: string;
}) {
  const w = 148;
  const h = 48;
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={2} rx={0} />
      <text
        x={x} y={y - 6}
        textAnchor="middle" fontSize={10} fontWeight="bold" fill="#111111"
        fontFamily="Arial, sans-serif" letterSpacing="0.05em"
      >
        {label}
      </text>
      <rect x={x - 30} y={y + 4} width={60} height={14} fill={statusColor} />
      <text
        x={x} y={y + 15}
        textAnchor="middle" fontSize={8} fontWeight="bold" fill="#111111"
        fontFamily="Arial, sans-serif" letterSpacing="0.05em"
      >
        {status}
      </text>
    </g>
  );
}

// ─── Cinematic Hero ──────────────────────────────────────────────────────────
function CinematicHero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(contentRef.current, {
        scale: 0.92,
        opacity: 0,
        y: -60,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        }
      });
      gsap.to(bgRef.current, {
        scale: 1.05,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        }
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative w-full h-[110vh] overflow-hidden bg-bg flex flex-col items-center justify-center pt-24 md:pt-32">
      <div ref={bgRef} className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#05070D]" />
        <div className="absolute top-[20%] left-[10%] w-[50vw] h-[50vw] rounded-full mix-blend-screen opacity-30 blur-[120px] bg-[radial-gradient(circle,_#8B6CFF_0%,_transparent_70%)]" />
        <div className="absolute bottom-[10%] right-[10%] w-[40vw] h-[40vw] rounded-full mix-blend-screen opacity-20 blur-[100px] bg-[radial-gradient(circle,_#4D7CFF_0%,_transparent_70%)]" />
      </div>

      <div ref={contentRef} className="relative z-10 w-full max-w-[1440px] px-5 lg:px-10 flex flex-col items-center text-center">
        <p className="font-display font-bold text-lg uppercase tracking-widest text-fg mb-12 opacity-80">
          CONCEPTIQ
        </p>
        <h1 className="font-display font-black text-fg leading-[0.85] tracking-tighter mb-8" style={{ fontSize: 'clamp(4rem, 10vw, 9rem)' }}>
          DON'T JUST<br />
          READ IT.<br />
          <span className="text-accent-yellow">EXPLAIN IT.</span>
        </h1>
        <p className="text-lg lg:text-xl font-medium text-fg/70 max-w-2xl leading-relaxed mb-12">
          ConceptIQ turns your study material into a living knowledge system — then tests whether you actually understand it.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-24">
          <Link to="/signup" className="editorial-btn-primary text-lg px-8 py-4 bg-fg text-bg hover:bg-fg/90 transition-colors inline-flex justify-center items-center">
            START LEARNING <ArrowRight size={20} className="ml-2" />
          </Link>
          <Link to="/demo" className="editorial-btn-outline text-lg px-8 py-4 border-border text-fg hover:border-fg transition-colors inline-flex justify-center items-center">
            TRY THE DEMO <ArrowRight size={20} className="ml-2" />
          </Link>
        </div>
      </div>
      
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20">
        <span className="text-xs font-bold uppercase tracking-widest text-fg/50">SCROLL TO REVEAL</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-fg/50 to-transparent animate-pulse" />
      </div>
    </section>
  );
}

// ─── Problem Section ──────────────────────────────────────────────────────────
function ProblemSection() {
  const secRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(textRef.current, {
        opacity: 0,
        y: 40,
        duration: 1,
        scrollTrigger: {
          trigger: secRef.current,
          start: "top 70%",
        }
      });
      gsap.from(".reveal-word", {
        opacity: 0,
        y: 20,
        stagger: 0.15,
        duration: 0.8,
        scrollTrigger: {
          trigger: wordsRef.current,
          start: "top 80%",
        }
      });
    }, secRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={secRef} className="bg-bg py-32 lg:py-48" aria-labelledby="problem-heading">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 ref={textRef} className="font-display font-black text-fg leading-none mb-16" style={{ fontSize: 'clamp(3rem, 7vw, 6rem)', letterSpacing: '-0.03em' }}>
            READING<br />
            <span className="text-accent-red">≠</span><br />
            UNDERSTANDING.
          </h2>
          <p className="text-xl lg:text-2xl font-medium text-muted max-w-2xl mx-auto leading-relaxed mb-24">
            You can highlight every line, read the chapter twice, and still struggle when someone asks you to explain it.
          </p>
          <div ref={wordsRef} className="flex flex-col gap-6 items-center">
            <p className="reveal-word font-display font-black text-fg opacity-20 text-4xl lg:text-5xl">READING</p>
            <p className="reveal-word font-display font-black text-fg opacity-50 text-5xl lg:text-6xl">REMEMBERING</p>
            <p className="reveal-word font-display font-black text-fg text-6xl lg:text-8xl drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">UNDERSTANDING</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Loop Section ─────────────────────────────────────────────────────────────
function LoopSection() {
  const secRef = useRef<HTMLElement>(null);

  const steps = [
    { n: '01', title: 'BRING MATERIAL' },
    { n: '02', title: 'UNDERSTAND' },
    { n: '03', title: 'TEACHBACK' },
    { n: '04', title: 'FIND THE GAP' },
    { n: '05', title: 'REPAIR' },
    { n: '06', title: 'EXPLAIN AGAIN' },
    { n: '07', title: 'MASTER' },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".loop-heading", {
        opacity: 0,
        y: 40,
        scrollTrigger: { trigger: secRef.current, start: "top 75%" }
      });
      gsap.from(".loop-step", {
        opacity: 0,
        y: 30,
        stagger: 0.1,
        scrollTrigger: { trigger: ".loop-grid", start: "top 80%" }
      });
    }, secRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={secRef} id="how-it-works" className="bg-bg py-32 lg:py-48 border-t border-border/10">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
        <h2 className="loop-heading font-display font-black text-fg leading-[0.9] mb-24 text-center" style={{ fontSize: 'clamp(3rem, 6vw, 6rem)', letterSpacing: '-0.03em' }}>
          SO WE MAKE<br />YOU EXPLAIN IT.
        </h2>
        <div className="loop-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {steps.map((step, i) => (
            <div key={i} className="loop-step glass-panel p-6 flex flex-col">
              <span className="font-display font-black text-fg/20 text-3xl mb-4">{step.n}</span>
              <span className="font-display font-bold text-fg text-lg uppercase leading-tight">{step.title}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Evidence Section ─────────────────────────────────────────────────────────
function EvidenceSection() {
  const secRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: secRef.current,
          start: "top 60%",
          end: "bottom 80%",
          scrub: 1,
        }
      });
      
      tl.from(".ev-card-1", { opacity: 0, y: 50 })
        .from(".ev-arrow-1", { opacity: 0, scale: 0 }, "-=0.2")
        .from(".ev-card-2", { opacity: 0, y: 50 }, "-=0.2")
        .from(".ev-arrow-2", { opacity: 0, scale: 0 }, "-=0.2")
        .from(".ev-card-3", { opacity: 0, y: 50 }, "-=0.2");
        
    }, secRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={secRef} className="bg-[#0D1220] py-32 lg:py-48 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#8B6CFF_0%,_transparent_60%)] opacity-10 mix-blend-screen pointer-events-none" />
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 relative z-10">
        <h2 className="font-display font-black text-fg leading-[0.9] mb-24 text-center" style={{ fontSize: 'clamp(3rem, 6vw, 6rem)', letterSpacing: '-0.03em' }}>
          SHOW ME WHAT<br />YOU ACTUALLY KNOW.
        </h2>
        
        <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
          {/* Card 1 */}
          <div className="ev-card-1 glass-strong w-full p-8 rounded-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-muted mb-2">Student Explanation</p>
            <p className="text-lg text-fg italic">"...The server responds with a SYN-ACK. Then the client sends an ACK and the connection is established."</p>
          </div>
          
          <ArrowDown className="ev-arrow-1 text-accent-purple" size={32} />
          
          {/* Card 2 */}
          <div className="ev-card-2 glass-panel w-full p-8 rounded-2xl border-l-4 border-warning">
            <p className="text-xs font-bold uppercase tracking-widest text-warning mb-2">Missing Evidence</p>
            <p className="font-display font-bold text-fg text-xl">Purpose of the final ACK</p>
          </div>
          
          <ArrowDown className="ev-arrow-2 text-accent-green" size={32} />
          
          {/* Card 3 */}
          <div className="ev-card-3 glass-strong w-full p-8 rounded-2xl border-l-4 border-accent-green">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-green mb-2">Repair & Stronger Explanation</p>
            <p className="text-lg text-fg italic">"...The client sends a final ACK to prove it received the server's sequence number, completing the two-way verification."</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Knowledge Map Section ────────────────────────────────────────────────────
function KnowledgeMapSection() {
  const secRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".map-svg", {
        opacity: 0,
        scale: 0.9,
        scrollTrigger: { trigger: secRef.current, start: "top 60%" }
      });
      gsap.from(".map-heading-lines", {
        opacity: 0,
        x: -40,
        stagger: 0.2,
        scrollTrigger: { trigger: secRef.current, start: "top 60%" }
      });
    }, secRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={secRef} className="bg-bg py-32 lg:py-48">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-display font-black text-fg leading-[0.9] mb-8" style={{ fontSize: 'clamp(3rem, 5vw, 5.5rem)', letterSpacing: '-0.03em' }}>
              <div className="map-heading-lines">YOUR KNOWLEDGE</div>
              <div className="map-heading-lines">HAS A SHAPE.</div>
            </h2>
            <p className="map-heading-lines text-xl text-fg/60 max-w-md">
              Watch concepts connect and mastery states update as you prove your understanding.
            </p>
          </div>
          <div className="map-svg glass-panel p-8 rounded-3xl">
            <svg viewBox="0 0 700 420" className="w-full h-auto">
              {[ [350, 64, 175, 121], [350, 64, 525, 121], [175, 169, 140, 236], [175, 169, 350, 236], [525, 169, 560, 236], [525, 169, 350, 236], [350, 284, 350, 346] ].map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
              ))}
              {[
                { x: 350, y: 40,  label: "TCP 3-WAY HANDSHAKE", status: "MASTERED",  color: "#35D49A" },
                { x: 175, y: 145, label: "CLIENT",               status: "MASTERED",  color: "#35D49A" },
                { x: 525, y: 145, label: "SERVER",               status: "MASTERED",  color: "#35D49A" },
                { x: 140, y: 260, label: "SYN",                  status: "STRONG",    color: "#35D49A" },
                { x: 350, y: 260, label: "SYN-ACK",              status: "STRONG",    color: "#35D49A" },
                { x: 560, y: 260, label: "FINAL ACK",            status: "STRONG",    color: "#35D49A" },
                { x: 350, y: 370, label: "CONNECTION EST.",      status: "MASTERED",  color: "#35D49A" },
              ].map((n, i) => (
                <MapNode key={i} {...n} statusColor={n.color} />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Material Section ─────────────────────────────────────────────────────────
function MaterialSection() {
  const secRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".mat-item", {
        opacity: 0,
        y: 20,
        stagger: 0.1,
        scrollTrigger: { trigger: secRef.current, start: "top 70%" }
      });
    }, secRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={secRef} className="bg-bg py-32 lg:py-48 border-t border-border/10">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 text-center">
        <h2 className="font-display font-black text-fg leading-[0.9] mb-16 mat-item" style={{ fontSize: 'clamp(3rem, 6vw, 6rem)', letterSpacing: '-0.03em' }}>
          BRING WHAT<br />YOU'RE STUDYING.
        </h2>
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {["PDFs", "LECTURE NOTES", "ARTICLES", "SLIDES"].map((t, i) => (
            <div key={i} className="mat-item glass-panel px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider text-fg">{t}</div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/signup" className="mat-item editorial-btn-primary inline-flex justify-center items-center">TEACH THIS MATERIAL <ArrowRight size={18} className="ml-2"/></Link>
        </div>
      </div>
    </section>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <LandingNav />
      <main>
        <CinematicHero />
        <ProblemSection />
        <LoopSection />
        <EvidenceSection />
        <KnowledgeMapSection />
        <MaterialSection />
      </main>
      <CinematicFooter />
    </div>
  );
}
