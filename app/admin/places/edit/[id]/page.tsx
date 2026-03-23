"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MultiImageUploader from "../../../../components/MultiImageUploader";

type PlaceItem = {
  id: string;
  name: string | null;
  category: string | null;
  location: string | null;
  whatsapp: string | null;
  description: string | null;
  is_featured: boolean | null;
  featured_rank: number | null;
  display_order: number | null;
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

const inputClass = "w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 text-sm outline-none focus:border-white/30 transition";

export default function EditPlacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);

  const [name, setName]               = useState("");
  const [category, setCategory]       = useState("Bar/Resto");
  const [location, setLocation]       = useState("");
  const [whatsapp, setWhatsapp]       = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured]   = useState(false);
  const [featuredRank, setFeaturedRank] = useState<number>(0);
  const [displayOrder, setDisplayOrder] = useState<number>(0);

  // Images via Bunny
  const [images, setImages] = useState<string[]>([]);

  // Liens
  const [mapsUrl, setMapsUrl]           = useState("");
  const [websiteUrl, setWebsiteUrl]     = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl]       = useState("");

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
        setDisplayOrder(p.display_order ?? 0);

        const merged = uniqMax4([
          p.image ?? "",
          ...(Array.isArray(p.media_urls) ? p.media_urls : []),
        ]);
        setImages(merged.filter(Boolean));

        setMapsUrl(p.maps_url ?? "");
        setWebsiteUrl(p.website_url ?? "");
        setInstagramUrl(p.instagram_url ?? "");
        setTiktokUrl(p.tiktok_url ?? "");
      })
      .catch((err) => alert("Erreur : " + (err?.message || "Impossible")))
      .finally(() => setLoading(false));
  }, [id]);

  const onSave = async () => {
    if (!id) return;
    const media_urls = images.filter(Boolean);

    const payload = {
      name:          clean(name),
      category,
      location:      clean(location)     || null,
      whatsapp:      clean(whatsapp) ? normalizePhoneToWa(clean(whatsapp)) : null,
      description:   clean(description)  || null,
      is_featured:   isFeatured,
      featured_rank: featuredRank || 0,
      display_order: displayOrder || 0,
      image:         media_urls[0]       || null,
      media_urls,
      maps_url:      clean(mapsUrl)      || null,
      website_url:   clean(websiteUrl)   || null,
      instagram_url: clean(instagramUrl) || null,
      tiktok_url:    clean(tiktokUrl)    || null,
    };

    const res = await fetch(`/api/admin/places/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert("Erreur : " + (data?.detail || data?.error || "Erreur serveur")); return; }
    alert("✅ Modifications enregistrées");
    router.push("/admin/places/manage");
  };

  const onDelete = async () => {
    if (!id || !confirm("Supprimer cette place ?")) return;
    const res = await fetch(`/api/admin/places/${id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert("Erreur : " + (data?.detail || data?.error || "Erreur serveur")); return; }
    alert("✅ Supprimé");
    router.push("/admin/places/manage");
  };

  if (loading) return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">Chargement…</div>
    </main>
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-4 space-y-4">

        <header className="flex items-center justify-between">
          <a href="/admin/places/manage"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition">
            ← Gérer Places
          </a>
          <button onClick={onDelete}
            className="text-sm px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition">
            Supprimer
          </button>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="font-semibold text-lg">Modifier Place</div>

          <input className={inputClass} placeholder="Nom"
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

          {/* Images */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="text-sm font-semibold mb-3">Images (max 4)</div>
            <MultiImageUploader folder="places" values={images} onChange={setImages} />
          </div>

          {/* Ordre & Featured */}
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
                  placeholder="featured_rank"
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
              <div className="text-xs text-white/25 mt-1">
                Les cartes avec un ordre plus petit apparaissent en premier.
              </div>
            </div>
          </div>

          <button onClick={onSave}
            className="w-full bg-white text-black rounded-xl py-3 font-semibold hover:bg-white/90 transition">
            Enregistrer
          </button>
        </div>
      </div>
    </main>
  );
}