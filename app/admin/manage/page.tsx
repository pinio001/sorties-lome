"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";


type EventItem = {
  id: string;
  title: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  is_featured: boolean | null;
};

export default function ManageEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMsg(null);
    const { data, error } = await supabase
      .from("events")
      .select("id,title,date,time,location,is_featured")
      .order("created_at", { ascending: false });

    if (error) setMsg("Erreur: " + error.message);
    setEvents((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const del = async (id: string) => {
    if (!confirm("Supprimer cet événement ?")) return;

    const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const t = await res.text();
      alert("Erreur suppression: " + t);
      return;
    }
    await load();
  };

  return (
    <main className="p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Gérer les événements</h1>

        <a className="text-sm border border-black px-3 py-1 rounded-lg" href="/admin">
          + Ajouter
        </a>
      </div>

      <a className="text-sm underline" href="/">
        ← Retour site public
      </a>

      {loading && <p className="mt-3">Chargement...</p>}
      {msg && <p className="text-sm text-red-600 mt-3">{msg}</p>}

      <div className="mt-4 grid gap-3">
        {events.map((e) => (
          <div key={e.id} className="border rounded-xl p-3">
            <div className="flex justify-between gap-2">
              <div>
                <div className="font-semibold">
                  {e.title ?? "Sans titre"} {e.is_featured ? "⭐" : ""}
                </div>
                <div className="text-sm text-gray-600">
                  {(e.date ?? "Date ?")} • {(e.time ?? "Heure ?")} • {(e.location ?? "Lieu ?")}
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[110px]">
                <a
                  className="text-center border border-black py-2 rounded-lg text-sm"
                  href={`/admin/edit/${e.id}`}
                >
                  Modifier
                </a>
                <button
                  className="text-center border border-red-500 text-red-600 py-2 rounded-lg text-sm"
                  onClick={() => del(e.id)}
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
