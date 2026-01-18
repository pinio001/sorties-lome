import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

/* =========================
   ADMIN CHECK (Next 16)
========================= */
async function isAdmin() {
  const store = await cookies();
  return store.get("admin_auth")?.value === "1";
}

/* =========================
   GET : LISTE DES PLACES
========================= */
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("places")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ places: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

/* =========================
   POST : AJOUTER UNE PLACE
========================= */
export async function POST(req: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const { data, error } = await supabaseAdmin
      .from("places")
      .insert([
        {
          name: body.name,
          category: body.category,
          location: body.location,
          image: body.image,
          whatsapp: body.whatsapp,
          description: body.description,
          is_featured: body.is_featured,
          featured_rank: body.featured_rank,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, place: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
