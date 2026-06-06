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
    const rewardId = String(body.reward_id ?? "");
    if (!token || !rewardId) return json({ error: "invalid_input" }, 400);

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

    const { data: reward } = await admin
      .from("rewards")
      .select("id, family_id, name, category, auris_cost, active")
      .eq("id", rewardId)
      .maybeSingle();

    if (!reward || reward.family_id !== session.family_id || !reward.active) {
      return json({ error: "invalid_reward" }, 400);
    }

    // Compute balance to give early feedback
    const { data: dash } = await admin.rpc("get_child_dashboard", { _token: token });
    const d = dash as any;
    const approved = d?.totals?.approved_auris ?? 0;
    const paid = d?.paid_auris ?? 0;
    const pendingRed = d?.pending_redemption_auris ?? 0;
    const available = Math.max(approved - paid - pendingRed, 0);

    if (available < reward.auris_cost) {
      return json({ error: "insufficient_auris", available, cost: reward.auris_cost }, 400);
    }

    const { data: ins, error } = await admin.from("reward_redemptions").insert({
      family_id: session.family_id,
      child_id: session.child_id,
      reward_id: reward.id,
      reward_name_snapshot: reward.name,
      reward_category_snapshot: reward.category,
      auris_cost: reward.auris_cost,
      status: "pendente",
    }).select().single();

    if (error) return json({ error: error.message }, 500);

    await admin.from("child_sessions").update({ last_used_at: new Date().toISOString() }).eq("token_hash", tokenHash);

    return json({ ok: true, redemption: ins });
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
