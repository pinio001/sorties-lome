"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import BingoBackground from "../components/BingoBackground";
import HeroCarousel from "../components/HeroCarousel";



type EventItem = {
  id: string;
  title: string | null;
  location: string | null;
  image: string | null;
  whatsapp: string | null;
  event_date?: string | null;
  event_end_date?: string | null;
  event_time?: string | null;
  is_featured?: boolean | null;
  featured_rank?: number | null;
  interest_count?: number | null;
  description?: string | null;
};

type TabKey = "all" | "tonight" | "weekend" | "upcoming";

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: "all",      label: "Tous",        emoji: "✦" },
  { key: "tonight",  label: "Ce soir",     emoji: "🌙" },
  { key: "weekend",  label: "Ce week-end", emoji: "🔥" },
  { key: "upcoming", label: "À venir",     emoji: "📅" },
];

function normalizePhoneToWa(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

function parseEventDate(e: EventItem): Date | null {
  const raw = (e.event_date ?? "").trim();
  if (!raw) return null;
  if (raw.includes("T")) { const d = new Date(raw); return isNaN(d.getTime()) ? null : d; }
  const d = new Date(`${raw}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateFr(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function formatRangeFr(start: string | null | undefined, end: string | null | undefined): string {
  const s = start ? new Date(start + "T00:00:00") : null;
  const e = end   ? new Date(end   + "T00:00:00") : null;
  if (!s) return "Date ?";
  const sm = s.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  if (!e || e.getTime() === s.getTime()) return sm;
  // même mois ?
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate().toString().padStart(2,"0")} – ${e.toLocaleDateString("fr-FR", { day:"2-digit", month:"short" })}`;
  }
  return `${sm} – ${e.toLocaleDateString("fr-FR", { day:"2-digit", month:"short" })}`;
}

function formatTimeHM(t?: string | null) {
  const s = (t ?? "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return s;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function startOfDay(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [visible, setVisible] = useState(true);

  const scrollTarget = useRef<number | null>(null);

  useEffect(() => {
    // Restaurer tab et position de scroll après retour depuis détail
    const saved = sessionStorage.getItem("events_scroll");
    if (saved) {
      const { scrollY, tab: savedTab } = JSON.parse(saved);
      if (savedTab) setTab(savedTab as TabKey);
      scrollTarget.current = scrollY;
      setVisible(false); // masquer pendant le chargement
    } else {
      const t = new URLSearchParams(window.location.search).get("tab");
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
        sessionStorage.removeItem("events_scroll");
        setVisible(true); // révéler la page une fois en position
      });
    }
  }, [loading]);

  const today = new Date().toISOString().slice(0, 10);
  const carouselItems = events
    .filter(e => e.image && (!e.event_date || e.event_date >= today))
    .map(e => ({ id: e.id, image: e.image!, name: e.title ?? "Event", location: e.location, type: "event" as const }));

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
  };

  useEffect(() => {
    supabase.from("events").select("*").order("display_order", { ascending: true }).order("created_at", { ascending: false })
      .then(({ data }) => { setEvents((data ?? []) as EventItem[]); setLoading(false); });
  }, []);

  const ranges = useMemo(() => {
    const now = new Date();
    const today0 = startOfDay(now);
    const tomorrow0 = new Date(today0); tomorrow0.setDate(tomorrow0.getDate() + 1);
    const day = now.getDay();
    let satOffset = 6 - day;
    if (day === 0) satOffset = -1;
    const weekendStart = new Date(today0); weekendStart.setDate(weekendStart.getDate() + satOffset);
    const weekendEnd = new Date(weekendStart); weekendEnd.setDate(weekendEnd.getDate() + 2);
    return { today0, tomorrow0, weekendStart, weekendEnd };
  }, []);

  const normalized = useMemo(() => {
    const { today0 } = ranges;
    return events
      .map((e) => ({ e, d: parseEventDate(e) }))
      .filter(({ d }) => !d || d.getTime() >= today0.getTime());
  }, [events, ranges]);

  const featured = useMemo(() =>
    normalized
      .filter(({ e }) => e.is_featured === true)
      .sort((a, b) => (a.e.featured_rank ?? 0) - (b.e.featured_rank ?? 0))
      .map(({ e }) => e),
    [normalized]
  );

  const filtered = useMemo(() => {
    const { today0, tomorrow0, weekendStart, weekendEnd } = ranges;
    const pick = (e: EventItem) => {
      const d = parseEventDate(e);
      if (!d) return tab === "all";
      const t = d.getTime();
      if (tab === "all")      return t >= today0.getTime();
      if (tab === "tonight")  return t >= today0.getTime() && t < tomorrow0.getTime();
      if (tab === "weekend")  return t >= weekendStart.getTime() && t < weekendEnd.getTime();
      if (tab === "upcoming") return t >= tomorrow0.getTime();
      return true;
    };
    return normalized.map(({ e }) => e).filter(pick);
  }, [normalized, ranges, tab]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        .ev-root { font-family: 'DM Sans', sans-serif; }
        .ev-root h1, .ev-root .syne { font-family: 'Syne', sans-serif; }

        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position:-200% center; }
          100% { background-position:200% center; }
        }
        @keyframes pulse-dot {
          0%,100% { transform:scale(1); opacity:1; }
          50%      { transform:scale(1.5); opacity:.5; }
        }
        .anim-1 { animation:fadeSlideUp .5s ease both .05s; }
        .anim-2 { animation:fadeSlideUp .5s ease both .12s; }
        .anim-3 { animation:fadeSlideUp .5s ease both .20s; }
        .anim-4 { animation:fadeSlideUp .5s ease both .28s; }

        .grain {
          pointer-events:none; position:fixed; inset:0; z-index:1;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          opacity:.4;
        }
        .ev-card { transition:transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s ease; }
        .ev-card:hover { transform:translateY(-6px) scale(1.01); }
        .ev-card .card-img { transition:transform .5s ease; }
        .ev-card:hover .card-img { transform:scale(1.06); }

        .hero-ev { transition:transform .3s ease, box-shadow .3s ease; }
        .hero-ev:hover { transform:translateY(-4px); }
        .hero-ev .card-img { transition:transform .6s ease; }
        .hero-ev:hover .card-img { transform:scale(1.04); }

        .tab-pill { transition:all .25s cubic-bezier(.34,1.56,.64,1); }
        .tab-pill:hover { transform:translateY(-2px); }

        .feat-badge {
          background:linear-gradient(90deg,#fff,#c8deff,#fff);
          background-size:200% auto;
          animation:shimmer 2.5s linear infinite;
        }
        .live-dot { animation:pulse-dot 2s ease infinite; }
      `}</style>

      <div className="grain" />

      <main className="ev-root min-h-screen relative"
        style={{ opacity: visible ? 1 : 0, background:"linear-gradient(160deg,#060a12 0%,#0c1220 60%,#060a12 100%)" }}>
        <BingoBackground />

        <div className="relative z-10 max-w-6xl mx-auto px-4 lg:px-10 pt-6 pb-16">

          {/* NAVBAR */}
          <div className="anim-1 flex items-center justify-between mb-8">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-lg">
                <span style={{ fontWeight:900, fontSize:16, color:"#000", fontFamily:"Syne" }}>B</span>
              </div>
              <div>
                <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:"#fff", lineHeight:1.2 }}>Bingo</div>
                <div className="flex items-center gap-1">
                  <span className="live-dot w-1.5 h-1.5 rounded-full bg-green-400 inline-block shrink-0" />
                  <span style={{ fontSize:9, color:"#4ade80", letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:600, whiteSpace:"nowrap" }}>
                    {events.length} events
                  </span>
                </div>
              </div>
            </div>
            {/* Boutons */}
            <div className="flex items-center gap-1">
              <a href="/" className="border border-white/15 px-2 py-1.5 rounded-lg text-white/60 hover:bg-white/8 transition text-xs">🏠</a>
              <a href="/contact?source=events" className="border border-white/15 px-2 py-1.5 rounded-lg text-white/70 hover:bg-white/8 transition text-xs whitespace-nowrap">✉️ Contact</a>
              <a href="/places" className="px-2 py-1.5 rounded-lg hover:opacity-90 transition text-xs font-semibold whitespace-nowrap" style={{ background:"#fff", color:"#000" }}>Places →</a>
              <a href="/inscription" className="border border-white/15 px-2 py-1.5 rounded-lg text-white/70 hover:bg-white/8 transition text-xs whitespace-nowrap">S'inscrire</a>
            </div>
          </div>

          {/* HERO HEADER */}
          <div className="anim-2 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize:28 }}>🎉</span>
              <span style={{ fontSize:11, fontWeight:600, letterSpacing:"0.15em", textTransform:"uppercase", color:"#fff", fontFamily:"DM Sans" }}>
                Events
              </span>
            </div>
            <h1 style={{ fontFamily:"Syne", fontWeight:800, fontSize:"clamp(28px,4vw,52px)", lineHeight:1.1, color:"#fff", letterSpacing:"-1px" }}>
              Les meilleurs<br/>
              <span style={{ color:"rgba(255,255,255,.7)" }}>events à Lomé</span>
            </h1>
            <p style={{ color:"rgba(255,255,255,.45)", fontSize:14, marginTop:8 }}>
              {filtered.length} événements · Concerts, clubs, afterworks & plus
            </p>
          </div>

          {/* ── HERO CAROUSEL ── */}
          {!loading && carouselItems.length > 0 && (
            <HeroCarousel items={carouselItems} />
          )}

          {/* TABS */}
          <div className="anim-3 flex gap-2 flex-wrap mb-8">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => handleTabChange(t.key)}
                className="tab-pill flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium"
                style={{
                  background: tab === t.key ? "#fff" : "rgba(255,255,255,.06)",
                  color: tab === t.key ? "#000" : "rgba(255,255,255,.65)",
                  border: `1px solid ${tab === t.key ? "#fff" : "rgba(255,255,255,.1)"}`,
                  boxShadow: tab === t.key ? "0 0 20px rgba(255,255,255,.15)" : "none",
                  fontFamily:"DM Sans", fontWeight: tab === t.key ? 600 : 400,
                }}>
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
            <a href="/soumettre"
              className="tab-pill flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm"
              style={{ border:"1px dashed rgba(255,255,255,.2)", color:"rgba(255,255,255,.45)" }}>
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

              {/* FEATURED */}
              {tab === "all" && featured.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="feat-badge text-black text-[10px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase">
                      ⚡ En avant
                    </span>
                    <div className="h-px flex-1" style={{ background:"linear-gradient(to right,rgba(255,255,255,.2),transparent)" }} />
                  </div>

                  {featured.length === 1 ? (
                    <HeroEventCard event={featured[0]} activeTab={tab} />
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <HeroEventCard event={featured[0]} activeTab={tab} />
                      <div className="grid gap-4">
                        {featured.slice(1, 3).map((ev) => <EventCard key={ev.id} event={ev} compact activeTab={tab} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION TITLE */}
              <div className="flex items-center gap-3 mb-5">
                <span style={{ fontFamily:"Syne", fontWeight:700, fontSize:16, color:"#fff" }}>
                  {tab === "all" ? "Tous les events" : "Résultats"}
                </span>
                <span style={{ fontSize:12, color:"rgba(255,255,255,.3)" }}>({filtered.length})</span>
                <div className="h-px flex-1" style={{ background:"linear-gradient(to right,rgba(255,255,255,.15),transparent)" }} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((ev) => <EventCard key={ev.id} event={ev} activeTab={tab} />)}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">🌙</div>
                  <p style={{ color:"rgba(255,255,255,.35)", fontFamily:"DM Sans" }}>
                    Aucun événement pour cette période.
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

function HeroEventCard({ event, activeTab }: { event: EventItem; activeTab: string }) {
  const router = useRouter();
  const d = parseEventDate(event);
  const dateText = formatRangeFr(event.event_date, event.event_end_date);
  const timeText = formatTimeHM(event.event_time);

  return (
    <div className="hero-ev cursor-pointer rounded-3xl overflow-hidden relative"
      style={{ height:380, border:"1px solid rgba(255,255,255,.1)", boxShadow:"0 20px 60px rgba(0,0,0,.5)" }}
      onClick={() => { sessionStorage.setItem("events_scroll", JSON.stringify({ scrollY: window.scrollY, tab: activeTab })); router.push(`/event/${event.id}`); }}>
      {event.image ? (
        <img src={event.image} alt={event.title ?? ""} className="card-img absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background:"linear-gradient(135deg,#0d1628,#1a2744)" }} />
      )}
      <div className="absolute inset-0" style={{ background:"linear-gradient(to top,rgba(0,0,0,.92) 0%,rgba(0,0,0,.3) 50%,transparent 100%)" }} />

      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        <span style={{ background:"#fff", color:"#000", fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:99, letterSpacing:"0.1em", textTransform:"uppercase" }}>
          Premium
        </span>
        {(event.interest_count ?? 0) > 0 && (
          <span style={{ background:"rgba(0,0,0,.6)", backdropFilter:"blur(10px)", color:"#fff", fontSize:12, padding:"4px 10px", borderRadius:99, border:"1px solid rgba(255,255,255,.15)" }}>
            ❤️ {event.interest_count}
          </span>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5">
        {(dateText || timeText) && (
          <div style={{ fontSize:11, color:"rgba(255,255,255,.6)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>
            {dateText}{timeText ? ` · ${timeText}` : ""}
          </div>
        )}
        <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:22, color:"#fff", lineHeight:1.2, marginBottom:6 }}>
          {event.title}
        </div>
        {event.location && (
          <div style={{ fontSize:12, color:"rgba(255,255,255,.55)", marginBottom:14 }}>📍 {event.location}</div>
        )}
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); sessionStorage.setItem("events_scroll", JSON.stringify({ scrollY: window.scrollY, tab: activeTab })); router.push(`/event/${event.id}`); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background:"#fff", color:"#000", fontFamily:"DM Sans" }}>
            Voir l'event
          </button>
          {event.whatsapp && (
            <a onClick={(e) => e.stopPropagation()}
              href={`https://wa.me/${normalizePhoneToWa(event.whatsapp)}?text=${encodeURIComponent(`Bonsoir, infos pour: ${event.title}`)}`}
              target="_blank" rel="noreferrer"
              className="px-4 py-2.5 rounded-xl text-sm text-white"
              style={{ border:"1px solid rgba(255,255,255,.25)", backdropFilter:"blur(10px)", background:"rgba(255,255,255,.1)" }}>
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, compact, activeTab }: { event: EventItem; compact?: boolean; activeTab: string }) {
  const router = useRouter();
  const d = parseEventDate(event);
  const dateText = formatRangeFr(event.event_date, event.event_end_date);
  const timeText = formatTimeHM(event.event_time);

  return (
    <div className="ev-card cursor-pointer rounded-2xl overflow-hidden"
      style={{ border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", boxShadow:"0 4px 24px rgba(0,0,0,.3)" }}
      onClick={() => { sessionStorage.setItem("events_scroll", JSON.stringify({ scrollY: window.scrollY, tab: activeTab })); router.push(`/event/${event.id}`); }}>

      <div className="relative overflow-hidden" style={{ height: compact ? 130 : 200 }}>
        {event.image ? (
          <img src={event.image} alt={event.title ?? ""} className="card-img w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background:"linear-gradient(135deg,rgba(255,255,255,.05),rgba(0,0,0,.3))" }}>
            <span style={{ fontSize:32, opacity:.3 }}>🎉</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background:"linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 60%)" }} />

        {(event.interest_count ?? 0) > 0 && (
          <div className="absolute bottom-3 right-3"
            style={{ background:"rgba(0,0,0,.65)", backdropFilter:"blur(8px)", color:"#fff", fontSize:11, padding:"3px 8px", borderRadius:99, border:"1px solid rgba(255,255,255,.12)" }}>
            ❤️ {event.interest_count}
          </div>
        )}
      </div>

      <div className="p-4">
        <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:3 }}>
          {dateText}{timeText ? ` · ${timeText}` : ""}
        </div>
        <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:15, color:"#fff", lineHeight:1.3, marginBottom:4 }}
          className="line-clamp-1">{event.title ?? "Sans titre"}</div>
        {event.location && !compact && (
          <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginBottom:12 }}>📍 {event.location}</div>
        )}
        <div className="flex gap-2 mt-3">
          <button onClick={(e) => { e.stopPropagation(); sessionStorage.setItem("events_scroll", JSON.stringify({ scrollY: window.scrollY, tab: activeTab })); router.push(`/event/${event.id}`); }}
            className="flex-1 py-2 rounded-xl text-xs font-semibold"
            style={{ background:"#fff", color:"#000", fontFamily:"DM Sans" }}>
            Détails
          </button>
          {event.whatsapp ? (
            <a onClick={(e) => e.stopPropagation()}
              href={`https://wa.me/${normalizePhoneToWa(event.whatsapp)}?text=${encodeURIComponent(`Bonsoir, infos pour: ${event.title}`)}`}
              target="_blank" rel="noreferrer"
              className="flex-1 py-2 rounded-xl text-xs text-white text-center transition hover:bg-white/10"
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