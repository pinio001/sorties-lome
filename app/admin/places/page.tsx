"use client";

import { useState } from "react";

type Category = "bar_resto" | "hotel" | "loisirs";

function generateWhatsAppDescription(
  name: string,
  category: Category,
  location?: string
) {
  const catLabel =
    category === "bar_resto"
      ? "Bar / Resto"
      : category === "hotel"
      ? "Hôtel / Auberge"
      : "Loisirs";

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
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredRank, setFeaturedRank] = useState(0);
  const [loading, setLoading] = useState(false);

  const generateDescription = () => {
    setDescription(generateWhatsAppDescription(name, category, location));
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
        credentials: "include", // 🔥 OBLIGATOIRE POUR ENVOYER LE COOKIE ADMIN
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          category,
          location: location || null,
          image: image || null,
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Admin • Ajouter une place</h1>
          <a href="/admin/places/manage" className="underline text-sm">
            Gérer
          </a>
        </div>

        {/* Form */}
        <div className="mt-6 grid gap-4">
          <input
            className="rounded-xl p-3 text-black"
            placeholder="Nom (ex: Byblos Lounge)"
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
            placeholder="Lieu (ex: Agoè, Downtown...)"
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
            placeholder="WhatsApp (+228...)"
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
              <span>Mettre en avant</span>
            </label>

            <input
              type="number"
              className="w-24 rounded-xl p-2 text-black"
              value={featuredRank}
              onChange={(e) => setFeaturedRank(Number(e.target.value))}
              placeholder="Ordre"
            />
          </div>

          <div className="flex items-center justify-between">
            <span>Description</span>
            <button
              onClick={generateDescription}
              type="button"
              className="text-sm underline"
            >
              Générer
            </button>
          </div>

          <textarea
            className="rounded-xl p-3 text-black min-h-[140px]"
            placeholder="Description WhatsApp"
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

          <div className="flex justify-between text-sm mt-4">
            <a href="/admin" className="underline">
              ← Admin Events
            </a>
            <a href="/admin/manage" className="underline">
              Gérer Events →
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
