// Gear categories, mirroring gearCategoryEnum in @whipperbook/validation, with
// display labels. Order matches the add-gear picker / the web gear page.
export type GearCategory =
  | "rope"
  | "quickdraws"
  | "harness"
  | "shoes"
  | "protection"
  | "bouldering"
  | "safety"
  | "other";

export const gearCategoryLabels: Record<GearCategory, string> = {
  rope: "Rope",
  quickdraws: "Quickdraws",
  harness: "Harness",
  shoes: "Shoes",
  protection: "Protection",
  bouldering: "Bouldering",
  safety: "Safety",
  other: "Other",
};
