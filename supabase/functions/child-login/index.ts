import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const childId = String(body.child_id ?? "");
    const password = String(body.password ?? "");
    const familyToken = body.family_token ? String(body.family_token) : null;
    if (!childId || !password) return json({ error: "invalid_input" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Rate limiting: máximo 5 tentativas malsucedidas por criança em 10 minutos.
    const RATE_LIMIT_MAX_ATTEMPTS = 5;
    const RATE_LIMIT_WINDOW_MINUTES = 10;
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();

    const { count: recentFailures } = await admin
      .from("child_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("child_id", childId)
      .gte("created_at", windowStart);

    if ((recentFailures ?? 0) >= RATE_LIMIT_MAX_ATTEMPTS) {
      return json({ error: "too_many_attempts" }, 429);
    }

    const { data: child } = await admin
      .from("children")
      .select("id, name, family_id, password_hash, active")
      .eq("id", childId)
      .maybeSingle();

    if (!child || !child.active || !child.password_hash) {
      await admin.from("child_login_attempts").insert({ child_id: childId });
      return json({ error: "invalid_credentials" }, 401);
    }

    if (familyToken) {
      const { data: famId } = await admin.rpc("get_family_id_by_token", { _token: familyToken });
      if (!famId || famId !== child.family_id) {
        return json({ error: "invalid_family" }, 403);
      }
    }

    const ok = await bcrypt.compare(password, child.password_hash);
    if (!ok) {
      await admin.from("child_login_attempts").insert({ child_id: childId });
      return json({ error: "invalid_credentials" }, 401);
    }

    // Generate token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, "0")).join("");

    // Hash the token (sha256) for storage
    const enc = new TextEncoder().encode(token);
    const hashBuf = await crypto.subtle.digest("SHA-256", enc);
    const tokenHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    const { error: insErr } = await admin.from("child_sessions").insert({
      child_id: child.id,
      family_id: child.family_id,
      token_hash: tokenHash,
    });
    if (insErr) return json({ error: insErr.message }, 500);

    // Login bem-sucedido: zera o contador de tentativas dessa criança.
    await admin.from("child_login_attempts").delete().eq("child_id", child.id);

    return json({
      token,
      child: { id: child.id, name: child.name, family_id: child.family_id },
    });
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
