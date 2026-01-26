"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert("Erreur : " + (data?.error || "Impossible"));
        return;
      }

      router.push("/admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-semibold">Connexion Admin</div>
        <p className="text-sm text-white/60 mt-1">
          Entre le code d’accès.
        </p>

        <input
          className="w-full mt-4 bg-black/40 border border-white/10 rounded-xl p-3"
          placeholder="Code admin"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full mt-3 bg-white text-black rounded-xl py-3 font-semibold disabled:opacity-60"
        >
          {loading ? "..." : "Se connecter"}
        </button>
      </div>
    </main>
  );
}
