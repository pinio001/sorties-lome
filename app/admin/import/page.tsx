"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import BingoBackground from "../../components/BingoBackground";

type Row = {
  type: string;
  name: string;
  title: string;
  category: string;
  location: string;
  whatsapp: string;
  description: string;
  media: string;
  maps_url: string;
  instagram_url: string;
  tiktok_url: string;
  website_url: string;
  event_date: string;
  event_time: string;
  is_featured: string;
  _status?: "pending" | "ok" | "error";
  _error?: string;
};

function parseCSV(text: string): Row[] {
  const lines = text.trim().split("\n");

  // Détecte automatiquement , ou ;
  const sep = lines[0].includes(";") ? ";" : ",";

  const headers = lines[0]
    .split(sep)
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

  return lines.slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: any = { _status: "pending" };
      headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
      return row as Row;
    });
}
export default function ImportPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      setDone(false);
    };
    reader.readAsText(file);
  };

  const buildPayload = (r: Row) => {
    // Parse médias : séparés par |
    const mediaArr = (r.media || "")
      .split("|")
      .map((m) => m.trim())
      .filter(Boolean)
      .slice(0, 4);

    const primaryImage = mediaArr[0] || null;
    const isPlace = (r.type || "").toLowerCase().trim() === "place";

    if (isPlace) {
      return {
        table: "places",
        data: {
          name: r.name?.trim() || null,
          category: r.category?.trim() || null,
          location: r.location?.trim() || null,
          whatsapp: r.whatsapp?.trim() || null,
          description: r.description?.trim() || null,
          image: primaryImage,
          media_urls: mediaArr,
          maps_url: r.maps_url?.trim() || null,
          instagram_url: r.instagram_url?.trim() || null,
          tiktok_url: r.tiktok_url?.trim() || null,
          website_url: r.website_url?.trim() || null,
          is_featured: r.is_featured?.trim().toLowerCase() === "true",
          interest_count: 0,
        },
      };
    } else {
      return {
        table: "events",
        data: {
          title: r.title?.trim() || null,
          location: r.location?.trim() || null,
          event_date: r.event_date?.trim() || null,
          event_time: r.event_time?.trim() || null,
          whatsapp: r.whatsapp?.trim() || null,
          description: r.description?.trim() || null,
          image: primaryImage,
          media_urls: mediaArr,
          is_featured: r.is_featured?.trim().toLowerCase() === "true",
          interest_count: 0,
        },
      };
    }
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    const updated = [...rows];

    for (let i = 0; i < updated.length; i++) {
      const r = updated[i];

      // Validation basique
      const isPlace = (r.type || "").toLowerCase().trim() === "place";
      const isEvent = (r.type || "").toLowerCase().trim() === "event";

      if (!isPlace && !isEvent) {
        updated[i] = { ...r, _status: "error", _error: "type invalide (place ou event)" };
        setRows([...updated]);
        continue;
      }
      if (isPlace && !r.name?.trim()) {
        updated[i] = { ...r, _status: "error", _error: "name manquant" };
        setRows([...updated]);
        continue;
      }
      if (isEvent && !r.title?.trim()) {
        updated[i] = { ...r, _status: "error", _error: "title manquant" };
        setRows([...updated]);
        continue;
      }

      try {
        const { table, data } = buildPayload(r);
        const res = await fetch("/api/admin/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ type: isPlace ? "place" : "event", table, data }),
        });
        const json = await res.json().catch(() => ({}));
        updated[i] = {
          ...r,
          _status: res.ok ? "ok" : "error",
          _error: res.ok ? undefined : (json.error || "Erreur serveur"),
        };
      } catch (e: any) {
        updated[i] = { ...r, _status: "error", _error: e.message };
      }
      setRows([...updated]);
    }

    setImporting(false);
    setDone(true);
  };

  const ok = rows.filter((r) => r._status === "ok").length;
  const errors = rows.filter((r) => r._status === "error").length;
  const pending = rows.filter((r) => r._status === "pending").length;

  return (
    <main className="min-h-screen">
      <BingoBackground />
      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white text-black font-bold flex items-center justify-center">
              <span className="font-black text-xl">B</span>
            </div>
            <div>
              <div className="text-white font-semibold">Bingo</div>
              <div className="text-xs text-white/60">Admin • Import CSV</div>
            </div>
          </div>
          <a
            href="/admin"
            className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white/70 hover:bg-white/10 transition"
          >
            ← Admin
          </a>
        </div>

        {/* Zone upload */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 mb-6 space-y-3">
          <div className="text-white font-semibold">📂 Importer un fichier CSV</div>

          {/* Colonnes attendues */}
          <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-2 text-xs text-white/60">
            <div>
              <span className="text-white/40 uppercase tracking-widest text-[10px]">Colonnes obligatoires</span>
              <div className="mt-1 font-mono text-white/70">
                type · name (place) · title (event) · category (place)
              </div>
            </div>
            <div>
              <span className="text-white/40 uppercase tracking-widest text-[10px]">Colonnes optionnelles</span>
              <div className="mt-1 font-mono">
                location · whatsapp · description · media · maps_url · instagram_url · tiktok_url · website_url · event_date · event_time · is_featured
              </div>
            </div>
            <div>
              <span className="text-white/40 uppercase tracking-widest text-[10px]">Valeurs de référence</span>
              <div className="mt-1 space-y-0.5">
                <div><span className="text-white/50">type :</span> <span className="font-mono text-green-400/80">place</span> ou <span className="font-mono text-blue-400/80">event</span></div>
                <div><span className="text-white/50">category :</span> <span className="font-mono">Bar/Resto · Loisirs · Night Clubs · Hôtels</span></div>
                <div><span className="text-white/50">media :</span> URLs séparées par <span className="font-mono text-yellow-400/80">|</span> (max 4)</div>
                <div><span className="text-white/50">event_date :</span> format <span className="font-mono">YYYY-MM-DD</span></div>
                <div><span className="text-white/50">event_time :</span> format <span className="font-mono">HH:MM</span></div>
                <div><span className="text-white/50">is_featured :</span> <span className="font-mono">true</span> ou <span className="font-mono">false</span></div>
                <div><span className="text-white/50">description :</span> utilise <span className="font-mono">;</span> au lieu de <span className="font-mono">,</span></div>
              </div>
            </div>
          </div>

          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="text-white/70 text-sm cursor-pointer"
          />
        </div>

        {/* Prévisualisation + Import */}
        {rows.length > 0 && (
          <>
            {/* Résumé */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-semibold">
                {rows.length} ligne{rows.length > 1 ? "s" : ""} détectée{rows.length > 1 ? "s" : ""}
              </div>
              {importing && (
                <div className="text-sm text-white/60">
                  ⏳ {ok} / {rows.length} importées...
                </div>
              )}
              {done && (
                <div className="text-sm text-white/70">
                  ✅ {ok} importées &nbsp;|&nbsp; ❌ {errors} erreurs
                </div>
              )}
            </div>

            {/* Liste des lignes */}
            <div className="space-y-2 mb-6 max-h-96 overflow-y-auto pr-1">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="rounded-xl border px-4 py-3 text-sm flex items-start justify-between gap-3"
                  style={{
                    borderColor:
                      r._status === "ok"    ? "rgba(34,197,94,.3)"  :
                      r._status === "error" ? "rgba(239,68,68,.3)"  :
                                              "rgba(255,255,255,.1)",
                    background:
                      r._status === "ok"    ? "rgba(34,197,94,.05)" :
                      r._status === "error" ? "rgba(239,68,68,.05)" :
                                              "rgba(255,255,255,.03)",
                  }}
                >
                  <div className="min-w-0">
                    <span className="text-white font-medium">
                      {r.name?.trim() || r.title?.trim() || "—"}
                    </span>
                    <span className="text-white/40 ml-2 text-xs">
                      {(r.type || "").toLowerCase() === "place" ? "📍 place" : "🎉 event"}
                    </span>
                    {r.category && (
                      <span className="text-white/40 ml-2 text-xs">{r.category}</span>
                    )}
                    {r.location && (
                      <span className="text-white/40 ml-2 text-xs">{r.location}</span>
                    )}
                  </div>
                  <div className="text-xs shrink-0">
                    {r._status === "pending" && <span className="text-white/30">En attente</span>}
                    {r._status === "ok"      && <span className="text-green-400">✅ Importé</span>}
                    {r._status === "error"   && <span className="text-red-400">❌ {r._error}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Bouton Import */}
            {!done && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full bg-white text-black font-semibold py-3.5 rounded-2xl disabled:opacity-50 transition"
              >
                {importing
                  ? `⏳ Import en cours... (${ok}/${rows.length})`
                  : `🚀 Importer ${rows.length} ligne${rows.length > 1 ? "s" : ""}`}
              </button>
            )}

            {/* Après import */}
            {done && (
              <div className="space-y-3">
                {ok > 0 && (
                  <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-center text-green-400 text-sm">
                    ✅ {ok} fiche{ok > 1 ? "s" : ""} importée{ok > 1 ? "s" : ""} avec succès
                  </div>
                )}
                {errors > 0 && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-center text-red-400 text-sm">
                    ❌ {errors} erreur{errors > 1 ? "s" : ""} — vérifie les lignes en rouge ci-dessus
                  </div>
                )}
                <button
                  onClick={() => { setRows([]); setDone(false); }}
                  className="w-full border border-white/20 text-white py-3 rounded-2xl hover:bg-white/10 transition"
                >
                  Importer un autre fichier
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}