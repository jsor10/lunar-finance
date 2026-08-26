export type CategoryDef = { name: string; icon: string };

export const PRESET_CATEGORIES: Record<"expense" | "income", CategoryDef[]> = {
  expense: [
    { name: "Food", icon: "coffee" },
    { name: "Transport", icon: "map-pin" },
    { name: "Housing", icon: "home" },
    { name: "Leisure", icon: "film" },
    { name: "Health", icon: "heart" },
    { name: "Shopping", icon: "shopping-bag" },
    { name: "Other", icon: "tag" },
  ],
  income: [
    { name: "Freelance", icon: "briefcase" },
    { name: "Bonus", icon: "award" },
    { name: "Gift", icon: "gift" },
    { name: "Investment", icon: "trending-up" },
    { name: "Other", icon: "tag" },
  ],
};

export function categoryIcon(name?: string): string {
  if (!name) return "tag";
  if (name.toLowerCase() === "savings") return "target";
  const all = [...PRESET_CATEGORIES.expense, ...PRESET_CATEGORIES.income];
  return all.find((c) => c.name === name)?.icon ?? "tag";
}
