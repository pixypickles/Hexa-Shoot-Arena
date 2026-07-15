import type { TeamDefinition } from "../data/Teams";

export type Difficulty = "easy" | "normal" | "hard";
export type MatchLength = 60 | 120;
export type SpecialShot = "hook" | "side-net" | "break" | "stealth";

export interface MatchSettings {
  playerTeam: TeamDefinition;
  cpuTeam: TeamDefinition;
  difficulty: Difficulty;
  matchLength: MatchLength;
  specialShot: SpecialShot;
}
