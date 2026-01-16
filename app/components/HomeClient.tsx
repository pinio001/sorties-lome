"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type EventItem = {
  id: string;
  title: string | null;
  location: string | null;
  image: string | null;
  whatsapp: string | null;
  is_featured: boolean | null;
  featured_rank: number | null;
  event_date: string | null; // YYYY-MM-DD
  event_time: string | null; // HH:MM:SS ou HH:MM
  created_at?: string | null;
};

type Filter = "TOUT" | "AUJOURD_HUI" | "WEEK_END";

function normalizePhoneToWa(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

function parseEventDate(e: EventItem): Date | null {
  if (!e.event_date) return null;
  const d = new Date(e.event_date + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function formatDateFr(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(d);
}

function formatTimeHM(t: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getWeekendRange(now: Date) {
  const day = now.getDay(); // 0 dim, 5 ven
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  // ramener au vendredi du week-end courant si ven/sam/dim
  if (day === 5 || day === 6 || day === 0) {
    const offsetToFriday = day === 0 ? -2 : day === 6 ? -1 : 0;
    start.setDate(now.getDate() + offsetToFriday);
  } else {
    // sinon aller au prochain vendredi
    start.setDate(now.getDate() + (5 - day));
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 2);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
        <span className="font-bold text-white">B</span>
      </div>
      <div className="leading-tight">
        <div className="text-white font-semibold text-lg">Bingo</div>
        <div className="text-white/60 text-xs">Sorties & bons plans</div>
      </div>
    </div>
  );
}

export default function HomeClient({ showAdmin }: { showAdmin: boolean }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("TOUT");

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true, nullsFirst: false })
        .order("event_time", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
        setEvents([]);
      } else {
        setEvents((data ?? []) as any);
      }

      setLoading(false);
    };

    loadEvents();
  }, []);

  const featured = useMemo(() => {
    const list = events.filter((e) => e.is_featured);
    return list.sort((a, b) => {
      const ra = a.featured_rank ?? 0;
      const rb = b.featured_rank ?? 0;
      if (ra !== rb) return ra - rb;

      const da = parseEventDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const db = parseEventDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return da - db;
    });
  }, [events]);

  const filtered = useMemo(() => {
    if (filter === "TOUT") return events;

    const now = new Date();

    if (filter === "AUJOURD_HUI") {
      return events.filter((e) => {
        const d = parseEventDate(e);
        return d ? sameDay(d, now) : false;
      });
    }

    if (filter === "WEEK_END") {
      const { start, end } = getWeekendRange(now);
      return events.filter((e) => {
        const d = parseEventDate(e);
        if (!d) return false;
        const t = d.getTime();
        return t >= start.getTime() && t <= end.getTime();
      });
    }

    return events;
  }, [events, filter]);

  const EventCard = ({ event }: { event: EventItem }) => {
    const d = parseEventDate(event);
    const dateText = d ? formatDateFr(d) : "Date ?";
    const timeText = formatTimeHM(event.event_time);

    return (
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur">
        {event.image ? (
          <img
            src={event.image}
            alt={event.title ?? "Événement"}
            className="w-full h-44 object-cover"
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
            {event.is_featured && (
              <span className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-white border border-white/10">
                Premium
              </span>
            )}
          </div>

          <p className="text-sm text-white/70 mt-1">
            {dateText} {timeText ? `• ${timeText}` : ""}
          </p>
          <p className="text-sm text-white/60">{event.location ?? "Lieu ?"}</p>

          <div className="mt-4 flex gap-2">
            <a
              href={`/event/${event.id}`}
              className="flex-1 text-center bg-white text-black py-2 rounded-xl font-medium"
            >
              Détails
            </a>

            {event.whatsapp ? (
              <a
                className="flex-1 text-center border border-white/20 text-white py-2 rounded-xl"
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

  return (
    <main className="min-h-screen">
      {/* Fond noir + dégradé bleu foncé */}
      <div className="fixed inset-0 -z-10 bg-black">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(600px 600px at 20% 10%, rgba(30,58,138,0.55), transparent 60%), radial-gradient(700px 700px at 90% 20%, rgba(2,6,23,0.6), transparent 55%), linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,1))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-black" />
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Logo />
          {showAdmin && (
            <a
              href="/admin"
              className="text-sm text-white border border-white/20 px-3 py-2 rounded-xl"
            >
              + Ajouter
            </a>
          )}
        </div>

        {/* Petite accroche */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-white font-semibold">Qu’est-ce qu’on fait ce soir ?</div>
          <div className="text-white/70 text-sm mt-1">
            Découvre les meilleures sorties à Lomé : soirées, concerts, vibes.
          </div>

          <div className="flex gap-2 mt-4">
            <button
              className={`px-3 py-2 rounded-xl text-sm border ${
                filter === "TOUT"
                  ? "bg-white text-black border-white"
                  : "border-white/20 text-white"
              }`}
              onClick={() => setFilter("TOUT")}
            >
              Tout
            </button>
            <button
              className={`px-3 py-2 rounded-xl text-sm border ${
                filter === "AUJOURD_HUI"
                  ? "bg-white text-black border-white"
                  : "border-white/20 text-white"
              }`}
              onClick={() => setFilter("AUJOURD_HUI")}
            >
              Aujourd’hui
            </button>
            <button
              className={`px-3 py-2 rounded-xl text-sm border ${
                filter === "WEEK_END"
                  ? "bg-white text-black border-white"
                  : "border-white/20 text-white"
              }`}
              onClick={() => setFilter("WEEK_END")}
            >
              Week-end
            </button>
          </div>
        </div>

        {loading && <p className="text-white/70 mt-5">Chargement...</p>}
        {errorMsg && <p className="text-sm text-red-400 mt-5">Erreur: {errorMsg}</p>}

        {!loading && !errorMsg && featured.length > 0 && (
          <>
            <h2 className="font-semibold text-white mt-7 mb-3">🔥 En avant</h2>
            <div className="grid gap-4">
              {featured.slice(0, 6).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )}

        {!loading && !errorMsg && (
          <>
            <h2 className="font-semibold text-white mt-7 mb-3">Tous les événements</h2>

            {filtered.length === 0 ? (
              <p className="text-white/70">Aucun événement.</p>
            ) : (
              <div className="grid gap-4">
                {filtered.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
