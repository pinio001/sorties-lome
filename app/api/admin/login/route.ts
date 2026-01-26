import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const code = String(body?.code ?? "").trim();

  const expected = process.env.ADMIN_CODE || "";

  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_CODE manquant côté serveur" },
      { status: 500 }
    );
  }

  if (code !== expected) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // Cookie admin (7 jours)
  res.cookies.set("admin_auth", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
