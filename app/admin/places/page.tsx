"use client";

import { useState } from "react";

type Category = "bar_resto" | "loisirs" | "club" | "hotel";

function generateWhatsAppDescription(
  name: string,
  category: Category,
  location?: string
) {
  const catLabel =
    category === "bar_resto"
      ? "Bar / Resto"
      : category === "loisirs"
      ? "Loisirs"
      : category === "club"
      ? "Night Club"
      : "Hôtels";

  return [
    `✨ *${name || "Bon plan"}*`,
    `📌 Catégorie : ${catLabel}`,
    location ? `📍 Lieu : ${location}` : "",
    "",
    `🔥 Ambiance au top`,
    `💸 Prix accessibles`,
    `🤝 Bon service`,
    "",
    `Écris-moi pour plus d'infos ou une réservation.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function AdminPlacesPage() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("bar_resto");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([""]);
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredRank, setFeaturedRank] = useState(0);
  const [loading, setLoading] = useState(false);

  const generateDescription = () => {
    setDescription(generateWhatsAppDescription(name, category, location));
  };

  const addMediaField = () => {
    if (mediaUrls.length >= 4) return;
    setMediaUrls([...mediaUrls, ""]);
  };

  const removeMediaField = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (!name) {
      alert("Le nom est obligatoire");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/places", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          location: location || null,
          image: image || null,
          media_urls: mediaUrls.filter(Boolean),
          whatsapp: whatsapp || null,
          description: description || null,
          is_featured: isFeatured,
          featured_rank: featuredRank,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert("Erreur : " + (data?.error || "Impossible"));
        return;
      }

      alert("✅ Place ajoutée !");
      setName("");
      setLocation("");
      setImage("");
      setMediaUrls([""]);
      setWhatsapp("");
      setDescription("");
      setIsFeatured(false);
      setFeaturedRank(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Admin • Ajouter une place</h1>
          <a href="/admin/places/manage" className="underline text-sm">
            Gérer
          </a>
        </div>

        <div className="mt-6 grid gap-4">
          <input
            className="rounded-xl p-3 bg-white text-black"
            placeholder="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <select
            className="rounded-xl p-3 bg-white text-black"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            <option value="bar_resto">Bar / Resto</option>
            <option value="loisirs">Loisirs</option>
            <option value="club">Night Clubs</option>
            <option value="hotel">Hôtels</option>
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Médias (max 4)</span>
              <button type="button" onClick={addMediaField} className="underline text-sm">
                + Ajouter
              </button>
            </div>

            {mediaUrls.map((url, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="flex-1 rounded-xl p-3 bg-white text-black"
                  placeholder={`Média ${i + 1}`}
                  value={url}
                  onChange={(e) => {
                    const copy = [...mediaUrls];
                    copy[i] = e.target.value;
                    setMediaUrls(copy);
                  }}
                />
                <button type="button" onClick={() => removeMediaField(i)} className="text-red-400">
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

          <div className="flex items-center justify-between gap-3">
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
              placeholder="Ordre"
            />
          </div>

          <div className="flex items-center justify-between">
            <span>Description</span>
            <button onClick={generateDescription} type="button" className="underline text-sm">
              Générer
            </button>
          </div>

          <textarea
            className="rounded-xl p-3 bg-white text-black min-h-[140px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button
            onClick={submit}
            disabled={loading}
            className="bg-white text-black rounded-xl py-3 font-semibold disabled:opacity-60"
          >
            {loading ? "..." : "Ajouter"}
          </button>
        </div>
      </div>
    </main>
  );
}
