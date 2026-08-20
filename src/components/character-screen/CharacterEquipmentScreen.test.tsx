import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CharacterEquipmentScreen } from "./CharacterEquipmentScreen";

const equipment = {
  avatar: { image_url: "gael.png", name: "Gael", rarity: "comum" as const, equipmentId: "gael" },
  helmet: { image_url: "helmet.png", name: "Guardian Helmet", rarity: "raro" as const, equipmentId: "helmet_guardian_blue" },
  armor: { image_url: "armor.png", name: "Guardian Armor", rarity: "raro" as const, equipmentId: "armor_guardian_blue" },
  weapon: { image_url: "sword.png", name: "Guardian Sword", rarity: "raro" as const, equipmentId: "sword_guardian_blue" },
  pet: { image_url: "fox.png", name: "Guardian Fox", rarity: "raro" as const, equipmentId: "pet_guardian_fox" },
};

describe("CharacterEquipmentScreen", () => {
  it("renders the full-body scene, dedicated helmet card and fixed navigation contract", () => {
    render(
      <CharacterEquipmentScreen
        childName="Gael"
        equipment={equipment}
        onBack={vi.fn()}
        onHelp={vi.fn()}
        onSelectSlot={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(document.querySelector("[data-avatar-surface='characterScene']")).not.toBeNull();
    expect(document.querySelector("[data-avatar-layer='helmet-scene']")).toBeNull();
    expect(screen.getByRole("button", { name: "Abrir equipamentos de elmo" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegação do personagem" }).querySelectorAll("button")).toHaveLength(5);
  });

  it("routes equipment interactions through the requested wardrobe and navigation targets", () => {
    const onSelectSlot = vi.fn();
    const onNavigate = vi.fn();
    render(
      <CharacterEquipmentScreen
        childName="Gael"
        equipment={equipment}
        onBack={vi.fn()}
        onHelp={vi.fn()}
        onSelectSlot={onSelectSlot}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir equipamentos de elmo" }));
    fireEvent.click(screen.getByRole("button", { name: /Inventário/i }));
    expect(onSelectSlot).toHaveBeenCalledWith("elmo");
    expect(onNavigate).toHaveBeenCalledWith("inventory");
  });
});
