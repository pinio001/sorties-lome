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
  whatsapp: string | null;
  description: string | null;
  is_featured: boolean | null;
  featured_rank: number | null;
  interest_count: number | null;
  created_at?: string | null;
};

type Tab = "BAR_RESTO" | "HOTEL" | "LOISIRS" | "POPULAIRES";

function normalizePhoneToWa(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

function Logo() {
  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <div className="h-10 w-10 rounded-2xl bg-white text-black flex items-center justify-center shadow">
        <span className="font-black text-xl tracking-tight">B</span>
      </div>

      <div className="leading-tight">
        <div className="text-white font-semibold text-lg">Bingo</div>
        <div className="text-white/60 text-xs">Places</div>
      </div>
    </div>
  );
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

export default function PlacesPage() {
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("BAR_RESTO");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("places")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
        setPlaces([]);
      } else {
        setPlaces((data ?? []) as any);
      }

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

  const PlaceCard = ({ place }: { place: PlaceItem }) => (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur fade-up transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {place.image ? (
        <img
          src={place.image}
          alt={place.name}
          className="w-full h-44 object-cover transition-transform duration-500 hover:scale-105"
        />
      ) : (
        <div className="w-full h-44 flex items-center justify-center bg-white/5">
          <span className="text-sm text-white/50">Pas d’image</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-white">{place.name}</h2>

          <div className="flex items-center gap-2">
            {(place.interest_count ?? 0) > 0 && (
              <span className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-white border border-white/10">
                ❤️ {place.interest_count}
              </span>
            )}

            {place.is_featured && (
              <span className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-white border border-white/10">
                Premium
              </span>
            )}
          </div>
        </div>

        <p className="text-sm text-white/60 mt-1">
          {place.location ?? "Lieu ?"}
        </p>

        <div className="mt-4 flex gap-2">
          <a
            href={`/place/${place.id}`}
            className="flex-1 text-center bg-white text-black py-2 rounded-xl font-medium transition-all active:scale-95"
          >
            Détails
          </a>

          {place.whatsapp ? (
            <a
              className="flex-1 text-center border border-white/20 text-white py-2 rounded-xl transition-all active:scale-95 hover:bg-white/10"
              href={`https://wa.me/${normalizePhoneToWa(place.whatsapp)}?text=${encodeURIComponent(
                `Bonsoir, je veux des infos sur: ${place.name}`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          ) : (
            <button
              className="flex-1 text-center border border-white/10 text-white/40 py-2 rounded-xl cursor-not-allowed"
              disabled
            >
              WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen">
      <BingoBackground />

      <div className="max-w-md mx-auto px-4 pt-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Logo />
          <a
            href="/events"
            className="text-sm text-white border border-white/20 px-3 py-2 rounded-xl transition-all hover:bg-white/10 active:scale-95"
          >
            ← Events
          </a>
        </div>

        {/* Hero + Tabs */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 animate-fade-in">
          <div className="text-white font-semibold">Places à Lomé</div>
          <div className="text-white/70 text-sm mt-1">
            Bars, restos, hôtels, loisirs — au même format Bingo.
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            {(["BAR_RESTO", "HOTEL", "LOISIRS", "POPULAIRES"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2 rounded-xl text-sm border transition-all duration-200 active:scale-95 ${
                  tab === t
                    ? "bg-white text-black border-white"
                    : "border-white/20 text-white hover:bg-white/10"
                }`}
              >
                {tabLabel(t)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4 mt-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        )}

        {errorMsg && (
          <p className="text-sm text-red-400 mt-5">Erreur : {errorMsg}</p>
        )}

        {!loading && !errorMsg && (
          <div key={tab} className="animate-fade-in">
            {tab !== "POPULAIRES" && featuredForTab.length > 0 && (
              <>
                <h2 className="font-semibold text-white mt-7 mb-3">🔥 En avant</h2>
                <div className="grid gap-4">
                  {featuredForTab.map((p) => (
                    <PlaceCard key={p.id} place={p} />
                  ))}
                </div>
              </>
            )}

            <h2 className="font-semibold text-white mt-7 mb-3">
              {tab === "POPULAIRES" ? "Les plus populaires" : "Tous"}
            </h2>

            {filtered.length === 0 ? (
              <p className="text-white/70">Aucun contenu.</p>
            ) : (
              <div className="grid gap-4">
                {filtered.map((p) => (
                  <PlaceCard key={p.id} place={p} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
