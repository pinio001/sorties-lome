// app/event/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import BingoBackground from "../../components/BingoBackground";
import MediaCarousel from "../../components/MediaCaroussel";
import { trackPageView } from "../../../lib/trackViewClient";

type EventItem = {
  id: string;
  title: string | null;
  location: string | null;
  image: string | null;
  media_urls?: string[] | null;
  whatsapp: string | null;
  is_featured: boolean | null;
  event_date: string | null;
  event_time: string | null;
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
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
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
      v = "dev_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
      localStorage.setItem(key, v);
    }
  } catch { v = "dev_" + Date.now().toString(16); }
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
    trackPageView({ entity_type: "event", entity_id: String(eventId) });
  }, [eventId]);

  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId) return;
      setLoading(true);
      setErrorMsg(null);
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId).single();
      if (error) { setErrorMsg(error.message); setEvent(null); }
      else setEvent(data as any);
      setLoading(false);
    };
    loadEvent();
  }, [eventId]);

  const media = useMemo(() => {
    if (!event) return [];
    const arr = Array.isArray(event.media_urls) ? event.media_urls : [];
    const merged = [event.image, ...arr].filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0
    );
    return Array.from(new Set(merged)).slice(0, 4);
  }, [event]);

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
    return [
      `🔥 ${event.title ?? "Événement"}`,
      `📅 ${dateTxt}`,
      `⏰ ${timeTxt}`,
      event.location ? `📍 ${event.location}` : "",
      "",
      `👉 Détails : ${typeof window !== "undefined" ? window.location.href : ""}`,
    ].filter(Boolean).join("\n");
  }, [event, dateTxt, timeTxt]);

  const handleShare = async () => {
    if (!event) return;
    const url = window.location.href;
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: event.title ?? "Bingo", text: shareText, url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(shareText); alert("✅ Texte copié !"); }
    catch { prompt("Copie ce texte :", shareText); }
  };

  const handleInterested = async () => {
    if (!event || !eventId || liked) return;
    setLikeLoading(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch(`/api/events/${eventId}/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert("Erreur: " + (data?.error || "Impossible")); return; }
      setLiked(true);
      if (!data?.already) {
        setEvent((prev) => prev ? { ...prev, interest_count: (prev.interest_count ?? 0) + 1 } : prev);
      }
    } finally { setLikeLoading(false); }
  };

  if (loading) return (
    <main className="min-h-screen">
      <BingoBackground />
      <div className="max-w-6xl mx-auto px-4 lg:px-10 pt-6">
        <p className="text-white/70">Chargement...</p>
      </div>
    </main>
  );

  if (errorMsg || !event) return (
    <main className="min-h-screen">
      <BingoBackground />
      <div className="max-w-6xl mx-auto px-4 lg:px-10 pt-6">
        <p className="text-sm text-red-400 mb-4">Erreur: {errorMsg ?? "Événement introuvable"}</p>
        <button onClick={() => router.back()} className="border border-white/20 text-white px-3 py-2 rounded-xl">
          Retour
        </button>
      </div>
    </main>
  );

  const waLink = event.whatsapp
    ? `https://wa.me/${normalizePhoneToWa(event.whatsapp)}?text=${encodeURIComponent(
        `Bonsoir, je veux des infos pour: ${event.title ?? "cet événement"}`
      )}`
    : null;

  return (
    <main className="min-h-screen">
      <BingoBackground />

      <div className="max-w-6xl mx-auto px-4 lg:px-10 pt-6 pb-12">

        {/* ── RETOUR ── */}
        <button onClick={() => router.back()}
          className="mb-5 border border-white/20 text-white px-3 py-2 rounded-xl hover:bg-white/10 transition text-sm">
          ← Retour
        </button>

        {/* ── DESKTOP : 2 colonnes | MOBILE : 1 colonne ── */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start">

          {/* ── GAUCHE : Média ── */}
          <div>
            {media.length > 0 ? (
              <div className="relative rounded-2xl overflow-hidden">
                <MediaCarousel media={media} height="h-72 lg:h-96" />
                {event.is_featured && (
                  <div className="absolute top-3 right-3 bg-white/10 border border-white/15 text-white text-xs px-2 py-1 rounded-full backdrop-blur">
                    Premium
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-72 lg:h-96 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-white/40">Pas de média</span>
              </div>
            )}
          </div>

          {/* ── DROITE : Infos + Actions ── */}
          <div className="mt-6 lg:mt-0">

            {/* Titre + badge */}
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight">
                {event.title ?? "Sans titre"}
              </h1>
              {event.is_featured && (
                <span className="lg:hidden shrink-0 text-xs bg-white/10 border border-white/15 text-white px-2 py-1 rounded-full">
                  Premium
                </span>
              )}
            </div>

            {/* Infos clés */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="flex items-center gap-3 text-sm text-white/80">
                <span className="text-lg">📅</span>
                <span className="capitalize">{dateTxt}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/80">
                <span className="text-lg">⏰</span>
                <span>{timeTxt}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/80">
                <span className="text-lg">📍</span>
                <span>{event.location ?? "Lieu ?"}</span>
              </div>
              {(event.interest_count ?? 0) > 0 && (
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <span className="text-lg">❤️</span>
                  <span>{event.interest_count} personnes intéressées</span>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-white font-semibold mb-2">Description</div>
                <p className="text-sm text-white/75 whitespace-pre-line leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 grid gap-2">
              {waLink ? (
                <a href={waLink} target="_blank" rel="noreferrer"
                  className="text-center bg-white text-black py-3 rounded-xl font-medium hover:scale-[1.02] transition">
                  💬 Contacter sur WhatsApp
                </a>
              ) : (
                <button disabled
                  className="text-center bg-white/5 text-white/40 py-3 rounded-xl border border-white/10 cursor-not-allowed">
                  WhatsApp non disponible
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleShare}
                  className="text-center border border-white/20 text-white py-3 rounded-xl hover:bg-white/10 transition">
                  🔗 Partager
                </button>
                <button onClick={handleInterested} disabled={likeLoading || liked}
                  className={`text-center border py-3 rounded-xl transition ${
                    liked
                      ? "border-red-500/30 bg-red-500/10 text-red-400"
                      : "border-white/20 text-white hover:bg-white/10"
                  } disabled:opacity-60`}>
                  {liked ? "❤️ Intéressé(e)" : likeLoading ? "..." : "🤍 Intéressé(e)"}
                  <span className="text-white/40 ml-1 text-xs">• {event.interest_count ?? 0}</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}