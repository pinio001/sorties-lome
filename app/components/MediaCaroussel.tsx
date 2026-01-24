"use client";

import { useEffect, useState } from "react";

type Props = {
  media: string[];
  height?: string;
};

export default function MediaCarousel({
  media,
  height = "h-48",
}: Props) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (media.length <= 1) return;

    const timer = setInterval(() => {
      setFade(false);

      setTimeout(() => {
        setIndex((i) => (i + 1) % media.length);
        setFade(true);
      }, 1500); // durée réelle du fade
    }, 1500); // ⏱️ vitesse carousel 

    return () => clearInterval(timer);
  }, [media.length]);

  if (!media || media.length === 0) {
    return (
      <div className={`w-full ${height} flex items-center justify-center bg-white/5`}>
        <span className="text-white/40 text-sm">Aucun média</span>
      </div>
    );
  }

  const current = media[index];
  const isVideo = /\.(mp4|webm|ogg)$/i.test(current);

  return (
    <div className={`relative w-full ${height} overflow-hidden rounded-xl`}>
      {isVideo ? (
        <video
          src={current}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <img
          src={current}
          alt=""
          className={`
            w-full h-full object-cover
            transition-opacity
            duration-100
            ${fade ? "opacity-100" : "opacity-100"}
          `}
        />
      )}

      {/* dots */}
      {media.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {media.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${
                i === index ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
