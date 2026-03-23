// app/admin/events/page.tsx
"use client";

import { useState } from "react";
import MultiImageUploader from "../components/MultiImageUploader";

const inputClass = "w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 text-sm outline-none focus:border-white/30 transition";

function normalizePhoneToWa(raw: string) {
  return raw.replace(/[^\d+]/g, "");
}

export default function AdminAddEventPage() {
  const [title, setTitle]             = useState("");
  const [location, setLocation]       = useState("");
  const [eventDate, setEventDate]     = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventTime, setEventTime]     = useState("");
  const [whatsapp, setWhatsapp]       = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured]   = useState(false);
  const [featuredRank, setFeaturedRank] = useState<number>(0);
  const [displayOrder, setDisplayOrder] = useState<number>(0);

  // Images via Bunny
  const [images, setImages] = useState<string[]>([]);

  const onSubmit = async () => {
    if (!title.trim()) return alert("Titre manquant");

    const media_urls = images.filter(Boolean);
    const image      = media_urls[0] || null;

    const payload = {
      title:         title.trim(),
      location:      location.trim()  || null,
      event_date:    eventDate        || null,
      event_end_date: eventEndDate    || null,
      event_time:    eventTime        || null,
      whatsapp:      whatsapp.trim() ? normalizePhoneToWa(whatsapp.trim()) : null,
      description:   description.trim() || null,
      is_featured:   isFeatured,
      featured_rank: featuredRank || 0,
      display_order: displayOrder || 0,
      image,
      media_urls,
    };

    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert("Erreur : " + (data?.detail || data?.error || "Impossible"));

    alert("✅ Event ajouté");
    setTitle(""); setLocation(""); setEventDate(""); setEventEndDate("");
    setEventTime(""); setWhatsapp(""); setDescription("");
    setIsFeatured(false); setFeaturedRank(0); setDisplayOrder(0);
    setImages([]);
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-4 space-y-4">

        {/* Header */}
        <header className="grid grid-cols-2 gap-2">
          <a href="/admin/manage"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-center">
            ← Gérer Events
          </a>
          <a href="/admin/places/manage"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-center">
            ← Gérer Places
          </a>
          <a href="/admin/import"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-center">
            📂 Import Excel
          </a>
          <a href="/admin/moderation"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-center">
            🔍 Modération
          </a>
          <a href="/admin/stats"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-center">
            📊 Stats
          </a>
          <a href="/admin/feedback"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-center">
            💬 Feedback
          </a>
        </header>

        {/* Formulaire */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="font-semibold text-lg">Ajouter un Event</div>

          <input className={inputClass} placeholder="Titre *"
            value={title} onChange={(e) => setTitle(e.target.value)} />

          <input className={inputClass} placeholder="Lieu"
            value={location} onChange={(e) => setLocation(e.target.value)} />

          {/* Dates */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-2">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Dates & Heure</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-white/30 mb-1">Date début *</div>
                <input type="date" className={inputClass}
                  value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-white/30 mb-1">Date fin (optionnel)</div>
                <input type="date" className={inputClass}
                  value={eventEndDate} onChange={(e) => setEventEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="text-xs text-white/30 mb-1">Heure</div>
              <input type="time" className={inputClass}
                value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
            </div>
          </div>

          <input className={inputClass} placeholder="WhatsApp (optionnel)"
            value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />

          <textarea className={`${inputClass} min-h-[90px] resize-none`} placeholder="Description (optionnel)"
            value={description} onChange={(e) => setDescription(e.target.value)} />

          {/* Images via Bunny */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="text-sm font-semibold mb-3">Images (max 4)</div>
            <MultiImageUploader folder="events" values={images} onChange={setImages} />
          </div>

          {/* Featured & Ordre */}
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
            Ajouter l'event
          </button>
        </div>
      </div>
    </main>
  );
}
