"use client";
// components/ImageUploader.tsx
// Composant réutilisable — upload vers Bunny.net via /api/upload
// Usage :
//   <ImageUploader folder="places" value={imageUrl} onChange={setImageUrl} />
//   <ImageUploader folder="events" value={imageUrl} onChange={setImageUrl} />

import { useRef, useState } from "react";

interface Props {
  folder: string;          // dossier Bunny (ex: "places", "events")
  value: string;           // URL actuelle
  onChange: (url: string) => void;
  label?: string;          // label du champ URL (défaut: "URL photo/image")
}

export default function ImageUploader({ folder, value, onChange, label = "URL photo/image" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const [preview, setPreview]     = useState("");
  const inputRef                  = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);

    // Aperçu local immédiat
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);

      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? "Erreur upload");
        setPreview("");
        return;
      }

      onChange(data.url);
      setPreview(""); // on utilise l'URL CDN désormais
    } catch (e: any) {
      setError(e?.message ?? "Erreur réseau");
      setPreview("");
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ""; // reset pour permettre re-sélection du même fichier
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const displayUrl   = preview || value;
  const hasImage     = !!displayUrl;

  const inputClass = "w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 text-sm outline-none focus:border-white/30 transition";

  return (
    <div className="space-y-2">
      {/* Champ URL manuel */}
      <input
        className={inputClass}
        placeholder={`${label} (optionnel)`}
        value={value}
        onChange={(e) => { onChange(e.target.value); setPreview(""); }}
      />

      {/* Séparateur */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-white/30">ou</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Zone de drop / bouton upload */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !uploading && inputRef.current?.click()}
        className="relative cursor-pointer rounded-xl border border-dashed transition"
        style={{
          borderColor: uploading ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.15)",
          background: hasImage ? "transparent" : "rgba(255,255,255,.03)",
          minHeight: hasImage ? "auto" : 72,
        }}
      >
        {/* Aperçu image */}
        {hasImage ? (
          <div className="relative rounded-xl overflow-hidden" style={{ height: 140 }}>
            <img
              src={displayUrl}
              alt="aperçu"
              className="w-full h-full object-cover"
            />
            {/* Overlay avec bouton changer */}
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,.45)", opacity: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
            >
              <span className="text-white text-sm font-medium bg-black/60 px-3 py-1.5 rounded-xl">
                🔄 Changer
              </span>
            </div>
            {/* Badge CDN */}
            {value && !preview && (
              <div className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(0,0,0,.7)", color: "rgba(255,255,255,.6)", border: "1px solid rgba(255,255,255,.1)" }}>
                ✓ CDN
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 p-4">
            {uploading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <span className="text-sm text-white/50">Upload en cours…</span>
              </>
            ) : (
              <>
                <span className="text-2xl">📸</span>
                <div>
                  <div className="text-sm text-white/60">Charger une image</div>
                  <div className="text-xs text-white/30">JPG, PNG, WebP · max 5MB</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Input file caché */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {/* Erreur */}
      {error && (
        <div className="text-xs text-red-400 ml-1">⚠️ {error}</div>
      )}
    </div>
  );
}