import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const childId = String(body.child_id ?? "");
    const password = String(body.password ?? "");
    if (!childId || password.length < 4 || password.length > 72) {
      return json({ error: "invalid_input" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    // Verify child belongs to caller's family via profile
    const { data: profile } = await admin.from("profiles").select("family_id").eq("id", userData.user.id).maybeSingle();
    if (!profile?.family_id) return json({ error: "no_family" }, 403);

    const { data: child } = await admin.from("children").select("id, family_id").eq("id", childId).maybeSingle();
    if (!child || child.family_id !== profile.family_id) return json({ error: "not_found" }, 404);

    const hash = await bcrypt.hash(password, 10);
    const { error: upErr } = await admin
      .from("children")
      .update({ password_hash: hash, password_set_at: new Date().toISOString() })
      .eq("id", childId);
    if (upErr) return json({ error: upErr.message }, 500);

    // Invalidate existing sessions
    await admin.from("child_sessions").delete().eq("child_id", childId);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
