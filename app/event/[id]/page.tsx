"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import BingoBackground from "../../components/BingoBackground";

type EventItem = {
  id: string;
  title: string | null;
  location: string | null;
  image: string | null;
  whatsapp: string | null;
  is_featured: boolean | null;

  event_date: string | null; // YYYY-MM-DD
  event_time: string | null; // HH:MM:SS ou HH:MM

  description: string | null;
  interest_count: number | null;
};

function normalizePhoneToWa(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

function parseEventDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function formatDateFr(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

function formatTimeHM(t: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

function getOrCreateDeviceId() {
  const key = "bingo_device_id";
  let v = "";
  try {
    v = localStorage.getItem(key) || "";
    if (!v) {
      // id simple + stable
      v = "dev_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
      localStorage.setItem(key, v);
    }
  } catch {
    // fallback si storage bloqué
    v = "dev_" + Date.now().toString(16);
  }
  return v;
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [likeLoading, setLikeLoading] = useState(false);
  const [liked, setLiked] = useState(false);

  const eventId = params?.id;

  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId) return;

      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) {
        setErrorMsg(error.message);
        setEvent(null);
      } else {
        setEvent(data as any);
      }

      setLoading(false);
    };

    loadEvent();
  }, [eventId]);

  const dateTxt = useMemo(() => {
    if (!event) return "";
    const d = parseEventDate(event.event_date);
    return d ? formatDateFr(d) : "Date ?";
  }, [event]);

  const timeTxt = useMemo(() => {
    if (!event) return "";
    return formatTimeHM(event.event_time) || "Heure ?";
  }, [event]);

  const shareText = useMemo(() => {
    if (!event) return "";
    const parts = [
      `🔥 ${event.title ?? "Événement"}`,
      `📅 ${dateTxt}`,
      `⏰ ${timeTxt}`,
      event.location ? `📍 ${event.location}` : "",
      "",
      `👉 Détails : ${typeof window !== "undefined" ? window.location.href : ""}`,
    ].filter(Boolean);
    return parts.join("\n");
  }, [event, dateTxt, timeTxt]);

  const handleShare = async () => {
    if (!event) return;

    const url = window.location.href;
    const title = event.title ?? "Bingo";
    const text = shareText;

    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title, text, url });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("✅ Texte copié ! Colle-le sur WhatsApp.");
    } catch {
      prompt("Copie ce texte :", text);
    }
  };

  const handleInterested = async () => {
    if (!event || !eventId) return;
    if (liked) return;

    setLikeLoading(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch(`/api/events/${eventId}/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert("Erreur: " + (data?.error || "Impossible"));
        return;
      }

      setLiked(true);

      // UI: on incrémente localement si pas already
      if (!data?.already) {
        setEvent((prev) =>
          prev ? { ...prev, interest_count: (prev.interest_count ?? 0) + 1 } : prev
        );
      }
    } finally {
      setLikeLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="p-4 max-w-md mx-auto min-h-screen">
        <BingoBackground />
        <p className="text-white/70">Chargement...</p>
      </main>
    );
  }

  if (errorMsg || !event) {
    return (
      <main className="p-4 max-w-md mx-auto min-h-screen">
        <BingoBackground />
        <p className="text-sm text-red-400 mb-4">
          Erreur: {errorMsg ?? "Événement introuvable"}
        </p>
        <button
          onClick={() => router.push("/")}
          className="border border-white/20 text-white px-3 py-2 rounded-xl"
        >
          Retour
        </button>
      </main>
    );
  }

  const waLink =
    event.whatsapp
      ? `https://wa.me/${normalizePhoneToWa(event.whatsapp)}?text=${encodeURIComponent(
          `Bonsoir, je veux des infos pour: ${event.title ?? "cet événement"}`
        )}`
      : null;

  return (
    <main className="max-w-md mx-auto min-h-screen">
      <BingoBackground />

      {/* Header image */}
      {event.image ? (
        <div className="relative">
          <img
            src={event.image}
            alt={event.title ?? "Événement"}
            className="w-full h-72 object-cover"
          />

          <button
            onClick={() => router.push("/")}
            className="absolute top-3 left-3 bg-black/60 border border-white/15 text-white px-3 py-2 rounded-xl backdrop-blur"
          >
            ← Retour
          </button>

          {event.is_featured && (
            <div className="absolute top-3 right-3 bg-white/10 border border-white/15 text-white text-xs px-2 py-1 rounded-full">
              Premium
            </div>
          )}
        </div>
      ) : (
        <div className="p-4">
          <button
            onClick={() => router.push("/")}
            className="border border-white/20 text-white px-3 py-2 rounded-xl"
          >
            ← Retour
          </button>
        </div>
      )}

      {/* Body */}
      <div className="p-4">
        <h1 className="text-2xl font-bold text-white">{event.title ?? "Sans titre"}</h1>

        <div className="mt-3 space-y-1 text-sm text-white/80">
          <p>📅 {dateTxt}</p>
          <p>⏰ {timeTxt}</p>
          <p>📍 {event.location ?? "Lieu ?"}</p>
        </div>

        {/* Description */}
        {event.description ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-white font-semibold mb-2">Description</div>
            <p className="text-sm text-white/75 whitespace-pre-line">{event.description}</p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="mt-5 grid gap-2">
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="text-center bg-white text-black py-3 rounded-xl font-medium"
            >
              Contacter sur WhatsApp
            </a>
          ) : (
            <button
              className="text-center bg-white/5 text-white/40 py-3 rounded-xl border border-white/10 cursor-not-allowed"
              disabled
            >
              WhatsApp non disponible
            </button>
          )}

          <button
            onClick={handleShare}
            className="text-center border border-white/20 text-white py-3 rounded-xl"
          >
            Partager
          </button>

          {/* Interested ❤️ */}
          <button
            onClick={handleInterested}
            disabled={likeLoading || liked}
            className="text-center border border-white/20 text-white py-3 rounded-xl disabled:opacity-60"
          >
            {liked ? "❤️ Intéressé(e)" : likeLoading ? "..." : "❤️ Intéressé(e)"}
            <span className="text-white/60"> • {event.interest_count ?? 0}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
