"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BingoBackground from "./BingoBackground";

/* ================= TYPES ================= */

type EventItem = {
  id: string;
  title: string | null;
  location: string | null;
  image: string | null;
  event_date: string | null;
  event_time: string | null;
  whatsapp: string | null;
  interest_count: number | null;
  is_featured: boolean;
};

/* ================= HELPERS ================= */

function parseEventDate(event: EventItem) {
  if (!event.event_date) return null;
  return new Date(event.event_date);
}

function formatDateFr(d: Date) {
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTimeHM(t: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

function normalizePhoneToWa(phone: string) {
  return phone.replace(/\D/g, "");
}

/* ================= UI ================= */

function Logo() {
  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <div className="h-10 w-10 rounded-2xl bg-white text-black flex items-center justify-center shadow-lg">
        <span className="font-black text-xl tracking-tight">B</span>
      </div>

      <div className="leading-tight">
        <div className="text-white font-semibold text-lg">Bingo</div>
        <div className="text-white/60 text-xs">Events</div>
      </div>
    </div>
  );
}

/* ================= MAIN ================= */

const HomeClient = ({ showAdmin }: { showAdmin: boolean }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events || []);
        setLoading(false);
      });
  }, []);

  const featured = useMemo(
    () => events.filter((e) => e.is_featured),
    [events]
  );

  return (
    <main className="min-h-screen relative animate-page-enter">
      <BingoBackground />

      <div className="max-w-md mx-auto px-4 pt-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <Logo />

          <Link
            href="/places"
            className="
              text-sm text-white border border-white/20 px-3 py-2 rounded-xl
              transition-all duration-200
              hover:bg-white/10 hover:scale-105
              active:scale-95
            "
          >
            → Places
          </Link>
        </div>

        {/* Hero */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-fade-up">
          <div className="text-white font-semibold">
            Qu’est-ce qu’on fait ce soir ?
          </div>
          <div className="text-white/70 text-sm mt-1">
            Découvre les meilleures sorties à Lomé : soirées, concerts, vibes.
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4 mt-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* En avant */}
        {!loading && featured.length > 0 && (
          <>
            <h2 className="font-semibold text-white mt-7 mb-3 animate-fade-in">
              🔥 En avant
            </h2>
            <div className="grid gap-4">
              {featured.map((event, i) => (
                <EventCard key={event.id} event={event} delay={i * 60} />
              ))}
            </div>
          </>
        )}

        {/* Tous */}
        {!loading && (
          <>
            <h2 className="font-semibold text-white mt-7 mb-3 animate-fade-in">
              Tous
            </h2>
            <div className="grid gap-4">
              {events.map((event, i) => (
                <EventCard key={event.id} event={event} delay={i * 40} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
};

/* ================= CARD ================= */

const EventCard = ({
  event,
  delay = 0,
}: {
  event: EventItem;
  delay?: number;
}) => {
  const d = parseEventDate(event);
  const dateText = d ? formatDateFr(d) : "Date ?";
  const timeText = formatTimeHM(event.event_time);

  return (
    <div
      className={`
        rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:shadow-[0_25px_50px_rgba(0,0,0,0.45)]
        animate-fade-up
        ${
          event.is_featured
            ? "ring-1 ring-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.25)]"
            : ""
        }
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {event.image ? (
        <img
          src={event.image}
          alt={event.title ?? "Événement"}
          className="w-full h-44 object-cover transition-transform duration-500 hover:scale-105"
        />
      ) : (
        <div className="w-full h-44 flex items-center justify-center bg-white/5">
          <span className="text-sm text-white/50">Pas d’image</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-white">
            {event.title ?? "Sans titre"}
          </h2>

          <div className="flex items-center gap-2">
            {(event.interest_count ?? 0) > 0 && (
              <span className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-white border border-white/10">
                ❤️ {event.interest_count}
              </span>
            )}

            {event.is_featured && (
              <span className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-white border border-white/10">
                Premium
              </span>
            )}
          </div>
        </div>

        <p className="text-sm text-white/70 mt-1">
          {dateText} {timeText ? `• ${timeText}` : ""}
        </p>
        <p className="text-sm text-white/60">
          {event.location ?? "Lieu ?"}
        </p>

        <div className="mt-4 flex gap-2">
          <a
            href={`/event/${event.id}`}
            className="
              flex-1 text-center bg-white text-black py-2 rounded-xl font-medium
              transition-all hover:scale-105 active:scale-95
            "
          >
            Détails
          </a>

          {event.whatsapp ? (
            <a
              className="
                flex-1 text-center border border-white/20 text-white py-2 rounded-xl
                transition-all hover:bg-white/10 hover:scale-105 active:scale-95
              "
              href={`https://wa.me/${normalizePhoneToWa(event.whatsapp)}?text=${encodeURIComponent(
                `Bonsoir, je veux des infos pour: ${event.title ?? "cet événement"}`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          ) : (
            <button
              className="flex-1 text-center border border-white/10 text-white/40 py-2 rounded-xl cursor-not-allowed"
              disabled
            >
              WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeClient;
