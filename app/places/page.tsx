"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import BingoBackground from "../components/BingoBackground";
import FeedbackPopup from "../components/FeedbackPopup";

type PlaceItem = {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  image: string | null;
  media_urls?: string[] | null;
  whatsapp: string | null;
  description: string | null;
  is_featured: boolean | null;
  featured_rank: number | null;
  interest_count: number | null;
};

const ACCENT  = "#FFFFFF";
const ACCENT2 = "#7EB8FF";   // bleu clair pour variation subtile
const GLOW    = "rgba(126,184,255,.18)";

const TABS = [
  { key: "bar_resto",  label: "Bar / Resto",  emoji: "🍻", color: ACCENT,  glow: GLOW },
  { key: "loisirs",   label: "Loisirs",       emoji: "🎯", color: ACCENT,  glow: GLOW },
  { key: "club",      label: "Night Clubs",   emoji: "🎵", color: ACCENT,  glow: GLOW },
  { key: "hotel",     label: "Hôtels",        emoji: "🏨", color: ACCENT,  glow: GLOW },
  { key: "populaires",label: "Populaires",    emoji: "🔥", color: ACCENT,  glow: GLOW },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function normalizeCategory(raw?: string | null): "bar_resto" | "loisirs" | "club" | "hotel" {
  if (!raw) return "bar_resto";
  switch (raw) {
    case "Bar/Resto":   return "bar_resto";
    case "Loisirs":     return "loisirs";
    case "Night Clubs": return "club";
    case "Hôtels":      return "hotel";
    default:            return "bar_resto";
  }
}

function normalizePhoneToWa(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

function norm(s: string) { return (s ?? "").trim().toLowerCase(); }

function getTabConfig(key: TabKey) {
  return TABS.find((t) => t.key === key) ?? TABS[0];
}

export default function PlacesPage() {
  const [places, setPlaces]   = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<TabKey>("bar_resto");
  const [q, setQ]             = useState("");
  const [loc, setLoc]         = useState("TOUS");
  const [visible, setVisible] = useState(true);
  const scrollTarget          = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = sessionStorage.getItem("places_scroll");
    if (saved) {
      const { scrollY, tab: savedTab } = JSON.parse(saved);
      if (savedTab) setTab(savedTab as TabKey);
      scrollTarget.current = scrollY;
      setVisible(false);
    } else {
      const t = new URLSearchParams(window.location.search).get("tab") ?? new URLSearchParams(window.location.search).get("cat");
      if (t) setTab(t as TabKey);
    }
  }, []);

  // Scroller une fois les données chargées
  useEffect(() => {
    if (!loading && scrollTarget.current !== null) {
      const target = scrollTarget.current;
      scrollTarget.current = null;
      requestAnimationFrame(() => {
        window.scrollTo({ top: target, behavior: "instant" });
        sessionStorage.removeItem("places_scroll");
        setVisible(true);
      });
    }
  }, [loading]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
  };

  useEffect(() => {
    supabase.from("places").select("*").order("display_order", { ascending: true }).order("created_at", { ascending: false })
      .then(({ data }) => { setPlaces((data ?? []) as PlaceItem[]); setLoading(false); });
  }, []);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of places) { const l = (p.location ?? "").trim(); if (l) set.add(l); }
    return ["TOUS", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [places]);

  const matchesFilter = (p: PlaceItem) => {
    const okQ   = q ? norm(p.name).includes(norm(q)) : true;
    const okLoc = loc === "TOUS" ? true : norm(p.location ?? "") === norm(loc);
    return okQ && okLoc;
  };

  const featuredForTab = useMemo(() => {
    if (tab === "populaires") return [];
    return places
      .filter((p) => normalizeCategory(p.category) === tab && p.is_featured && matchesFilter(p))
      .sort((a, b) => (a.featured_rank ?? 0) - (b.featured_rank ?? 0));
  }, [places, tab, q, loc]);

  const filtered = useMemo(() => {
    if (tab === "populaires")
      return [...places].filter(matchesFilter).sort((a, b) => (b.interest_count ?? 0) - (a.interest_count ?? 0));
    return places.filter((p) => normalizeCategory(p.category) === tab).filter(matchesFilter);
  }, [places, tab, q, loc]);

  const activeTab = getTabConfig(tab);

  // Counts per tab
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of TABS) {
      if (t.key === "populaires") { c[t.key] = places.filter(p => (p.interest_count ?? 0) > 0).length; }
      else c[t.key] = places.filter(p => normalizeCategory(p.category) === t.key).length;
    }
    return c;
  }, [places]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .places-root { font-family: 'DM Sans', sans-serif; }
        .places-root h1, .places-root .display { font-family: 'Syne', sans-serif; }

        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-dot {
          0%,100% { transform:scale(1); opacity:1; }
          50%      { transform:scale(1.4); opacity:.6; }
        }

        .anim-1 { animation: fadeSlideUp .5s ease both .05s; }
        .anim-2 { animation: fadeSlideUp .5s ease both .12s; }
        .anim-3 { animation: fadeSlideUp .5s ease both .20s; }
        .anim-4 { animation: fadeSlideUp .5s ease both .28s; }

        .grain-overlay {
          pointer-events:none;
          position:fixed; inset:0; z-index:1;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          opacity:.4;
        }

        .place-card { transition: transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s ease; }
        .place-card:hover { transform: translateY(-6px) scale(1.01); }
        .place-card .card-img { transition: transform .5s ease; }
        .place-card:hover .card-img { transform: scale(1.07); }
        .place-card .card-overlay {
          background: linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.4) 50%, transparent 100%);
          transition: opacity .3s ease;
        }
        .place-card:hover .card-overlay { opacity:.85; }

        .tab-pill { transition: all .25s cubic-bezier(.34,1.56,.64,1); }
        .tab-pill:hover { transform: translateY(-2px); }

        .search-input:focus { outline:none; }
        .search-input::placeholder { color: rgba(255,255,255,.3); }

        .featured-badge {
          background: linear-gradient(90deg, #ffffff, #c8deff, #ffffff);
          background-size: 200% auto;
          animation: shimmer 2.5s linear infinite;
        }

        .live-dot { animation: pulse-dot 2s ease infinite; }

        .hero-card { transition: transform .3s ease, box-shadow .3s ease; }
        .hero-card:hover { transform: translateY(-4px); }
        .hero-card .card-img { transition: transform .6s ease; }
        .hero-card:hover .card-img { transform: scale(1.05); }
      `}</style>

      <div className="grain-overlay" />

      <main className="places-root min-h-screen relative" style={{ opacity: visible ? 1 : 0 , background: "linear-gradient(160deg,#060a12 0%,#0c1220 60%,#060a12 100%)" }}>
        <BingoBackground />
        <FeedbackPopup />

        <div className="relative z-10 max-w-6xl mx-auto px-4 lg:px-10 pt-6 pb-16">

          {/* ── NAVBAR ── */}
          <div className="anim-1 flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                <span style={{ fontWeight:900, fontSize:18, color:"#000", fontFamily:"Syne" }}>B</span>
              </div>
              <div>
                <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:15, color:"#fff" }}>Bingo</div>
                <div className="flex items-center gap-1.5">
                  <span className="live-dot w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  <span style={{ fontSize:10, color:"#4ade80", letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600 }}>
                    {places.length} spots
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <a href="/" className="border border-white/15 px-2.5 py-2 rounded-xl text-white/60 hover:bg-white/8 transition text-sm">🏠</a>
              <a href="/contact?source=places" className="border border-white/15 px-2.5 py-2 rounded-xl text-white/70 hover:bg-white/8 transition text-sm">
                <span className="hidden sm:inline text-sm">✉️ Contact</span>
                <span className="sm:hidden text-sm">✉️</span>
              </a>
              <a href="/events" className="border border-white/15 px-2.5 py-2 rounded-xl text-white/70 hover:bg-white/8 transition text-sm">
                <span className="hidden sm:inline">Events →</span>
                <span className="sm:hidden">🎉</span>
              </a>
            </div>
          </div>

          {/* ── HERO HEADER ── */}
          <div className="anim-2 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize:28 }}>{activeTab.emoji}</span>
                  <span style={{
                    fontSize:11, fontWeight:600, letterSpacing:"0.15em", textTransform:"uppercase",
                    color: activeTab.color, fontFamily:"DM Sans"
                  }}>
                    {activeTab.label}
                  </span>
                </div>
                <h1 style={{
                  fontFamily:"Syne", fontWeight:800, fontSize:"clamp(28px,4vw,52px)",
                  lineHeight:1.1, color:"#fff", letterSpacing:"-1px"
                }}>
                  Où sortir<br/>
                  <span style={{ color: activeTab.color }}>à Lomé ?</span>
                </h1>
                <p style={{ color:"rgba(255,255,255,.45)", fontSize:14, marginTop:8, fontFamily:"DM Sans" }}>
                  {filtered.length} spots disponibles · Trouvez votre bonheur ce soir
                </p>
              </div>

              {/* Search + Filter */}
              <div className="flex flex-col sm:flex-row gap-2 lg:w-auto w-full">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Rechercher..."
                    className="search-input pl-8 pr-4 py-2.5 rounded-xl text-sm text-white w-full sm:w-48"
                    style={{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)" }}
                  />
                </div>
                <select value={loc} onChange={(e) => setLoc(e.target.value)}
                  className="px-3 py-2.5 rounded-xl text-sm text-white"
                  style={{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)" }}>
                  {locationOptions.map((l) => <option key={l} value={l} style={{ background:"#0c1220" }}>{l}</option>)}
                </select>
                {(q || loc !== "TOUS") && (
                  <button onClick={() => { setQ(""); setLoc("TOUS"); }}
                    className="px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white transition"
                    style={{ border:"1px solid rgba(255,255,255,.12)" }}>✕</button>
                )}
              </div>
            </div>
          </div>

          {/* ── TABS ── */}
          <div className="anim-3 flex gap-2 flex-wrap mb-8">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => handleTabChange(t.key)}
                className="tab-pill flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium"
                style={{
                  background: tab === t.key ? t.color : "rgba(255,255,255,.06)",
                  color: tab === t.key ? "#000" : "rgba(255,255,255,.65)",
                  border: `1px solid ${tab === t.key ? t.color : "rgba(255,255,255,.1)"}`,
                  boxShadow: tab === t.key ? `0 0 20px ${t.glow}` : "none",
                  fontFamily: "DM Sans",
                  fontWeight: tab === t.key ? 600 : 400,
                }}>
                <span>{t.emoji}</span>
                <span>{t.label}</span>
                <span style={{
                  fontSize:10, fontWeight:700, opacity:.7,
                  background: tab === t.key ? "rgba(0,0,0,.15)" : "rgba(255,255,255,.1)",
                  padding:"1px 6px", borderRadius:99
                }}>{counts[t.key] ?? 0}</span>
              </button>
            ))}
            <a href="/soumettre"
              className="tab-pill flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm"
              style={{ border:"1px dashed rgba(255,255,255,.2)", color:"rgba(255,255,255,.45)", fontFamily:"DM Sans" }}>
              + Soumettre
            </a>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3">
              <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay:"0ms" }} />
              <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay:"150ms" }} />
              <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay:"300ms" }} />
            </div>
          ) : (
            <div className="anim-4">

              {/* ── FEATURED — Hero layout ── */}
              {tab !== "populaires" && featuredForTab.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="featured-badge text-black text-[10px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase">
                      ⚡ En avant
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                  </div>

                  {/* Premier featured en grand, reste en grille */}
                  {featuredForTab.length === 1 ? (
                    <HeroCard place={featuredForTab[0]} activeTab={tab} accentColor={activeTab.color} />
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <HeroCard place={featuredForTab[0]} activeTab={tab} accentColor={activeTab.color} />
                      <div className="grid grid-cols-1 gap-4">
                        {featuredForTab.slice(1, 3).map((p) => (
                          <PlaceCard key={p.id} place={p} activeTab={tab} accentColor={activeTab.color} compact />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── SECTION TITLE ── */}
              <div className="flex items-center gap-3 mb-5">
                <span style={{ fontFamily:"Syne", fontWeight:700, fontSize:16, color:"#fff" }}>
                  {tab === "populaires" ? "🏆 Classement" : "Tous les spots"}
                </span>
                <span style={{ fontSize:12, color:"rgba(255,255,255,.3)" }}>({filtered.length})</span>
                <div className="h-px flex-1" style={{ background:`linear-gradient(to right, ${activeTab.color}40, transparent)` }} />
              </div>

              {/* ── GRID ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((p, idx) => (
                  <PlaceCard key={p.id} place={p} activeTab={tab} accentColor={activeTab.color}
                    rank={tab === "populaires" ? idx + 1 : undefined} />
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">🌙</div>
                  <p style={{ color:"rgba(255,255,255,.35)", fontFamily:"DM Sans" }}>
                    Aucun spot trouvé. Essayez un autre filtre.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

// ─── Hero Card (featured large) ───────────────────────────────────────────────
function HeroCard({ place, activeTab, accentColor }: { place: PlaceItem; activeTab: string; accentColor: string }) {
  const router = useRouter();
  const primary: string | null = place.image || (Array.isArray(place.media_urls) && place.media_urls[0]) || null;
  const goDetails = () => { sessionStorage.setItem("places_scroll", JSON.stringify({ scrollY: window.scrollY, tab: activeTab })); router.push(`/place/${place.id}?cat=${encodeURIComponent(activeTab)}`); };

  return (
    <div className="hero-card cursor-pointer rounded-3xl overflow-hidden relative"
      style={{ height: 380, border:"1px solid rgba(255,255,255,.1)", boxShadow:"0 20px 60px rgba(0,0,0,.5)" }}
      onClick={goDetails}>
      {primary ? (
        <img src={primary} alt={place.name} className="card-img absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)" }} />
      )}
      <div className="card-overlay absolute inset-0" />

      {/* Top badges */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <span style={{
          background: accentColor, color:"#000", fontSize:10, fontWeight:700,
          padding:"3px 10px", borderRadius:99, letterSpacing:"0.1em", textTransform:"uppercase"
        }}>Premium</span>
        {(place.interest_count ?? 0) > 0 && (
          <span style={{
            background:"rgba(0,0,0,.6)", backdropFilter:"blur(10px)",
            color:"#fff", fontSize:12, padding:"4px 10px", borderRadius:99,
            border:"1px solid rgba(255,255,255,.15)"
          }}>❤️ {place.interest_count}</span>
        )}
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div style={{ fontSize:11, color: accentColor, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>
          {place.location}
        </div>
        <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:22, color:"#fff", lineHeight:1.2, marginBottom:12 }}>
          {place.name}
        </div>
        {place.description && (
          <p style={{ fontSize:13, color:"rgba(255,255,255,.65)", lineHeight:1.5, marginBottom:14 }}
            className="line-clamp-2">{place.description}</p>
        )}
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); goDetails(); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center"
            style={{ background: accentColor, color:"#000", fontFamily:"DM Sans" }}>
            Voir le spot
          </button>
          {place.whatsapp && (
            <a onClick={(e) => e.stopPropagation()}
              href={`https://wa.me/${place.whatsapp.replace(/[^\d]/g,"")}?text=${encodeURIComponent(`Bonsoir, infos sur ${place.name}`)}`}
              target="_blank" rel="noreferrer"
              className="px-4 py-2.5 rounded-xl text-sm text-white text-center"
              style={{ border:"1px solid rgba(255,255,255,.25)", backdropFilter:"blur(10px)", background:"rgba(255,255,255,.1)" }}>
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Regular Place Card ────────────────────────────────────────────────────────
function PlaceCard({ place, activeTab, accentColor, compact, rank }:
  { place: PlaceItem; activeTab: string; accentColor: string; compact?: boolean; rank?: number }) {
  const router = useRouter();
  const primary: string | null = place.image || (Array.isArray(place.media_urls) && place.media_urls[0]) || null;
  const isVideo = primary?.match(/\.(mp4|webm|ogg)$/i);
  const goDetails = () => { sessionStorage.setItem("places_scroll", JSON.stringify({ scrollY: window.scrollY, tab: activeTab })); router.push(`/place/${place.id}?cat=${encodeURIComponent(activeTab)}`); };

  return (
    <div className="place-card cursor-pointer rounded-2xl overflow-hidden"
      style={{
        border:"1px solid rgba(255,255,255,.08)",
        background:"rgba(255,255,255,.04)",
        boxShadow:"0 4px 24px rgba(0,0,0,.3)",
      }}
      onClick={goDetails}>

      {/* Image */}
      <div className="relative overflow-hidden" style={{ height: compact ? 130 : 200 }}>
        {primary ? (
          isVideo ? (
            <video src={primary} autoPlay muted loop playsInline className="card-img w-full h-full object-cover" />
          ) : (
            <img src={primary} alt={place.name} className="card-img w-full h-full object-cover" loading="lazy" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background:`linear-gradient(135deg,${accentColor}15,rgba(0,0,0,.3))` }}>
            <span style={{ fontSize:32, opacity:.4 }}>📍</span>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0"
          style={{ background:"linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 60%)" }} />

        {/* Rank badge (populaires) */}
        {rank && rank <= 3 && (
          <div className="absolute top-3 left-3"
            style={{
              background: rank === 1 ? "#ffffff" : rank === 2 ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.35)",
              color:"#000", fontSize:11, fontWeight:800, padding:"2px 8px", borderRadius:99
            }}>
            #{rank}
          </div>
        )}

        {/* Interest count */}
        {(place.interest_count ?? 0) > 0 && (
          <div className="absolute bottom-3 right-3"
            style={{
              background:"rgba(0,0,0,.65)", backdropFilter:"blur(8px)",
              color:"#fff", fontSize:11, padding:"3px 8px", borderRadius:99,
              border:"1px solid rgba(255,255,255,.12)"
            }}>
            ❤️ {place.interest_count}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div style={{ fontSize:11, color: accentColor, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:3 }}>
          {place.location ?? "Lomé"}
        </div>
        <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:15, color:"#fff", lineHeight:1.3, marginBottom:6 }}
          className="line-clamp-1">
          {place.name}
        </div>
        {place.description && !compact && (
          <p style={{ fontSize:12, color:"rgba(255,255,255,.45)", lineHeight:1.5, marginBottom:12 }}
            className="line-clamp-2">{place.description}</p>
        )}

        <div className="flex gap-2 mt-3">
          <button onClick={(e) => { e.stopPropagation(); goDetails(); }}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-center transition hover:opacity-90"
            style={{ background: accentColor, color:"#000", fontFamily:"DM Sans" }}>
            Détails
          </button>
          {place.whatsapp ? (
            <a onClick={(e) => e.stopPropagation()}
              href={`https://wa.me/${place.whatsapp.replace(/[^\d]/g,"")}?text=${encodeURIComponent(`Bonsoir, infos sur ${place.name}`)}`}
              target="_blank" rel="noreferrer"
              className="flex-1 py-2 rounded-xl text-xs text-white text-center transition hover:bg-white/15"
              style={{ border:"1px solid rgba(255,255,255,.2)" }}>
              WhatsApp
            </a>
          ) : (
            <button disabled className="flex-1 py-2 rounded-xl text-xs text-center cursor-not-allowed"
              style={{ border:"1px solid rgba(255,255,255,.08)", color:"rgba(255,255,255,.25)" }}>
              WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}