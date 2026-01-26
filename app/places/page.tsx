// app/places/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import BingoBackground from "../components/BingoBackground";

type PlaceCategory = "bar_resto" | "loisirs" | "club" | "hotel";

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

const TABS = [
  { key: "bar_resto", label: "Bar / Resto" },
  { key: "loisirs", label: "Loisirs" },
  { key: "club", label: "Night Clubs" },
  { key: "hotel", label: "Hôtels" },
  { key: "populaires", label: "Populaires ♥" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function normalizeCategory(raw?: string | null): PlaceCategory {
  if (!raw) return "bar_resto";
  switch (raw) {
    case "Bar/Resto":
      return "bar_resto";
    case "Loisirs":
      return "loisirs";
    case "Night Clubs":
      return "club";
    case "Hôtels":
      return "hotel";
    default:
      return "bar_resto";
  }
}

function normalizePhoneToWa(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

function norm(s: string) {
  return (s ?? "").trim().toLowerCase();
}

export default function PlacesPage() {
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("bar_resto");

  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("TOUS");
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of places) {
      const l = (p.location ?? "").trim();
      if (l) set.add(l);
    }
    return ["TOUS", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [places]);

  const matchesSearchAndLoc = (p: PlaceItem) => {
    const query = norm(q);
    const locSel = loc;

    const okName = query ? norm(p.name).includes(query) : true;
    const okLoc = locSel === "TOUS" ? true : norm(p.location ?? "") === norm(locSel);

    return okName && okLoc;
  };

  const featuredForTab = useMemo(() => {
    if (tab === "populaires") return [];
    return places
      .filter(
        (p) =>
          normalizeCategory(p.category) === tab &&
          p.is_featured === true &&
          matchesSearchAndLoc(p)
      )
      .sort((a, b) => (a.featured_rank ?? 0) - (b.featured_rank ?? 0));
  }, [places, tab, q, loc]);

  const filtered = useMemo(() => {
    if (tab === "populaires") {
      return [...places]
        .filter(matchesSearchAndLoc)
        .sort((a, b) => (b.interest_count ?? 0) - (a.interest_count ?? 0));
    }
    return places
      .filter((p) => normalizeCategory(p.category) === tab)
      .filter(matchesSearchAndLoc);
  }, [places, tab, q, loc]);

  const activeCount = (q.trim() ? 1 : 0) + (loc !== "TOUS" ? 1 : 0);

  return (
    <main className="min-h-screen">
      <BingoBackground />

      <div className="max-w-md mx-auto px-4 pt-6 pb-10">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white text-black font-bold flex items-center justify-center shadow-lg">
              <span className="font-black text-xl tracking-tight">B</span>
            </div>
            <div>
              <div className="text-white font-semibold">Bingo</div>
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

        {/* HERO (compact) */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-white font-semibold text-lg leading-6">
                Où sortir à Lomé ?
              </h1>
              <p className="text-sm text-white/60 mt-1">
                Explorez ces spots, retrouvez un endroit branché et profitez ! Recherchez par lieu au besoin              </p>
            </div>

            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="shrink-0 text-sm border border-white/20 px-3 py-2 rounded-xl text-white hover:bg-white/10"
            >
              Rechercher{activeCount ? ` (${activeCount})` : ""}
            </button>
          </div>

          {/* FILTERS (collapsible + compact) */}
          {filtersOpen && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Recherche une place"
                className="col-span-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-white/40"
              />

              <select
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                className="col-span-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
              >
                {locationOptions.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>

              <div className="col-span-3 flex items-center justify-between">
                <div className="text-xs text-white/60">
                  Résultats : {filtered.length}
                </div>

                {(q.trim() || loc !== "TOUS") && (
                  <button
                    onClick={() => {
                      setQ("");
                      setLoc("TOUS");
                    }}
                    className="text-xs border border-white/20 px-3 py-2 rounded-xl text-white hover:bg-white/10"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* TABS */}
        <div className="flex gap-2 flex-wrap mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 rounded-xl text-sm border transition ${
                tab === t.key
                  ? "bg-white text-black"
                  : "border-white/20 text-white hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {loading ? (
          <p className="text-white/60 mt-6">Chargement…</p>
        ) : (
          <>
            {tab !== "populaires" && featuredForTab.length > 0 && (
              <>
                <h2 className="text-white font-semibold mt-6 mb-3">🔥 En avant</h2>
                <div className="grid gap-4">
                  {featuredForTab.map((p) => (
                    <PlaceCard key={p.id} place={p} />
                  ))}
                </div>
              </>
            )}

            <h2 className="text-white font-semibold mt-6 mb-3">
              {tab === "populaires" ? "Classement" : "Tous"}
            </h2>
            <div className="grid gap-4">
              {filtered.map((p) => (
                <PlaceCard key={p.id} place={p} />
              ))}
            </div>

            {filtered.length === 0 && (
              <p className="text-white/60 mt-6">Aucun résultat.</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function PlaceCard({ place }: { place: PlaceItem }) {
  const primary =
    place.image ??
    (Array.isArray(place.media_urls) && place.media_urls.length > 0
      ? place.media_urls[0]
      : null);

  const isVideo = primary?.match(/\.(mp4|webm|ogg)$/i);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative w-full h-44 overflow-hidden">
        {primary ? (
          isVideo ? (
            <video
              src={primary}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={primary}
              alt={place.name}
              className="w-full h-full object-cover"
              loading="lazy"
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
              ♥ {place.interest_count}
            </span>
          )}
        </div>

        <p className="text-sm text-white/60 mt-1">{place.location ?? "Lieu ?"}</p>

        <div className="mt-4 flex gap-2">
          <a
            href={`/place/${place.id}`}
            className="flex-1 text-center bg-white text-black py-2 rounded-xl font-medium"
          >
            Détails
          </a>

          {place.whatsapp ? (
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
}
