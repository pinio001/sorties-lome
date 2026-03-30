"use client";
// app/inscription/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import BingoBackground from "../components/BingoBackground";

export default function InscriptionPage() {
  const router = useRouter();
  const [pseudo, setPseudo]       = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");

  const inputClass = "w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 text-sm outline-none focus:border-white/30 transition";

  const submit = async () => {
    if (!pseudo.trim())              return setError("Le pseudo est requis");
    if (!email.trim() && !phone.trim()) return setError("Email ou numéro requis");
    if (email && !/\S+@\S+\.\S+/.test(email)) return setError("Email invalide");

    setLoading(true); setError("");
    try {
      const res = await fetch("/api/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo: pseudo.trim(), email: email.trim() || null, phone: phone.trim() || null, newsletter }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur"); return; }

      // Sauvegarder l'user_id en localStorage
      if (data.user_id) localStorage.setItem("bingo_user_id", data.user_id);
      if (data.pseudo)  localStorage.setItem("bingo_pseudo", data.pseudo);

      // Ouvrir WhatsApp si numéro fourni
      if (data.wa_link) {
        setTimeout(() => window.open(data.wa_link, "_blank"), 500);
      }
      setSuccess(true);
    } catch { setError("Erreur réseau"); }
    finally { setLoading(false); }
  };

  if (success) return (
    <main className="min-h-screen relative" style={{ background:"linear-gradient(160deg,#060a12 0%,#0c1220 60%,#060a12 100%)" }}>
      <BingoBackground />
      <div className="relative z-10 max-w-sm mx-auto px-4 pt-24 text-center">
        <div className="text-5xl mb-5">🎉</div>
        <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:24, color:"#fff", marginBottom:8 }}>
          Bienvenue !
        </div>
        <div style={{ color:"rgba(255,255,255,.5)", fontSize:14, marginBottom:32 }}>
          Ton compte Bingo228 est créé.{newsletter ? " Tu recevras les events et recommandations chaque semaine." : ""}
        </div>
        <button onClick={() => router.push("/places")}
          className="w-full py-3 rounded-2xl font-semibold text-sm"
          style={{ background:"#fff", color:"#000" }}>
          Explorer les spots →
        </button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen relative" style={{ background:"linear-gradient(160deg,#060a12 0%,#0c1220 60%,#060a12 100%)" }}>
      <BingoBackground />
      <div className="relative z-10 max-w-sm mx-auto px-4 pt-8 pb-16">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center">
            <span style={{ fontFamily:"Syne", fontWeight:900, fontSize:18, color:"#000" }}>B</span>
          </div>
          <div>
            <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:16, color:"#fff" }}>Bingo228</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>Créer un compte</div>
          </div>
        </div>

        <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:26, color:"#fff", marginBottom:8 }}>
          Rejoins la communauté
        </div>
        <div style={{ fontSize:14, color:"rgba(255,255,255,.45)", marginBottom:32, lineHeight:1.6 }}>
          Laisse des avis sur tes spots préférés et reçois les meilleures sorties de Lomé chaque semaine.
        </div>

        <div className="space-y-3">
          {/* Pseudo */}
          <input className={inputClass} placeholder="Ton pseudo *"
            value={pseudo} onChange={e => setPseudo(e.target.value)} />

          {/* Email */}
          <input className={inputClass} type="email" placeholder="Email (optionnel si numéro)"
            value={email} onChange={e => setEmail(e.target.value)} />

          {/* Téléphone */}
          <input className={inputClass} placeholder="Numéro WhatsApp (optionnel si email)"
            value={phone} onChange={e => setPhone(e.target.value)} />

          {/* Newsletter */}
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl transition"
            style={{ border:"1px solid rgba(255,255,255,.1)", background: newsletter ? "rgba(74,222,128,.06)" : "rgba(255,255,255,.03)" }}>
            <div className="relative mt-0.5">
              <input type="checkbox" className="sr-only" checked={newsletter} onChange={e => setNewsletter(e.target.checked)} />
              <div className="w-5 h-5 rounded-md flex items-center justify-center transition"
                style={{ background: newsletter ? "#4ade80" : "rgba(255,255,255,.1)", border: newsletter ? "none" : "1px solid rgba(255,255,255,.2)" }}>
                {newsletter && <span style={{ fontSize:12, color:"#000", fontWeight:900 }}>✓</span>}
              </div>
            </div>
            <div>
              <div style={{ fontSize:13, color:"#fff", fontWeight:600 }}>
                Recevoir les events et recommandations
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:2 }}>
                Un email chaque lundi avec les meilleures sorties de la semaine à Lomé
              </div>
            </div>
          </label>

          {error && (
            <div className="text-sm text-red-400 px-1">⚠️ {error}</div>
          )}

          <button onClick={submit} disabled={loading}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition disabled:opacity-50"
            style={{ background:"#fff", color:"#000", fontFamily:"DM Sans" }}>
            {loading ? "Création..." : "Créer mon compte →"}
          </button>

          <div className="text-center text-xs" style={{ color:"rgba(255,255,255,.3)" }}>
            Pas de mot de passe, pas de spam. Juste les meilleures sorties.
          </div>

          <div className="text-center text-xs" style={{ color:"rgba(255,255,255,.3)", marginTop:8 }}>
            Déjà inscrit ?{" "}
            <button onClick={() => router.push("/")} style={{ color:"rgba(255,255,255,.5)", textDecoration:"underline" }}>
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}