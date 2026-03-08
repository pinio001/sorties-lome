"use client";
import { useState } from "react";
import BingoBackground from "../../components/BingoBackground";
import * as XLSX from "xlsx";

type ImportType = "place" | "event";

type Row = {
  name?: string;
  title?: string;
  category?: string;
  location?: string;
  whatsapp?: string;
  description?: string;
  media?: string;
  image?: string;
  maps_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  website_url?: string;
  event_date?: string;
  event_time?: string;
  is_featured?: string;
  _status?: "pending" | "ok" | "error";
  _error?: string;
};

// Nettoie les noms de colonnes : enlève " *" et "\n(auto)"
function cleanHeader(h: string): string {
  return h.replace(/\s*\*/g, "").replace(/\n\(auto\)/g, "").trim().toLowerCase();
}

// Convertit JJ/MM/AAAA ou JJ/MM/AA → YYYY-MM-DD
function convertDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // Déjà au bon format
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Format JJ/MM/AAAA
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const day  = m[1].padStart(2, "0");
    const mon  = m[2].padStart(2, "0");
    const year = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${year}-${mon}-${day}`;
  }
  // Excel serial date (number)
  if (/^\d+$/.test(s)) {
    const date = XLSX.SSF.parse_date_code(Number(s));
    if (date) {
      const y = date.y;
      const mo = String(date.m).padStart(2, "0");
      const d  = String(date.d).padStart(2, "0");
      return `${y}-${mo}-${d}`;
    }
  }
  return s || null;
}

function parseExcel(buffer: ArrayBuffer, type: ImportType): Row[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];

  // Cherche la ligne d'en-têtes (ligne 3 dans nos templates = index 2)
  // On cherche la première ligne qui contient "name" ou "title"
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  let headerRow = 0;
  for (let r = range.s.r; r <= Math.min(range.s.r + 5, range.e.r); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell?.v) {
        const val = cleanHeader(String(cell.v));
        if (val === "name" || val === "title") {
          headerRow = r;
          break;
        }
      }
    }
    if (headerRow === r && headerRow > 0) break;
  }

  // Extraire en-têtes
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
    headers.push(cell?.v ? cleanHeader(String(cell.v)) : "");
  }

  // Extraire lignes de données (saute la ligne exemple = headerRow+1)
  const rows: Row[] = [];
  for (let r = headerRow + 2; r <= range.e.r; r++) {
    const row: any = { _status: "pending" };
    let hasData = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const h = headers[c - range.s.c];
      if (!h) continue;
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      const val  = cell?.v !== undefined && cell?.v !== null ? String(cell.v).trim() : "";
      row[h] = val;
      if (val) hasData = true;
    }
    if (hasData) rows.push(row as Row);
  }

  return rows;
}

function buildPayload(r: Row, type: ImportType) {
  if (type === "place") {
    const mediaRaw = r.media || "";
    const mediaArr = mediaRaw.split("|").map((m) => m.trim()).filter(Boolean).slice(0, 4);
    return {
      name:          r.name?.trim() || null,
      category:      r.category?.trim() || null,
      location:      r.location?.trim() || null,
      whatsapp:      r.whatsapp?.trim() || null,
      description:   r.description?.trim() || null,
      image:         mediaArr[0] || null,
      media_urls:    mediaArr,
      maps_url:      r.maps_url?.trim() || null,
      instagram_url: r.instagram_url?.trim() || null,
      tiktok_url:    r.tiktok_url?.trim() || null,
      website_url:   r.website_url?.trim() || null,
      is_featured:   String(r.is_featured ?? "").toLowerCase() === "true",
      interest_count: 0,
    };
  } else {
    const imageUrl = (r.image || r.media || "").trim() || null;
    return {
      title:         r.title?.trim() || null,
      location:      r.location?.trim() || null,
      event_date:    convertDate(r.event_date),
      event_time:    r.event_time?.trim() || null,
      whatsapp:      r.whatsapp?.trim() || null,
      description:   r.description?.trim() || null,
      image:         imageUrl,
      media_urls:    imageUrl ? [imageUrl] : [],
      is_featured:   String(r.is_featured ?? "").toLowerCase() === "true",
      interest_count: 0,
    };
  }
}

export default function ImportPage() {
  const [importType, setImportType] = useState<ImportType>("place");
  const [rows, setRows]             = useState<Row[]>([]);
  const [importing, setImporting]   = useState(false);
  const [done, setDone]             = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer;
      try {
        const parsed = parseExcel(buffer, importType);
        setRows(parsed);
        setDone(false);
      } catch (err: any) {
        alert("Erreur lecture fichier : " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    const updated = [...rows];

    for (let i = 0; i < updated.length; i++) {
      const r = updated[i];

      // Validation
      if (importType === "place" && !r.name?.trim()) {
        updated[i] = { ...r, _status: "error", _error: "name manquant" };
        setRows([...updated]);
        continue;
      }
      if (importType === "event" && !r.title?.trim()) {
        updated[i] = { ...r, _status: "error", _error: "title manquant" };
        setRows([...updated]);
        continue;
      }

      try {
        const data = buildPayload(r, importType);
        const res = await fetch("/api/admin/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ type: importType, data }),
        });
        const json = await res.json().catch(() => ({}));
        updated[i] = {
          ...r,
          _status: res.ok ? "ok" : "error",
          _error:  res.ok ? undefined : (json.error || "Erreur serveur"),
        };
      } catch (e: any) {
        updated[i] = { ...r, _status: "error", _error: e.message };
      }
      setRows([...updated]);
    }

    setImporting(false);
    setDone(true);
  };

  const reset = () => { setRows([]); setDone(false); };

  const ok      = rows.filter((r) => r._status === "ok").length;
  const errors  = rows.filter((r) => r._status === "error").length;

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
              <div className="text-xs text-white/60">Admin • Import Excel</div>
            </div>
          </div>
          <a href="/admin"
            className="text-sm border border-white/20 px-3 py-2 rounded-xl text-white/70 hover:bg-white/10 transition">
            ← Admin
          </a>
        </div>

        {/* Type selector */}
        <div className="flex gap-3 mb-5">
          {(["place", "event"] as ImportType[]).map((t) => (
            <button key={t} onClick={() => { setImportType(t); reset(); }}
              className={`flex-1 py-3 rounded-2xl text-sm font-medium border transition ${
                importType === t
                  ? "bg-white text-black border-white"
                  : "border-white/20 text-white hover:bg-white/10"
              }`}>
              {t === "place" ? "📍 Importer des Places" : "🎉 Importer des Events"}
            </button>
          ))}
        </div>

        {/* Zone upload */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 mb-6 space-y-4">
          <div className="text-white font-semibold">
            📂 Fichier Excel — template_{importType === "place" ? "places" : "events"}.xlsx
          </div>

          {/* Info colonnes */}
          <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-xs text-white/60 space-y-2">
            {importType === "place" ? (
              <>
                <div><span className="text-white/40 uppercase tracking-widest text-[10px]">Obligatoires</span>
                  <div className="mt-1 font-mono text-white/70">name · category</div></div>
                <div><span className="text-white/40 uppercase tracking-widest text-[10px]">Optionnelles</span>
                  <div className="mt-1 font-mono">location · whatsapp · description · maps_url · instagram_url · tiktok_url · website_url · is_featured</div></div>
                <div><span className="text-white/40 uppercase tracking-widest text-[10px]">Auto (script Python)</span>
                  <div className="mt-1 font-mono text-green-400/80">media — URLs séparées par |, max 4</div></div>
              </>
            ) : (
              <>
                <div><span className="text-white/40 uppercase tracking-widest text-[10px]">Obligatoires</span>
                  <div className="mt-1 font-mono text-white/70">title</div></div>
                <div><span className="text-white/40 uppercase tracking-widest text-[10px]">Optionnelles</span>
                  <div className="mt-1 font-mono">event_date · event_time · location · whatsapp · description · is_featured</div></div>
                <div><span className="text-white/40 uppercase tracking-widest text-[10px]">Auto (script Python)</span>
                  <div className="mt-1 font-mono text-green-400/80">image — 1 seule URL</div></div>
                <div><span className="text-white/50">event_date :</span> <span className="font-mono">JJ/MM/AAAA</span> converti automatiquement</div>
              </>
            )}
            <div><span className="text-white/50">is_featured :</span> <span className="font-mono">TRUE</span> ou <span className="font-mono">FALSE</span></div>
            <div><span className="text-white/50">category :</span> <span className="font-mono">Bar/Resto · Loisirs · Night Clubs · Hôtels</span></div>
          </div>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            key={importType}
            className="text-white/70 text-sm cursor-pointer"
          />

          {rows.length > 0 && !importing && !done && (
            <div className="text-sm text-white/50">
              ✅ {rows.length} ligne{rows.length > 1 ? "s" : ""} détectée{rows.length > 1 ? "s" : ""} — prêt à importer
            </div>
          )}
        </div>

        {/* Prévisualisation */}
        {rows.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-semibold">
                {rows.length} ligne{rows.length > 1 ? "s" : ""}
              </div>
              {importing && (
                <div className="text-sm text-white/60">⏳ {ok} / {rows.length} importées...</div>
              )}
              {done && (
                <div className="text-sm text-white/70">
                  ✅ {ok} importées &nbsp;|&nbsp; ❌ {errors} erreurs
                </div>
              )}
            </div>

            <div className="space-y-2 mb-6 max-h-96 overflow-y-auto pr-1">
              {rows.map((r, i) => (
                <div key={i}
                  className="rounded-xl border px-4 py-3 text-sm flex items-start justify-between gap-3"
                  style={{
                    borderColor: r._status === "ok" ? "rgba(34,197,94,.3)" : r._status === "error" ? "rgba(239,68,68,.3)" : "rgba(255,255,255,.1)",
                    background:  r._status === "ok" ? "rgba(34,197,94,.05)" : r._status === "error" ? "rgba(239,68,68,.05)" : "rgba(255,255,255,.03)",
                  }}>
                  <div className="min-w-0">
                    <span className="text-white font-medium">
                      {r.name?.trim() || r.title?.trim() || "—"}
                    </span>
                    {r.category && <span className="text-white/40 ml-2 text-xs">{r.category}</span>}
                    {r.location && <span className="text-white/40 ml-2 text-xs">{r.location}</span>}
                    {(r.media || r.image) && (
                      <span className="text-green-400/60 ml-2 text-xs">🖼️ image</span>
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

            {!done && (
              <button onClick={handleImport} disabled={importing}
                className="w-full bg-white text-black font-semibold py-3.5 rounded-2xl disabled:opacity-50 transition">
                {importing
                  ? `⏳ Import en cours... (${ok}/${rows.length})`
                  : `🚀 Importer ${rows.length} ligne${rows.length > 1 ? "s" : ""}`}
              </button>
            )}

            {done && (
              <div className="space-y-3">
                {ok > 0 && (
                  <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-center text-green-400 text-sm">
                    ✅ {ok} fiche{ok > 1 ? "s" : ""} importée{ok > 1 ? "s" : ""} avec succès
                  </div>
                )}
                {errors > 0 && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-center text-red-400 text-sm">
                    ❌ {errors} erreur{errors > 1 ? "s" : ""} — vérifie les lignes en rouge
                  </div>
                )}
                <button onClick={reset}
                  className="w-full border border-white/20 text-white py-3 rounded-2xl hover:bg-white/10 transition">
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