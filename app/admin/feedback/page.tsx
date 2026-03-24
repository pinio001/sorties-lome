// app/admin/feedback/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import BingoBackground from "../../components/BingoBackground";

type FeedbackItem = {
  id: string;
  created_at: string;
  source: string | null;
  page_path: string | null;
  name: string | null;
  phone: string | null;
  message: string;
  rating: number | null;
  _type: "contact" | "note";
};

type SiteFeedback = {
  id: string;
  created_at: string;
  rating: number;
  comment: string | null;
  page: string | null;
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function Stars({ n }: { n: number }) {
  return (
    <span>
      {[1,2,3,4,5].map((i) => (
        <span key={i} style={{ opacity: i <= n ? 1 : 0.2 }}>⭐</span>
      ))}
    </span>
  );
}

export default function AdminFeedbackPage() {
  const [contacts, setContacts]   = useState<FeedbackItem[]>([]);
  const [notes, setNotes]         = useState<SiteFeedback[]>([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState<string | null>(null);
  const [tab, setTab]             = useState<"contact" | "note">("note");
  const [q, setQ]                 = useState("");
  const [filterRating, setFilterRating] = useState(0); // 0 = tous

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      // Messages contact
      const r1 = await fetch("/api/admin/feedback", { cache: "no-store", credentials: "include" });
      const d1 = await r1.json().catch(() => ({}));
      if (!r1.ok) throw new Error(d1?.error || "Erreur feedback");
      setContacts((Array.isArray(d1?.items) ? d1.items : []).map((x: any) => ({ ...x, _type: "contact" })));

      // Notes popup
      const r2 = await fetch("/api/admin/feedback-site", { cache: "no-store", credentials: "include" });
      const d2 = await r2.json().catch(() => ({}));
      if (r2.ok) setNotes(Array.isArray(d2?.items) ? d2.items : []);
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Stats notes
  const avgRating = useMemo(() => {
    if (!notes.length) return 0;
    return (notes.reduce((s, n) => s + n.rating, 0) / notes.length).toFixed(1);
  }, [notes]);

  const ratingDist = useMemo(() => {
    const d: Record<number, number> = {1:0,2:0,3:0,4:0,5:0};
    for (const n of notes) d[n.rating] = (d[n.rating] || 0) + 1;
    return d;
  }, [notes]);

  // Filtres
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => filterRating === 0 || n.rating === filterRating)
      .filter((n) => !q || (n.comment ?? "").toLowerCase().includes(q.toLowerCase()));
  }, [notes, filterRating, q]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) =>
      !q || [c.name, c.message, c.phone, c.page_path].some(
        (f) => (f ?? "").toLowerCase().includes(q.toLowerCase())
      )
    );
  }, [contacts, q]);

  const deleteContact = async (id: string) => {
    if (!confirm("Supprimer ce message ?")) return;
    const res = await fetch(`/api/admin/feedback?id=${encodeURIComponent(id)}`, {
      method: "DELETE", credentials: "include",
    });
    if (res.ok) setContacts((prev) => prev.filter((x) => x.id !== id));
    else alert("Erreur suppression");
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Supprimer cet avis ?")) return;
    const res = await fetch(`/api/admin/feedback-site?id=${encodeURIComponent(id)}`, {
      method: "DELETE", credentials: "include",
    });
    if (res.ok) setNotes((prev) => prev.filter((x) => x.id !== id));
    else alert("Erreur suppression");
  };

  return (
    <main className="min-h-screen">
      <BingoBackground />
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white text-black font-bold flex items-center justify-center shadow-lg">
              <span className="font-black text-xl tracking-tight">B</span>
            </div>
            <div>
              <div className="text-white font-semibold">Bingo</div>
              <div className="text-xs text-white/60">Admin • Feedback</div>
            </div>
          </div>
          <div className="flex gap-2">
            <a href="/admin" className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white hover:bg-white/10">Admin</a>
            <button onClick={load} className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white hover:bg-white/10">↺</button>
          </div>
        </div>

        {/* Stats notes */}
        {notes.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-white font-semibold">Notes du site</div>
                <div className="text-xs text-white/50">{notes.length} avis</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{avgRating}</div>
                <div className="text-xs text-white/40">/ 5</div>
              </div>
            </div>
            {/* Distribution */}
            <div className="space-y-1.5">
              {[5,4,3,2,1].map((r) => {
                const count = ratingDist[r] || 0;
                const pct   = notes.length ? Math.round((count / notes.length) * 100) : 0;
                return (
                  <div key={r} className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setFilterRating(filterRating === r ? 0 : r)}>
                    <span className="text-xs text-white/50 w-4">{r}★</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/10">
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: filterRating === r ? "#fff" : "rgba(255,255,255,.4)" }} />
                    </div>
                    <span className="text-xs text-white/40 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
            {filterRating > 0 && (
              <button onClick={() => setFilterRating(0)}
                className="mt-2 text-xs text-white/40 hover:text-white/70">
                ✕ Retirer le filtre {filterRating}★
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("note")}
            className={`flex-1 py-2.5 rounded-xl text-sm border transition ${
              tab === "note" ? "bg-white text-black border-white font-semibold" : "border-white/20 text-white hover:bg-white/10"
            }`}>
            ⭐ Notes ({notes.length})
          </button>
          <button onClick={() => setTab("contact")}
            className={`flex-1 py-2.5 rounded-xl text-sm border transition ${
              tab === "contact" ? "bg-white text-black border-white font-semibold" : "border-white/20 text-white hover:bg-white/10"
            }`}>
            ✉️ Messages ({contacts.length})
          </button>
        </div>

        {/* Recherche */}
        <div className="mb-4">
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={tab === "note" ? "Rechercher dans les commentaires…" : "Rechercher (nom, message, tél)…"}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-white/30 text-sm outline-none focus:border-white/30" />
        </div>

        {loading ? (
          <div className="text-white/60">Chargement…</div>
        ) : err ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">Erreur : {err}</div>
        ) : tab === "note" ? (
          /* ── NOTES ── */
          <div className="space-y-3">
            {filteredNotes.length === 0 && <div className="text-white/40">Aucun avis.</div>}
            {filteredNotes.map((n) => (
              <div key={n.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Stars n={n.rating} />
                    <div className="text-xs text-white/40 mt-1">
                      {fmtDate(n.created_at)}
                      {n.page && <span> · <a href={n.page} target="_blank" rel="noreferrer"
                        className="hover:underline">{n.page}</a></span>}
                    </div>
                  </div>
                  <button onClick={() => deleteNote(n.id)}
                    className="shrink-0 text-xs border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-200 px-3 py-1.5 rounded-xl">
                    Supprimer
                  </button>
                </div>
                {n.comment && (
                  <div className="mt-2 text-sm text-white/80 whitespace-pre-line">{n.comment}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* ── MESSAGES CONTACT ── */
          <div className="space-y-3">
            {filteredContacts.length === 0 && <div className="text-white/40">Aucun message.</div>}
            {filteredContacts.map((it) => (
              <div key={it.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-white font-semibold truncate">
                      {it.name || "Anonyme"}{it.phone ? ` · ${it.phone}` : ""}
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                      {fmtDate(it.created_at)} · {it.source || "site"}
                      {it.rating ? <span> · <Stars n={it.rating} /></span> : ""}
                    </div>
                    {it.page_path && (
                      <a className="text-xs text-white/40 hover:underline break-all"
                        href={it.page_path} target="_blank" rel="noreferrer">{it.page_path}</a>
                    )}
                  </div>
                  <button onClick={() => deleteContact(it.id)}
                    className="shrink-0 text-xs border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-200 px-3 py-1.5 rounded-xl">
                    Supprimer
                  </button>
                </div>
                <div className="mt-3 text-sm text-white/80 whitespace-pre-line">{it.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}