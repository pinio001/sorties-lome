"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import BingoBackground from "./components/BingoBackground";

const PHRASES = ["Ce soir à Lomé...", "Ce week-end à Lomé...", "Les meilleurs spots...", "Où sortir ce soir ?"];

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
        if (ci - 1 === 0) { setDel(false); setPi((i) => (i + 1) % phrases.length); setCi(0); }
        else setCi((c) => c - 1);
      }
    }, del ? 70 : 130);
    return () => clearTimeout(id);
  }, [ci, del, pi, phrases]);
  return display;
}

function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.3, vx: (Math.random() - 0.5) * 0.35,
      vy: -Math.random() * 0.55 - 0.1, op: Math.random() * 0.5 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.op -= 0.001;
        if (p.y < 0 || p.op <= 0) {
          p.x = Math.random() * canvas.width; p.y = canvas.height + 5;
          p.op = Math.random() * 0.5 + 0.2; p.vy = -Math.random() * 0.55 - 0.1;
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.op * 0.4})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:0 }} />;
}

function StatCard({ value, label, delay }: { value: number; label: string; delay: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      let s = 0; const step = Math.ceil(value / 40);
      const iv = setInterval(() => { s = Math.min(s + step, value); setCount(s); if (s >= value) clearInterval(iv); }, 28);
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <div className="flex-1 text-center rounded-2xl py-4 px-2"
      style={{ border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)", backdropFilter:"blur(10px)" }}>
      <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:24, color:"#fff", letterSpacing:"-1px" }}>{count}+</div>
      <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:"0.12em", marginTop:3 }}>{label}</div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const typed = useTyping(PHRASES);
  const [stats, setStats] = useState({ lieux: 0, events: 0, interesses: 0 });

  useEffect(() => {
    const load = async () => {
      const [{ count: lieux }, { count: events }, { data: evInterest }, { data: plInterest }] =
        await Promise.all([
          supabase.from("places").select("*", { count: "exact", head: true }),
          supabase.from("events").select("*", { count: "exact", head: true }),
          supabase.from("events").select("interest_count"),
          supabase.from("places").select("interest_count"),
        ]);
      const totalInterest = [...(evInterest ?? []), ...(plInterest ?? [])].reduce(
        (acc, r) => acc + (r.interest_count ?? 0), 0
      );
      setStats({ lieux: lieux ?? 0, events: events ?? 0, interesses: totalInterest });
    };
    load();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        .home-root { font-family:'DM Sans',sans-serif; }
        .home-root .syne { font-family:'Syne',sans-serif; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulseDot { 0%{box-shadow:0 0 0 0 rgba(74,222,128,.4)} 100%{box-shadow:0 0 0 8px rgba(74,222,128,0)} }

        .fu1{animation:fadeUp .7s ease both .10s} .fu2{animation:fadeUp .7s ease both .25s}
        .fu3{animation:fadeUp .7s ease both .40s} .fu4{animation:fadeUp .7s ease both .55s}
        .fu5{animation:fadeUp .7s ease both .70s} .fu6{animation:fadeUp .7s ease both .85s}

        .cursor { animation:blink 1s step-end infinite; color:rgba(255,255,255,.6); }
        .live-dot { width:7px;height:7px;border-radius:50%;background:#4ade80;flex-shrink:0;animation:pulseDot 1.5s infinite; }

        .card-cat { transition:transform .25s ease, box-shadow .25s ease; }
        .card-cat:hover { transform:translateY(-5px); box-shadow:0 20px 50px rgba(0,0,0,.5); }

        .btn-primary { transition:transform .2s ease, box-shadow .2s ease; }
        .btn-primary:hover { transform:scale(1.02); box-shadow:0 8px 30px rgba(255,255,255,.15); }
        .btn-secondary { transition:background .2s ease, transform .2s ease; }
        .btn-secondary:hover { background:rgba(255,255,255,.1); transform:scale(1.01); }
      `}</style>

      <main className="home-root min-h-screen relative overflow-hidden"
        style={{ background:"linear-gradient(160deg,#060a12 0%,#0c1220 50%,#060a12 100%)" }}>

        {/* Subtle blue glow blobs */}
        <div style={{ position:"absolute", top:"-5%", left:"-5%", width:500, height:500, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(100,150,255,.06) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"5%", right:"-8%", width:400, height:400, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(100,150,255,.04) 0%,transparent 70%)", pointerEvents:"none" }} />

        <Particles />
        <BingoBackground />

        {/* NAVBAR */}
        <div className="relative z-10 px-4 lg:px-12 pt-5">
          <div className="fu1 flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                <span style={{ fontWeight:900, fontSize:18, color:"#000", fontFamily:"Syne" }}>B</span>
              </div>
              <div>
                <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:16, color:"#fff" }}>Bingo</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:"0.1em" }}>Lomé</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => router.push("/places")}
                className="text-sm border border-white/15 text-white/70 px-3 py-2 rounded-xl hover:bg-white/8 transition">
                Places
              </button>
              <button onClick={() => router.push("/events")}
                className="text-sm border border-white/15 text-white/70 px-3 py-2 rounded-xl hover:bg-white/8 transition">
                Events
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 lg:px-12 pt-6 pb-12">
          <div className="lg:grid lg:grid-cols-2 lg:gap-20 lg:items-center lg:min-h-[82vh]">

            {/* LEFT : Hero */}
            <div className="max-w-md mx-auto lg:max-w-none lg:mx-0">

              {/* Live badge */}
              <div className="fu2">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ fontSize:11, color:"#4ade80", textTransform:"uppercase", letterSpacing:"0.12em",
                    background:"rgba(74,222,128,.08)", border:"1px solid rgba(74,222,128,.2)" }}>
                  <span className="live-dot" />
                  En ce moment à Lomé
                </span>
              </div>

              {/* Title */}
              <div className="fu3 mt-4">
                <h1 style={{ fontFamily:"Syne", fontWeight:800, fontSize:"clamp(26px,3.5vw,54px)",
                  lineHeight:1.12, letterSpacing:"-1px", color:"#fff" }}>
                  {typed}<span className="cursor">|</span>
                </h1>
                <p style={{ marginTop:12, color:"rgba(255,255,255,.5)", lineHeight:1.7, fontSize:"clamp(14px,1.2vw,16px)" }}>
                  Bars, clubs, restos, hôtels et events — tout Lomé en un seul endroit.
                </p>
              </div>

              {/* CTA */}
              <div className="fu4 mt-7 flex gap-3">
                <button onClick={() => router.push("/places")}
                  className="btn-primary flex-1 bg-white text-black font-semibold rounded-2xl py-3.5"
                  style={{ fontFamily:"DM Sans", fontSize:"clamp(13px,1vw,15px)" }}>
                  📍 Explorer Places
                </button>
                <button onClick={() => router.push("/events")}
                  className="btn-secondary flex-1 rounded-2xl py-3.5 text-white"
                  style={{ border:"1px solid rgba(255,255,255,.2)", backdropFilter:"blur(10px)",
                    background:"rgba(255,255,255,0.1)", fontFamily:"DM Sans", fontSize:"clamp(13px,1vw,15px)" }}>
                  🎉 Voir les Events
                </button>
              </div>

              {/* Stats */}
              <div className="fu5 mt-5 flex gap-3">
                <StatCard value={stats.lieux}      label="Lieux"      delay={600} />
                <StatCard value={stats.events}     label="Events"     delay={750} />
                <StatCard value={stats.interesses} label="Intéressés" delay={900} />
              </div>
            </div>

            {/* RIGHT : Category cards */}
            <div className="fu6 mt-10 lg:mt-0">
              <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:"0.15em", marginBottom:16 }}>
                Explorer par catégorie
              </div>

              {/* Events card */}
              <div onClick={() => router.push("/events")}
                className="card-cat cursor-pointer rounded-2xl p-5 lg:p-7 mb-4 flex items-center justify-between"
                style={{
                  border:"1px solid rgba(59,130,246,.2)",
                  background:"linear-gradient(135deg,rgba(59,130,246,.12) 0%,rgba(59,130,246,.03) 100%)",
                  backdropFilter:"blur(20px)",
                }}>
                <div>
                  <div style={{ fontSize:28, marginBottom:4 }}>🎵</div>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:"clamp(15px,1.3vw,20px)", color:"#fff" }}>
                    Sorties & Events
                  </div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:4 }}>Concerts · Clubs · Afterworks</div>
                  <div className="mt-3 inline-flex items-center text-xs px-2.5 py-1 rounded-lg"
                    style={{ color:"rgba(255,255,255,.7)", background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.15)" }}>
                    Ce soir · Week-end · À venir →
                  </div>
                </div>
                <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full flex items-center justify-center flex-shrink-0 text-2xl lg:text-3xl"
                  style={{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)" }}>
                  🎉
                </div>
              </div>

              {/* Places card */}
              <div onClick={() => router.push("/places")}
                className="card-cat cursor-pointer rounded-2xl p-5 lg:p-7 flex items-center justify-between"
                style={{
                  border:"1px solid rgba(251,191,36,.2)",
                  background:"linear-gradient(135deg,rgba(251,191,36,.08) 0%,rgba(251,191,36,.02) 100%)",
                  backdropFilter:"blur(20px)",
                }}>
                <div>
                  <div style={{ fontSize:28, marginBottom:4 }}>🏙️</div>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:"clamp(15px,1.3vw,20px)", color:"#fff" }}>
                    Bars, Restos & Plus
                  </div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:4 }}>Bar/Resto · Hôtels · Clubs · Loisirs</div>
                  <div className="mt-3 inline-flex items-center text-xs px-2.5 py-1 rounded-lg"
                    style={{ color:"rgba(255,255,255,.7)", background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.15)" }}>
                    Maps · WhatsApp · Insta →
                  </div>
                </div>
                <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full flex items-center justify-center flex-shrink-0 text-2xl lg:text-3xl"
                  style={{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)" }}>
                  📍
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div style={{ marginTop:40, textAlign:"center", fontSize:10, color:"rgba(255,255,255,.18)", textTransform:"uppercase", letterSpacing:"0.2em" }}>
            Bingo · Lomé · 228
          </div>
        </div>
      </main>
    </>
  );
}