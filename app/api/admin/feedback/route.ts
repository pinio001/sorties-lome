// app/api/admin/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

async function requireAdmin() {
  const store = await cookies();
  return store.get("admin_auth")?.value === "1";
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export async function GET(req: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const source = (url.searchParams.get("source") || "").trim();
    const limit = clamp(Number(url.searchParams.get("limit") || "50"), 1, 200);

    const { data, error } = await supabaseAdmin
      .from("feedback")
      .select("id,created_at,source,page_path,name,phone,message,rating")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (error) {
      return NextResponse.json({ error: "Erreur serveur", detail: error.message }, { status: 500 });
    }

    let rows = (data ?? []) as any[];

    if (source) {
      rows = rows.filter((r) => String(r.source ?? "").toLowerCase() === source.toLowerCase());
    }

    if (q) {
      const s = q.toLowerCase();
      rows = rows.filter((r) => {
        const name = String(r.name ?? "").toLowerCase();
        const msg = String(r.message ?? "").toLowerCase();
        const path = String(r.page_path ?? "").toLowerCase();
        const phone = String(r.phone ?? "").toLowerCase();
        return name.includes(s) || msg.includes(s) || path.includes(s) || phone.includes(s);
      });
    }

    rows = rows.slice(0, limit);

    return NextResponse.json({ ok: true, items: rows });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Erreur serveur", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = (url.searchParams.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    const { error } = await supabaseAdmin.from("feedback").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: "Erreur serveur", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Erreur serveur", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}