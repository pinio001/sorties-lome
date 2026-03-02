import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

async function requireAdmin() {
  const store = await cookies();
  return store.get("admin_auth")?.value === "1";
}

// GET — liste les soumissions pending
export async function GET(req: NextRequest) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type") ?? "places";
  const table = type === "places" ? "pending_places" : "pending_events";

  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, items: data ?? [] });
}

// POST — approuver ou rejeter
export async function POST(req: NextRequest) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { id, type, action } = body ?? {};
  if (!id || !type || !action)
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

  const pendingTable = type === "places" ? "pending_places" : "pending_events";
  const targetTable  = type === "places" ? "places" : "events";

  if (action === "reject") {
    await supabaseAdmin.from(pendingTable).update({ status: "rejected" }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    // 1) Récupère la soumission
    const { data, error } = await supabaseAdmin
      .from(pendingTable).select("*").eq("id", id).single();

    if (error || !data)
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    // 2) Copie dans la vraie table (sans les champs meta)
    const { id: _id, created_at: _ca, status: _s,
            submitter_name: _sn, submitter_phone: _sp, ...clean } = data;

    const { error: insErr } = await supabaseAdmin
      .from(targetTable).insert({ ...clean, interest_count: 0, is_featured: false });

    if (insErr)
      return NextResponse.json({ error: insErr.message }, { status: 500 });

    // 3) Marque comme approuvé
    await supabaseAdmin.from(pendingTable).update({ status: "approved" }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}

