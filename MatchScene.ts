import Phaser from "phaser";
import { BALL, COLORS, COURT, PLAYER } from "../config/GameConfig";
import type { MatchSettings } from "../state/MatchSettings";
import { Ball } from "../objects/Ball";
import { Player } from "../objects/Player";
import { InputController } from "../systems/InputController";
import { closestPointOnSegment, createCourtWalls, type WallSegment } from "../systems/CourtGeometry";

export class MatchScene extends Phaser.Scene {
  private settings!: MatchSettings;
  private ball!: Ball;
  private playerField!: Player;
  private playerKeeper!: Player;
  private cpuField!: Player;
  private cpuKeeper!: Player;
  private controlled!: Player;
  private inputController!: InputController;
  private walls: WallSegment[] = [];
  private scorePlayer = 0;
  private scoreCpu = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private remaining = 60;
  private lastTick = 0;

  constructor() {
    super("Match");
  }

  init(data: MatchSettings): void {
    this.settings = data;
    this.remaining = data.matchLength;
  }

  create(): void {
    this.drawCourt();
    this.walls = createCourtWalls();

    this.playerKeeper = new Player(this, 640, 575, "bottom", "keeper", this.settings.playerTeam);
    this.playerField = new Player(this, 640, 430, "bottom", "field", this.settings.playerTeam);
    this.cpuKeeper = new Player(this, 640, 145, "top", "keeper", this.settings.cpuTeam);
    this.cpuField = new Player(this, 640, 290, "top", "field", this.settings.cpuTeam);
    this.ball = new Ball(this, 640, 360);

    this.controlled = this.playerField;
    this.controlled.setSelected(true);
    this.inputController = new InputController(this);

    this.physics.add.collider(this.ball, [this.playerField, this.playerKeeper, this.cpuField, this.cpuKeeper], (_, playerObject) => {
      this.onBallPlayerCollision(playerObject as Player);
    });

    this.scoreText = this.add.text(640, 25, "0  -  0", {
      fontFamily: "system-ui",
      fontSize: "38px",
      fontStyle: "900",
      color: "#ffffff"
    }).setOrigin(0.5).setDepth(60);

    this.timeText = this.add.text(640, 65, "", {
      fontFamily: "system-ui",
      fontSize: "21px",
      color: "#b8eae4"
    }).setOrigin(0.5).setDepth(60);

    this.add.text(20, 18, "WASD: MOVE   J: PASS   K: SHOOT   L: SWITCH", {
      fontFamily: "system-ui",
      fontSize: "17px",
      color: "#9bd7cf"
    }).setDepth(60);

    this.lastTick = this.time.now;
  }

  update(time: number, delta: number): void {
    this.updateClock(time);
    this.updateControlledPlayer();
    this.updateCpu(delta);
    this.updateKeeperReturn(this.playerKeeper, this.controlled === this.playerKeeper);
    this.updateKeeperReturn(this.cpuKeeper, false);
    this.updateBall(delta);
    this.resolveWallCollisions();
    this.resolveGoal();
  }

  private drawCourt(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.courtFill, 1);
    graphics.lineStyle(7, COLORS.wall, 1);

    graphics.beginPath();
    graphics.moveTo(COURT.leftX + COURT.shoulderInset, COURT.topY);
    graphics.lineTo(COURT.leftX, COURT.centerY - 155);
    graphics.lineTo(COURT.leftX, COURT.centerY + 155);
    graphics.lineTo(COURT.leftX + COURT.shoulderInset, COURT.bottomY);
    graphics.lineTo(COURT.rightX - COURT.shoulderInset, COURT.bottomY);
    graphics.lineTo(COURT.rightX, COURT.centerY + 155);
    graphics.lineTo(COURT.rightX, COURT.centerY - 155);
    graphics.lineTo(COURT.rightX - COURT.shoulderInset, COURT.topY);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();

    graphics.lineStyle(3, COLORS.centerLine, 0.8);
    graphics.lineBetween(COURT.leftX, COURT.centerY, COURT.rightX, COURT.centerY);
    graphics.strokeCircle(COURT.centerX, COURT.centerY, 68);

    const goalHalf = COURT.goalWidth / 2;
    graphics.lineStyle(7, 0xffffff, 1);
    graphics.lineBetween(COURT.centerX - goalHalf, COURT.topY, COURT.centerX - goalHalf, COURT.topY - COURT.goalDepth);
    graphics.lineBetween(COURT.centerX + goalHalf, COURT.topY, COURT.centerX + goalHalf, COURT.topY - COURT.goalDepth);
    graphics.lineBetween(COURT.centerX - goalHalf, COURT.bottomY, COURT.centerX - goalHalf, COURT.bottomY + COURT.goalDepth);
    graphics.lineBetween(COURT.centerX + goalHalf, COURT.bottomY, COURT.centerX + goalHalf, COURT.bottomY + COURT.goalDepth);

    this.drawCurvedGoalWalls(graphics, true);
    this.drawCurvedGoalWalls(graphics, false);
  }

  private drawCurvedGoalWalls(graphics: Phaser.GameObjects.Graphics, top: boolean): void {
    const y = top ? COURT.topY : COURT.bottomY;
    const direction = top ? 1 : -1;
    const goalHalf = COURT.goalWidth / 2;
    graphics.lineStyle(7, COLORS.wall, 1);

    for (const side of [-1, 1]) {
      const outerX = COURT.centerX + side * (goalHalf + 125);
      const goalX = COURT.centerX + side * goalHalf;
      graphics.beginPath();
      graphics.moveTo(outerX, y);
      graphics.quadraticBezierTo(
        (outerX + goalX) / 2,
        y + direction * COURT.curveDepth,
        goalX,
        y
      );
      graphics.strokePath();
    }
  }

  private updateControlledPlayer(): void {
    const move = this.inputController.getMoveVector();
    this.controlled.setVelocity(move.x * PLAYER.speed, move.y * PLAYER.speed);
    this.clampPlayerToHalf(this.controlled);

    if (this.inputController.consumeSwitch()) {
      this.controlled.setSelected(false);
      this.controlled = this.controlled === this.playerField ? this.playerKeeper : this.playerField;
      this.controlled.setSelected(true);
    }

    if (this.inputController.consumePass()) {
      this.kickToward(this.controlled === this.playerField ? this.playerKeeper : this.playerField, BALL.passSpeed);
      this.controlled.setSelected(false);
      this.controlled = this.controlled === this.playerField ? this.playerKeeper : this.playerField;
      this.controlled.setSelected(true);
    }

    if (this.inputController.consumeShoot()) {
      const target = new Phaser.Math.Vector2(COURT.centerX, COURT.topY - 20);
      this.kickTowardPoint(target, BALL.shotSpeed);
    }
  }

  private updateCpu(delta: number): void {
    const target = new Phaser.Math.Vector2(this.ball.x, Math.min(this.ball.y, COURT.centerY - 20));
    const velocity = target.subtract(new Phaser.Math.Vector2(this.cpuField.x, this.cpuField.y));
    if (velocity.length() > 8) velocity.normalize().scale(PLAYER.speed * 0.78);
    this.cpuField.setVelocity(velocity.x, velocity.y);
    this.clampPlayerToHalf(this.cpuField);

    const distanceToBall = Phaser.Math.Distance.Between(this.cpuField.x, this.cpuField.y, this.ball.x, this.ball.y);
    if (distanceToBall < 56 && this.ball.speed < 260) {
      const aim = new Phaser.Math.Vector2(COURT.centerX + Phaser.Math.Between(-95, 95), COURT.bottomY + 20);
      const shot = aim.subtract(new Phaser.Math.Vector2(this.ball.x, this.ball.y)).normalize().scale(BALL.shotSpeed * 0.92);
      this.ball.setVelocity(shot.x, shot.y);
    }

    void delta;
  }

  private updateKeeperReturn(keeper: Player, isControlled: boolean): void {
    if (isControlled) return;

    const homeY = keeper.side === "bottom" ? 575 : 145;
    const targetX = Phaser.Math.Clamp(this.ball.x, COURT.centerX - 80, COURT.centerX + 80);
    const toHome = new Phaser.Math.Vector2(targetX - keeper.x, homeY - keeper.y);

    if (toHome.length() < 5) {
      keeper.stop();
      return;
    }

    toHome.normalize().scale(PLAYER.keeperReturnSpeed);
    keeper.setVelocity(toHome.x, toHome.y);
    this.clampPlayerToHalf(keeper);
  }

  private updateBall(delta: number): void {
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    const damping = Math.pow(BALL.dragPerSecond, delta / 1000);
    body.velocity.scale(damping);
    if (body.velocity.length() < BALL.stopSpeed) {
      body.setVelocity(0, 0);
    }
  }

  private resolveWallCollisions(): void {
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    const p = new Phaser.Math.Vector2(this.ball.x, this.ball.y);

    for (const wall of this.walls) {
      const closest = closestPointOnSegment(p, wall.a, wall.b);
      const distance = p.distance(closest);
      if (distance >= BALL.physicsRadius) continue;

      const velocityTowardWall = body.velocity.dot(wall.normal);
      if (velocityTowardWall >= 0) continue;

      const penetration = BALL.physicsRadius - distance + 0.5;
      this.ball.x += wall.normal.x * penetration;
      this.ball.y += wall.normal.y * penetration;

      const reflected = body.velocity.clone().subtract(
        wall.normal.clone().scale(2 * body.velocity.dot(wall.normal))
      ).scale(0.82);

      body.setVelocity(reflected.x, reflected.y);
    }
  }

  private onBallPlayerCollision(player: Player): void {
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.length() < 240) {
      body.setVelocity(0, 0);
      this.ball.setPosition(player.x, player.y + (player.side === "bottom" ? -34 : 34));
      return;
    }

    const incoming = body.velocity.clone().normalize();
    const side = Phaser.Math.RND.pick([-1, 1]);
    const angle = Phaser.Math.DegToRad(35 * side);
    const spill = incoming.rotate(angle).scale(body.velocity.length() * 0.27);
    body.setVelocity(spill.x, spill.y);
  }

  private kickToward(target: Player, speed: number): void {
    this.kickTowardPoint(new Phaser.Math.Vector2(target.x, target.y), speed);
  }

  private kickTowardPoint(target: Phaser.Math.Vector2, speed: number): void {
    const distance = Phaser.Math.Distance.Between(this.controlled.x, this.controlled.y, this.ball.x, this.ball.y);
    if (distance > 82) return;

    this.ball.setPosition(
      this.controlled.x,
      this.controlled.y + (this.controlled.side === "bottom" ? -35 : 35)
    );
    const direction = target.subtract(new Phaser.Math.Vector2(this.ball.x, this.ball.y)).normalize().scale(speed);
    this.ball.setVelocity(direction.x, direction.y);
  }

  private clampPlayerToHalf(player: Player): void {
    const body = player.body as Phaser.Physics.Arcade.Body;
    const minY = player.side === "bottom" ? COURT.centerY + PLAYER.radius : COURT.topY + PLAYER.radius;
    const maxY = player.side === "bottom" ? COURT.bottomY - PLAYER.radius : COURT.centerY - PLAYER.radius;

    player.y = Phaser.Math.Clamp(player.y, minY, maxY);
    player.x = Phaser.Math.Clamp(player.x, COURT.leftX + PLAYER.radius, COURT.rightX - PLAYER.radius);

    if (player.y <= minY && body.velocity.y < 0) body.setVelocityY(0);
    if (player.y >= maxY && body.velocity.y > 0) body.setVelocityY(0);
  }

  private resolveGoal(): void {
    const goalHalf = COURT.goalWidth / 2;
    const insideGoalX = Math.abs(this.ball.x - COURT.centerX) < goalHalf - BALL.physicsRadius;

    if (insideGoalX && this.ball.y < COURT.topY - 7) {
      this.scorePlayer += 1;
      this.resetAfterGoal("bottom");
    } else if (insideGoalX && this.ball.y > COURT.bottomY + 7) {
      this.scoreCpu += 1;
      this.resetAfterGoal("top");
    }
  }

  private resetAfterGoal(kickoffSide: "top" | "bottom"): void {
    this.scoreText.setText(`${this.scorePlayer}  -  ${this.scoreCpu}`);
    this.ball.setPosition(COURT.centerX, COURT.centerY + (kickoffSide === "bottom" ? 40 : -40));
    this.ball.stop();
    this.playerField.setPosition(640, 430);
    this.playerKeeper.setPosition(640, 575);
    this.cpuField.setPosition(640, 290);
    this.cpuKeeper.setPosition(640, 145);
  }

  private updateClock(time: number): void {
    if (time - this.lastTick >= 1000) {
      this.lastTick += 1000;
      this.remaining = Math.max(0, this.remaining - 1);
      this.timeText.setText(`${this.remaining} SEC`);
      if (this.remaining <= 0) {
        this.scene.pause();
        const result = this.scorePlayer === this.scoreCpu
          ? "DRAW"
          : this.scorePlayer > this.scoreCpu
            ? "YOU WIN"
            : "CPU WIN";

        this.add.rectangle(640, 360, 540, 220, 0x06101d, 0.94)
          .setStrokeStyle(4, 0x73e8dc)
          .setDepth(100);
        this.add.text(640, 325, result, {
          fontFamily: "system-ui",
          fontSize: "58px",
          fontStyle: "900",
          color: "#ffffff"
        }).setOrigin(0.5).setDepth(101);
        this.add.text(640, 405, "ページを再読み込みして再戦", {
          fontFamily: "system-ui",
          fontSize: "22px",
          color: "#a8dcd6"
        }).setOrigin(0.5).setDepth(101);
      }
    }
  }
}
