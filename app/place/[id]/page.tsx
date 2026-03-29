// app/place/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BingoBackground from "../../components/BingoBackground";
import MediaCarousel from "../../components/MediaCaroussel";
import { trackPageView } from "../../../lib/trackViewClient";
import ReviewsSection from "../../components/ReviewsSection";

type PlaceItem = {
  id: string; name: string | null; category: string | null; location: string | null;
  image: string | null; media_urls?: string[] | null; whatsapp: string | null;
  description: string | null; is_featured: boolean | null; featured_rank: number | null;
  interest_count: number | null; maps_url?: string | null; website_url?: string | null;
  instagram_url?: string | null; tiktok_url?: string | null;
  opening_hours?: Record<string, {open:string; close:string} | {open:string; close:string}[] | null> | null;
  budget_range?: string | null;
};

type MenuItem = {
  id: string;
  category: string | null;
  item_name: string;
  price: number | null;
  currency: string;
  available: boolean;
};

function normalizePhoneToWa(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

function categoryLabel(raw: string | null) {
  if (!raw) return "Bar / Resto";
  const map: Record<string, string> = { "Bar/Resto":"Bar / Resto","Loisirs":"Loisirs","Night Clubs":"Night Clubs","Hôtels":"Hôtels","Populaires":"Populaires" };
  return map[raw] ?? raw;
}

function getOrCreateDeviceId() {
  const key = "bingo_device_id"; let v = "";
  try { v = localStorage.getItem(key) || ""; if (!v) { v = "dev_"+Math.random().toString(16).slice(2)+"_"+Date.now().toString(16); localStorage.setItem(key,v); } }
  catch { v = "dev_"+Date.now().toString(16); }
  return v;
}

function cleanUrl(u?: string | null) {
  const s = (u ?? "").trim(); if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

function isOpenNow(hours?: Record<string, {open:string; close:string} | {open:string; close:string}[] | null> | null): boolean | null {
  if (!hours) return null;
  // Lomé = UTC+0 toute l'année
  const nowUtc  = new Date();
  const lomeMin = nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes();
  const days    = ["dim","lun","mar","mer","jeu","ven","sam"];
  const slot    = hours[days[nowUtc.getUTCDay()]];
  if (!slot) return false;
  const slots = Array.isArray(slot) ? slot : [slot];
  for (const s of slots) {
    const [oh, om] = s.open.split(":").map(Number);
    const [ch, cm] = s.close.split(":").map(Number);
    const openMin  = oh * 60 + om;
    let   closeMin = ch * 60 + cm;
    if (closeMin <= openMin) closeMin += 1440;
    if (lomeMin >= openMin && lomeMin < closeMin) return true;
  }
  return false;
}

function formatSlots(slot: {open:string; close:string} | {open:string; close:string}[] | null | undefined): string {
  if (!slot) return "Fermé";
  const slots = Array.isArray(slot) ? slot : [slot];
  return slots.map(s => `${s.open} – ${s.close}`).join("  •  ");
}

function budgetLabel(b?: string | null) {
  const map: Record<string,string> = {"€":"< 5 000 F","€€":"5–15 000 F","€€€":"> 15 000 F"};
  return b ? map[b] ?? b : null;
}

function getUtm() {
  const sp = new URLSearchParams(window.location.search);
  return { utm_source:sp.get("utm_source"), utm_medium:sp.get("utm_medium"), utm_campaign:sp.get("utm_campaign") };
}

async function trackClick(entity_type:"place"|"event", entity_id:string, click_type:"whatsapp"|"maps"|"website"|"instagram"|"tiktok") {
  try {
    fetch("/api/track/click", { method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ entity_type, entity_id, click_type, device_id:getOrCreateDeviceId(), ...getUtm() }) }).catch(()=>{});
  } catch {}
}

const EXTERNAL_LINKS = [
  { key:"maps",      icon:"🗺️",  label:"Adresse"   },
  { key:"website",   icon:"🌐",  label:"Site web"  },
  { key:"instagram", icon:"📸",  label:"Instagram" },
  { key:"tiktok",    icon:"🎵",  label:"TikTok"    },
] as const;

export default function PlaceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const handleBack = () => {
    const saved = sessionStorage.getItem("places_scroll");
    if (saved) {
      const { tab } = JSON.parse(saved);
      router.push(`/places${tab && tab !== "bar_resto" ? `?tab=${tab}` : ""}`);
    } else {
      router.push("/places");
    }
  };
  const sp = useSearchParams();
  const placeId = params?.id;

  const [place, setPlace]           = useState<PlaceItem | null>(null);
  const [loading, setLoading]       = useState(true);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState(false);
  const [liked, setLiked]           = useState(false);
  const [menu, setMenu]             = useState<MenuItem[]>([]);

  useEffect(() => { trackPageView({ entity_type:"place", entity_id:String(placeId) }); }, [placeId]);

  // Charger le menu
  useEffect(() => {
    if (!placeId) return;
    supabase.from("menus").select("*").eq("place_id", placeId).eq("available", true).order("category").order("price")
      .then(({ data }) => setMenu((data ?? []) as MenuItem[]));
  }, [placeId]);

  useEffect(() => {
    if (!placeId) return;
    setLoading(true); setErrorMsg(null);
    supabase.from("places").select("*").eq("id", placeId).single().then(({ data, error }) => {
      if (error) { setErrorMsg(error.message); setPlace(null); }
      else {
        const p = data as any;
        setPlace({ ...p, media_urls: Array.isArray(p.media_urls) ? p.media_urls : [] });
      }
      setLoading(false);
    });
  }, [placeId]);

  const media = useMemo(() => {
    if (!place) return [];
    const arr = Array.isArray(place.media_urls) ? place.media_urls : [];
    const merged = [place.image, ...arr].filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    return Array.from(new Set(merged)).slice(0, 4);
  }, [place]);

  const waLink = useMemo(() => {
    if (!place?.whatsapp) return null;
    return `https://wa.me/${normalizePhoneToWa(place.whatsapp)}?text=${encodeURIComponent(`Bonsoir, je veux des infos sur: ${place.name ?? "cette place"}`)}`;
  }, [place]);

  const shareText = useMemo(() => {
    if (!place) return "";
    const url = typeof window !== "undefined" ? window.location.href : "";
    return [`✨ *${place.name}*`, `📌 ${categoryLabel(place.category)}`, place.location ? `📍 ${place.location}` : "", place.description ?? "", "", `👉 ${url}`].filter(Boolean).join("\n");
  }, [place]);

  const handleShare = async () => {
    if (!place) return;
    const url = window.location.href;
    if ((navigator as any).share) { try { await (navigator as any).share({ title:place.name ?? "Bingo", text:shareText, url }); return; } catch {} }
    try { await navigator.clipboard.writeText(shareText); alert("✅ Texte copié !"); }
    catch { prompt("Copie ce texte :", shareText); }
  };

  const handleInterested = async () => {
    if (!place || !placeId || liked) return;
    setLikeLoading(true);
    try {
      const res = await fetch(`/api/places/${placeId}/interest`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ deviceId:getOrCreateDeviceId() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert("Erreur: "+(data?.error||"Impossible")); return; }
      setLiked(true);
      if (!data?.already) setPlace((prev) => prev ? { ...prev, interest_count:(prev.interest_count ?? 0)+1 } : prev);
    } finally { setLikeLoading(false); }
  };

  const openTracked = (url: string, type:"whatsapp"|"maps"|"website"|"instagram"|"tiktok") => {
    if (place?.id) trackClick("place", place.id, type);
    window.open(url, "_blank", "noreferrer");
  };

  const LoadingScreen = () => (
    <main className="min-h-screen relative" style={{ background:"linear-gradient(160deg,#060a12 0%,#0c1220 60%,#060a12 100%)" }}>
      <BingoBackground />
      <div className="relative z-10 flex items-center justify-center min-h-screen gap-3">
        <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay:"0ms" }} />
        <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay:"150ms" }} />
        <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay:"300ms" }} />
      </div>
    </main>
  );

  if (loading) return <LoadingScreen />;

  if (errorMsg || !place) return (
    <main className="min-h-screen relative" style={{ background:"linear-gradient(160deg,#060a12 0%,#0c1220 60%,#060a12 100%)" }}>
      <BingoBackground />
      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-10">
        <p className="text-red-400 text-sm mb-4">{errorMsg ?? "Introuvable"}</p>
        <button onClick={handleBack} className="text-white border border-white/20 px-4 py-2 rounded-xl hover:bg-white/10 transition">← Retour</button>
      </div>
    </main>
  );

  const maps    = cleanUrl(place.maps_url);
  const website = cleanUrl(place.website_url);
  const ig      = cleanUrl(place.instagram_url);
  const tt      = cleanUrl(place.tiktok_url);
  const extLinks = [maps, website, ig, tt];
  const hasExt = extLinks.some(Boolean);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        .detail-root { font-family:'DM Sans',sans-serif; }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .anim-in { animation:fadeSlideUp .4s ease both; }
        .ext-btn { transition:background .2s, transform .2s; }
        .ext-btn:hover { background:rgba(255,255,255,.12) !important; transform:translateY(-2px); }
        .action-btn { transition:transform .2s, box-shadow .2s; }
        .action-btn:hover { transform:scale(1.02); }
      `}</style>

      <main className="detail-root min-h-screen relative"
        style={{ background:"linear-gradient(160deg,#060a12 0%,#0c1220 60%,#060a12 100%)" }}>
        <BingoBackground />

        <div className="relative z-10 max-w-6xl mx-auto px-4 lg:px-10 pt-6 pb-12">

          {/* TOP NAV */}
          <div className="anim-in flex items-center justify-between mb-6">
            <button onClick={handleBack}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
              style={{ border:"1px solid rgba(255,255,255,.15)", padding:"6px 14px", borderRadius:12 }}>
              ← <span className="hidden sm:inline">Retour</span>
            </button>
            <div className="flex items-center gap-2">
              <a href="/places" className="text-sm text-white/70 hover:text-white transition"
                style={{ border:"1px solid rgba(255,255,255,.15)", padding:"6px 12px", borderRadius:12 }}>
                <span className="hidden sm:inline">📍 Places</span>
                <span className="sm:hidden">📍</span>
              </a>
              <button onClick={handleShare}
                className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
                style={{ border:"1px solid rgba(255,255,255,.15)", padding:"6px 14px", borderRadius:12 }}>
                🔗 <span className="hidden sm:inline">Partager</span>
              </button>
            </div>
          </div>

          {/* 2-COLUMN LAYOUT */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">

            {/* LEFT : Media */}
            <div className="anim-in">
              {media.length > 0 ? (
                <div className="relative rounded-3xl overflow-hidden"
                  style={{ boxShadow:"0 20px 60px rgba(0,0,0,.5)", border:"1px solid rgba(255,255,255,.08)" }}>
                  <MediaCarousel media={media} height="h-72 lg:h-[420px]" />
                  {place.is_featured && (
                    <div className="absolute top-4 right-4"
                      style={{ background:"#fff", color:"#000", fontSize:10, fontWeight:700, padding:"3px 12px", borderRadius:99, letterSpacing:"0.12em", textTransform:"uppercase" }}>
                      Premium
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-72 lg:h-[420px] rounded-3xl flex items-center justify-center"
                  style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)" }}>
                  <span style={{ fontSize:48, opacity:.2 }}>📍</span>
                </div>
              )}

              {/* External links — visible desktop sous le carousel */}
              {hasExt && (
                <div className="hidden lg:grid grid-cols-2 gap-2 mt-4">
                  {[
                    maps    && { url:maps,    type:"maps"      as const, icon:"🗺️",  label:"Adresse"   },
                    website && { url:website, type:"website"   as const, icon:"🌐",  label:"Site web"  },
                    ig      && { url:ig,      type:"instagram" as const, icon:"📸",  label:"Instagram" },
                    tt      && { url:tt,      type:"tiktok"    as const, icon:"🎵",  label:"TikTok"    },
                  ].filter(Boolean).map((link) => link && (
                    <button key={link.type} onClick={() => openTracked(link.url, link.type)}
                      className="ext-btn text-center py-3 rounded-2xl text-sm text-white"
                      style={{ border:"1px solid rgba(255,255,255,.12)", background:"rgba(255,255,255,.04)" }}>
                      {link.icon} {link.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT : Info */}
            <div className="mt-6 lg:mt-0">

              {/* Category + Name */}
              <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:6 }}>
                {categoryLabel(place.category)}
              </div>
              <h1 style={{ fontFamily:"Syne", fontWeight:800, fontSize:"clamp(22px,3vw,36px)", color:"#fff", lineHeight:1.15, letterSpacing:"-0.5px" }}>
                {place.name}
              </h1>

              {/* Key info card */}
              <div className="mt-5 rounded-2xl p-4 space-y-3"
                style={{ border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)" }}>

                {/* Voyant ouvert/fermé */}
                {(() => {
                  const status = isOpenNow(place.opening_hours);
                  if (status === null) return null;
                  return (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: status ? "#4ade80" : "#ef4444" }} />
                      <span className="text-sm font-semibold" style={{ color: status ? "#4ade80" : "#ef4444" }}>
                        {status ? "Ouvert maintenant" : "Fermé actuellement"}
                      </span>
                    </div>
                  );
                })()}

                <div className="flex items-center gap-3 text-sm" style={{ color:"rgba(255,255,255,.75)" }}>
                  <span className="text-lg">📍</span>
                  <span>{place.location ?? "Lomé"}</span>
                </div>

                {/* Budget */}
                {place.budget_range && (
                  <div className="flex items-center gap-3 text-sm" style={{ color:"rgba(255,255,255,.75)" }}>
                    <span className="text-lg">💰</span>
                    <span>{place.budget_range} — {budgetLabel(place.budget_range)}</span>
                  </div>
                )}

                {(place.interest_count ?? 0) > 0 && (
                  <div className="flex items-center gap-3 text-sm" style={{ color:"rgba(255,255,255,.75)" }}>
                    <span className="text-lg">❤️</span>
                    <span>{place.interest_count} personne{(place.interest_count ?? 0) > 1 ? "s" : ""} intéressée{(place.interest_count ?? 0) > 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {place.description && (
                <div className="mt-4 rounded-2xl p-4"
                  style={{ border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.03)" }}>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>
                    À propos
                  </div>
                  <p style={{ fontSize:13, color:"rgba(255,255,255,.7)", lineHeight:1.7, whiteSpace:"pre-line" }}>
                    {place.description}
                  </p>
                </div>
              )}

              {/* External links — mobile */}
              {hasExt && (
                <div className="lg:hidden grid grid-cols-2 gap-2 mt-4">
                  {[
                    maps    && { url:maps,    type:"maps"      as const, icon:"🗺️",  label:"Adresse"   },
                    website && { url:website, type:"website"   as const, icon:"🌐",  label:"Site web"  },
                    ig      && { url:ig,      type:"instagram" as const, icon:"📸",  label:"Instagram" },
                    tt      && { url:tt,      type:"tiktok"    as const, icon:"🎵",  label:"TikTok"    },
                  ].filter(Boolean).map((link) => link && (
                    <button key={link.type} onClick={() => openTracked(link.url, link.type)}
                      className="ext-btn text-center py-3 rounded-2xl text-sm text-white"
                      style={{ border:"1px solid rgba(255,255,255,.12)", background:"rgba(255,255,255,.04)" }}>
                      {link.icon} {link.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Horaires d'ouverture */}
              {place.opening_hours && Object.values(place.opening_hours).some(Boolean) && (
                <div className="mt-4 rounded-2xl p-4"
                  style={{ border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.03)" }}>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>
                    🕐 Horaires
                  </div>
                  <div className="space-y-1.5">
                    {["lun","mar","mer","jeu","ven","sam","dim"].map((day) => {
                      const slot = place.opening_hours?.[day];
                      const labels: Record<string,string> = {lun:"Lundi",mar:"Mardi",mer:"Mercredi",jeu:"Jeudi",ven:"Vendredi",sam:"Samedi",dim:"Dimanche"};
                      const isToday = ["dim","lun","mar","mer","jeu","ven","sam"][new Date().getUTCDay()] === day;
                      return (
                        <div key={day} className="flex items-center justify-between text-sm gap-3"
                          style={{ color: isToday ? "#fff" : "rgba(255,255,255,.5)", fontWeight: isToday ? 600 : 400 }}>
                          <span className="shrink-0">{labels[day]}{isToday ? " (aujourd'hui)" : ""}</span>
                          <span className="text-right" style={{ color: slot ? (isToday ? "#4ade80" : "rgba(255,255,255,.6)") : "rgba(239,68,68,.7)" }}>
                            {formatSlots(slot)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Menu */}
              {menu.length > 0 && (
                <div className="mt-4 rounded-2xl p-4"
                  style={{ border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.03)" }}>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>
                    🍽️ Menu
                  </div>
                  {Object.entries(
                    menu.reduce((acc, item) => {
                      const cat = item.category ?? "Autres";
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(item);
                      return acc;
                    }, {} as Record<string, MenuItem[]>)
                  ).map(([cat, items]) => (
                    <div key={cat} className="mb-4 last:mb-0">
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{cat}</div>
                      <div className="space-y-1.5">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm"
                            style={{ color:"rgba(255,255,255,.75)" }}>
                            <span>{item.item_name}</span>
                            {item.price && (
                              <span style={{ color:"rgba(255,255,255,.5)", whiteSpace:"nowrap", marginLeft:8 }}>
                                {item.price.toLocaleString("fr-FR")} {item.currency}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA */}
              <div className="mt-5 space-y-2">
                {waLink ? (
                  <button onClick={() => openTracked(waLink, "whatsapp")}
                    className="action-btn w-full py-3.5 rounded-2xl text-sm font-semibold"
                    style={{ background:"#fff", color:"#000", fontFamily:"DM Sans" }}>
                    💬 Contacter sur WhatsApp
                  </button>
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
                </button>
              </div>

              {/* Avis utilisateurs */}
              <ReviewsSection placeId={placeId ?? ""} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}