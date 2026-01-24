// app/admin/places/edit/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Category = "Bar/Resto" | "Loisirs" | "Night Clubs" | "Hôtels" | "Populaires";

function normalizeCategoryClient(input: any): Category {
  const raw = String(input ?? "").trim();
  if (!raw) return "Bar/Resto";

  if (raw === "Bar/Resto" || raw === "Loisirs" || raw === "Night Clubs" || raw === "Hôtels" || raw === "Populaires") {
    return raw;
  }

  const s = raw.toLowerCase();

  if (s === "bar/resto" || s === "bar / resto" || s === "bar_resto" || (s.includes("bar") && s.includes("resto"))) return "Bar/Resto";
  if (s === "loisirs" || s === "loisir") return "Loisirs";
  if (s === "night clubs" || s === "night club" || s === "night_clubs" || s === "clubs" || s === "club") return "Night Clubs";
  if (s === "hôtels" || s === "hotel" || s === "hôtel" || s.includes("auberge")) return "Hôtels";
  if (s === "populaires" || s === "populaire" || s === "popular") return "Populaires";

  return "Bar/Resto";
}

function safeParse(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export default function EditPlacePage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("Bar/Resto");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredRank, setFeaturedRank] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      const res = await fetch(`/api/admin/places/${id}`, {
        credentials: "include",
      });

      const text = await res.text();
      const data = safeParse(text);

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
      setCategory(normalizeCategoryClient(p.category));
      setLocation(p.location ?? "");
      setImage(p.image ?? "");

      const m = Array.isArray(p.media_urls) ? p.media_urls : [];
      setMediaUrls(m.filter((x: any) => typeof x === "string").slice(0, 4));

      setWhatsapp(p.whatsapp ?? "");
      setDescription(p.description ?? "");
      setIsFeatured(!!p.is_featured);
      setFeaturedRank(p.featured_rank ?? 0);

      setLoading(false);
    };

    load();
  }, [id]);

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

  const save = async () => {
    if (!name) {
      alert("Nom obligatoire");
      return;
    }
    if (!id) {
      alert("ID manquant");
      return;
    }

    setSaving(true);

    const payload = {
      name,
      category, // ✅ envoie "Bar/Resto" exactement (compatible CHECK)
      location: location || null,
      image: image || null,
      whatsapp: whatsapp || null,
      description: description || null,
      is_featured: isFeatured,
      featured_rank: featuredRank,
      media_urls: mediaUrls.filter((x) => typeof x === "string" && x.trim().length > 0).slice(0, 4),
    };

    const res = await fetch(`/api/admin/places/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    const data = safeParse(text);

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
          className="rounded-xl p-3 bg-white text-black w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom"
        />

        <select
          className="rounded-xl p-3 bg-white text-black w-full"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          <option value="Bar/Resto">Bar / Resto</option>
          <option value="Loisirs">Loisirs</option>
          <option value="Night Clubs">Night Clubs</option>
          <option value="Hôtels">Hôtels</option>
          <option value="Populaires">Populaires</option>
        </select>

        <input
          className="rounded-xl p-3 bg-white text-black w-full"
          placeholder="Lieu"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <input
          className="rounded-xl p-3 bg-white text-black w-full"
          placeholder="Image principale (URL)"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />

        {/* Médias */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/80">Médias (max 4)</span>
            <button
              type="button"
              onClick={addMedia}
              className="underline text-sm"
            >
              + Ajouter
            </button>
          </div>

          {mediaUrls.length === 0 && (
            <div className="text-xs text-white/60">
              Aucun média additionnel.
            </div>
          )}

          {mediaUrls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="flex-1 rounded-xl p-3 bg-white text-black"
                placeholder={`Media URL ${i + 1}`}
                value={url}
                onChange={(e) => updateMedia(i, e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeMedia(i)}
                className="px-3 rounded-xl border border-white/20 text-white/80"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <input
          className="rounded-xl p-3 bg-white text-black w-full"
          placeholder="WhatsApp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />

        <textarea
          className="rounded-xl p-3 bg-white text-black w-full min-h-[120px]"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
            />
            Mettre en avant
          </label>

          <input
            type="number"
            className="w-28 rounded-xl p-3 bg-white text-black"
            value={featuredRank}
            onChange={(e) => setFeaturedRank(Number(e.target.value))}
            placeholder="Ordre"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="bg-white text-black rounded-xl py-3 font-semibold w-full"
        >
          {saving ? "Sauvegarde…" : "Enregistrer"}
        </button>
      </div>
    </main>
  );
}
