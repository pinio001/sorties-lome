"use client";
// components/FeedbackPopup.tsx
// Affiche un pop-up 30s après la visite — 1 fois par semaine max
// Usage : <FeedbackPopup /> dans places/page.tsx et events/page.tsx

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "bingo_feedback_last";
const DELAY_MS    = 30_000; // 30 secondes

export default function FeedbackPopup() {
  const [open, setOpen]         = useState(false);
  const [step, setStep]         = useState<"rate" | "comment" | "done">("rate");
  const [rating, setRating]     = useState(0);
  const [hovered, setHovered]   = useState(0);
  const [comment, setComment]   = useState("");
  const [sending, setSending]   = useState(false);
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Vérifier si affiché récemment
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    timerRef.current = setTimeout(() => setOpen(true), DELAY_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const dismiss = () => {
    setOpen(false);
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const selectRating = (r: number) => {
    setRating(r);
    setStep("comment");
  };

  const submit = async () => {
    if (!rating) return;
    setSending(true);
    try {
      await fetch("/api/feedback-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
    } catch (_) {}
    setSending(false);
    setStep("done");
    setTimeout(() => { setOpen(false); }, 2500);
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  if (!open) return null;

  const stars = [1, 2, 3, 4, 5];
  const labels: Record<number, string> = {
    1: "Décevant 😕",
    2: "Passable 😐",
    3: "Bien 🙂",
    4: "Super 😄",
    5: "Excellent ! 🤩",
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={dismiss}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,.5)",
          backdropFilter: "blur(4px)",
          animation: "fbOverlay .2s ease",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        zIndex: 9999, width: "calc(100% - 32px)", maxWidth: 380,
        background: "linear-gradient(145deg,#0e1525,#111827)",
        border: "1px solid rgba(255,255,255,.12)",
        borderRadius: 24, padding: "28px 24px 24px",
        boxShadow: "0 24px 80px rgba(0,0,0,.7)",
        animation: "fbSlideUp .3s cubic-bezier(.16,1,.3,1)",
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* Close */}
        <button onClick={dismiss} style={{
          position: "absolute", top: 14, right: 14,
          background: "rgba(255,255,255,.07)", border: "none",
          color: "rgba(255,255,255,.5)", borderRadius: 99,
          width: 28, height: 28, cursor: "pointer", fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>

        {step === "rate" && (
          <>
            <div style={{ fontSize: 11, color: "#4ade80", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>
              🟢 Bingo228
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              Votre avis compte !
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 24 }}>
              Comment trouvez-vous le site jusqu'ici ?
            </div>

            {/* Étoiles */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
              {stars.map((s) => (
                <button key={s}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => selectRating(s)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 36, lineHeight: 1,
                    filter: s <= (hovered || rating) ? "none" : "grayscale(1) opacity(.35)",
                    transform: s <= (hovered || rating) ? "scale(1.15)" : "scale(1)",
                    transition: "all .15s ease",
                  }}>
                  ⭐
                </button>
              ))}
            </div>

            <div style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,.4)", height: 18 }}>
              {hovered ? labels[hovered] : ""}
            </div>
          </>
        )}

        {step === "comment" && (
          <>
            {/* Étoiles recap */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
              {stars.map((s) => (
                <span key={s} style={{ fontSize: 20, filter: s <= rating ? "none" : "grayscale(1) opacity(.3)" }}>⭐</span>
              ))}
              <span style={{ marginLeft: 8, fontSize: 13, color: "rgba(255,255,255,.5)", alignSelf: "center" }}>
                {labels[rating]}
              </span>
            </div>

            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              Un commentaire ? <span style={{ fontWeight: 400, fontSize: 13, color: "rgba(255,255,255,.4)" }}>(optionnel)</span>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ce que vous aimez, ce qui manque..."
              maxLength={280}
              rows={3}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 12, padding: "10px 14px",
                color: "#fff", fontSize: 13, resize: "none",
                outline: "none", marginBottom: 16,
                fontFamily: "'DM Sans', sans-serif",
              }}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={dismiss} style={{
                flex: 1, padding: "10px 0", borderRadius: 12,
                border: "1px solid rgba(255,255,255,.12)",
                background: "none", color: "rgba(255,255,255,.5)",
                fontSize: 13, cursor: "pointer",
              }}>
                Passer
              </button>
              <button onClick={submit} disabled={sending} style={{
                flex: 2, padding: "10px 0", borderRadius: 12,
                border: "none",
                background: sending ? "rgba(255,255,255,.2)" : "#fff",
                color: "#000", fontSize: 13, fontWeight: 700,
                cursor: sending ? "not-allowed" : "pointer",
                transition: "background .2s",
              }}>
                {sending ? "Envoi…" : "Envoyer ✓"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🙏</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              Merci beaucoup !
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>
              Votre avis nous aide à améliorer Bingo228.
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fbOverlay { from { opacity:0 } to { opacity:1 } }
        @keyframes fbSlideUp {
          from { opacity:0; transform:translateX(-50%) translateY(24px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  );
}