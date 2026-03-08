// app/place/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BingoBackground from "../../components/BingoBackground";
import MediaCarousel from "../../components/MediaCaroussel";
import { trackPageView } from "../../../lib/trackViewClient";

type PlaceItem = {
  id: string;
  name: string | null;
  category: string | null;
  location: string | null;
  image: string | null;
  media_urls?: string[] | null;
  whatsapp: string | null;
  description: string | null;
  is_featured: boolean | null;
  featured_rank: number | null;
  interest_count: number | null;
  maps_url?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
};

function normalizePhoneToWa(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

function categoryLabel(raw: string | null) {
  if (!raw) return "Bar / Resto";
  if (raw === "Bar/Resto")   return "Bar / Resto";
  if (raw === "Loisirs")     return "Loisirs";
  if (raw === "Night Clubs") return "Night Clubs";
  if (raw === "Hôtels")      return "Hôtels";
  if (raw === "Populaires")  return "Populaires";
  return raw;
}

function categoryToCatKey(raw: string | null) {
  if (!raw || raw === "Bar/Resto") return "bar_resto";
  if (raw === "Loisirs")     return "loisirs";
  if (raw === "Night Clubs") return "club";
  if (raw === "Hôtels")      return "hotel";
  if (raw === "Populaires")  return "populaires";
  return "bar_resto";
}

function getOrCreateDeviceId() {
  const key = "bingo_device_id";
  let v = "";
  try {
    v = localStorage.getItem(key) || "";
    if (!v) {
      v = "dev_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
      localStorage.setItem(key, v);
    }
  } catch { v = "dev_" + Date.now().toString(16); }
  return v;
}

function cleanUrl(u?: string | null) {
  const s = (u ?? "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function getUtm() {
  const sp = new URLSearchParams(window.location.search);
  return {
    utm_source: sp.get("utm_source"),
    utm_medium: sp.get("utm_medium"),
    utm_campaign: sp.get("utm_campaign"),
  };
}

async function trackClick(
  entity_type: "place" | "event",
  entity_id: string,
  click_type: "whatsapp" | "maps" | "website" | "instagram" | "tiktok"
) {
  try {
    const device_id = getOrCreateDeviceId();
    const utm = getUtm();
    fetch("/api/track/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type, entity_id, click_type, device_id, ...utm }),
    }).catch(() => {});
  } catch {}
}

export default function PlaceDetailPage() {
  const params  = useParams<{ id: string }>();
  const router  = useRouter();
  const sp      = useSearchParams();
  const placeId = params?.id;
  const catFromUrl = (sp?.get("cat") || "").trim();

  const [place, setPlace]       = useState<PlaceItem | null>(null);
  const [loading, setLoading]   = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState(false);
  const [liked, setLiked]       = useState(false);

  useEffect(() => {
    trackPageView({ entity_type: "place", entity_id: String(placeId) });
  }, [placeId]);

  useEffect(() => {
    const load = async () => {
      if (!placeId) return;
      setLoading(true); setErrorMsg(null);
      const { data, error } = await supabase.from("places").select("*").eq("id", placeId).single();
      if (error) { setErrorMsg(error.message); setPlace(null); }
      else {
        const p = data as any;
        setPlace({ ...(p as PlaceItem), media_urls: Array.isArray(p.media_urls) ? p.media_urls : [] });
      }
      setLoading(false);
    };
    load();
  }, [placeId]);

  const media = useMemo(() => {
    if (!place) return [];
    const arr = Array.isArray(place.media_urls) ? place.media_urls : [];
    const merged = [place.image, ...arr].filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0
    );
    return Array.from(new Set(merged)).slice(0, 4);
  }, [place]);

  const waLink = useMemo(() => {
    if (!place?.whatsapp) return null;
    return `https://wa.me/${normalizePhoneToWa(place.whatsapp)}?text=${encodeURIComponent(
      `Bonsoir, je veux des infos sur: ${place.name ?? "cette place"}`
    )}`;
  }, [place]);

  const handleBack = () => router.back();

  const shareText = useMemo(() => {
    if (!place) return "";
    const url = typeof window !== "undefined" ? window.location.href : "";
    return [
      `✨ *${place.name}*`,
      `📌 Catégorie : ${categoryLabel(place.category)}`,
      place.location ? `📍 Lieu : ${place.location}` : "",
      place.description ? place.description : "",
      "",
      `👉 Détails : ${url}`,
    ].filter(Boolean).join("\n");
  }, [place]);

  const handleShare = async () => {
    if (!place) return;
    const url = window.location.href;
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: place.name ?? "Bingo", text: shareText, url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(shareText); alert("✅ Texte copié !"); }
    catch { prompt("Copie ce texte :", shareText); }
  };

  const handleInterested = async () => {
    if (!place || !placeId || liked) return;
    setLikeLoading(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch(`/api/places/${placeId}/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert("Erreur: " + (data?.error || "Impossible")); return; }
      setLiked(true);
      if (!data?.already) {
        setPlace((prev) => prev ? { ...prev, interest_count: (prev.interest_count ?? 0) + 1 } : prev);
      }
    } finally { setLikeLoading(false); }
  };

  const openTracked = (url: string, type: "whatsapp" | "maps" | "website" | "instagram" | "tiktok") => {
    if (!place?.id) return;
    trackClick("place", place.id, type);
    window.open(url, "_blank", "noreferrer");
  };

  if (loading) return (
    <main className="min-h-screen">
      <BingoBackground />
      <div className="max-w-6xl mx-auto px-4 lg:px-10 pt-6">
        <p className="text-white/70">Chargement...</p>
      </div>
    </main>
  );

  if (errorMsg || !place) return (
    <main className="min-h-screen">
      <BingoBackground />
      <div className="max-w-6xl mx-auto px-4 lg:px-10 pt-6">
        <p className="text-sm text-red-400 mb-4">Erreur: {errorMsg ?? "Introuvable"}</p>
        <button onClick={handleBack} className="border border-white/20 text-white px-3 py-2 rounded-xl">
          Retour
        </button>
      </div>
    </main>
  );

  const maps    = cleanUrl(place.maps_url);
  const website = cleanUrl(place.website_url);
  const ig      = cleanUrl(place.instagram_url);
  const tt      = cleanUrl(place.tiktok_url);

  return (
    <main className="min-h-screen">
      <BingoBackground />

      <div className="max-w-6xl mx-auto px-4 lg:px-10 pt-6 pb-12">

        {/* ── RETOUR ── */}
        <button onClick={handleBack}
          className="mb-5 border border-white/20 text-white px-3 py-2 rounded-xl hover:bg-white/10 transition text-sm">
          ← Retour
        </button>

        {/* ── DESKTOP : 2 colonnes | MOBILE : 1 colonne ── */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start">

          {/* ── GAUCHE : Média ── */}
          <div>
            {media.length > 0 ? (
              <div className="relative rounded-2xl overflow-hidden">
                <MediaCarousel media={media} height="h-72 lg:h-96" />
                {place.is_featured && (
                  <div className="absolute top-3 right-3 bg-white/10 border border-white/15 text-white text-xs px-2 py-1 rounded-full backdrop-blur">
                    Premium
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-72 lg:h-96 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-white/40">Pas de média</span>
              </div>
            )}
          </div>

          {/* ── DROITE : Infos + Actions ── */}
          <div className="mt-6 lg:mt-0">

            {/* Catégorie + Titre */}
            <div className="text-white/50 text-xs uppercase tracking-widest mb-1">
              {categoryLabel(place.category)}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight">
              {place.name}
            </h1>

            {/* Infos clés */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="flex items-center gap-3 text-sm text-white/80">
                <span className="text-lg">📍</span>
                <span>{place.location ?? "Lieu ?"}</span>
              </div>
              {(place.interest_count ?? 0) > 0 && (
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <span className="text-lg">❤️</span>
                  <span>{place.interest_count} personne{(place.interest_count ?? 0) > 1 ? "s" : ""} intéressée{(place.interest_count ?? 0) > 1 ? "s" : ""}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {place.description && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-white font-semibold mb-2">Description</div>
                <p className="text-sm text-white/75 whitespace-pre-line leading-relaxed">
                  {place.description}
                </p>
              </div>
            )}

            {/* Liens externes */}
            {(maps || website || ig || tt) && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {maps && (
                  <button onClick={() => openTracked(maps, "maps")}
                    className="text-center border border-white/20 text-white py-2.5 rounded-xl hover:bg-white/10 transition text-sm">
                    🗺️ Adresse
                  </button>
                )}
                {website && (
                  <button onClick={() => openTracked(website, "website")}
                    className="text-center border border-white/20 text-white py-2.5 rounded-xl hover:bg-white/10 transition text-sm">
                    🌐 Site web
                  </button>
                )}
                {ig && (
                  <button onClick={() => openTracked(ig, "instagram")}
                    className="text-center border border-white/20 text-white py-2.5 rounded-xl hover:bg-white/10 transition text-sm">
                    📸 Instagram
                  </button>
                )}
                {tt && (
                  <button onClick={() => openTracked(tt, "tiktok")}
                    className="text-center border border-white/20 text-white py-2.5 rounded-xl hover:bg-white/10 transition text-sm">
                    🎵 TikTok
                  </button>
                )}
              </div>
            )}

            {/* Actions principales */}
            <div className="mt-4 grid gap-2">
              {waLink ? (
                <button onClick={() => openTracked(waLink, "whatsapp")}
                  className="text-center bg-white text-black py-3 rounded-xl font-medium hover:scale-[1.02] transition">
                  💬 Contacter sur WhatsApp
                </button>
              ) : (
                <button disabled
                  className="text-center bg-white/5 text-white/40 py-3 rounded-xl border border-white/10 cursor-not-allowed">
                  WhatsApp non disponible
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleShare}
                  className="text-center border border-white/20 text-white py-3 rounded-xl hover:bg-white/10 transition">
                  🔗 Partager
                </button>
                <button onClick={handleInterested} disabled={likeLoading || liked}
                  className={`text-center border py-3 rounded-xl transition ${
                    liked
                      ? "border-red-500/30 bg-red-500/10 text-red-400"
                      : "border-white/20 text-white hover:bg-white/10"
                  } disabled:opacity-60`}>
                  {liked ? "❤️ Intéressé(e)" : likeLoading ? "..." : "🤍 Intéressé(e)"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}