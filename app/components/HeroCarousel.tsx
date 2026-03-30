"use client";
// components/HeroCarousel.tsx
// Carousel aléatoire en haut des pages Places et Events
// Défilement automatique + cliquable

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface CarouselItem {
  id: string;
  image: string;
  name: string;        // nom du spot ou titre event
  location?: string | null;
  type: "place" | "event";
}

interface Props {
  items: CarouselItem[];
}

export default function HeroCarousel({ items }: Props) {
  const router              = useRouter();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused]   = useState(false);
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null);

  const shuffled = [...items].sort(() => Math.random() - 0.5).slice(0, 8);

  const next = () => setCurrent(c => (c + 1) % shuffled.length);
  const prev = () => setCurrent(c => (c - 1 + shuffled.length) % shuffled.length);

  useEffect(() => {
    if (shuffled.length === 0) return;
    if (paused) return;
    timerRef.current = setInterval(next, 3500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, shuffled.length, current]);

  if (shuffled.length === 0) return null;

  const item = shuffled[current];

  return (
    <div className="relative mb-8 overflow-hidden rounded-xl"
      style={{ height: "min(280px, 75vw)", boxShadow:"0 20px 60px rgba(0,0,0,.6)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>

      {/* Images avec transition */}
      {shuffled.map((it, i) => (
        <div key={it.id + i}
          className="absolute inset-0 transition-opacity duration-700 cursor-pointer"
          style={{ opacity: i === current ? 1 : 0 }}
          onClick={() => router.push(`/${it.type === "place" ? "place" : "event"}/${it.id}`)}>
          <img src={it.image} alt={it.name}
            className="w-full h-full object-cover" />
          <div className="absolute inset-0"
            style={{ background:"linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,.2) 50%, transparent 100%)" }} />
        </div>
      ))}

      {/* Contenu texte */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
        <div style={{ fontSize:10, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:3 }}>
          {item.type === "place" ? "📍 Spot" : "🎉 Event"}
        </div>
        <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:18, color:"#fff", lineHeight:1.2 }}
          className="line-clamp-1">
          {item.name}
        </div>
        {item.location && (
          <div style={{ fontSize:12, color:"rgba(255,255,255,.55)", marginTop:2 }}>
            {item.location}
          </div>
        )}
      </div>

      {/* Flèches */}
      <button onClick={e => { e.stopPropagation(); prev(); }}
        className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center transition hover:bg-black/50"
        style={{ width:32, height:32, borderRadius:"50%", background:"rgba(0,0,0,.35)", border:"1px solid rgba(255,255,255,.15)", color:"#fff", fontSize:14 }}>
        ‹
      </button>
      <button onClick={e => { e.stopPropagation(); next(); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center transition hover:bg-black/50"
        style={{ width:32, height:32, borderRadius:"50%", background:"rgba(0,0,0,.35)", border:"1px solid rgba(255,255,255,.15)", color:"#fff", fontSize:14 }}>
        ›
      </button>

      {/* Indicateurs */}
      <div className="absolute bottom-3 right-4 flex items-center gap-1">
        {shuffled.map((_, i) => (
          <button key={i} onClick={e => { e.stopPropagation(); setCurrent(i); }}
            style={{ width: i === current ? 16 : 6, height:6, borderRadius:3,
              background: i === current ? "#fff" : "rgba(255,255,255,.35)",
              transition:"all .3s", border:"none", cursor:"pointer", padding:0 }} />
        ))}
      </div>
    </div>
  );
}