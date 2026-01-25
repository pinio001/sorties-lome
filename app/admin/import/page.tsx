"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";

type Row = {
  name?: string;
  category?: string;
  location?: string;
  image?: string;
  media_urls?: string;
  whatsapp?: string;
  description?: string;
  is_featured?: any;
  featured_rank?: any;
};

function pick(obj: any, key: string) {
  const v = obj?.[key];
  if (v === undefined || v === null) return "";
  return String(v);
}

function safeJson(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: "Réponse non JSON", raw: text };
  }
}

export default function ImportExcelPage() {
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const preview = useMemo(() => rows.slice(0, 8), [rows]);

  const onFile = async (f: File) => {
    setResult(null);
    setRows([]);
    setFileName(f.name);

    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    const all: Row[] = [];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;

      const raw = XLSX.utils.sheet_to_json<any>(ws, {
        defval: "",
        raw: false,
      });

      for (const r of raw) {
        const row: Row = {
          name: pick(r, "name"),
          category: pick(r, "category") || sheetName,
          location: pick(r, "location"),
          image: pick(r, "image"),
          media_urls: pick(r, "media_urls"),
          whatsapp: pick(r, "whatsapp"),
          description: pick(r, "description"),
          is_featured: r["is_featured"],
          featured_rank: r["featured_rank"],
        };

        if (!row.name || row.name.trim().length === 0) continue;
        all.push(row);
      }
    }

    setRows(all);
  };

  const doImport = async () => {
    if (!rows.length) {
      alert("Aucune ligne à importer");
      return;
    }

    setLoading(true);
    setResult(null);

    const res = await fetch("/api/admin/import/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ rows }),
    });

    const text = await res.text();
    const data = safeJson(text);

    setResult({ ok: res.ok, data });
    setLoading(false);

    if (!res.ok) {
      alert("Erreur : " + (data?.detail || data?.error || "Import impossible"));
    } else {
      alert(
        `✅ Import terminé\nAjoutés: ${data.inserted}\nIgnorés: ${data.skipped}\nErreurs lignes: ${data.errors?.length ?? 0}`
      );
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-4 space-y-4">
        <header className="flex items-center justify-between">
          <a
            href="/admin"
            className="text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition"
          >
            ← Admin
          </a>
          <div className="text-sm text-white/60">Import Excel</div>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="font-semibold">Importer Places depuis Excel</div>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
            className="block w-full text-sm"
          />

          {fileName ? (
            <div className="text-xs text-white/60">Fichier: {fileName}</div>
          ) : (
            <div className="text-xs text-white/60">
              Le champ <b>media_urls</b> doit contenir des URLs séparées par <b>|</b>.
            </div>
          )}

          <button
            onClick={doImport}
            disabled={loading || rows.length === 0}
            className="w-full bg-white text-black rounded-xl py-3 font-semibold disabled:opacity-60"
          >
            {loading ? "Import en cours…" : `Importer (${rows.length})`}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="font-semibold mb-2">Aperçu (8 premières lignes)</div>

          {rows.length === 0 ? (
            <div className="text-sm text-white/60">Aucune donnée chargée.</div>
          ) : (
            <div className="space-y-2">
              {preview.map((r, i) => (
                <div
                  key={i}
                  className="text-xs border border-white/10 rounded-xl p-3 bg-black/20"
                >
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-white/70">{r.category}</div>
                  <div className="text-white/60">{r.location}</div>
                  <div className="text-white/50 break-all mt-1">
                    media_urls: {r.media_urls || "(vide)"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {result && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="font-semibold mb-2">Résultat</div>
            <pre className="text-xs text-white/70 whitespace-pre-wrap break-words">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
