"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import BingoBackground from "./components/BingoBackground";

// ─── Typing effect ───────────────────────────────────────────────────────────
const PHRASES = [
  "Ce soir à Lomé...",
  "Ce week-end à Lomé...",
  "Les meilleurs spots...",
  "Où sortir ce soir ?",
];

function useTyping(phrases: string[]) {
  const [display, setDisplay] = useState("");
  const [pi, setPi] = useState(0);
  const [ci, setCi] = useState(0);
  const [del, setDel] = useState(false);

  useEffect(() => {
    const cur = phrases[pi];
    const id = setTimeout(() => {
      if (!del) {
        setDisplay(cur.slice(0, ci + 1));
        if (ci + 1 === cur.length) setTimeout(() => setDel(true), 1800);
        else setCi((c) => c + 1);
      } else {
        setDisplay(cur.slice(0, ci - 1));
        if (ci - 1 === 0) {
          setDel(false);
          setPi((i) => (i + 1) % phrases.length);
          setCi(0);
        } else setCi((c) => c - 1);
      }
    }, del ? 70 : 130);
    return () => clearTimeout(id);
  }, [ci, del, pi, phrases]);

  return display;
}

// ─── Particles ───────────────────────────────────────────────────────────────
function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -Math.random() * 0.55 - 0.1,
      op: Math.random() * 0.5 + 0.1,
      hue: Math.random() > 0.55 ? 210 : Math.random() > 0.5 ? 45 : 175,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.op -= 0.001;
        if (p.y < 0 || p.op <= 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + 5;
          p.op = Math.random() * 0.5 + 0.2;
          p.vy = -Math.random() * 0.55 - 0.1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},80%,70%,${p.op})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
    />
  );
}

// ─── Stat counter ─────────────────────────────────────────────────────────────
function StatCard({ value, label, delay }: { value: number; label: string; delay: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      let s = 0;
      const step = Math.ceil(value / 40);
      const iv = setInterval(() => {
        s = Math.min(s + step, value);
        setCount(s);
        if (s >= value) clearInterval(iv);
      }, 28);
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div className="flex-1 text-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm py-4 px-2">
      <div className="text-2xl font-extrabold text-white tracking-tight">
        {count}+
      </div>
      <div className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const typed = useTyping(PHRASES);

  // Stats depuis Supabase
  const [stats, setStats] = useState({ lieux: 0, events: 0, interesses: 0 });

  useEffect(() => {
    const load = async () => {
      const [
        { count: lieux },
        { count: events },
        { data: evInterest },
        { data: plInterest },
      ] = await Promise.all([
        supabase.from("places").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("events").select("interest_count"),
        supabase.from("places").select("interest_count"),
      ]);

      const totalInterest =
        [...(evInterest ?? []), ...(plInterest ?? [])].reduce(
          (acc, r) => acc + (r.interest_count ?? 0), 0
        );

      setStats({
        lieux: lieux ?? 0,
        events: events ?? 0,
        interesses: totalInterest,
      });
    };
    load();
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse   { 0%{box-shadow:0 0 0 0 rgba(34,197,94,.4)} 100%{box-shadow:0 0 0 8px rgba(34,197,94,0)} }

        .fu1 { animation: fadeUp .7s ease both .10s; }
        .fu2 { animation: fadeUp .7s ease both .25s; }
        .fu3 { animation: fadeUp .7s ease both .40s; }
        .fu4 { animation: fadeUp .7s ease both .55s; }
        .fu5 { animation: fadeUp .7s ease both .70s; }
        .fu6 { animation: fadeUp .7s ease both .85s; }

        .cursor { animation: blink 1s step-end infinite; color: rgba(59,130,246,.9); }
        .live-dot { width:7px; height:7px; border-radius:50%; background:#22c55e; flex-shrink:0;
                    animation: pulse 1.5s infinite; }

        .card-cat { transition: transform .25s ease, box-shadow .25s ease; }
        .card-cat:hover { transform: translateY(-4px); }

        .btn-primary:hover  { transform: scale(1.02); }
        .btn-secondary:hover { background: rgba(255,255,255,0.12); }
      `}</style>

      <main
        className="min-h-screen relative overflow-hidden"
        style={{ background: "linear-gradient(160deg,#080c14 0%,#0d1628 50%,#080c14 100%)" }}
      >
        {/* Ambient blobs */}
        <div style={{ position:"absolute", top:"-10%", left:"-5%", width:500, height:500, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(59,130,246,.08) 0%, transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"10%", right:"-10%", width:400, height:400, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(251,191,36,.06) 0%, transparent 70%)", pointerEvents:"none" }} />

        <Particles />

        <div className="relative z-10 max-w-md mx-auto px-4 pt-5 pb-12">

          {/* ── NAVBAR ── */}
          <div className="fu1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                <span style={{ fontWeight:800, fontSize:18, color:"#000" }}>B</span>
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:16, color:"#fff" }}>Bingo</div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest">Lomé</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.push("/events")}
                className="text-sm border border-white/20 text-white/70 px-3 py-2 rounded-xl hover:bg-white/10 transition"
              >
                Events
              </button>
              <button
                onClick={() => router.push("/places")}
                className="text-sm border border-white/20 text-white/70 px-3 py-2 rounded-xl hover:bg-white/10 transition"
              >
                Places
              </button>
            </div>
          </div>

          {/* ── LIVE BADGE ── */}
          <div className="fu2 mt-8">
            <span className="inline-flex items-center gap-2 text-[11px] text-white/60 uppercase tracking-widest
              bg-green-500/8 border border-green-500/20 px-3 py-1.5 rounded-full">
              <span className="live-dot" />
              En ce moment à Lomé
            </span>
          </div>

          {/* ── HERO TITLE ── */}
          <div className="fu3 mt-4">
            <h1 style={{ fontSize:26, fontWeight:700, lineHeight:1.2, letterSpacing:"-0.5px", color:"#fff" }}>
              {typed}<span className="cursor">|</span>
            </h1>
            <p className="mt-3 text-[15px] text-white/50 leading-relaxed max-w-xs">
              Bars, clubs, restos, hôtels et events — tout Lomé en un seul endroit.
            </p>
          </div>

          {/* ── CTA ── */}
          <div className="fu4 mt-6 flex gap-3">
            <button
              onClick={() => router.push("/events")}
              className="btn-primary flex-1 bg-white text-black font-semibold text-sm rounded-2xl py-3.5 transition"
            >
              🎉 Voir les Events
            </button>
            <button
              onClick={() => router.push("/places")}
              className="btn-secondary flex-1 border border-white/20 text-white text-sm rounded-2xl py-3.5 transition"
              style={{ backdropFilter:"blur(10px)" }}
            >
              📍 Explorer Places
            </button>
          </div>

          {/* ── STATS ── */}
          <div className="fu5 mt-6 flex gap-3">
            <StatCard value={stats.lieux}      label="Lieux"      delay={600} />
            <StatCard value={stats.events}     label="Events"     delay={750} />
            <StatCard value={stats.interesses} label="Intéressés" delay={900} />
          </div>

          {/* ── CATEGORY CARDS ── */}
          <div className="fu6 mt-8">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-4">Explorer par catégorie</div>

            {/* Events */}
            <div
              onClick={() => router.push("/events")}
              className="card-cat cursor-pointer rounded-2xl p-5 mb-3 flex items-center justify-between"
              style={{
                border:"1px solid rgba(59,130,246,.2)",
                background:"linear-gradient(135deg,rgba(59,130,246,.12) 0%,rgba(59,130,246,.03) 100%)",
                backdropFilter:"blur(20px)",
                boxShadow:"0 0 40px rgba(59,130,246,.08)",
              }}
            >
              <div>
                <div className="text-2xl mb-1">🎵</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>
                  Sorties & Events
                </div>
                <div className="text-xs text-white/40 mt-1">Concerts · Clubs · Afterworks</div>
                <div className="mt-3 inline-flex items-center text-xs px-2.5 py-1 rounded-lg"
                  style={{ color:"rgba(59,130,246,.9)", background:"rgba(59,130,246,.1)", border:"1px solid rgba(59,130,246,.2)" }}>
                  Ce soir · Week-end · À venir →
                </div>
              </div>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background:"rgba(59,130,246,.12)", border:"1px solid rgba(59,130,246,.2)" }}>
                🎉
              </div>
            </div>

            {/* Places */}
            <div
              onClick={() => router.push("/places")}
              className="card-cat cursor-pointer rounded-2xl p-5 flex items-center justify-between"
              style={{
                border:"1px solid rgba(251,191,36,.2)",
                background:"linear-gradient(135deg,rgba(251,191,36,.08) 0%,rgba(251,191,36,.02) 100%)",
                backdropFilter:"blur(20px)",
                boxShadow:"0 0 40px rgba(251,191,36,.06)",
              }}
            >
              <div>
                <div className="text-2xl mb-1">🏙️</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>
                  Bars, Restos & Plus
                </div>
                <div className="text-xs text-white/40 mt-1">Bar/Resto · Hôtels · Clubs · Loisirs</div>
                <div className="mt-3 inline-flex items-center text-xs px-2.5 py-1 rounded-lg"
                  style={{ color:"rgba(251,191,36,.9)", background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.2)" }}>
                  Maps · WhatsApp · Insta →
                </div>
              </div>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background:"rgba(251,191,36,.1)", border:"1px solid rgba(251,191,36,.2)" }}>
                📍
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="mt-10 text-center text-[10px] text-white/20 uppercase tracking-widest">
            Bingo · Lomé · 228
          </div>

        </div>
      </main>
    </>
  );
}
