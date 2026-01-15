"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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

type Filter = "TOUT" | "AUJOURD_HUI" | "WEEK_END";

function normalizePhoneToWa(phone: string) {
  // garde chiffres + +
  const cleaned = phone.replace(/[^\d+]/g, "");
  // wa.me préfère sans +
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

export default function Home() {
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
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
        setEvents([]);
      } else {
        setEvents(data ?? []);
      }

      setLoading(false);
    };

    loadEvents();
  }, []);

  const featured = useMemo(
    () => events.filter((e) => e.is_featured),
    [events]
  );

  // MVP filtre “aujourd’hui” / “week-end” basé sur texte (car ton champ date est en text)
  // Plus tard on passera date/time en vrai type Date pour filtrer parfaitement.
  const filtered = useMemo(() => {
    if (filter === "TOUT") return events;

    const now = new Date();
    const day = now.getDay(); // 0 dim, 5 ven, 6 sam
    const isWeekendNow = day === 5 || day === 6 || day === 0;

    if (filter === "AUJOURD_HUI") {
      // Heuristique simple: cherche le jour actuel en français dans le champ date
      const frDays = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
      const token = frDays[day];
      return events.filter((e) =>
        (e.date ?? "").toLowerCase().includes(token)
      );
    }

    if (filter === "WEEK_END") {
      // Heuristique: inclut vend/sam/dim OU si on est déjà week-end, on affiche tout
      if (isWeekendNow) return events;
      return events.filter((e) => {
        const d = (e.date ?? "").toLowerCase();
        return d.includes("vendredi") || d.includes("samedi") || d.includes("dimanche");
      });
    }

    return events;
  }, [events, filter]);

  const EventCard = ({ event }: { event: EventItem }) => (
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
          {(event.date ?? "Date ?")} • {(event.time ?? "Heure ?")}
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

  return (
    <main className="p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h1 className="text-2xl font-bold">Sorties à Lomé</h1>
        <a
          href="/admin"
          className="text-sm border border-black px-3 py-1 rounded-lg"
        >
          + Ajouter
        </a>
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
            {featured.slice(0, 4).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </>
      )}

      {!loading && !errorMsg && (
        <>
          <h2 className="font-semibold mb-2">Tous les événements</h2>

          {filtered.length === 0 ? (
            <p>Aucun événement pour l’instant.</p>
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
