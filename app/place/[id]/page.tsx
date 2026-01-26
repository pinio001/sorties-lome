// app/place/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BingoBackground from "../../components/BingoBackground";
import MediaCarousel from "../../components/MediaCaroussel";

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
  if (raw === "Bar/Resto") return "Bar / Resto";
  if (raw === "Loisirs") return "Loisirs";
  if (raw === "Night Clubs") return "Night Clubs";
  if (raw === "Hôtels") return "Hôtels";
  if (raw === "Populaires") return "Populaires";
  return raw;
}

// ✅ clé URL pour /places?cat=...
function categoryToCatKey(raw: string | null) {
  if (!raw || raw === "Bar/Resto") return "bar_resto";
  if (raw === "Loisirs") return "loisirs";
  if (raw === "Night Clubs") return "club";
  if (raw === "Hôtels") return "hotel";
  if (raw === "Populaires") return "populaires";
  return "bar_resto";
}

function getOrCreateDeviceId() {
  const key = "bingo_device_id";
  let v = "";
  try {
    v = localStorage.getItem(key) || "";
    if (!v) {
      v =
        "dev_" +
        Math.random().toString(16).slice(2) +
        "_" +
        Date.now().toString(16);
      localStorage.setItem(key, v);
    }
  } catch {
    v = "dev_" + Date.now().toString(16);
  }
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
      body: JSON.stringify({
        entity_type,
        entity_id,
        click_type,
        device_id,
        ...utm,
      }),
    }).catch(() => {});
  } catch {}
}

export default function PlaceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sp = useSearchParams();
  const placeId = params?.id;

  // ✅ cat venant de /places (ex: /place/ID?cat=club)
  const catFromUrl = (sp?.get("cat") || "").trim();

  const [place, setPlace] = useState<PlaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [likeLoading, setLikeLoading] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!placeId) return;

      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("places")
        .select("*")
        .eq("id", placeId)
        .single();

      if (error) {
        setErrorMsg(error.message);
        setPlace(null);
      } else {
        const p = data as any;
        setPlace({
          ...(p as PlaceItem),
          media_urls: Array.isArray(p.media_urls) ? p.media_urls : [],
        });
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

  // ✅ RETOUR : priorise router.back() (retour exact), sinon fallback /places?cat=...
  const handleBack = () => {
    const fallbackCat =
      catFromUrl || (place ? categoryToCatKey(place.category) : "bar_resto");

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(`/places?cat=${encodeURIComponent(fallbackCat)}`);
  };

  const shareText = useMemo(() => {
    if (!place) return "";
    const url = typeof window !== "undefined" ? window.location.href : "";
    const parts = [
      `✨ *${place.name}*`,
      `📌 Catégorie : ${categoryLabel(place.category)}`,
      place.location ? `📍 Lieu : ${place.location}` : "",
      place.description ? place.description : "",
      "",
      `👉 Détails : ${url}`,
    ].filter(Boolean);
    return parts.join("\n");
  }, [place]);

  const handleShare = async () => {
    if (!place) return;

    const url = window.location.href;
    const title = place.name ?? "Bingo";
    const text = shareText;

    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title, text, url });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("✅ Texte copié ! Colle-le sur WhatsApp.");
    } catch {
      prompt("Copie ce texte :", text);
    }
  };

  const handleInterested = async () => {
    if (!place || !placeId) return;
    if (liked) return;

    setLikeLoading(true);
    try {
      const deviceId = getOrCreateDeviceId();

      const res = await fetch(`/api/places/${placeId}/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert("Erreur: " + (data?.error || "Impossible"));
        return;
      }

      setLiked(true);

      if (!data?.already) {
        setPlace((prev) =>
          prev ? { ...prev, interest_count: (prev.interest_count ?? 0) + 1 } : prev
        );
      }
    } finally {
      setLikeLoading(false);
    }
  };

  const openTracked = (
    url: string,
    type: "whatsapp" | "maps" | "website" | "instagram" | "tiktok"
  ) => {
    if (!place?.id) return;
    trackClick("place", place.id, type);
    window.open(url, "_blank", "noreferrer");
  };

  if (loading) {
    return (
      <main className="p-4 max-w-md mx-auto min-h-screen">
        <BingoBackground />
        <p className="text-white/70">Chargement...</p>
      </main>
    );
  }

  if (errorMsg || !place) {
    return (
      <main className="p-4 max-w-md mx-auto min-h-screen">
        <BingoBackground />
        <p className="text-sm text-red-400 mb-4">
          Erreur: {errorMsg ?? "Introuvable"}
        </p>
        <button
          onClick={handleBack}
          className="border border-white/20 text-white px-3 py-2 rounded-xl"
        >
          Retour
        </button>
      </main>
    );
  }

  const maps = cleanUrl(place.maps_url);
  const website = cleanUrl(place.website_url);
  const ig = cleanUrl(place.instagram_url);
  const tt = cleanUrl(place.tiktok_url);

  return (
    <main className="max-w-md mx-auto min-h-screen">
      <BingoBackground />

      {media.length > 0 ? (
        <div className="relative">
          <MediaCarousel media={media} height="h-72" />

          <button
            onClick={handleBack}
            className="absolute top-3 left-3 bg-black/60 border border-white/15 text-white px-3 py-2 rounded-xl backdrop-blur"
          >
            ← Retour
          </button>

          {place.is_featured && (
            <div className="absolute top-3 right-3 bg-white/10 border border-white/15 text-white text-xs px-2 py-1 rounded-full">
              Premium
            </div>
          )}
        </div>
      ) : (
        <div className="p-4">
          <button
            onClick={handleBack}
            className="border border-white/20 text-white px-3 py-2 rounded-xl"
          >
            ← Retour
          </button>
        </div>
      )}

      <div className="p-4">
        <div className="text-white/60 text-xs mb-1">
          {categoryLabel(place.category)}
        </div>

        <h1 className="text-2xl font-bold text-white">{place.name}</h1>

        <div className="mt-2 text-sm text-white/70">
          ❤️ {(place.interest_count ?? 0).toString()} intéressé(s)
        </div>

        <div className="mt-3 space-y-1 text-sm text-white/80">
          <p>📍 {place.location ?? "Lieu ?"}</p>
        </div>

        {place.description ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-white font-semibold mb-2">Description</div>
            <p className="text-sm text-white/75 whitespace-pre-line">
              {place.description}
            </p>
          </div>
        ) : null}

        {(maps || website || ig || tt) && (
          <div className="mt-4 grid gap-2">
            {maps && (
              <button
                onClick={() => openTracked(maps, "maps")}
                className="text-center border border-white/20 text-white py-3 rounded-xl hover:bg-white/10"
              >
                Adresse
              </button>
            )}

            {website && (
              <button
                onClick={() => openTracked(website, "website")}
                className="text-center border border-white/20 text-white py-3 rounded-xl hover:bg-white/10"
              >
                Page web
              </button>
            )}

            {ig && (
              <button
                onClick={() => openTracked(ig, "instagram")}
                className="text-center border border-white/20 text-white py-3 rounded-xl hover:bg-white/10"
              >
                Instagram/Facebook
              </button>
            )}

            {tt && (
              <button
                onClick={() => openTracked(tt, "tiktok")}
                className="text-center border border-white/20 text-white py-3 rounded-xl hover:bg-white/10"
              >
                TikTok
              </button>
            )}
          </div>
        )}

        <div className="mt-5 grid gap-2">
          {waLink ? (
            <button
              onClick={() => openTracked(waLink, "whatsapp")}
              className="text-center bg-black text-white py-3 rounded-xl font-medium border border-white/20"
            >
              Contacter sur WhatsApp
            </button>
          ) : (
            <button
              className="text-center bg-black/5 text-white/40 py-3 rounded-xl border border-white/40 cursor-not-allowed"
              disabled
            >
              WhatsApp non disponible
            </button>
          )}

          <button
            onClick={handleShare}
            className="text-center border border-white/20 text-white py-3 rounded-xl"
          >
            Partager
          </button>

          <button
            onClick={handleInterested}
            disabled={likeLoading || liked}
            className="text-center border border-white/20 text-white py-3 rounded-xl disabled:opacity-60"
          >
            {liked ? "❤️ Intéressé(e)" : likeLoading ? "..." : "❤️ Intéressé(e)"}
          </button>
        </div>
      </div>
    </main>
  );
}
