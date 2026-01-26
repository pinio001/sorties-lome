// app/admin/places/manage/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type PlaceItem = {
  id: string;
  name: string | null;
  category: string | null;
  location: string | null;
  is_featured: boolean | null;
  featured_rank: number | null;
};

export default function AdminPlacesManagePage() {
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ recherche admin
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/places", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setPlaces(Array.isArray(data?.places) ? data.places : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return places;
    return places.filter((p) => (p.name ?? "").toLowerCase().includes(query));
  }, [places, q]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-4 space-y-4">
        <header className="flex items-center justify-between">
          <a
            href="/admin/places"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition"
          >
            ← Ajouter Place
          </a>
          <a
            href="/places"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition"
          >
            Voir Places →
          </a>
        </header>

        {/* ✅ recherche */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une carte…"
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/40"
          />
          <div className="text-xs text-white/60">
            Résultats : {filtered.length}
          </div>
        </div>

        {loading ? (
          <div className="text-white/70">Chargement…</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">
                    {p.name ?? "Sans nom"}
                  </div>
                  <div className="text-xs text-white/60 truncate">
                    {p.category ?? "Catégorie ?"} • {p.location ?? "Lieu ?"}
                  </div>
                </div>

                <a
                  href={`/admin/places/edit/${p.id}`}
                  className="shrink-0 text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition"
                >
                  Modifier
                </a>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-white/60 text-sm">Aucun résultat.</div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
