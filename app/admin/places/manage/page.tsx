"use client";

import { useEffect, useMemo, useState } from "react";

type Category = "bar_resto" | "hotel" | "loisirs" | "all";

type Place = {
  id: string;
  name: string;
  category: "bar_resto" | "hotel" | "loisirs";
  location: string | null;
  is_featured: boolean;
  featured_rank: number | null;
  interest_count: number | null;
};

function labelCategory(c: Category) {
  if (c === "bar_resto") return "Bar / Resto";
  if (c === "hotel") return "Hôtel / Auberge";
  if (c === "loisirs") return "Loisirs";
  return "Tous";
}

export default function AdminPlacesManagePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [tab, setTab] = useState<Category>("all");
  const [loading, setLoading] = useState(true);

  const loadPlaces = async () => {
    setLoading(true);

    const res = await fetch("/api/admin/places", {
      cache: "no-store",
      credentials: "include", // 🔥 OBLIGATOIRE
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert("Erreur : " + (data?.error || "Impossible"));
      setPlaces([]);
      setLoading(false);
      return;
    }

    setPlaces(data.places ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadPlaces();
  }, []);

  const filteredPlaces = useMemo(() => {
    if (tab === "all") return places;
    return places.filter((p) => p.category === tab);
  }, [places, tab]);

  const deletePlace = async (id: string) => {
    if (!confirm("Supprimer cette place ?")) return;

    const res = await fetch(`/api/admin/places/${id}`, {
      method: "DELETE",
      credentials: "include", // 🔥 OBLIGATOIRE
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert("Erreur : " + (data?.error || "Impossible"));
      return;
    }

    setPlaces((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Gérer • Places</h1>
          <a href="/admin/places" className="underline text-sm">
            + Ajouter
          </a>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {(["all", "bar_resto", "hotel", "loisirs"] as Category[]).map(
            (c) => (
              <button
                key={c}
                onClick={() => setTab(c)}
                className={`px-3 py-2 rounded-xl border text-sm ${
                  tab === c
                    ? "bg-white text-black border-white"
                    : "border-white/30"
                }`}
              >
                {labelCategory(c)}
              </button>
            )
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <button onClick={loadPlaces} className="underline">
            Rafraîchir
          </button>
          <a
            href="/places"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Voir page publique →
          </a>
        </div>

        {/* Content */}
        {loading && <p className="mt-4">Chargement…</p>}

        {!loading && filteredPlaces.length === 0 && (
          <p className="mt-4">Aucune place.</p>
        )}

        <div className="mt-4 grid gap-3">
          {filteredPlaces.map((p) => (
            <div
              key={p.id}
              className="border border-white/20 rounded-2xl p-3"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-white/70">
                    {labelCategory(p.category)} • {p.location || "Lieu ?"}
                  </div>
                  <div className="text-xs text-white/60 mt-1 flex gap-3">
                    <span>{p.is_featured ? "⭐ Premium" : "—"}</span>
                    <span>Ordre: {p.featured_rank ?? 0}</span>
                    <span>❤️ {p.interest_count ?? 0}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={`/admin/places/edit/${p.id}`}
                    className="border rounded-xl px-3 py-2 text-sm text-center"
                  >
                    Modifier
                  </a>
                  <button
                    onClick={() => deletePlace(p.id)}
                    className="border border-red-500 text-red-400 rounded-xl px-3 py-2 text-sm"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <div className="mt-2">
                <a
                  href={`/place/${p.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-sm"
                >
                  Voir en public →
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Footer nav */}
        <div className="flex justify-between text-sm mt-6">
          <a href="/admin" className="underline">
            ← Admin Events
          </a>
          <a href="/admin/manage" className="underline">
            Gérer Events →
          </a>
        </div>
      </div>
    </main>
  );
}
