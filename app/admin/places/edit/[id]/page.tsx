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
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredRank, setFeaturedRank] = useState(0);

  /* =========================
     LOAD (SAFE)
  ========================= */
  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/admin/places/${id}`, {
        credentials: "include",
      });

      const text = await res.text();
      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        alert("Erreur : " + (data?.error || "Impossible"));
        return;
      }

      const p = data.place;
      if (!p) {
        alert("Erreur : Place introuvable");
        return;
      }

      setName(p.name ?? "");
      setCategory(p.category);
      setLocation(p.location ?? "");
      setImage(p.image ?? "");
      setMediaUrls(Array.isArray(p.media_urls) ? p.media_urls : []);
      setWhatsapp(p.whatsapp ?? "");
      setDescription(p.description ?? "");
      setIsFeatured(!!p.is_featured);
      setFeaturedRank(p.featured_rank ?? 0);

      setLoading(false);
    };

    load();
  }, [id]);

  /* =========================
     MEDIA
  ========================= */
  const addMedia = () => {
    if (mediaUrls.length >= 4) return;
    setMediaUrls([...mediaUrls, ""]);
  };

  const updateMedia = (i: number, val: string) => {
    const copy = [...mediaUrls];
    copy[i] = val;
    setMediaUrls(copy);
  };

  const removeMedia = (i: number) => {
    setMediaUrls(mediaUrls.filter((_, idx) => idx !== i));
  };

  /* =========================
     SAVE
  ========================= */
  const save = async () => {
    if (!name) {
      alert("Nom obligatoire");
      return;
    }

    setSaving(true);

    const payload = {
      name,
      category,
      location,
      image,
      whatsapp,
      description,
      is_featured: isFeatured,
      featured_rank: featuredRank,
      media_urls: mediaUrls.filter(Boolean),
    };

    const res = await fetch(`/api/admin/places/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: any = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

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
      <div className="max-w-md mx-auto p-4 space-y-4">
        <h1 className="text-xl font-bold">Modifier • Place</h1>

        <input
          className="rounded-xl p-3 bg-white text-black"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <select
          className="rounded-xl p-3 bg-white text-black"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          <option value="bar_resto">Bar / Resto</option>
          <option value="hotel">Hôtel / Auberge</option>
          <option value="loisirs">Loisirs</option>
        </select>

        <input
          className="rounded-xl p-3 bg-white text-black"
          placeholder="Lieu"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <input
          className="rounded-xl p-3 bg-white text-black"
          placeholder="Image principale (URL)"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />

        {/* Médias */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Médias (max 4)</span>
            <button onClick={addMedia} className="underline text-sm">
              + Ajouter
            </button>
          </div>

          {mediaUrls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="flex-1 rounded-xl p-3 bg-white text-black"
                value={url}
                onChange={(e) => updateMedia(i, e.target.value)}
              />
              <button
                onClick={() => removeMedia(i)}
                className="text-red-400"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <input
          className="rounded-xl p-3 bg-white text-black"
          placeholder="WhatsApp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />

        <textarea
          className="rounded-xl p-3 bg-white text-black min-h-[120px]"
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
            className="w-24 rounded-xl p-2 bg-white text-black"
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
    </main>
  );
}
