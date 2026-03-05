"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BingoBackground from "../components/BingoBackground";

function ContactForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [source, setSource]   = useState("site");
  const [pagePath, setPagePath] = useState("");
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating]   = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = (sp.get("source") || "").trim();
    setSource(s || "site");
    if (typeof window !== "undefined") {
      setPagePath(window.location.pathname + window.location.search);
    }
  }, [sp]);

  const send = async () => {
    if (!message.trim()) return alert("Écrivez un message 🙂");
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          page_path: pagePath,
          name: name.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          message: message.trim(),
          rating: rating === "" ? null : rating,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert("Erreur : " + (data?.detail || data?.error || "Impossible"));
        return;
      }
      alert(
        email.trim()
          ? "✅ Message envoyé ! Un email de confirmation vous a été adressé."
          : "✅ Merci ! Votre message a été envoyé."
      );
      router.back();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-12">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-white text-black font-bold flex items-center justify-center">
            <span className="font-black text-xl tracking-tight">B</span>
          </div>
          <div>
            <div className="text-white font-semibold">Bingo</div>
            <div className="text-xs text-white/60">Contact / Avis</div>
          </div>
        </div>
        <button
          onClick={() => router.back()}
          className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white"
        >
          ← Retour
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 space-y-3">
        <div className="text-white font-semibold">Laisser un message</div>
        <div className="text-xs text-white/40">Source : {source}</div>

        <input
          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/40"
          placeholder="Votre nom (optionnel)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/40"
          placeholder="Votre email (optionnel — pour recevoir une confirmation)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/40"
          placeholder="Téléphone (optionnel)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <select
          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
          value={rating}
          onChange={(e) => setRating(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">Note (optionnel)</option>
          <option value="5">⭐⭐⭐⭐⭐ (5)</option>
          <option value="4">⭐⭐⭐⭐ (4)</option>
          <option value="3">⭐⭐⭐ (3)</option>
          <option value="2">⭐⭐ (2)</option>
          <option value="1">⭐ (1)</option>
        </select>
        <textarea
          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/40 min-h-[100px]"
          placeholder="Votre message / avis *"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        {email.trim() && (
          <div className="text-xs text-white/40 bg-white/5 rounded-xl px-3 py-2">
            📧 Un email de confirmation sera envoyé à <span className="text-white/70">{email.trim()}</span>
          </div>
        )}

        <button
          onClick={send}
          disabled={loading}
          className="w-full bg-white text-black rounded-xl py-3 font-semibold disabled:opacity-50"
        >
          {loading ? "Envoi en cours..." : "Envoyer"}
        </button>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <main className="min-h-screen">
      <BingoBackground />
      <Suspense fallback={<div className="text-white/60 p-6">Chargement...</div>}>
        <ContactForm />
      </Suspense>
    </main>
  );
}
