import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SLOT_MAP: Record<string, { col: string; cat: string | null }> = {
  avatar:   { col: "avatar_id",        cat: null },
  elmo:     { col: "helmet_item_id",   cat: "elmo" },
  armadura: { col: "armor_item_id",    cat: "armadura" },
  arma:     { col: "weapon_item_id",   cat: "arma" },
  pet:      { col: "pet_item_id",      cat: "pet" },
  aura:     { col: "aura_item_id",     cat: "aura" },
  moldura:  { col: "frame_item_id",    cat: "moldura" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authz = req.headers.get("Authorization") ?? "";
    const jwt = authz.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthorized" }, 401);

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ures, error: uerr } = await supa.auth.getUser(jwt);
    if (uerr || !ures?.user) return json({ error: "unauthorized" }, 401);
    const uid = ures.user.id;

    const { child_id, slot, item_id } = await req.json();
    if (!child_id || !slot || !(slot in SLOT_MAP)) return json({ error: "bad_request" }, 400);

    // family check
    const [{ data: prof }, { data: child }] = await Promise.all([
      supa.from("profiles").select("family_id").eq("id", uid).maybeSingle(),
      supa.from("children").select("family_id").eq("id", child_id).maybeSingle(),
    ]);
    if (!prof?.family_id || !child?.family_id || prof.family_id !== child.family_id) {
      return json({ error: "forbidden" }, 403);
    }

    const info = SLOT_MAP[slot];

    if (item_id) {
      if (slot === "avatar") {
        const { data: av } = await supa.from("avatars").select("id, rarity, category, active").eq("id", item_id).maybeSingle();
        if (!av || !av.active) return json({ error: "not_found" }, 404);
        if (av.rarity !== "comum" || av.category !== "humano") return json({ error: "not_allowed" }, 403);
        // grant unlock if missing
        await supa.from("child_unlocked_avatars")
          .upsert({ child_id, avatar_id: item_id, source: "parent_grant" }, { onConflict: "child_id,avatar_id" });
      } else {
        const { data: it } = await supa.from("cosmetic_items").select("id, rarity, category, active").eq("id", item_id).maybeSingle();
        if (!it || !it.active) return json({ error: "not_found" }, 404);
        if (it.category !== info.cat) return json({ error: "wrong_category" }, 400);
        if (it.rarity !== "comum") return json({ error: "not_allowed" }, 403);
        const { data: own } = await supa.from("child_unlocked_items")
          .select("id").eq("child_id", child_id).eq("item_id", item_id).maybeSingle();
        if (!own) return json({ error: "not_unlocked" }, 403);
      }
    }

    const patch: Record<string, unknown> = { [info.col]: item_id ?? null, updated_at: new Date().toISOString() };
    const { error: ue } = await supa.from("child_equipment").upsert({ child_id, ...patch }, { onConflict: "child_id" });
    if (ue) return json({ error: ue.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
