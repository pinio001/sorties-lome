"use client";
import { useEffect, useState } from "react";
import BingoBackground from "../../components/BingoBackground";

type Item = Record<string, any> & { id: string; status: string; created_at: string };

export default function ModerationPage() {
  const [tab, setTab] = useState<"places" | "events">("places");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/moderation?type=${tab}`, { credentials: "include" });
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const action = async (id: string, act: "approve" | "reject") => {
    await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, type: tab, action: act }),
    });
    load();
  };

  return (
    <main className="min-h-screen">
      <BingoBackground />
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-16">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white text-black flex items-center justify-center">
              <span className="font-black text-xl">B</span>
            </div>
            <div>
              <div className="text-white font-semibold">Bingo</div>
              <div className="text-xs text-white/60">Admin • Modération</div>
            </div>
          </div>
          <a href="/admin" className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white/70">← Admin</a>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          {(["places", "events"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm border transition ${
                tab === t ? "bg-white text-black border-white" : "border-white/20 text-white"
              }`}>
              {t === "places" ? "📍 Lieux" : "🎉 Events"}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-white/60">Chargement...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <div className="text-4xl mb-3">✅</div>
            <div>Aucune soumission en attente</div>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                {item.image && (
                  <img src={item.image} alt="" className="w-full h-36 object-cover rounded-xl mb-3" />
                )}
                <div className="text-white font-semibold text-base">
                  {item.name ?? item.title ?? "Sans titre"}
                </div>
                {item.category && <div className="text-xs text-white/50 mt-0.5">{item.category}</div>}
                {item.location && <div className="text-sm text-white/60 mt-1">📍 {item.location}</div>}
                {item.whatsapp && <div className="text-sm text-white/60">📱 {item.whatsapp}</div>}
                {item.event_date && <div className="text-sm text-white/60">📅 {item.event_date} {item.event_time}</div>}
                {item.description && (
                  <div className="text-sm text-white/50 mt-2 line-clamp-2">{item.description}</div>
                )}
                {(item.submitter_name || item.submitter_phone) && (
                  <div className="text-xs text-white/30 mt-2 border-t border-white/10 pt-2">
                    Soumis par : {item.submitter_name} {item.submitter_phone}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => action(item.id, "approve")}
                    className="flex-1 bg-green-500/20 border border-green-500/30 text-green-400 py-2 rounded-xl text-sm font-medium">
                    ✅ Approuver
                  </button>
                  <button onClick={() => action(item.id, "reject")}
                    className="flex-1 bg-red-500/10 border border-red-500/20 text-red-400 py-2 rounded-xl text-sm font-medium">
                    ❌ Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}