import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SLOT_MAP: Record<string, { col: string; cat: string | null }> = {
  avatar: { col: "avatar_id", cat: null }, // special: validated against unlocked_avatars
  elmo: { col: "helmet_item_id", cat: "elmo" },
  armadura: { col: "armor_item_id", cat: "armadura" },
  arma: { col: "weapon_item_id", cat: "arma" },
  pet: { col: "pet_item_id", cat: "pet" },
  aura: { col: "aura_item_id", cat: "aura" },
  moldura: { col: "frame_item_id", cat: "moldura" },
  badge: { col: "favorite_badge_id", cat: "badge" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token, slot, item_id } = await req.json();
    if (!token || !slot || !(slot in SLOT_MAP)) {
      return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: vt, error: ve } = await supa.rpc("validate_child_token", { _token: token });
    if (ve || !vt || !vt[0]?.child_id) {
      return new Response(JSON.stringify({ error: "invalid_token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const child_id = vt[0].child_id as string;
    const info = SLOT_MAP[slot];

    // Validate ownership/unlock if item_id provided
    if (item_id) {
      if (slot === "avatar") {
        const { data, error } = await supa.from("child_unlocked_avatars")
          .select("id").eq("child_id", child_id).eq("avatar_id", item_id).maybeSingle();
        if (error || !data) {
          return new Response(JSON.stringify({ error: "not_unlocked" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } else {
        const { data: it } = await supa.from("cosmetic_items").select("category").eq("id", item_id).maybeSingle();
        if (!it || it.category !== info.cat) {
          return new Response(JSON.stringify({ error: "wrong_category" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { data: own } = await supa.from("child_unlocked_items")
          .select("id").eq("child_id", child_id).eq("item_id", item_id).maybeSingle();
        if (!own) {
          return new Response(JSON.stringify({ error: "not_unlocked" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    // Upsert equipment row
    const patch: Record<string, unknown> = { [info.col]: item_id ?? null, updated_at: new Date().toISOString() };
    const { error: ue } = await supa.from("child_equipment").upsert({ child_id, ...patch }, { onConflict: "child_id" });
    if (ue) {
      return new Response(JSON.stringify({ error: ue.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
