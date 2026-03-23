"use client";
// components/MultiImageUploader.tsx
// Upload jusqu'à 4 images vers Bunny.net
// Usage : <MultiImageUploader folder="places" values={images} onChange={setImages} />

import { useRef, useState } from "react";

interface Props {
  folder: string;
  values: string[];           // tableau d'URLs (max 4)
  onChange: (urls: string[]) => void;
  max?: number;
}

const MAX = 4;
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export default function MultiImageUploader({ folder, values, onChange, max = MAX }: Props) {
  const [uploading, setUploading] = useState<number | null>(null); // index en cours
  const [errors, setErrors]       = useState<Record<number, string>>({});
  const inputRef                  = useRef<HTMLInputElement>(null);
  const targetSlot                = useRef<number>(0);

  const uploadFile = async (file: File, slot: number) => {
    setErrors((e) => ({ ...e, [slot]: "" }));
    setUploading(slot);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);

      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setErrors((e) => ({ ...e, [slot]: data.error ?? "Erreur upload" }));
        return;
      }

      const updated = [...values];
      updated[slot] = data.url;
      onChange(updated);
    } catch (err: any) {
      setErrors((e) => ({ ...e, [slot]: err?.message ?? "Erreur réseau" }));
    } finally {
      setUploading(null);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, targetSlot.current);
    e.target.value = "";
  };

  const openPicker = (slot: number) => {
    targetSlot.current = slot;
    inputRef.current?.click();
  };

  const removeImage = (slot: number) => {
    const updated = [...values];
    updated.splice(slot, 1);
    onChange(updated);
    setErrors((e) => { const n = { ...e }; delete n[slot]; return n; });
  };

  // Toujours afficher max slots, les vides sont des zones de drop
  const slots = Array.from({ length: max }, (_, i) => values[i] ?? null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 uppercase tracking-widest">
          Images ({values.length}/{max})
        </span>
        {values.length === 0 && (
          <span className="text-xs text-red-400/80">Au moins 1 image requise</span>
        )}
      </div>

      {/* Grille 2×2 */}
      <div className="grid grid-cols-2 gap-2">
        {slots.map((url, i) => {
          const isLoading = uploading === i;
          const err       = errors[i];
          const isEmpty   = !url;
          const isFirst   = i === 0;

          return (
            <div key={i}
              className="relative rounded-xl overflow-hidden cursor-pointer"
              style={{
                height: 120,
                border: err
                  ? "1px solid rgba(239,68,68,.4)"
                  : isEmpty
                    ? "1px dashed rgba(255,255,255,.15)"
                    : "1px solid rgba(255,255,255,.1)",
                background: isEmpty ? "rgba(255,255,255,.02)" : "transparent",
              }}
              onClick={() => !isLoading && openPicker(i)}
            >
              {url ? (
                <>
                  <img src={url} alt={`image ${i + 1}`} className="w-full h-full object-cover" />

                  {/* Badge position */}
                  <div className="absolute top-2 left-2 text-xs px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: isFirst ? "#fff" : "rgba(0,0,0,.6)", color: isFirst ? "#000" : "rgba(255,255,255,.7)", fontSize: 10 }}>
                    {isFirst ? "Principale" : `#${i + 1}`}
                  </div>

                  {/* Overlay actions */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,0,0,.5)" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); openPicker(i); }}
                      className="text-xs text-white bg-black/60 px-2.5 py-1.5 rounded-lg border border-white/20">
                      🔄 Changer
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      className="text-xs text-white bg-red-500/30 px-2.5 py-1.5 rounded-lg border border-red-500/30">
                      🗑️
                    </button>
                  </div>

                  {/* Badge CDN */}
                  <div className="absolute bottom-2 right-2 text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(0,0,0,.7)", color: "rgba(74,222,128,.8)", fontSize: 9 }}>
                    ✓ CDN
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <span className="text-xs text-white/40">Upload…</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">{isFirst ? "📸" : "+"}</span>
                      <span className="text-xs text-white/30">
                        {isFirst ? "Image principale" : `Photo ${i + 1}`}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Erreur */}
              {err && (
                <div className="absolute bottom-0 inset-x-0 text-xs text-red-300 text-center p-1"
                  style={{ background: "rgba(239,68,68,.2)" }}>
                  ⚠️ {err}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-white/25">
        JPG, PNG, WebP · max 5MB par image · La 1ère photo sera l'image principale
      </div>

      {/* Input file caché partagé */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}