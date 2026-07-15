export interface TeamDefinition {
  id: string;
  name: string;
  shirtPrimary: number;
  shirtSecondary?: number;
  shorts: number;
  pattern: "solid" | "vertical" | "horizontal";
  accent?: number;
}

export const TEAMS: TeamDefinition[] = [
  {
    id: "blizzard-fox",
    name: "BLIZZARD FOX",
    shirtPrimary: 0xffffff,
    shirtSecondary: 0x111111,
    shorts: 0x111111,
    pattern: "vertical",
    accent: 0x71d8ff
  },
  {
    id: "salvida-a",
    name: "SALVIDA A",
    shirtPrimary: 0x7d1f38,
    shorts: 0xffffff,
    pattern: "solid"
  },
  {
    id: "salvida-b",
    name: "SALVIDA B",
    shirtPrimary: 0x22b7ad,
    shorts: 0xffffff,
    pattern: "solid"
  },
  {
    id: "take-zo",
    name: "TAKE-ZO",
    shirtPrimary: 0xff5ba7,
    shirtSecondary: 0x17274b,
    shorts: 0xffffff,
    pattern: "horizontal"
  },
  {
    id: "manchester-p",
    name: "漫チェスターP",
    shirtPrimary: 0x071a36,
    shorts: 0x071a36,
    pattern: "solid"
  }
];
