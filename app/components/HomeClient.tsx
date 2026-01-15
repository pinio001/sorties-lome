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
  // event_date = YYYY-MM-DD
  const d = new Date(e.event_date + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function formatDateFr(d: Date) {
  // ex: "samedi 10 mars 2026"
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

function formatTimeHM(t: string | null) {
  if (!t) return "";
  return t.slice(0, 5); // HH:MM
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getWeekendRange(now: Date) {
  // On définit le week-end = vendredi/samedi/dimanche
  // On prend le prochain vendredi (ou aujourd’hui si on est déjà ven/sam/dim)
  const day = now.getDay(); // 0 dim, 5 ven
  const daysUntilFriday = day <= 5 ? 5 - day : 6; // si samedi (6) -> 6 jours jusqu’au prochain vendredi
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() + daysUntilFriday);

  const end = new Date(start);
  end.setDate(start.getDate() + 2); // vendredi + 2 = dimanche
  end.setHours(23, 59, 59, 999);

  // Si on est déjà vendredi/samedi/dimanche, on prend ce week-end
  if (day === 5 || day === 6 || day === 0) {
    const thisStart = new Date(now);
    thisStart.setHours(0, 0, 0, 0);
    // ramener au vendredi de ce week-end
    const offsetToFriday = day === 0 ? -2 : day === 6 ? -1 : 0;
    thisStart.setDate(now.getDate() + offsetToFriday);

    const thisEnd = new Date(thisStart);
    thisEnd.setDate(thisStart.getDate() + 2);
    thisEnd.setHours(23, 59, 59, 999);

    return { start: thisStart, end: thisEnd };
  }

  return { start, end };
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
    // tri Premium: featured_rank asc, puis date asc
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
      <div className="rounded-xl shadow overflow-hidden bg-white">
        {event.image ? (
          <img
            src={event.image}
            alt={event.title ?? "Événement"}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 flex items-center justify-center bg-gray-100">
            <span className="text-sm text-gray-500">Pas d’image</span>
          </div>
        )}

        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{event.title ?? "Sans titre"}</h2>
            {event.is_featured && (
              <span className="text-xs px-2 py-1 rounded-full bg-black text-white">
                Premium
              </span>
            )}
          </div>

          <p className="text-sm">
            {dateText} {timeText ? `• ${timeText}` : ""}
          </p>
          <p className="text-sm text-gray-600">{event.location ?? "Lieu ?"}</p>

          <div className="mt-3 flex gap-2">
            <a
              href={`/event/${event.id}`}
              className="flex-1 text-center bg-black text-white py-2 rounded-lg"
            >
              Voir détails
            </a>

            {event.whatsapp ? (
              <a
                className="flex-1 text-center border border-black py-2 rounded-lg"
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
                className="flex-1 text-center border border-gray-300 py-2 rounded-lg text-gray-400 cursor-not-allowed"
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
    <main className="p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h1 className="text-2xl font-bold">Sorties à Lomé</h1>

        {showAdmin && (
          <a
            href="/admin"
            className="text-sm border border-black px-3 py-1 rounded-lg"
          >
            + Ajouter
          </a>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-2 rounded-lg text-sm border ${
            filter === "TOUT" ? "bg-black text-white border-black" : "border-gray-300"
          }`}
          onClick={() => setFilter("TOUT")}
        >
          Tout
        </button>
        <button
          className={`px-3 py-2 rounded-lg text-sm border ${
            filter === "AUJOURD_HUI" ? "bg-black text-white border-black" : "border-gray-300"
          }`}
          onClick={() => setFilter("AUJOURD_HUI")}
        >
          Aujourd’hui
        </button>
        <button
          className={`px-3 py-2 rounded-lg text-sm border ${
            filter === "WEEK_END" ? "bg-black text-white border-black" : "border-gray-300"
          }`}
          onClick={() => setFilter("WEEK_END")}
        >
          Week-end
        </button>
      </div>

      {loading && <p>Chargement...</p>}
      {errorMsg && <p className="text-sm text-red-600">Erreur: {errorMsg}</p>}

      {!loading && !errorMsg && featured.length > 0 && (
        <>
          <h2 className="font-semibold mb-2">🔥 En avant</h2>
          <div className="grid gap-4 mb-6">
            {featured.slice(0, 6).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </>
      )}

      {!loading && !errorMsg && (
        <>
          <h2 className="font-semibold mb-2">Tous les événements</h2>

          {filtered.length === 0 ? (
            <p>Aucun événement.</p>
          ) : (
            <div className="grid gap-4">
              {filtered.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
