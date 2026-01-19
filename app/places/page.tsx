"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import BingoBackground from "../components/BingoBackground";

type PlaceItem = {
  id: string;
  name: string;
  category: "bar_resto" | "hotel" | "loisirs";
  location: string | null;
  image: string | null;
  media_urls?: string[] | null;
  whatsapp: string | null;
  description: string | null;
  is_featured: boolean | null;
  featured_rank: number | null;
  interest_count: number | null;
};

type Tab = "BAR_RESTO" | "HOTEL" | "LOISIRS" | "POPULAIRES";

/* =========================
   HELPERS
========================= */

function normalizePhoneToWa(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

function tabLabel(t: Tab) {
  if (t === "BAR_RESTO") return "Bar / Resto";
  if (t === "HOTEL") return "Hôtel / Auberge";
  if (t === "LOISIRS") return "Loisirs";
  return "Populaires ❤️";
}

function categoryFromTab(t: Tab): PlaceItem["category"] | null {
  if (t === "BAR_RESTO") return "bar_resto";
  if (t === "HOTEL") return "hotel";
  if (t === "LOISIRS") return "loisirs";
  return null;
}

/* =========================
   PAGE
========================= */

export default function PlacesPage() {
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("BAR_RESTO");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("places")
        .select("*")
        .order("created_at", { ascending: false });

      setPlaces((data ?? []) as PlaceItem[]);
      setLoading(false);
    };

    load();
  }, []);

  const featuredForTab = useMemo(() => {
    const cat = categoryFromTab(tab);
    if (!cat) return [];
    return places
      .filter((p) => p.category === cat && p.is_featured)
      .sort((a, b) => (a.featured_rank ?? 0) - (b.featured_rank ?? 0));
  }, [places, tab]);

  const filtered = useMemo(() => {
    if (tab === "POPULAIRES") {
      return [...places].sort(
        (a, b) => (b.interest_count ?? 0) - (a.interest_count ?? 0)
      );
    }
    const cat = categoryFromTab(tab);
    return places.filter((p) => p.category === cat);
  }, [places, tab]);

  /* ========================= */

  return (
    <main className="min-h-screen">
      <BingoBackground />

      <div className="max-w-md mx-auto px-4 pt-6 pb-10">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white text-black font-bold flex items-center justify-center">
              B
            </div>
            <div>
              <div className="text-white font-semibold leading-tight">
                Bingo
              </div>
              <div className="text-xs text-white/60">Places</div>
            </div>
          </div>

          <a
            href="/events"
            className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white hover:bg-white/10"
          >
            ← Events
          </a>
        </div>

        {/* HERO CARD (comme Events) */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 mb-5">
          <h1 className="text-white font-semibold text-lg">
            Où sortir à Lomé ?
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Bars, restos, hôtels, loisirs — découvre les meilleurs spots
            autour de toi.
          </p>
        </div>

        {/* TABS */}
        <div className="flex gap-2 flex-wrap mb-4">
          {(["BAR_RESTO", "HOTEL", "LOISIRS", "POPULAIRES"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 rounded-xl text-sm border ${
                tab === t
                  ? "bg-white text-black"
                  : "border-white/20 text-white"
              }`}
            >
              {tabLabel(t)}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {loading ? (
          <p className="text-white/60 mt-6">Chargement…</p>
        ) : (
          <>
            {tab !== "POPULAIRES" && featuredForTab.length > 0 && (
              <>
                <h2 className="text-white font-semibold mt-6 mb-3">
                  🔥 En avant
                </h2>
                <div className="grid gap-4">
                  {featuredForTab.map((p) => (
                    <PlaceCard key={p.id} place={p} />
                  ))}
                </div>
              </>
            )}

            <h2 className="text-white font-semibold mt-6 mb-3">Tous</h2>

            <div className="grid gap-4">
              {filtered.map((p) => (
                <PlaceCard key={p.id} place={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/* =========================
   CARD (inchangé)
========================= */

function PlaceCard({ place }: { place: PlaceItem }) {
  const media =
    place.media_urls && place.media_urls.length > 0
      ? place.media_urls
      : place.image
      ? [place.image]
      : [];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (media.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % media.length);
    }, 1500);
    return () => clearInterval(t);
  }, [media.length]);

  const current = media[index];
  const isVideo = current?.match(/\.(mp4|webm|ogg)$/i);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative w-full h-44 overflow-hidden">
        {current ? (
          isVideo ? (
            <video
              src={current}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={current}
              alt={place.name}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <span className="text-sm text-white/50">Pas de média</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between gap-2">
          <h2 className="font-semibold text-white">{place.name}</h2>
          {(place.interest_count ?? 0) > 0 && (
            <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
              ❤️ {place.interest_count}
            </span>
          )}
        </div>

        <p className="text-sm text-white/60 mt-1">
          {place.location ?? "Lieu ?"}
        </p>

        <div className="mt-4 flex gap-2">
          <a
            href={`/place/${place.id}`}
            className="flex-1 text-center bg-white text-black py-2 rounded-xl font-medium"
          >
            Détails
          </a>

          {place.whatsapp && (
            <a
              className="flex-1 text-center border border-white/20 text-white py-2 rounded-xl hover:bg-white/10"
              href={`https://wa.me/${normalizePhoneToWa(place.whatsapp)}?text=${encodeURIComponent(
                `Bonsoir, je veux des infos sur ${place.name}`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
