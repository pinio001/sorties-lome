"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";

type EventItem = {
  id: string;
  title: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  image: string | null;
  whatsapp: string | null;
  is_featured: boolean | null;
};

function normalizePhoneToWa(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        setEvent(data as EventItem);
      }

      setLoading(false);
    };

    loadEvent();
  }, [eventId]);

  const shareText = useMemo(() => {
    if (!event) return "";
    const parts = [
      event.title ?? "Événement",
      event.date ? `📅 ${event.date}` : "",
      event.time ? `⏰ ${event.time}` : "",
      event.location ? `📍 ${event.location}` : "",
      "",
      "👉 Détails ici : " + (typeof window !== "undefined" ? window.location.href : ""),
    ].filter(Boolean);

    return parts.join("\n");
  }, [event]);

  const handleShare = async () => {
    if (!event) return;

    const url = window.location.href;
    const title = event.title ?? "Événement";
    const text = shareText;

    // Partage natif (mobile) si dispo
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // si l’utilisateur annule, on ne fait rien
      }
    }

    // fallback: copier dans le presse-papier
    try {
      await navigator.clipboard.writeText(text);
      alert("✅ Lien copié ! Tu peux le coller sur WhatsApp.");
    } catch {
      // fallback ultime
      prompt("Copie ce texte :", text);
    }
  };

  if (loading) {
    return (
      <main className="p-4 max-w-md mx-auto">
        <p>Chargement...</p>
      </main>
    );
  }

  if (errorMsg || !event) {
    return (
      <main className="p-4 max-w-md mx-auto">
        <p className="text-sm text-red-600 mb-4">
          Erreur: {errorMsg ?? "Événement introuvable"}
        </p>
        <button
          onClick={() => router.push("/")}
          className="border border-black px-3 py-2 rounded-lg"
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
    <main className="max-w-md mx-auto">
      {/* Image */}
      {event.image ? (
        <div className="relative">
          <img
            src={event.image}
            alt={event.title ?? "Événement"}
            className="w-full h-72 object-cover"
          />
          <button
            onClick={() => router.push("/")}
            className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow"
          >
            ← Retour
          </button>

          {event.is_featured && (
            <div className="absolute top-3 right-3 bg-black text-white text-xs px-2 py-1 rounded-full">
              Premium
            </div>
          )}
        </div>
      ) : (
        <div className="p-4">
          <button
            onClick={() => router.push("/")}
            className="border border-black px-3 py-2 rounded-lg"
          >
            ← Retour
          </button>
        </div>
      )}

      {/* Infos */}
      <div className="p-4">
        <h1 className="text-2xl font-bold">{event.title ?? "Sans titre"}</h1>

        <div className="mt-3 space-y-1 text-sm">
          <p>{event.date ? `📅 ${event.date}` : "📅 Date ?"}</p>
          <p>{event.time ? `⏰ ${event.time}` : "⏰ Heure ?"}</p>
          <p>{event.location ? `📍 ${event.location}` : "📍 Lieu ?"}</p>
        </div>

        {/* Actions */}
        <div className="mt-5 grid gap-2">
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="text-center bg-black text-white py-3 rounded-lg"
            >
              Contacter sur WhatsApp
            </a>
          ) : (
            <button
              className="text-center bg-gray-200 text-gray-500 py-3 rounded-lg cursor-not-allowed"
              disabled
            >
              WhatsApp non disponible
            </button>
          )}

          <button
            onClick={handleShare}
            className="text-center border border-black py-3 rounded-lg"
          >
            Partager
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Astuce : partage ce lien dans un groupe WhatsApp pour inviter tes amis.
        </p>
      </div>
    </main>
  );
}
