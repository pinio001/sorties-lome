"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    setLoading(false);

    if (!res.ok) {
      setMsg("Code incorrect.");
      return;
    }

    // redirection vers /admin
    window.location.href = "/admin";
  };

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Accès Admin</h1>

      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full border rounded-lg p-2"
          placeholder="Code secret"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          type="password"
          autoFocus
          required
        />

        <button
          className="w-full bg-black text-white py-2 rounded-lg disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Vérification..." : "Entrer"}
        </button>

        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </form>
    </main>
  );
}
