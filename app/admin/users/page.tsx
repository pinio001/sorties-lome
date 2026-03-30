// app/admin/users/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import BingoBackground from "../../components/BingoBackground";

type BingoUser = {
  id: string;
  created_at: string;
  pseudo: string;
  email: string | null;
  phone: string | null;
  newsletter: boolean;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
}

export default function AdminUsersPage() {
  const [users, setUsers]     = useState<BingoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState("");
  const [filter, setFilter]   = useState<"all" | "newsletter" | "email" | "phone">("all");

  useEffect(() => {
    fetch("/api/admin/users", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    return users
      .filter(u => filter === "all"        ? true
                 : filter === "newsletter" ? u.newsletter
                 : filter === "email"      ? !!u.email
                 :                           !!u.phone)
      .filter(u => !q || [u.pseudo, u.email, u.phone].some(
        f => (f ?? "").toLowerCase().includes(q.toLowerCase())
      ));
  }, [users, filter, q]);

  const newsletter_count = users.filter(u => u.newsletter).length;
  const email_count      = users.filter(u => u.email).length;
  const phone_count      = users.filter(u => u.phone).length;

  const cardStyle = { border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.05)", borderRadius:16, padding:"12px 16px" };

  return (
    <main className="min-h-screen">
      <BingoBackground />
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-16 relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white text-black font-bold flex items-center justify-center">
              <span className="font-black text-xl">B</span>
            </div>
            <div>
              <div className="text-white font-semibold">Bingo</div>
              <div className="text-xs text-white/50">Admin · Utilisateurs</div>
            </div>
          </div>
          <a href="/admin" className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white hover:bg-white/10">
            Admin
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total inscrits",  value: users.length,       key: "all" },
            { label: "Newsletter",      value: newsletter_count,   key: "newsletter" },
            { label: "Avec email",      value: email_count,        key: "email" },
            { label: "Avec WhatsApp",   value: phone_count,        key: "phone" },
          ].map(({ label, value, key }) => (
            <button key={key} onClick={() => setFilter(key as any)}
              className="rounded-2xl p-4 text-left transition"
              style={{
                border: `1px solid ${filter === key ? "rgba(255,255,255,.4)" : "rgba(255,255,255,.1)"}`,
                background: filter === key ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.04)",
              }}>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-white/40 mt-1">{label}</div>
            </button>
          ))}
        </div>

        {/* Recherche */}
        <div className="mb-4">
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Rechercher par pseudo, email, téléphone..."
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-white/30 text-sm outline-none focus:border-white/30" />
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-white/50 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="text-white/40 text-sm">Aucun utilisateur.</div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-white/30 mb-2">{filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}</div>
            {filtered.map(u => (
              <div key={u.id} style={cardStyle} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60 shrink-0">
                      {u.pseudo[0].toUpperCase()}
                    </div>
                    <span className="text-white font-medium text-sm truncate">{u.pseudo}</span>
                    {u.newsletter && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background:"rgba(74,222,128,.15)", color:"#4ade80", border:"1px solid rgba(74,222,128,.25)" }}>
                        newsletter
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40 pl-9">
                    {u.email && <span>✉️ {u.email}</span>}
                    {u.phone && <span>📱 {u.phone}</span>}
                  </div>
                </div>
                <div className="text-xs text-white/30 shrink-0">{fmtDate(u.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}