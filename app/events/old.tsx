// app/events/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import BingoBackground from "../components/BingoBackground";
import { trackPageView } from "../../lib/trackViewClient";



type EventItem = {
  id: string;
  title: string | null;
  location: string | null;
  image: string | null;
  whatsapp: string | null;
  description: string | null;

  // champs usuels chez toi (si certains n'existent pas, ça ne casse pas)
  event_date?: string | null; // ex: "2026-01-26" ou ISO
  event_time?: string | null; // ex: "20:30"
  is_featured?: boolean | null;
  featured_rank?: number | null;
  interest_count?: number | null;
};

type TabKey = "all" | "tonight" | "weekend" | "upcoming";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "tonight", label: "Ce soir" },
  { key: "weekend", label: "Ce week-end" },
  { key: "upcoming", label: "À venir" },
];

function normalizePhoneToWa(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

function parseEventDate(e: EventItem): Date | null {
  const raw = (e.event_date ?? "").trim();
  if (!raw) return null;

  // ISO datetime
  if (raw.includes("T")) {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  // YYYY-MM-DD
  const d = new Date(`${raw}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateFr(d: Date) {
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatTimeHM(t?: string | null) {
  const s = (t ?? "").trim();
  if (!s) return "";
  // accepte "20:30" ou "20:30:00"
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return s;
  const hh = m[1].padStart(2, "0");
  const mm = m[2];
  return `${hh}:${mm}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");

  useEffect(() => {
    trackPageView();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      setEvents((data ?? []) as EventItem[]);
      setLoading(false);
    };
    load();
  }, []);

  const ranges = useMemo(() => {
    const now = new Date();
    const today0 = startOfDay(now);
    const tomorrow0 = new Date(today0);
    tomorrow0.setDate(tomorrow0.getDate() + 1);

    // Weekend window: Sat 00:00 -> Mon 00:00
    const day = now.getDay(); // 0=Sun ... 6=Sat
    let satOffset = 6 - day;
    if (day === 0) satOffset = -1; // dimanche -> samedi d'hier
    const weekendStart = new Date(today0);
    weekendStart.setDate(weekendStart.getDate() + satOffset);
    const weekendEnd = new Date(weekendStart);
    weekendEnd.setDate(weekendEnd.getDate() + 2);

    return { today0, tomorrow0, weekendStart, weekendEnd };
  }, []);

  const normalized = useMemo(() => {
    const { today0 } = ranges;

    // On n'affiche pas le passé
    return events
      .map((e) => ({ e, d: parseEventDate(e) }))
      .filter(({ d }) => !d || d.getTime() >= today0.getTime());
  }, [events, ranges]);

  const featured = useMemo(() => {
    return normalized
      .filter(({ e }) => e.is_featured === true)
      .sort((a, b) => (a.e.featured_rank ?? 0) - (b.e.featured_rank ?? 0))
      .map(({ e }) => e);
  }, [normalized]);

  const filtered = useMemo(() => {
    const { today0, tomorrow0, weekendStart, weekendEnd } = ranges;

    const pick = (e: EventItem) => {
      const d = parseEventDate(e);
      if (!d) return tab === "all"; // si pas de date, seulement dans "Tous"

      const t = d.getTime();

      if (tab === "all") return t >= today0.getTime();
      if (tab === "tonight") return t >= today0.getTime() && t < tomorrow0.getTime();
      if (tab === "weekend") return t >= weekendStart.getTime() && t < weekendEnd.getTime();
      if (tab === "upcoming") return t >= tomorrow0.getTime();

      return true;
    };

    return normalized.map(({ e }) => e).filter(pick);
  }, [normalized, ranges, tab]);

  return (
    <main className="min-h-screen">
      <BingoBackground />

      <div className="max-w-md mx-auto px-4 pt-6 pb-10">
        {/* ENTÊTE (même style que Places) */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white text-black font-bold flex items-center justify-center shadow-lg">
              <span className="font-black text-xl tracking-tight">B</span>
            </div>
            <div>
              <div className="text-white font-semibold">Bingo</div>
              <div className="text-xs text-white/60">Events</div>
            </div>
          </div>

          <a
            href="/places"
            className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white hover:bg-white/10"
          >
            Places →
          </a>
        </div>

        {/* HERO */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 mb-4">
          <h1 className="text-white font-semibold text-lg leading-6">
            Qu'est-ce qu'on fait ce week-end?
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Découvrez les meilleures sorties à Lomé : concerts, soirées, vibes, évènements...
          </p>
        </div>

        {/* TABS */}
        <div className="flex gap-2 flex-wrap mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 rounded-xl text-sm border transition ${
                tab === t.key
                  ? "bg-white text-black"
                  : "border-white/20 text-white hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-white/60 mt-6">Chargement…</p>
        ) : (
          <>
            {/* EN AVANT (seulement dans "Tous") */}
            {tab === "all" && featured.length > 0 && (
              <>
                <h2 className="text-white font-semibold mt-2 mb-3">🔥 En avant</h2>
                <div className="grid gap-4 mb-6">
                  {featured.map((ev) => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              </>
            )}

            <h2 className="text-white font-semibold mb-3">
              {tab === "all" ? "Tous les events" : "Résultats"}
            </h2>

            <div className="grid gap-4">
              {filtered.map((ev) => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </div>

            {filtered.length === 0 && (
              <p className="text-white/60 mt-6">Aucun événement trouvé.</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function EventCard({ event }: { event: EventItem }) {
  const d = parseEventDate(event);
  const dateText = d ? formatDateFr(d) : "Date ?";
  const timeText = formatTimeHM(event.event_time);

  return (
    <div
      className={`
        rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur
        transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]
        ${event.is_featured ? "ring-1 ring-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.25)]" : ""}
      `}
    >
      {event.image ? (
        <img
          src={event.image}
          alt={event.title ?? "Événement"}
          className="w-full h-44 object-cover transition-transform duration-500 hover:scale-[1.03]"
          loading="lazy"
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
            className="flex-1 text-center bg-white text-black py-2 rounded-xl font-medium transition hover:scale-[1.03]"
          >
            Détails
          </a>

          {event.whatsapp ? (
            <a
              className="flex-1 text-center border border-white/20 text-white py-2 rounded-xl transition hover:bg-white/10 hover:scale-[1.03]"
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
}
