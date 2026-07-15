import Phaser from "phaser";
import { PLAYER } from "../config/GameConfig";
import type { TeamDefinition } from "../data/Teams";

export type Side = "top" | "bottom";
export type Role = "keeper" | "field";

export class Player extends Phaser.GameObjects.Container {
  readonly side: Side;
  readonly role: Role;
  readonly team: TeamDefinition;
  readonly bodyCircle: Phaser.GameObjects.Arc;
  hasBall = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    side: Side,
    role: Role,
    team: TeamDefinition
  ) {
    super(scene, x, y);
    this.side = side;
    this.role = role;
    this.team = team;

    this.bodyCircle = scene.add.circle(0, 0, PLAYER.radius, team.shirtPrimary)
      .setStrokeStyle(4, role === "keeper" ? 0xffdc65 : 0xffffff);

    const stripe = scene.add.rectangle(0, 0, 11, PLAYER.radius * 1.5, team.shirtSecondary ?? team.shirtPrimary);
    if (team.pattern === "horizontal") {
      stripe.setSize(PLAYER.radius * 1.5, 11);
    }
    if (team.pattern === "solid") {
      stripe.setVisible(false);
    }

    const accent = scene.add.circle(0, -8, 5, team.accent ?? team.shirtPrimary);
    const roleText = scene.add.text(0, 2, role === "keeper" ? "K" : "F", {
      fontFamily: "system-ui",
      fontSize: "17px",
      fontStyle: "900",
      color: "#08101c"
    }).setOrigin(0.5);

    this.add([this.bodyCircle, stripe, accent, roleText]);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(PLAYER.radius);
    body.setOffset(-PLAYER.radius, -PLAYER.radius);
    body.setCollideWorldBounds(false);
  }

  setVelocity(x: number, y: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(x, y);
  }

  stop(): void {
    this.setVelocity(0, 0);
  }

  setSelected(selected: boolean): void {
    this.bodyCircle.setStrokeStyle(selected ? 6 : 4, selected ? 0x79fff0 : (this.role === "keeper" ? 0xffdc65 : 0xffffff));
    this.setScale(selected ? 1.07 : 1);
  }
}
