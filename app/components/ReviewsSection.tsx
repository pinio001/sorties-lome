"use client";
// components/ReviewsSection.tsx
// Section avis utilisateurs sur la page détail d'un spot

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Review = {
  id: string;
  created_at: string;
  rating: number;
  comment: string | null;
  bingo_users: { pseudo: string } | null;
};

interface Props {
  placeId: string;
}

function Stars({ n, size = 16 }: { n: number; size?: number }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: size, opacity: i <= n ? 1 : 0.2 }}>⭐</span>
      ))}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
}

export default function ReviewsSection({ placeId }: Props) {
  const [reviews, setReviews]     = useState<Review[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [userId, setUserId]       = useState<string | null>(null);
  const [pseudo, setPseudo]       = useState<string | null>(null);
  const [rating, setRating]       = useState(0);
  const [hovered, setHovered]     = useState(0);
  const [comment, setComment]     = useState("");
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    // Récupérer l'utilisateur connecté depuis localStorage
    const uid = localStorage.getItem("bingo_user_id");
    const ps  = localStorage.getItem("bingo_pseudo");
    setUserId(uid); setPseudo(ps);
  }, []);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("id, created_at, rating, comment, bingo_users(pseudo)")
      .eq("place_id", placeId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setReviews((data ?? []) as Review[]);
        setLoading(false);
      });
  }, [placeId, sent]);

  useEffect(() => {
    if (!userId) return;
    const already = reviews.some(r => {
      // @ts-ignore
      return r.user_id === userId;
    });
    setAlreadyReviewed(already);
  }, [reviews, userId]);

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const submit = async () => {
    if (!userId)  return;
    if (!rating)  return;
    setSending(true);
    try {
      await supabase.from("reviews").insert({
        place_id: placeId,
        user_id:  userId,
        rating,
        comment: comment.trim() || null,
      });
      setSent(true);
      setShowForm(false);
      setRating(0);
      setComment("");
    } catch {}
    finally { setSending(false); }
  };

  const cardStyle = { border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.03)", borderRadius:16, padding:"16px" };

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:"0.1em" }}>
            ✍️ Avis
          </div>
          {avgRating && (
            <div className="flex items-center gap-2 mt-1">
              <Stars n={Math.round(Number(avgRating))} size={14} />
              <span style={{ fontSize:13, color:"rgba(255,255,255,.6)" }}>{avgRating} · {reviews.length} avis</span>
            </div>
          )}
        </div>

        {userId && !alreadyReviewed && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="text-sm px-3 py-2 rounded-xl transition hover:bg-white/10"
            style={{ border:"1px solid rgba(255,255,255,.15)", color:"rgba(255,255,255,.7)" }}>
            + Mon avis
          </button>
        )}

        {!userId && (
          <a href="/inscription"
            className="text-sm px-3 py-2 rounded-xl transition hover:bg-white/10"
            style={{ border:"1px solid rgba(255,255,255,.15)", color:"rgba(255,255,255,.7)" }}>
            S'inscrire pour noter
          </a>
        )}
      </div>

      {/* Formulaire avis */}
      {showForm && userId && (
        <div style={{ ...cardStyle, marginBottom:12, border:"1px solid rgba(74,222,128,.2)", background:"rgba(74,222,128,.04)" }}>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.6)", marginBottom:12 }}>
            Ton avis, <span style={{ color:"#fff", fontWeight:600 }}>{pseudo}</span>
          </div>

          {/* Étoiles */}
          <div className="flex gap-2 mb-3">
            {[1,2,3,4,5].map(s => (
              <button key={s}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(s)}
                style={{ background:"none", border:"none", cursor:"pointer", fontSize:28,
                  filter: s <= (hovered || rating) ? "none" : "grayscale(1) opacity(.3)",
                  transform: s <= (hovered || rating) ? "scale(1.1)" : "scale(1)",
                  transition:"all .15s" }}>
                ⭐
              </button>
            ))}
          </div>

          <textarea
            value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Commentaire (optionnel)..."
            rows={3} maxLength={500}
            style={{ width:"100%", boxSizing:"border-box",
              background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)",
              borderRadius:10, padding:"10px 12px", color:"#fff", fontSize:13,
              resize:"none", outline:"none", fontFamily:"DM Sans", marginBottom:10 }}
          />

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)}
              style={{ flex:1, padding:"9px 0", borderRadius:10, border:"1px solid rgba(255,255,255,.12)",
                background:"none", color:"rgba(255,255,255,.5)", fontSize:13, cursor:"pointer" }}>
              Annuler
            </button>
            <button onClick={submit} disabled={!rating || sending}
              style={{ flex:2, padding:"9px 0", borderRadius:10, border:"none",
                background: rating ? "#fff" : "rgba(255,255,255,.15)",
                color: rating ? "#000" : "rgba(255,255,255,.3)",
                fontSize:13, fontWeight:700, cursor: rating ? "pointer" : "not-allowed" }}>
              {sending ? "Envoi…" : "Publier ✓"}
            </button>
          </div>
        </div>
      )}

      {/* Liste des avis */}
      {loading ? (
        <div style={{ color:"rgba(255,255,255,.3)", fontSize:13 }}>Chargement…</div>
      ) : reviews.length === 0 ? (
        <div style={{ ...cardStyle, textAlign:"center", padding:"24px" }}>
          <div style={{ fontSize:28, marginBottom:8 }}>💬</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.35)" }}>
            Aucun avis pour l'instant. Sois le premier !
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map(r => (
            <div key={r.id} style={cardStyle}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,.1)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:12, color:"rgba(255,255,255,.6)", fontWeight:700 }}>
                    {r.bingo_users?.pseudo?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span style={{ fontSize:13, color:"#fff", fontWeight:600 }}>
                    {r.bingo_users?.pseudo ?? "Anonyme"}
                  </span>
                </div>
                <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{fmtDate(r.created_at)}</span>
              </div>
              <Stars n={r.rating} size={13} />
              {r.comment && (
                <p style={{ fontSize:13, color:"rgba(255,255,255,.65)", marginTop:6, lineHeight:1.6 }}>
                  {r.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}