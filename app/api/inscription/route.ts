// app/api/inscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { pseudo, email, phone, newsletter } = await req.json();

    if (!pseudo?.trim())                    return NextResponse.json({ error: "Pseudo requis" }, { status: 400 });
    if (!email?.trim() && !phone?.trim())   return NextResponse.json({ error: "Email ou téléphone requis" }, { status: 400 });

    // Vérifier si l'email/phone existe déjà
    if (email) {
      const { data: existing } = await supabaseAdmin
        .from("bingo_users").select("id, pseudo").eq("email", email.trim()).maybeSingle();
      if (existing) return NextResponse.json({ error: "Cet email est déjà utilisé", user_id: existing.id, pseudo: existing.pseudo });
    }
    if (phone) {
      const { data: existing } = await supabaseAdmin
        .from("bingo_users").select("id, pseudo").eq("phone", phone.trim()).maybeSingle();
      if (existing) return NextResponse.json({ error: "Ce numéro est déjà utilisé", user_id: existing.id, pseudo: existing.pseudo });
    }

    // Créer l'utilisateur
    const { data, error } = await supabaseAdmin
      .from("bingo_users")
      .insert({ pseudo: pseudo.trim(), email: email?.trim() || null, phone: phone?.trim() || null, newsletter: newsletter ?? false })
      .select("id, pseudo")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, user_id: data.id, pseudo: data.pseudo });
  } catch (err: any) {
    console.error("[inscription]", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  }
}