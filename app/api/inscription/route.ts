// app/api/inscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { Resend } from "resend";

const resend   = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.SITE_URL ?? "https://bingo228.com";
const FROM     = "Bingo228 <noreply@bingo228.com>";

// ─── Email de bienvenue ───────────────────────────────────────────────────────
async function sendWelcomeEmail(email: string, pseudo: string) {
  await resend.emails.send({
    from: FROM,
    to:   email,
    subject: "🎉 Bienvenue sur Bingo228 !",
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#060a12;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-block;background:#fff;width:48px;height:48px;border-radius:14px;line-height:48px;font-size:22px;font-weight:900;color:#000;">B</div>
  </div>
  <h1 style="font-size:26px;color:#fff;margin-bottom:8px;">Bienvenue ${pseudo} ! 👋</h1>
  <p style="color:rgba(255,255,255,.55);font-size:15px;line-height:1.7;margin-bottom:28px;">
    Tu fais maintenant partie de la communauté <strong style="color:#fff">Bingo228</strong> — le guide des sorties à Lomé.
  </p>
  <p style="color:rgba(255,255,255,.55);font-size:14px;line-height:1.7;margin-bottom:28px;">
    Chaque semaine tu recevras :<br>
    🎉 Les meilleurs events de la semaine<br>
    ✨ Un spot coup de cœur à découvrir<br>
    🔔 Une alerte dès qu'un nouvel event est ajouté
  </p>
  <div style="text-align:center;margin-bottom:32px;">
    <a href="${SITE_URL}/places"
      style="display:inline-block;background:#fff;color:#000;font-size:14px;font-weight:700;padding:14px 32px;border-radius:14px;text-decoration:none;">
      Explorer les spots →
    </a>
  </div>
  <div style="border-top:1px solid rgba(255,255,255,.08);padding-top:20px;text-align:center;">
    <p style="color:rgba(255,255,255,.25);font-size:11px;">© 2025 Bingo228 · Lomé, Togo</p>
  </div>
</div>
</body></html>`,
  });
}

// ─── Message WhatsApp de bienvenue ────────────────────────────────────────────
function buildWelcomeWaLink(phone: string, pseudo: string): string {
  const msg = encodeURIComponent(
    `Bonjour ${pseudo} 👋\n\nBienvenue sur *Bingo228* — le guide des sorties à Lomé ! 🎉\n\nChaque semaine tu recevras :\n🎉 Les meilleurs events\n✨ Un spot coup de cœur\n🔔 Les nouveaux events dès leur ajout\n\n👉 ${SITE_URL}/places`
  );
  const number = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return `https://wa.me/${number}?text=${msg}`;
}

export async function POST(req: NextRequest) {
  try {
    const { pseudo, email, phone, newsletter } = await req.json();

    if (!pseudo?.trim())
      return NextResponse.json({ error: "Pseudo requis" }, { status: 400 });
    if (!email?.trim() && !phone?.trim())
      return NextResponse.json({ error: "Email ou téléphone requis" }, { status: 400 });

    // Vérifier doublons
    if (email) {
      const { data: ex } = await supabaseAdmin
        .from("bingo_users").select("id,pseudo").eq("email", email.trim()).maybeSingle();
      if (ex) return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }
    if (phone) {
      const { data: ex } = await supabaseAdmin
        .from("bingo_users").select("id,pseudo").eq("phone", phone.trim()).maybeSingle();
      if (ex) return NextResponse.json({ error: "Ce numéro est déjà utilisé" }, { status: 409 });
    }

    // Créer l'utilisateur
    const { data, error } = await supabaseAdmin
      .from("bingo_users")
      .insert({
        pseudo:     pseudo.trim(),
        email:      email?.trim()  || null,
        phone:      phone?.trim()  || null,
        newsletter: newsletter ?? false,
      })
      .select("id, pseudo")
      .single();

    if (error) throw new Error(error.message);

    // Envoyer la confirmation
    let wa_link: string | null = null;

    if (email?.trim()) {
      await sendWelcomeEmail(email.trim(), pseudo.trim()).catch(e =>
        console.error("[inscription] email error:", e)
      );
    }

    if (phone?.trim()) {
      wa_link = buildWelcomeWaLink(phone.trim(), pseudo.trim());
    }

    return NextResponse.json({ ok: true, user_id: data.id, pseudo: data.pseudo, wa_link });
  } catch (err: any) {
    console.error("[inscription]", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  }
}