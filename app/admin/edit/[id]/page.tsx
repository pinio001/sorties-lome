"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";

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
  description: string | null;
  interest_count: number | null;
};

function genDescriptionWhatsApp(title: string, date?: string, time?: string, location?: string) {
  const lines: string[] = [];
  lines.push(`🔥 *${title || "Sortie du moment"}*`);
  if (date) lines.push(`📅 Date : ${date}`);
  if (time) lines.push(`⏰ Heure : ${time}`);
  if (location) lines.push(`📍 Lieu : ${location}`);
  lines.push("");
  lines.push("Ambiance garantie 😄");
  lines.push("Viens avec les amis, et arrive tôt ✅");
  return lines.join("\n");
}

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);

      const { data, error } = await supabase.from("events").select("*").eq("id", id).single();

      if (error) setMsg("Erreur: " + error.message);
      setEvent((data ?? null) as any);
      setLoading(false);
    };
    load();
  }, [id]);

  const generate = () => {
    if (!event) return;
    const timeForGen = (event.event_time ?? "").slice(0, 5);
    setEvent({
      ...event,
      description: genDescriptionWhatsApp(
        event.title ?? "",
        event.event_date ?? "",
        timeForGen,
        event.location ?? ""
      ),
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    setMsg(null);

    const res = await fetch(`/api/admin/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: event.title,
        location: event.location,
        image: event.image,
        whatsapp: event.whatsapp,
        is_featured: Boolean(event.is_featured),
        featured_rank: Number(event.featured_rank ?? 0),
        event_date: event.event_date,
        event_time: event.event_time,
        description: event.description,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      setMsg("Erreur: " + t);
      return;
    }

    router.push("/admin/manage");
  };

  if (loading) return <main className="p-4 max-w-md mx-auto">Chargement...</main>;
  if (!event) return <main className="p-4 max-w-md mx-auto">Introuvable.</main>;

  const timeForInput = (event.event_time ?? "").slice(0, 5);

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">Modifier événement</h1>

      <div className="text-sm text-gray-600 mb-4">
        Audience (❤️ intéressés) : <span className="font-semibold">{event.interest_count ?? 0}</span>
      </div>

      <form onSubmit={save} className="space-y-3">
        <input
          className="w-full border rounded-lg p-2"
          value={event.title ?? ""}
          onChange={(e) => setEvent({ ...event, title: e.target.value })}
          placeholder="Titre"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            className="w-full border rounded-lg p-2"
            type="date"
            value={event.event_date ?? ""}
            onChange={(e) => setEvent({ ...event, event_date: e.target.value })}
          />
          <input
            className="w-full border rounded-lg p-2"
            type="time"
            value={timeForInput}
            onChange={(e) => setEvent({ ...event, event_time: e.target.value })}
          />
        </div>

        <input
          className="w-full border rounded-lg p-2"
          value={event.location ?? ""}
          onChange={(e) => setEvent({ ...event, location: e.target.value })}
          placeholder="Lieu"
        />

        <input
          className="w-full border rounded-lg p-2"
          value={event.image ?? ""}
          onChange={(e) => setEvent({ ...event, image: e.target.value })}
          placeholder="URL image"
        />

        <input
          className="w-full border rounded-lg p-2"
          value={event.whatsapp ?? ""}
          onChange={(e) => setEvent({ ...event, whatsapp: e.target.value })}
          placeholder="WhatsApp (+228...)"
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(event.is_featured)}
            onChange={(e) => setEvent({ ...event, is_featured: e.target.checked })}
          />
          Mettre en avant (Premium)
        </label>

        <input
          className="w-full border rounded-lg p-2"
          type="number"
          min={0}
          value={Number(event.featured_rank ?? 0)}
          onChange={(e) => setEvent({ ...event, featured_rank: Number(e.target.value) })}
          placeholder="Ordre Premium (1,2,3...)"
        />

        {/* Description + générateur */}
        <div className="flex items-center justify-between">
          <div className="font-semibold">Description</div>
          <button
            type="button"
            onClick={generate}
            className="text-sm border border-black px-3 py-1 rounded-lg"
          >
            Générer
          </button>
        </div>

        <textarea
          className="w-full border rounded-lg p-2 min-h-[160px]"
          placeholder="Description (modifiable)"
          value={event.description ?? ""}
          onChange={(e) => setEvent({ ...event, description: e.target.value })}
        />

        <button className="w-full bg-black text-white py-2 rounded-lg" type="submit">
          Enregistrer
        </button>

        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </form>

      <div className="mt-4">
        <a className="text-sm underline" href="/admin/manage">
          ← Retour
        </a>
      </div>
    </main>
  );
}
