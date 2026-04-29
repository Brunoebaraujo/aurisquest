import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    // Cliente do usuário para identificar quem chamou
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Família do usuário
    const { data: profile } = await admin
      .from("profiles")
      .select("family_id")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!profile?.family_id) {
      return new Response(JSON.stringify({ error: "Família não encontrada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);

    // Busca submissões antigas com foto, da família do usuário
    const { data: subs, error: subsErr } = await admin
      .from("submissions")
      .select("id, photo_url")
      .eq("family_id", profile.family_id)
      .lt("completed_at", cutoff.toISOString())
      .not("photo_url", "is", null);

    if (subsErr) throw subsErr;

    let deleted = 0;
    const paths: string[] = [];
    const ids: string[] = [];

    for (const s of subs ?? []) {
      if (!s.photo_url) continue;
      // photo_url é um getPublicUrl, extraímos o caminho após /proofs/
      const marker = "/proofs/";
      const idx = s.photo_url.indexOf(marker);
      if (idx === -1) continue;
      const path = decodeURIComponent(s.photo_url.substring(idx + marker.length));
      paths.push(path);
      ids.push(s.id);
    }

    if (paths.length > 0) {
      // Apaga em lotes de 100
      for (let i = 0; i < paths.length; i += 100) {
        const chunk = paths.slice(i, i + 100);
        const { error: rmErr } = await admin.storage.from("proofs").remove(chunk);
        if (rmErr) console.error("Erro ao apagar storage:", rmErr);
      }

      // Limpa photo_url no banco
      const { error: updErr } = await admin
        .from("submissions")
        .update({ photo_url: null })
        .in("id", ids);

      if (updErr) throw updErr;
      deleted = ids.length;
    }

    return new Response(JSON.stringify({ success: true, deleted, cutoff: cutoff.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
