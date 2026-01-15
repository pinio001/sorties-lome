"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
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

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    setMsg(null);
    const res = await fetch(`/api/admin/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        image: event.image,
        whatsapp: event.whatsapp,
        is_featured: event.is_featured,
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

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Modifier événement</h1>

      <form onSubmit={save} className="space-y-3">
        <input
          className="w-full border rounded-lg p-2"
          value={event.title ?? ""}
          onChange={(e) => setEvent({ ...event, title: e.target.value })}
          placeholder="Titre"
        />
        <input
          className="w-full border rounded-lg p-2"
          value={event.date ?? ""}
          onChange={(e) => setEvent({ ...event, date: e.target.value })}
          placeholder="Date"
        />
        <input
          className="w-full border rounded-lg p-2"
          value={event.time ?? ""}
          onChange={(e) => setEvent({ ...event, time: e.target.value })}
          placeholder="Heure"
        />
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
