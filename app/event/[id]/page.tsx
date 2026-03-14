// app/event/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import BingoBackground from "../../components/BingoBackground";
import MediaCarousel from "../../components/MediaCaroussel";
import { trackPageView } from "../../../lib/trackViewClient";

type EventItem = {
  id: string; title: string | null; location: string | null; image: string | null;
  media_urls?: string[] | null; whatsapp: string | null; is_featured: boolean | null;
  event_date: string | null; event_end_date: string | null; event_time: string | null; description: string | null;
  interest_count: number | null;
};

function normalizePhoneToWa(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

function formatRangeFr(start: string | null, end: string | null): string {
  const s = start ? new Date(start + "T00:00:00") : null;
  const e = end   ? new Date(end   + "T00:00:00") : null;
  if (!s) return "Date à confirmer";
  const sm = s.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
  if (!e || e.getTime() === s.getTime()) return sm;
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate().toString().padStart(2,"0")} – ${e.toLocaleDateString("fr-FR", { day:"2-digit", month:"long" })}`;
  }
  return `${s.toLocaleDateString("fr-FR", { day:"2-digit", month:"short" })} – ${e.toLocaleDateString("fr-FR", { day:"2-digit", month:"long" })}`;
}

function parseEventDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function formatDateFr(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" }).format(d);
}

function formatTimeHM(t: string | null) { return t ? t.slice(0, 5) : ""; }

function getOrCreateDeviceId() {
  const key = "bingo_device_id"; let v = "";
  try { v = localStorage.getItem(key) || ""; if (!v) { v = "dev_"+Math.random().toString(16).slice(2)+"_"+Date.now().toString(16); localStorage.setItem(key,v); } }
  catch { v = "dev_"+Date.now().toString(16); }
  return v;
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params?.id;

  const [event, setEvent]           = useState<EventItem | null>(null);
  const [loading, setLoading]       = useState(true);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState(false);
  const [liked, setLiked]           = useState(false);

  useEffect(() => { trackPageView({ entity_type:"event", entity_id:String(eventId) }); }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true); setErrorMsg(null);
    supabase.from("events").select("*").eq("id", eventId).single().then(({ data, error }) => {
      if (error) { setErrorMsg(error.message); setEvent(null); }
      else setEvent(data as any);
      setLoading(false);
    });
  }, [eventId]);

  const media = useMemo(() => {
    if (!event) return [];
    const arr = Array.isArray(event.media_urls) ? event.media_urls : [];
    const merged = [event.image, ...arr].filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    return Array.from(new Set(merged)).slice(0, 4);
  }, [event]);

  const dateTxt = useMemo(() => {
    if (!event) return "";
    if (event.event_end_date) return formatRangeFr(event.event_date, event.event_end_date);
    const d = parseEventDate(event.event_date);
    return d ? formatDateFr(d) : "Date ?";
  }, [event]);

  const timeTxt = useMemo(() => { if (!event) return ""; return formatTimeHM(event.event_time) || "Heure ?"; }, [event]);

  const shareText = useMemo(() => {
    if (!event) return "";
    return [`🔥 ${event.title ?? "Événement"}`, `📅 ${dateTxt}`, `⏰ ${timeTxt}`, event.location ? `📍 ${event.location}` : "", "", `👉 ${typeof window !== "undefined" ? window.location.href : ""}`].filter(Boolean).join("\n");
  }, [event, dateTxt, timeTxt]);

  const handleShare = async () => {
    if (!event) return;
    const url = window.location.href;
    if ((navigator as any).share) { try { await (navigator as any).share({ title:event.title ?? "Bingo", text:shareText, url }); return; } catch {} }
    try { await navigator.clipboard.writeText(shareText); alert("✅ Texte copié !"); }
    catch { prompt("Copie ce texte :", shareText); }
  };

  const handleInterested = async () => {
    if (!event || !eventId || liked) return;
    setLikeLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/interest`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ deviceId:getOrCreateDeviceId() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert("Erreur: "+(data?.error||"Impossible")); return; }
      setLiked(true);
      if (!data?.already) setEvent((prev) => prev ? { ...prev, interest_count:(prev.interest_count ?? 0)+1 } : prev);
    } finally { setLikeLoading(false); }
  };

  if (loading) return (
    <main className="min-h-screen relative" style={{ background:"linear-gradient(160deg,#060a12 0%,#0c1220 60%,#060a12 100%)" }}>
      <BingoBackground />
      <div className="relative z-10 flex items-center justify-center min-h-screen gap-3">
        <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay:"0ms" }} />
        <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay:"150ms" }} />
        <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay:"300ms" }} />
      </div>
    </main>
  );

  if (errorMsg || !event) return (
    <main className="min-h-screen relative" style={{ background:"linear-gradient(160deg,#060a12 0%,#0c1220 60%,#060a12 100%)" }}>
      <BingoBackground />
      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-10">
        <p className="text-red-400 text-sm mb-4">{errorMsg ?? "Événement introuvable"}</p>
        <button onClick={() => router.back()} className="text-white border border-white/20 px-4 py-2 rounded-xl hover:bg-white/10 transition">← Retour</button>
      </div>
    </main>
  );

  const waLink = event.whatsapp
    ? `https://wa.me/${normalizePhoneToWa(event.whatsapp)}?text=${encodeURIComponent(`Bonsoir, je veux des infos pour: ${event.title ?? "cet événement"}`)}`
    : null;

  // Is today or future?
  const eventDate = parseEventDate(event.event_date);
  const isUpcoming = eventDate ? eventDate.getTime() >= new Date().setHours(0,0,0,0) : false;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        .ev-detail { font-family:'DM Sans',sans-serif; }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .anim-in { animation:fadeSlideUp .4s ease both; }
        .action-btn { transition:transform .2s, box-shadow .2s; }
        .action-btn:hover { transform:scale(1.02); }
      `}</style>

      <main className="ev-detail min-h-screen relative"
        style={{ background:"linear-gradient(160deg,#060a12 0%,#0c1220 60%,#060a12 100%)" }}>
        <BingoBackground />

        <div className="relative z-10 max-w-6xl mx-auto px-4 lg:px-10 pt-6 pb-12">

          {/* TOP NAV */}
          <div className="anim-in flex items-center justify-between mb-6">
            <button onClick={() => router.back()}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
              style={{ border:"1px solid rgba(255,255,255,.15)", padding:"6px 14px", borderRadius:12 }}>
              ← <span className="hidden sm:inline">Retour</span>
            </button>
            <div className="flex items-center gap-2">
              <a href="/events" className="text-sm text-white/70 hover:text-white transition"
                style={{ border:"1px solid rgba(255,255,255,.15)", padding:"6px 12px", borderRadius:12 }}>
                <span className="hidden sm:inline">🎉 Events</span>
                <span className="sm:hidden">🎉</span>
              </a>
              <button onClick={handleShare}
                className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
                style={{ border:"1px solid rgba(255,255,255,.15)", padding:"6px 14px", borderRadius:12 }}>
                🔗 <span className="hidden sm:inline">Partager</span>
              </button>
            </div>
          </div>

          {/* 2-COLUMN */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">

            {/* LEFT : Media */}
            <div className="anim-in">
              {media.length > 0 ? (
                <div className="relative rounded-3xl overflow-hidden"
                  style={{ boxShadow:"0 20px 60px rgba(0,0,0,.5)", border:"1px solid rgba(255,255,255,.08)" }}>
                  <MediaCarousel media={media} height="h-72 lg:h-[420px]" />
                  {event.is_featured && (
                    <div className="absolute top-4 right-4"
                      style={{ background:"#fff", color:"#000", fontSize:10, fontWeight:700, padding:"3px 12px", borderRadius:99, letterSpacing:"0.12em", textTransform:"uppercase" }}>
                      Premium
                    </div>
                  )}
                  {isUpcoming && (
                    <div className="absolute top-4 left-4"
                      style={{ background:"rgba(74,222,128,.15)", border:"1px solid rgba(74,222,128,.3)", color:"#4ade80", fontSize:10, fontWeight:600, padding:"3px 10px", borderRadius:99, letterSpacing:"0.08em", textTransform:"uppercase" }}>
                      À venir
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-72 lg:h-[420px] rounded-3xl flex items-center justify-center"
                  style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)" }}>
                  <span style={{ fontSize:48, opacity:.2 }}>🎉</span>
                </div>
              )}
            </div>

            {/* RIGHT : Info */}
            <div className="mt-6 lg:mt-0">

              {/* Label + Title */}
              <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:6 }}>
                Événement
              </div>
              <h1 style={{ fontFamily:"Syne", fontWeight:800, fontSize:"clamp(22px,3vw,36px)", color:"#fff", lineHeight:1.15, letterSpacing:"-0.5px" }}>
                {event.title ?? "Sans titre"}
              </h1>

              {/* Info card */}
              <div className="mt-5 rounded-2xl p-4 space-y-3"
                style={{ border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)" }}>
                <div className="flex items-center gap-3 text-sm" style={{ color:"rgba(255,255,255,.75)" }}>
                  <span className="text-lg">📅</span>
                  <span className="capitalize">{dateTxt}</span>
                </div>
                <div className="flex items-center gap-3 text-sm" style={{ color:"rgba(255,255,255,.75)" }}>
                  <span className="text-lg">⏰</span>
                  <span>{timeTxt}</span>
                </div>
                <div className="flex items-center gap-3 text-sm" style={{ color:"rgba(255,255,255,.75)" }}>
                  <span className="text-lg">📍</span>
                  <span>{event.location ?? "Lieu ?"}</span>
                </div>
                {(event.interest_count ?? 0) > 0 && (
                  <div className="flex items-center gap-3 text-sm" style={{ color:"rgba(255,255,255,.75)" }}>
                    <span className="text-lg">❤️</span>
                    <span>{event.interest_count} personnes intéressées</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {event.description && (
                <div className="mt-4 rounded-2xl p-4"
                  style={{ border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.03)" }}>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>
                    Description
                  </div>
                  <p style={{ fontSize:13, color:"rgba(255,255,255,.7)", lineHeight:1.7, whiteSpace:"pre-line" }}>
                    {event.description}
                  </p>
                </div>
              )}

              {/* CTA */}
              <div className="mt-5 space-y-2">
                {waLink ? (
                  <a href={waLink} target="_blank" rel="noreferrer"
                    className="action-btn block w-full text-center py-3.5 rounded-2xl text-sm font-semibold"
                    style={{ background:"#fff", color:"#000", fontFamily:"DM Sans" }}>
                    💬 Contacter sur WhatsApp
                  </a>
                ) : (
                  <button disabled className="w-full py-3.5 rounded-2xl text-sm cursor-not-allowed"
                    style={{ background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.3)", border:"1px solid rgba(255,255,255,.08)" }}>
                    WhatsApp non disponible
                  </button>
                )}

                <button onClick={handleInterested} disabled={likeLoading || liked}
                  className="action-btn w-full py-3.5 rounded-2xl text-sm transition disabled:opacity-60"
                  style={{
                    border: liked ? "1px solid rgba(255,100,100,.3)" : "1px solid rgba(255,255,255,.18)",
                    background: liked ? "rgba(255,100,100,.08)" : "rgba(255,255,255,.05)",
                    color: liked ? "#f87171" : "#fff",
                    fontFamily:"DM Sans",
                  }}>
                  {liked ? "❤️ Intéressé(e)" : likeLoading ? "..." : "🤍 Je suis intéressé(e)"}
                  {(event.interest_count ?? 0) > 0 && (
                    <span style={{ marginLeft:6, opacity:.4, fontSize:11 }}>· {event.interest_count}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}