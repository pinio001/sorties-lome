"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";


export default function AdminPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(""); // YYYY-MM-DD
  const [eventTime, setEventTime] = useState(""); // HH:MM
  const [location, setLocation] = useState("");
  const [image, setImage] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredRank, setFeaturedRank] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.from("events").insert([
      {
        title,
        location,
        image,
        whatsapp,
        is_featured: isFeatured,
        featured_rank: featuredRank || 0,
        event_date: eventDate || null,
        event_time: eventTime || null,
      },
    ]);

    setLoading(false);

    if (error) {
      setMsg("Erreur: " + error.message);
      return;
    }

    setMsg("✅ Événement ajouté !");
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 500);
  };

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">Admin — Ajouter un événement</h1>
      <a href="/admin/places" className="underline">Admin Places</a>
      <a href="/admin/places/manage" className="underline">Gérer Places</a>

      <a className="text-sm underline" href="/admin/manage">
        Gérer les événements (modifier / supprimer)
      </a>

      <form onSubmit={handleSubmit} className="space-y-3 mt-4">
        <input
          className="w-full border rounded-lg p-2"
          placeholder="Titre (ex: Soirée Afro)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            className="w-full border rounded-lg p-2"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
          />
          <input
            className="w-full border rounded-lg p-2"
            type="time"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            required
          />
        </div>

        <input
          className="w-full border rounded-lg p-2"
          placeholder="Lieu (ex: Place Rooftop)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />

        <input
          className="w-full border rounded-lg p-2"
          placeholder="URL image (affiche)"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />

        <input
          className="w-full border rounded-lg p-2"
          placeholder="WhatsApp (ex: +22890000000)"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
          />
          Mettre en avant (Premium)
        </label>

        <input
          className="w-full border rounded-lg p-2"
          type="number"
          placeholder="Ordre Premium (ex: 1,2,3...) — 0 = pas d’ordre"
          value={featuredRank}
          onChange={(e) => setFeaturedRank(Number(e.target.value))}
          min={0}
        />

        <button
          className="w-full bg-black text-white py-2 rounded-lg disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Ajout..." : "Ajouter"}
        </button>

        {msg && <p className="text-sm">{msg}</p>}
      </form>
    </main>
  );
}
