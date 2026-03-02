"use client";

import { useMemo, useState } from "react";

function normalizePhoneToWa(raw: string) {
  const s = raw.replace(/[^\d+]/g, "");
  return s;
}

export default function AdminAddEventPage() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredRank, setFeaturedRank] = useState<number>(0);

  // ✅ multi media (max 4)
  const [media, setMedia] = useState<string[]>([""]);

  const primaryImage = useMemo(() => {
    const clean = media.map((m) => m.trim()).filter(Boolean);
    return clean[0] || "";
  }, [media]);

  const setMediaAt = (i: number, val: string) => {
    setMedia((prev) => prev.map((x, idx) => (idx === i ? val : x)));
  };

  const addMedia = () => {
    setMedia((prev) => (prev.length >= 4 ? prev : [...prev, ""]));
  };

  const removeMedia = (i: number) => {
    setMedia((prev) => prev.filter((_, idx) => idx !== i));
  };

  const onSubmit = async () => {
    if (!title.trim()) return alert("Titre manquant");

    const media_urls = media.map((m) => m.trim()).filter(Boolean).slice(0, 4);

    const payload = {
      title: title.trim(),
      location: location.trim(),
      event_date: eventDate || null,
      event_time: eventTime || null,
      whatsapp: whatsapp.trim() ? normalizePhoneToWa(whatsapp.trim()) : null,
      description: description.trim() || null,
      is_featured: isFeatured,
      featured_rank: featuredRank || 0,
      image: primaryImage || null,
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
    setTitle("");
    setLocation("");
    setEventDate("");
    setEventTime("");
    setWhatsapp("");
    setDescription("");
    setIsFeatured(false);
    setFeaturedRank(0);
    setMedia([""]);
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-4 space-y-4">

        {/* ── HEADER ── */}
        <header className="grid grid-cols-2 gap-2">
          <a
            href="/admin/manage"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-center"
          >
            ← Gérer Events
          </a>
          <a
            href="/places"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-center"
          >
            Voir Places →
          </a>
          <a
            href="/admin/import"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-center"
          >
            📂 Import CSV
          </a>
          <a
            href="/admin/moderation"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-center"
          >
            🔍 Modération
          </a>
          <a
            href="/admin/stats"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-center"
          >
            📊 Stats
          </a>
          <a
            href="/admin/feedback"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-center"
          >
            💬 Feedback
          </a>
        </header>

        {/* ── FORMULAIRE ── */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="font-semibold text-lg">Ajouter un Event</div>

          <input
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3"
            placeholder="Titre"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3"
            placeholder="Lieu"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
            <input
              type="time"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>

          <input
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3"
            placeholder="WhatsApp (optionnel)"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />

          <textarea
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 min-h-[90px]"
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* ✅ MULTI MEDIA */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-2">
            <div className="text-sm font-semibold">Médias (max 4)</div>
            <div className="text-xs text-white/60">
              Mets ici des URLs (images/vidéos). Le carousel sera sur la page Détails.
            </div>

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
            onClick={onSubmit}
            className="w-full bg-white text-black rounded-xl py-3 font-semibold"
          >
            Ajouter
          </button>
        </div>

      </div>
    </main>
  );
}
