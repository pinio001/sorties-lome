"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Category = "bar_resto" | "hotel" | "loisirs";

export default function EditPlacePage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("bar_resto");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredRank, setFeaturedRank] = useState(0);

  // 🔹 Charger la place
  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/admin/places/${id}`, {
        credentials: "include", // 🔥 IMPORTANT
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert("Erreur : " + (data?.error || "Impossible"));
        return;
      }

      const p = data.place;
      setName(p.name);
      setCategory(p.category);
      setLocation(p.location || "");
      setImage(p.image || "");
      setWhatsapp(p.whatsapp || "");
      setDescription(p.description || "");
      setIsFeatured(!!p.is_featured);
      setFeaturedRank(p.featured_rank || 0);
      setLoading(false);
    };

    load();
  }, [id]);

  // 🔹 Sauvegarder
  const save = async () => {
    if (!name) {
      alert("Nom obligatoire");
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/admin/places/${id}`, {
      method: "PATCH",
      credentials: "include", // 🔥 IMPORTANT
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        location,
        image,
        whatsapp,
        description,
        is_featured: isFeatured,
        featured_rank: featuredRank,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert("Erreur : " + (data?.error || "Impossible"));
      setSaving(false);
      return;
    }

    alert("✅ Place modifiée");
    router.push("/admin/places/manage");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-4">
        Chargement…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-xl font-bold mb-4">Modifier • Place</h1>

        <div className="grid gap-4">
          <input
            className="rounded-xl p-3 text-black"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <select
            className="rounded-xl p-3 text-black"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            <option value="bar_resto">Bar / Resto</option>
            <option value="hotel">Hôtel / Auberge</option>
            <option value="loisirs">Loisirs</option>
          </select>

          <input
            className="rounded-xl p-3 text-black"
            placeholder="Lieu"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <input
            className="rounded-xl p-3 text-black"
            placeholder="Image (URL)"
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />

          <input
            className="rounded-xl p-3 text-black"
            placeholder="WhatsApp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />

          <textarea
            className="rounded-xl p-3 text-black min-h-[120px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              Mettre en avant
            </label>

            <input
              type="number"
              className="w-24 rounded-xl p-2 text-black"
              value={featuredRank}
              onChange={(e) => setFeaturedRank(Number(e.target.value))}
            />
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="bg-white text-black rounded-xl py-3 font-semibold"
          >
            {saving ? "..." : "Enregistrer"}
          </button>

          <button
            onClick={() => router.back()}
            className="underline text-sm"
          >
            ← Retour
          </button>
        </div>
      </div>
    </main>
  );
}
