import Phaser from "phaser";
import { TEAMS } from "../data/Teams";
import type { Difficulty, MatchLength, SpecialShot } from "../state/MatchSettings";

const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];
const LENGTHS: MatchLength[] = [60, 120];
const SPECIALS: SpecialShot[] = ["hook", "side-net", "break", "stealth"];

export class MenuScene extends Phaser.Scene {
  private teamIndex = 0;
  private cpuIndex = 1;
  private difficultyIndex = 1;
  private lengthIndex = 0;
  private specialIndex = 0;
  private summary!: Phaser.GameObjects.Text;

  constructor() {
    super("Menu");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#07111f");

    this.add.text(640, 92, "HEXA SHOOT ARENA", {
      fontFamily: "system-ui",
      fontSize: "62px",
      fontStyle: "900",
      color: "#efffff",
      stroke: "#0aa99a",
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(640, 155, "六角形アリーナの2対2シュートアクション", {
      fontFamily: "system-ui",
      fontSize: "23px",
      color: "#a9d9d4"
    }).setOrigin(0.5);

    const makeRow = (y: number, label: string, onLeft: () => void, onRight: () => void) => {
      this.add.text(330, y, label, {
        fontFamily: "system-ui",
        fontSize: "28px",
        color: "#ffffff"
      }).setOrigin(0, 0.5);

      this.makeButton(780, y, "◀", onLeft);
      this.makeButton(950, y, "▶", onRight);
    };

    makeRow(260, "PLAYER TEAM", () => this.change("team", -1), () => this.change("team", 1));
    makeRow(330, "CPU TEAM", () => this.change("cpu", -1), () => this.change("cpu", 1));
    makeRow(400, "DIFFICULTY", () => this.change("difficulty", -1), () => this.change("difficulty", 1));
    makeRow(470, "MATCH TIME", () => this.change("length", -1), () => this.change("length", 1));
    makeRow(540, "SPECIAL SHOT", () => this.change("special", -1), () => this.change("special", 1));

    this.summary = this.add.text(640, 400, "", {
      fontFamily: "system-ui",
      fontSize: "25px",
      color: "#efffff",
      align: "center",
      lineSpacing: 25
    }).setOrigin(0.5);

    this.makeButton(640, 645, "START MATCH", () => this.startMatch(), 290, 62);
    this.refreshSummary();
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    width = 72,
    height = 50
  ): void {
    const bg = this.add.rectangle(x, y, width, height, 0x123f52, 0.95)
      .setStrokeStyle(2, 0x7be9dd)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontFamily: "system-ui",
      fontSize: "24px",
      fontStyle: "700",
      color: "#ffffff"
    }).setOrigin(0.5);

    bg.on("pointerover", () => bg.setFillStyle(0x1c6675));
    bg.on("pointerout", () => bg.setFillStyle(0x123f52));
    bg.on("pointerdown", () => {
      bg.setScale(0.96);
      onClick();
    });
    bg.on("pointerup", () => bg.setScale(1));

    text.setInteractive({ useHandCursor: true }).on("pointerdown", onClick);
  }

  private change(kind: "team" | "cpu" | "difficulty" | "length" | "special", delta: number): void {
    const wrap = (value: number, max: number) => (value + delta + max) % max;

    if (kind === "team") this.teamIndex = wrap(this.teamIndex, TEAMS.length);
    if (kind === "cpu") this.cpuIndex = wrap(this.cpuIndex, TEAMS.length);
    if (kind === "difficulty") this.difficultyIndex = wrap(this.difficultyIndex, DIFFICULTIES.length);
    if (kind === "length") this.lengthIndex = wrap(this.lengthIndex, LENGTHS.length);
    if (kind === "special") this.specialIndex = wrap(this.specialIndex, SPECIALS.length);

    if (this.cpuIndex === this.teamIndex) {
      this.cpuIndex = (this.cpuIndex + 1) % TEAMS.length;
    }
    this.refreshSummary();
  }

  private refreshSummary(): void {
    const specialNames: Record<SpecialShot, string> = {
      hook: "HOOK SHOT",
      "side-net": "SIDE NET CURVE",
      break: "BREAK SHOT",
      stealth: "STEALTH SHOT"
    };

    this.summary.setText([
      TEAMS[this.teamIndex].name,
      TEAMS[this.cpuIndex].name,
      DIFFICULTIES[this.difficultyIndex].toUpperCase(),
      `${LENGTHS[this.lengthIndex]} SEC`,
      specialNames[SPECIALS[this.specialIndex]]
    ]);
  }

  private startMatch(): void {
    this.scene.start("Match", {
      playerTeam: TEAMS[this.teamIndex],
      cpuTeam: TEAMS[this.cpuIndex],
      difficulty: DIFFICULTIES[this.difficultyIndex],
      matchLength: LENGTHS[this.lengthIndex],
      specialShot: SPECIALS[this.specialIndex]
    });
  }
}
