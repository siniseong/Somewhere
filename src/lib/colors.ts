export type ColorOption = {
  id: string;
  hex: string;
  label: string;
};

export const COLORS: ColorOption[] = [
  { id: "apricot", hex: "#FFD6A5", label: "살구" },
  { id: "mint", hex: "#A8DADC", label: "민트" },
  { id: "lilac", hex: "#B8B0E0", label: "라일락" },
  { id: "amber", hex: "#F4A261", label: "앰버" },
  { id: "pale-blue", hex: "#95C8D8", label: "페일 블루" },
  { id: "rose", hex: "#E0AFA0", label: "더스티 로즈" },
];

export function getColor(id: string): ColorOption {
  return COLORS.find((c) => c.id === id) ?? COLORS[0];
}
