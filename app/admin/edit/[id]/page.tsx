// app/admin/edit/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type EventItem = {
  id: string;
  title: string | null;
  location: string | null;
  whatsapp: string | null;
  description: string | null;
  event_date: string | null;
  event_time: string | null;
  is_featured: boolean | null;
  featured_rank: number | null;
  image: string | null;
  media_urls?: string[] | null;
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

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);

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
    const clean = uniqMax4(media);
    return clean[0] || "";
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

    fetch(`/api/admin/events/${id}`, { credentials: "include" })
      .then(async (res) => {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok) throw new Error(data?.detail || data?.error || "Erreur serveur");
        return data;
      })
      .then((data) => {
        const e: EventItem = data.event;

        setTitle(e.title ?? "");
        setLocation(e.location ?? "");
        setWhatsapp(e.whatsapp ?? "");
        setDescription(e.description ?? "");
        setEventDate(e.event_date ?? "");
        setEventTime((e.event_time ?? "").slice(0, 5));
        setIsFeatured(!!e.is_featured);
        setFeaturedRank(e.featured_rank ?? 0);

        // ✅ NORMALISATION médias (image + media_urls)
        const merged = uniqMax4([
          e.image ?? "",
          ...(Array.isArray(e.media_urls) ? e.media_urls : []),
        ]);

        setMedia(merged.length ? merged : [""]);
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

    const res = await fetch(`/api/admin/events/${id}`, {
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
    router.push("/admin/manage");
  };

  const onDelete = async () => {
    if (!id) return;
    if (!confirm("Supprimer cet événement ?")) return;

    const res = await fetch(`/api/admin/events/${id}`, {
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
    router.push("/admin/manage");
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
            href="/admin/manage"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition"
          >
            ← Gérer Events
          </a>

          <button
            onClick={onDelete}
            className="text-sm px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition"
          >
            Supprimer
          </button>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="font-semibold text-lg">Modifier Event</div>

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

          {/* ✅ MULTI MEDIA */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-2">
            <div className="text-sm font-semibold">Médias (max 4)</div>
            <div className="text-xs text-white/60">
              URLs séparées (une par champ). Le 1er est l’image principale.
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
