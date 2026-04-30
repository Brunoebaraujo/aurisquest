import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the requesting user
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: uerr } = await userClient.auth.getUser();
    if (uerr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json();
    const childId = String(body.child_id ?? "");
    if (!childId) return json({ error: "invalid_input" }, 400);

    const admin = createClient(url, service);

    // Get parent's family_id
    const { data: profile } = await admin
      .from("profiles").select("family_id").eq("id", userId).maybeSingle();
    if (!profile?.family_id) return json({ error: "no_family" }, 403);

    // Verify the child belongs to the parent's family
    const { data: child } = await admin
      .from("children")
      .select("id, name, family_id, active")
      .eq("id", childId)
      .maybeSingle();
    if (!child || child.family_id !== profile.family_id) {
      return json({ error: "forbidden" }, 403);
    }

    // Generate token (short-lived: 1 hour)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const enc = new TextEncoder().encode(token);
    const hashBuf = await crypto.subtle.digest("SHA-256", enc);
    const tokenHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { error: insErr } = await admin.from("child_sessions").insert({
      child_id: child.id,
      family_id: child.family_id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
    if (insErr) return json({ error: insErr.message }, 500);

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
