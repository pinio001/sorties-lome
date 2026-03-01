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
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [source, setSource] = useState("TOUS");

  const load = async () => {
    setLoading(true);
    setErr(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (source !== "TOUS") params.set("source", source);

      const res = await fetch(`/api/admin/feedback?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setErr(data?.detail || data?.error || "Erreur serveur");
        setItems([]);
      } else {
        setItems(Array.isArray(data?.items) ? data.items : []);
      }
    } catch (e: any) {
      setErr(e?.message || "Erreur");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { TOUS: items.length };
    for (const it of items) {
      const s = (it.source || "site").toLowerCase();
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [items]);

  const deleteOne = async (id: string) => {
    if (!confirm("Supprimer ce message ?")) return;

    const res = await fetch(`/api/admin/feedback?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) {
      alert("Erreur : " + (data?.detail || data?.error || "Impossible"));
      return;
    }

    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <main className="min-h-screen">
      <BingoBackground />

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-16">
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

          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white hover:bg-white/10"
            >
              Admin
            </a>
            <button
              onClick={load}
              className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white hover:bg-white/10"
            >
              Rafraîchir
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 mb-4">
          <div className="text-white font-semibold">Messages / Avis</div>
          <div className="text-xs text-white/60 mt-1">
            Total : {counts.TOUS || 0}
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Recherche (nom, message, tel, page)…"
              className="md:col-span-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-white/40"
            />

            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
            >
              <option value="TOUS">Toutes sources</option>
              <option value="places">places</option>
              <option value="events">events</option>
              <option value="home">home</option>
              <option value="site">site</option>
            </select>

            <div className="md:col-span-3 flex items-center justify-between">
              <div className="text-xs text-white/60">
                Affiché : {items.length}
              </div>
              <button
                onClick={load}
                className="text-xs border border-white/20 px-3 py-2 rounded-xl text-white hover:bg-white/10"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-white/70">Chargement…</div>
        ) : err ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            Erreur : {err}
          </div>
        ) : items.length === 0 ? (
          <div className="text-white/60">Aucun message.</div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div
                key={it.id}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-white font-semibold truncate">
                      {it.name || "Anonyme"}{" "}
                      {it.phone ? `• ${it.phone}` : ""}
                    </div>
                    <div className="text-xs text-white/60 mt-1">
                      {fmtDate(it.created_at)} • source: {it.source || "site"}
                      {it.rating ? ` • note: ${"⭐".repeat(it.rating)}` : ""}
                    </div>
                    {it.page_path && (
                      <a
                        className="text-xs text-white/60 hover:underline break-all"
                        href={it.page_path}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {it.page_path}
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => deleteOne(it.id)}
                    className="shrink-0 text-xs border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-200 px-3 py-2 rounded-xl"
                  >
                    Supprimer
                  </button>
                </div>

                <div className="mt-3 text-sm text-white/80 whitespace-pre-line">
                  {it.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}