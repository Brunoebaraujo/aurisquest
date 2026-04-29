import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const token = String(body.token ?? "");
    const activityId = String(body.activity_id ?? "");
    const photoUrl = body.photo_url ? String(body.photo_url) : null;
    const comment = body.comment ? String(body.comment).slice(0, 500) : null;
    if (!token || !activityId) return json({ error: "invalid_input" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Validate token
    const enc = new TextEncoder().encode(token);
    const hashBuf = await crypto.subtle.digest("SHA-256", enc);
    const tokenHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: session } = await admin
      .from("child_sessions")
      .select("child_id, family_id, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!session || new Date(session.expires_at) < new Date()) {
      return json({ error: "invalid_token" }, 401);
    }

    // Get activity to validate family + reward
    const { data: activity } = await admin
      .from("activities")
      .select("id, family_id, reward_amount_cents, active")
      .eq("id", activityId)
      .maybeSingle();

    if (!activity || activity.family_id !== session.family_id || !activity.active) {
      return json({ error: "invalid_activity" }, 400);
    }

    const { data: ins, error } = await admin.from("submissions").insert({
      family_id: session.family_id,
      child_id: session.child_id,
      activity_id: activity.id,
      photo_url: photoUrl,
      status: "pendente",
      reward_amount_cents: activity.reward_amount_cents,
      completed_at: new Date().toISOString(),
    }).select().single();

    if (error) return json({ error: error.message }, 500);

    // Touch last_used_at
    await admin.from("child_sessions").update({ last_used_at: new Date().toISOString() }).eq("token_hash", tokenHash);

    return json({ ok: true, submission: ins });
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
