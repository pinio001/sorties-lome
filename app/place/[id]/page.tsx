// app/place/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import BingoBackground from "../../components/BingoBackground";
import MediaCarousel from "../../components/MediaCaroussel";

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

export default function PlaceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const placeId = params?.id;

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
        setPlace(data as any);
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
    // de-dup + max 4
    return Array.from(new Set(merged)).slice(0, 4);
  }, [place]);

  const waLink = useMemo(() => {
    if (!place?.whatsapp) return null;
    return `https://wa.me/${normalizePhoneToWa(place.whatsapp)}?text=${encodeURIComponent(
      `Bonsoir, je veux des infos sur: ${place.name}`
    )}`;
  }, [place]);

  const shareText = useMemo(() => {
    if (!place) return "";
    const url = typeof window !== "undefined" ? window.location.href : "";
    const parts = [
      `✨ *${place.name}*`,
      `📌 Catégorie : ${categoryLabel(place.category)}`,
      place.location ? `📍 Lieu : ${place.location}` : "",
      place.description ? "" : "",
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
        alert("Erreur: " + (data?.error || JSON.stringify(data) || "Impossible"));
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
        <p className="text-sm text-red-400 mb-4">Erreur: {errorMsg ?? "Introuvable"}</p>
        <button
          onClick={() => router.push("/places")}
          className="border border-white/20 text-white px-3 py-2 rounded-xl"
        >
          Retour
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto min-h-screen">
      <BingoBackground />

      {/* Media header (CAROUSEL ONLY HERE) */}
      {media.length > 0 ? (
        <div className="relative">
          <MediaCarousel media={media} height="h-72" />

          <button
            onClick={() => router.push("/places")}
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
            onClick={() => router.push("/places")}
            className="border border-white/20 text-white px-3 py-2 rounded-xl"
          >
            ← Retour
          </button>
        </div>
      )}

      {/* Body */}
      <div className="p-4">
        <div className="text-white/60 text-xs mb-1">{categoryLabel(place.category)}</div>

        <h1 className="text-2xl font-bold text-white">{place.name}</h1>

        {/* compteur ❤️ sous le titre */}
        <div className="mt-2 text-sm text-white/70">
          ❤️ {(place.interest_count ?? 0).toString()} intéressé(s)
        </div>

        <div className="mt-3 space-y-1 text-sm text-white/80">
          <p>📍 {place.location ?? "Lieu ?"}</p>
        </div>

        {/* Description */}
        {place.description ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-white font-semibold mb-2">Description</div>
            <p className="text-sm text-white/75 whitespace-pre-line">{place.description}</p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="mt-5 grid gap-2">
          {/* WhatsApp principal */}
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="text-center bg-white text-black py-3 rounded-xl font-medium"
            >
              Contacter sur WhatsApp
            </a>
          ) : (
            <button
              className="text-center bg-white/5 text-white/40 py-3 rounded-xl border border-white/10 cursor-not-allowed"
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

          {/* Interested ❤️ */}
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
