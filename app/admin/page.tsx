"use client";

<a className="text-sm underline" href="/admin/manage">
  Gérer les événements (modifier/supprimer)
</a>

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.from("events").insert([
      {
        title,
        date,
        time,
        location,
        image,
        whatsapp,
        is_featured: isFeatured,
      },
    ]);

    setLoading(false);

    if (error) {
      setMsg("Erreur: " + error.message);
      return;
    }

    setMsg("✅ Événement ajouté !");
    // petite pause puis retour accueil
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 600);
  };

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin — Ajouter un événement</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="w-full border rounded-lg p-2"
          placeholder="Titre (ex: Soirée Afro)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <input
          className="w-full border rounded-lg p-2"
          placeholder="Date (ex: Vendredi 19 Avril)"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <input
          className="w-full border rounded-lg p-2"
          placeholder="Heure (ex: 22h)"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />

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

        <button
          className="w-full bg-black text-white py-2 rounded-lg disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Ajout..." : "Ajouter"}
        </button>

        {msg && <p className="text-sm">{msg}</p>}
      </form>

      <p className="text-xs text-gray-500 mt-4">
        Astuce : tu peux coller une image depuis un lien public (ex: Unsplash) ou
        mettre vide.
      </p>
    </main>
  );
}
