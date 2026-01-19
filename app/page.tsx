"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-t from-black via-black to-blue-900 text-white flex items-center justify-center">
      <div className="max-w-sm w-full px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center text-3xl font-extrabold">
            B
          </div>
          <h1 className="text-2xl font-bold mt-4">Bingo</h1>
          <p className="text-white/70 text-sm mt-1">
            Sorties & lieux à Lomé
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-4">
          <Link
            href="/places"
            className="block text-center bg-white text-black py-4 rounded-2xl text-lg font-semibold"
          >
            📍 Places branchées
          </Link>

          <Link
            href="/events"
            className="block text-center bg-white text-black py-4 rounded-2xl text-lg font-semibold"
          >
            🎉 Voir les Events
          </Link>


        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/40 mt-10">
          Bingo © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
