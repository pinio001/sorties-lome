"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type PlaceItem = {
  id: string;
  name: string | null;
  category: string | null;
  location: string | null;
  whatsapp: string | null;
  description: string | null;
  is_featured: boolean | null;
  featured_rank: number | null;
  image: string | null;
  media_urls?: string[] | null;

  maps_url?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
};

function normalizePhoneToWa(raw: string) {
  return raw.replace(/[^\d+]/g, "");
}

function uniqMax4(list: string[]) {
  const uniq: string[] = [];
  for (const x of list) {
    const t = (x ?? "").trim();
    if (t && !uniq.includes(t)) uniq.push(t);
  }
  return uniq.slice(0, 4);
}

function clean(v: string) {
  const s = (v ?? "").trim();
  return s.length ? s : "";
}

export default function EditPlacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Bar/Resto");
  const [location, setLocation] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredRank, setFeaturedRank] = useState<number>(0);

  // ✅ médias
  const [media, setMedia] = useState<string[]>([""]);

  // ✅ nouveaux champs
  const [mapsUrl, setMapsUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");

  const primaryImage = useMemo(() => {
    const cleanMedia = uniqMax4(media);
    return cleanMedia[0] || "";
  }, [media]);

  const setMediaAt = (i: number, val: string) => {
    setMedia((prev) => prev.map((x, idx) => (idx === i ? val : x)));
  };

  const addMedia = () => {
    setMedia((prev) => (prev.length >= 4 ? prev : [...prev, ""]));
  };

  const removeMedia = (i: number) => {
    setMedia((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.length ? next : [""];
    });
  };

  useEffect(() => {
    if (!id) return;

    setLoading(true);

    fetch(`/api/admin/places/${id}`, { credentials: "include" })
      .then(async (res) => {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok) throw new Error(data?.detail || data?.error || "Erreur serveur");
        return data;
      })
      .then((data) => {
        const p: PlaceItem = data.place;

        setName(p.name ?? "");
        setCategory(p.category ?? "Bar/Resto");
        setLocation(p.location ?? "");
        setWhatsapp(p.whatsapp ?? "");
        setDescription(p.description ?? "");
        setIsFeatured(!!p.is_featured);
        setFeaturedRank(p.featured_rank ?? 0);

        // ✅ normalisation médias (image + media_urls)
        const merged = uniqMax4([
          p.image ?? "",
          ...(Array.isArray(p.media_urls) ? p.media_urls : []),
        ]);
        setMedia(merged.length ? merged : [""]);

        // ✅ nouveaux champs (même si anciennes cartes -> vide)
        setMapsUrl(p.maps_url ?? "");
        setWebsiteUrl(p.website_url ?? "");
        setInstagramUrl(p.instagram_url ?? "");
        setTiktokUrl(p.tiktok_url ?? "");
      })
      .catch((err) => {
        alert("Erreur : " + (err?.message || "Impossible"));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const onSave = async () => {
    if (!id) return;

    const media_urls = uniqMax4(media);

    const payload = {
      name: clean(name),
      category,
      location: clean(location) || null,
      whatsapp: clean(whatsapp) ? normalizePhoneToWa(clean(whatsapp)) : null,
      description: clean(description) || null,
      is_featured: isFeatured,
      featured_rank: featuredRank || 0,

      image: primaryImage || null,
      media_urls,

      // ✅ nouveaux champs
      maps_url: clean(mapsUrl) || null,
      website_url: clean(websiteUrl) || null,
      instagram_url: clean(instagramUrl) || null,
      tiktok_url: clean(tiktokUrl) || null,
    };

    const res = await fetch(`/api/admin/places/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) {
      alert("Erreur : " + (data?.detail || data?.error || "Erreur serveur"));
      return;
    }

    alert("✅ Modifications enregistrées");
    router.push("/admin/places/manage");
  };

  const onDelete = async () => {
    if (!id) return;
    if (!confirm("Supprimer cette place ?")) return;

    const res = await fetch(`/api/admin/places/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) {
      alert("Erreur : " + (data?.detail || data?.error || "Erreur serveur"));
      return;
    }

    alert("✅ Supprimé");
    router.push("/admin/places/manage");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-4">
        <div className="max-w-md mx-auto">Chargement…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-4 space-y-4">
        <header className="flex items-center justify-between">
          <a
            href="/admin/places/manage"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition"
          >
            ← Gérer Places
          </a>

          <button
            onClick={onDelete}
            className="text-sm px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition"
          >
            Supprimer
          </button>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="font-semibold text-lg">Modifier Place</div>

          <input
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3"
            placeholder="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <select
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Bar/Resto</option>
            <option>Loisirs</option>
            <option>Night Clubs</option>
            <option>Hôtels</option>
            <option>Populaires</option>
          </select>

          <input
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3"
            placeholder="Localisation"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <input
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3"
            placeholder="WhatsApp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />

          <textarea
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 min-h-[90px]"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* ✅ nouveaux liens */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-2">
            <div className="text-sm font-semibold">Liens (boutons sur Détails)</div>

            <input
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3"
              placeholder="Adresse (Google Maps URL)"
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
            />
            <input
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3"
              placeholder="Page web (URL)"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
            <input
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3"
              placeholder="Instagram (URL)"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
            />
            <input
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3"
              placeholder="TikTok (URL)"
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
            />
          </div>

          {/* ✅ médias */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-2">
            <div className="text-sm font-semibold">Médias (max 4)</div>

            {media.map((m, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3"
                  placeholder={`URL média ${i + 1}`}
                  value={m}
                  onChange={(e) => setMediaAt(i, e.target.value)}
                />
                {media.length > 1 && (
                  <button
                    onClick={() => removeMedia(i)}
                    className="px-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={addMedia}
              disabled={media.length >= 4}
              className="w-full py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50"
            >
              + Ajouter un média
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
            />
            <span className="text-sm">Mettre en avant</span>
          </div>

          <input
            type="number"
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3"
            placeholder="Ordre (featured_rank)"
            value={featuredRank}
            onChange={(e) => setFeaturedRank(Number(e.target.value))}
          />

          <button
            onClick={onSave}
            className="w-full bg-white text-black rounded-xl py-3 font-semibold"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </main>
  );
}
