"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import BingoBackground from "../components/BingoBackground";
import ImageUploader from "../components/ImageUploader";

type FormType = "place" | "event";

const CATEGORIES = ["Bar/Resto", "Loisirs", "Night Clubs", "Hôtels"];

// Capitalise la 1ère lettre de chaque mot
function capitalizeFirst(val: string) {
  return val.charAt(0).toUpperCase() + val.slice(1);
}

// Valide +228XXXXXXXX (8 chiffres après +228)
function isValidPhone(val: string) {
  return val === "" || /^\+228\d{8}$/.test(val);
}

export default function SoumettreePage() {
  const router = useRouter();
  const [type, setType] = useState<FormType>("place");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Champs communs
  const [submitterName, setSubmitterName] = useState("");
  const [submitterPhone, setSubmitterPhone] = useState("");

  // Place
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Bar/Resto");
  const [location, setLocation] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");

  // Event
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");

  // Erreurs téléphone
  const [whatsappError, setWhatsappError] = useState("");
  const [submitterPhoneError, setSubmitterPhoneError] = useState("");

  const handleWhatsappChange = (val: string) => {
    setWhatsapp(val);
    if (val && !isValidPhone(val))
      setWhatsappError("Format requis : +228XXXXXXXX (ex: +22871529865)");
    else setWhatsappError("");
  };

  const handleSubmitterPhoneChange = (val: string) => {
    setSubmitterPhone(val);
    if (val && !isValidPhone(val))
      setSubmitterPhoneError("Format requis : +228XXXXXXXX (ex: +22871529865)");
    else setSubmitterPhoneError("");
  };

  const send = async () => {
    if (type === "place" && !name.trim()) return alert("Le nom du lieu est requis");
    if (type === "event" && !title.trim()) return alert("Le titre est requis");
    if (whatsappError || submitterPhoneError) return alert("Corrigez les erreurs de format de téléphone");
    if (whatsapp && !isValidPhone(whatsapp)) return alert("Format WhatsApp invalide : +228XXXXXXXX");

    setLoading(true);
    try {
      const res = await fetch("/api/soumettre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          data: type === "place"
            ? { name, category, location, whatsapp, description, image,
                maps_url: mapsUrl, instagram_url: instagramUrl,
                submitter_name: submitterName, submitter_phone: submitterPhone }
            : { title, event_date: eventDate, event_time: eventTime,
                location, whatsapp, description, image,
                submitter_name: submitterName, submitter_phone: submitterPhone },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert("Erreur : " + (data.error || "Impossible")); return; }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 text-sm outline-none focus:border-white/30 transition";
  const errorClass = "text-xs text-red-400 mt-1 ml-1";

  if (success) return (
    <main className="min-h-screen">
      <BingoBackground />
      <div className="relative z-10 max-w-md mx-auto px-4 pt-20 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <div className="text-white text-xl font-semibold mb-2">Merci !</div>
        <div className="text-white/60 text-sm mb-8">
          Votre soumission a bien été reçue. Elle sera examinée et publiée sous peu.
        </div>
        <button onClick={() => router.push("/")}
          className="bg-white text-black font-semibold px-6 py-3 rounded-2xl">
          Retour à l'accueil
        </button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen">
      <BingoBackground />
      <div className="relative z-10 max-w-md mx-auto px-4 pt-6 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white text-black flex items-center justify-center">
              <span className="font-black text-xl">B</span>
            </div>
            <div>
              <div className="text-white font-semibold">Bingo</div>
              <div className="text-xs text-white/60">Soumettre un lieu / event</div>
            </div>
          </div>
          <button onClick={() => router.push("/")}
            className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white/70">
            🏠
          </button>
        </div>

        {/* Type selector */}
        <div className="flex gap-3 mb-6">
          {(["place", "event"] as FormType[]).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-3 rounded-2xl text-sm font-medium border transition ${
                type === t ? "bg-white text-black border-white" : "border-white/20 text-white"
              }`}>
              {t === "place" ? "📍 Un lieu" : "🎉 Un événement"}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 space-y-3">

          {/* Infos soumetteur */}
          <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Vos coordonnées</div>

          <input className={inputClass}
            placeholder="Votre nom (optionnel)"
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value.toUpperCase())} />

          <div>
            <input className={`${inputClass} ${submitterPhoneError ? "border-red-500/50" : ""}`}
              placeholder="Votre téléphone (ex: +22871529865)"
              value={submitterPhone}
              onChange={(e) => handleSubmitterPhoneChange(e.target.value)} />
            {submitterPhoneError && <div className={errorClass}>⚠️ {submitterPhoneError}</div>}
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-3">
              {type === "place" ? "Infos du lieu" : "Infos de l'événement"}
            </div>
          </div>

          {type === "place" ? (
            <>
              {/* Nom en MAJUSCULES */}
              <input className={inputClass}
                placeholder="NOM DU LIEU *"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())} />

              <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-white/30 transition"
                value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Quartier — 1ère lettre majuscule */}
              <input className={inputClass}
                placeholder="Quartier / Zone (ex: Kégué, Tokoin...)"
                value={location}
                onChange={(e) => setLocation(capitalizeFirst(e.target.value))} />

              {/* WhatsApp avec validation */}
              <div>
                <input className={`${inputClass} ${whatsappError ? "border-red-500/50" : ""}`}
                  placeholder="WhatsApp (ex: +22871529865)"
                  value={whatsapp}
                  onChange={(e) => handleWhatsappChange(e.target.value)} />
                {whatsappError && <div className={errorClass}>⚠️ {whatsappError}</div>}
                {!whatsappError && !whatsapp && (
                  <div className="text-xs text-white/25 mt-1 ml-1">Format : +228XXXXXXXX</div>
                )}
              </div>

              <input className={inputClass}
                placeholder="Lien Google Maps (optionnel)"
                value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} />
              <input className={inputClass}
                placeholder="Instagram (optionnel)"
                value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} />
              <ImageUploader folder="places" value={image} onChange={setImage} />
            </>
          ) : (
            <>
              {/* Titre event en MAJUSCULES */}
              <input className={inputClass}
                placeholder="TITRE DE L'ÉVÉNEMENT *"
                value={title}
                onChange={(e) => setTitle(e.target.value.toUpperCase())} />

              <input type="date" className={inputClass}
                value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              <input type="time" className={inputClass}
                value={eventTime} onChange={(e) => setEventTime(e.target.value)} />

              {/* Lieu event — 1ère lettre majuscule */}
              <input className={inputClass}
                placeholder="Lieu (ex: Playce Rooftop, Lomé)"
                value={location}
                onChange={(e) => setLocation(capitalizeFirst(e.target.value))} />

              {/* WhatsApp event avec validation */}
              <div>
                <input className={`${inputClass} ${whatsappError ? "border-red-500/50" : ""}`}
                  placeholder="WhatsApp (ex: +22871529865)"
                  value={whatsapp}
                  onChange={(e) => handleWhatsappChange(e.target.value)} />
                {whatsappError && <div className={errorClass}>⚠️ {whatsappError}</div>}
                {!whatsappError && !whatsapp && (
                  <div className="text-xs text-white/25 mt-1 ml-1">Format : +228XXXXXXXX</div>
                )}
              </div>

              <ImageUploader folder="events" value={image} onChange={setImage} />
            </>
          )}

          <textarea className={`${inputClass} resize-none`}
            placeholder="Description (optionnel)" rows={3}
            value={description} onChange={(e) => setDescription(e.target.value)} />

          <button onClick={send} disabled={loading || !!whatsappError || !!submitterPhoneError}
            className="w-full bg-white text-black font-semibold py-3 rounded-2xl disabled:opacity-50 mt-2 transition">
            {loading ? "Envoi en cours..." : "📤 Soumettre"}
          </button>
        </div>
      </div>
    </main>
  );
}