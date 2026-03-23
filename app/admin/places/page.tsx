// app/admin/places/page.tsx
"use client";

import { useState } from "react";
import MultiImageUploader from "../../components/MultiImageUploader";

function clean(v: string) {
  const s = (v ?? "").trim();
  return s.length ? s : "";
}

const inputClass = "w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 text-sm outline-none focus:border-white/30 transition";

export default function AdminAddPlacePage() {
  const [name, setName]               = useState("");
  const [category, setCategory]       = useState("Bar/Resto");
  const [location, setLocation]       = useState("");
  const [whatsapp, setWhatsapp]       = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured]   = useState(false);
  const [featuredRank, setFeaturedRank] = useState<number>(0);
  const [displayOrder, setDisplayOrder] = useState<number>(0);

  // Médias via Bunny
  const [images, setImages] = useState<string[]>([]);

  // Liens
  const [mapsUrl, setMapsUrl]           = useState("");
  const [websiteUrl, setWebsiteUrl]     = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl]       = useState("");

  const onSubmit = async () => {
    if (!clean(name)) return alert("Nom manquant");

    const media_urls = images.filter(Boolean);
    const image      = media_urls[0] || null;

    const payload = {
      name:          clean(name),
      category,
      location:      clean(location)     || null,
      whatsapp:      clean(whatsapp)     || null,
      description:   clean(description)  || null,
      is_featured:   isFeatured,
      featured_rank: featuredRank || 0,
      display_order: displayOrder || 0,
      image,
      media_urls,
      maps_url:      clean(mapsUrl)      || null,
      website_url:   clean(websiteUrl)   || null,
      instagram_url: clean(instagramUrl) || null,
      tiktok_url:    clean(tiktokUrl)    || null,
    };

    const res = await fetch("/api/admin/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert("Erreur : " + (data?.detail || data?.error || "Impossible"));

    alert("✅ Place ajoutée");
    setName(""); setCategory("Bar/Resto"); setLocation(""); setWhatsapp("");
    setDescription(""); setIsFeatured(false); setFeaturedRank(0); setDisplayOrder(0);
    setImages([]); setMapsUrl(""); setWebsiteUrl(""); setInstagramUrl(""); setTiktokUrl("");
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-4 space-y-4">

        <header className="flex items-center justify-between">
          <a href="/admin/places/manage"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition">
            ← Gérer Places
          </a>
          <a href="/places"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition">
            Voir Places →
          </a>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="font-semibold text-lg">Ajouter une Place</div>

          <input className={inputClass} placeholder="Nom *"
            value={name} onChange={(e) => setName(e.target.value)} />

          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>Bar/Resto</option>
            <option>Loisirs</option>
            <option>Night Clubs</option>
            <option>Hôtels</option>
          </select>

          <input className={inputClass} placeholder="Localisation"
            value={location} onChange={(e) => setLocation(e.target.value)} />

          <input className={inputClass} placeholder="WhatsApp"
            value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />

          <textarea className={`${inputClass} min-h-[90px] resize-none`} placeholder="Description"
            value={description} onChange={(e) => setDescription(e.target.value)} />

          {/* Liens */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-2">
            <div className="text-sm font-semibold mb-2">Liens</div>
            <input className={inputClass} placeholder="Google Maps URL"
              value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} />
            <input className={inputClass} placeholder="Site web"
              value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
            <input className={inputClass} placeholder="Instagram URL"
              value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} />
            <input className={inputClass} placeholder="TikTok URL"
              value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} />
          </div>

          {/* Images via Bunny */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="text-sm font-semibold mb-3">Images (max 4)</div>
            <MultiImageUploader folder="places" values={images} onChange={setImages} />
          </div>

          {/* Featured */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-3">
            <div className="text-sm font-semibold">Mise en avant & Ordre</div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)} />
              <span className="text-sm">Mettre en avant (featured)</span>
            </label>

            {isFeatured && (
              <div>
                <div className="text-xs text-white/40 mb-1">Ordre featured (1 = premier)</div>
                <input type="number" min={0} className={inputClass}
                  placeholder="featured_rank (ex: 1)"
                  value={featuredRank} onChange={(e) => setFeaturedRank(Number(e.target.value))} />
              </div>
            )}

            <div>
              <div className="text-xs text-white/40 mb-1">
                Ordre d'affichage sur la page publique (0 = défaut, 1 = premier)
              </div>
              <input type="number" min={0} className={inputClass}
                placeholder="display_order (ex: 1, 2, 3...)"
                value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
            </div>
          </div>

          <button onClick={onSubmit}
            className="w-full bg-white text-black rounded-xl py-3 font-semibold hover:bg-white/90 transition">
            Ajouter la place
          </button>
        </div>
      </div>
    </main>
  );
}