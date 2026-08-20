import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CharacterEquipmentScreen } from "@/components/character-screen/CharacterEquipmentScreen";
import type { CharacterNavigationTarget } from "@/components/character-screen/CharacterBottomNavigation";
import type { WardrobeSlot } from "@/avatar-system/renderer/equipment-resolver";
import { ChildInventoryDialog } from "@/components/cosmetics/ChildInventoryDialog";
import { WardrobeDialog } from "@/components/cosmetics/WardrobeDialog";
import { supabase } from "@/integrations/supabase/client";
import { buildEquipment, type DashboardCosmetics } from "@/lib/cosmetics";

type ChildSummary = { id: string; name: string; family_id: string };
type ChildDashboardResponse = {
  child: ChildSummary;
  equipment?: DashboardCosmetics["equipment"];
  unlocked_avatars?: DashboardCosmetics["unlocked_avatars"];
  unlocked_items?: DashboardCosmetics["unlocked_items"];
  avatars_catalog?: DashboardCosmetics["avatars_catalog"];
  items_catalog?: DashboardCosmetics["items_catalog"];
};

const EMPTY_COSMETICS: DashboardCosmetics = {
  equipment: null,
  unlocked_avatars: [],
  unlocked_items: [],
  avatars_catalog: [],
  items_catalog: [],
};

export default function ChildEquipment() {
  const navigate = useNavigate();
  const [child, setChild] = useState<ChildSummary | null>(null);
  const [cosmetics, setCosmetics] = useState<DashboardCosmetics>(EMPTY_COSMETICS);
  const [loading, setLoading] = useState(true);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [wardrobeTab, setWardrobeTab] = useState<WardrobeSlot>("avatar");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("jk_child_token") : null;

  const leaveChildSession = useCallback(() => {
    localStorage.removeItem("jk_child_token");
    localStorage.removeItem("jk_child");
    const sharedMode = localStorage.getItem("aq_shared_mode") === "1";
    navigate(sharedMode ? "/app/quem-entra" : "/entrar", { replace: true });
  }, [navigate]);

  const refresh = useCallback(async () => {
    const currentToken = localStorage.getItem("jk_child_token");
    if (!currentToken) {
      leaveChildSession();
      return;
    }

    const { data, error } = await supabase.rpc("get_child_dashboard", { _token: currentToken });
    if (error || !data) {
      leaveChildSession();
      return;
    }

    const dashboard = data as unknown as ChildDashboardResponse;
    setChild(dashboard.child);
    setCosmetics({
      equipment: dashboard.equipment ?? null,
      unlocked_avatars: dashboard.unlocked_avatars ?? [],
      unlocked_items: dashboard.unlocked_items ?? [],
      avatars_catalog: dashboard.avatars_catalog ?? [],
      items_catalog: dashboard.items_catalog ?? [],
    });
    setLoading(false);
  }, [leaveChildSession]);

  useEffect(() => {
    if (window.location.hash.startsWith("#t=")) {
      const previewToken = decodeURIComponent(window.location.hash.slice(3));
      if (previewToken) {
        localStorage.setItem("jk_child_token", previewToken);
        localStorage.setItem("jk_child_preview", "1");
        history.replaceState(null, "", window.location.pathname);
      }
    }
    void refresh();
  }, [refresh]);

  const equipment = useMemo(() => buildEquipment(cosmetics), [cosmetics]);

  const openWardrobe = (slot: WardrobeSlot) => {
    setWardrobeTab(slot);
    setWardrobeOpen(true);
  };

  const handleNavigation = (target: CharacterNavigationTarget) => {
    if (target === "inventory") {
      setInventoryOpen(true);
      return;
    }
    if (target === "equipment") return;
    const tab = target === "abilities" ? "atividades" : target === "map" ? "calendario" : "perfil";
    navigate(`/c/jornada?tab=${tab}`);
  };

  if (loading || !child) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#01070d] text-cyan-100">
        <div className="flex flex-col items-center gap-3" role="status">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300" />
          <span className="text-sm">Preparando o personagem...</span>
        </div>
      </main>
    );
  }

  return (
    <>
      <CharacterEquipmentScreen
        childName={child.name}
        equipment={equipment}
        onBack={() => navigate("/c/jornada?tab=perfil")}
        onHelp={() => toast.info("Toque no elmo ou nas peças do personagem para abrir o guarda-roupa. O elmo permanece somente no card dedicado.")}
        onSelectSlot={openWardrobe}
        onNavigate={handleNavigation}
      />
      <WardrobeDialog
        open={wardrobeOpen}
        onOpenChange={setWardrobeOpen}
        data={cosmetics}
        token={token}
        onChanged={refresh}
        defaultTab={wardrobeTab}
      />
      <ChildInventoryDialog open={inventoryOpen} onOpenChange={setInventoryOpen} data={cosmetics} />
    </>
  );
}
