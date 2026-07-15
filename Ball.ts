import Phaser from "phaser";
import { BALL } from "../config/GameConfig";

export class Ball extends Phaser.GameObjects.Container {
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly visual: Phaser.GameObjects.Arc;
  ownerId: string | null = null;
  airborne = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.shadow = scene.add.ellipse(3, 7, BALL.visualRadius * 2.1, BALL.visualRadius * 0.9, 0x000000, 0.34);
    this.visual = scene.add.circle(0, 0, BALL.visualRadius, 0xffffff)
      .setStrokeStyle(3, 0x101820);

    const patch1 = scene.add.circle(-5, -4, 4, 0x101820);
    const patch2 = scene.add.circle(6, 3, 3, 0x101820);
    this.add([this.shadow, this.visual, patch1, patch2]);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(BALL.physicsRadius);
    body.setOffset(-BALL.physicsRadius, -BALL.physicsRadius);
    body.setBounce(1, 1);
  }

  get speed(): number {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return body.velocity.length();
  }

  setVelocity(x: number, y: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(x, y);
  }

  stop(): void {
    this.setVelocity(0, 0);
  }
}
