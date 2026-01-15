import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const code = body?.code;

  const secret = process.env.ADMIN_CODE;

  if (!secret) {
    return NextResponse.json(
      { error: "ADMIN_CODE manquant côté serveur" },
      { status: 500 }
    );
  }

  if (typeof code !== "string" || code !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // Cookie httpOnly: inaccessible via JS (plus sûr)
  res.cookies.set("admin_auth", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  });

  return res;
}
