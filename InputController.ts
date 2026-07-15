import Phaser from "phaser";

export interface MoveVector {
  x: number;
  y: number;
}

export class InputController {
  private readonly scene: Phaser.Scene;
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
  private pointerVector: MoveVector = { x: 0, y: 0 };
  private shootPressed = false;
  private passPressed = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    if (!scene.input.keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    this.keys = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      pass: Phaser.Input.Keyboard.KeyCodes.J,
      shoot: Phaser.Input.Keyboard.KeyCodes.K,
      switch: Phaser.Input.Keyboard.KeyCodes.L
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.createTouchControls();
  }

  getMoveVector(): MoveVector {
    let x = 0;
    let y = 0;
    if (this.keys.left.isDown) x -= 1;
    if (this.keys.right.isDown) x += 1;
    if (this.keys.up.isDown) y -= 1;
    if (this.keys.down.isDown) y += 1;

    x += this.pointerVector.x;
    y += this.pointerVector.y;

    const vector = new Phaser.Math.Vector2(x, y);
    if (vector.lengthSq() > 1) vector.normalize();
    return { x: vector.x, y: vector.y };
  }

  consumePass(): boolean {
    const keyboard = Phaser.Input.Keyboard.JustDown(this.keys.pass);
    const pressed = this.passPressed;
    this.passPressed = false;
    return keyboard || pressed;
  }

  consumeShoot(): boolean {
    const keyboard = Phaser.Input.Keyboard.JustDown(this.keys.shoot);
    const pressed = this.shootPressed;
    this.shootPressed = false;
    return keyboard || pressed;
  }

  consumeSwitch(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keys.switch);
  }

  private createTouchControls(): void {
    const centerX = 132;
    const centerY = 590;
    const padRadius = 86;
    const pad = this.scene.add.circle(centerX, centerY, padRadius, 0x102c3d, 0.72)
      .setStrokeStyle(3, 0x68d8cc)
      .setScrollFactor(0)
      .setDepth(50)
      .setInteractive();

    const nub = this.scene.add.circle(centerX, centerY, 31, 0x70e6d7, 0.85)
      .setDepth(51)
      .setScrollFactor(0);

    const updatePad = (pointer: Phaser.Input.Pointer) => {
      const vector = new Phaser.Math.Vector2(pointer.x - centerX, pointer.y - centerY);
      if (vector.length() > padRadius) vector.setLength(padRadius);
      nub.setPosition(centerX + vector.x, centerY + vector.y);
      if (vector.length() < 12) {
        this.pointerVector = { x: 0, y: 0 };
      } else {
        vector.normalize();
        this.pointerVector = { x: vector.x, y: vector.y };
      }
    };

    pad.on("pointerdown", updatePad);
    pad.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) updatePad(pointer);
    });
    pad.on("pointerup", () => {
      nub.setPosition(centerX, centerY);
      this.pointerVector = { x: 0, y: 0 };
    });
    pad.on("pointerout", () => {
      nub.setPosition(centerX, centerY);
      this.pointerVector = { x: 0, y: 0 };
    });

    this.makeActionButton(1130, 600, "C\nSTRAIGHT", () => { this.shootPressed = true; });
    this.makeActionButton(1015, 625, "A\nGROUND PASS", () => { this.passPressed = true; });
    this.makeActionButton(1070, 510, "B\nLOB PASS", () => { this.passPressed = true; });
    this.makeActionButton(1190, 500, "D\nCURVE", () => { this.shootPressed = true; });
  }

  private makeActionButton(x: number, y: number, label: string, action: () => void): void {
    const button = this.scene.add.circle(x, y, 46, 0x143e58, 0.9)
      .setStrokeStyle(3, 0x81f3e6)
      .setDepth(50)
      .setScrollFactor(0)
      .setInteractive();

    this.scene.add.text(x, y, label, {
      fontFamily: "system-ui",
      fontSize: "15px",
      fontStyle: "800",
      color: "#ffffff",
      align: "center"
    }).setOrigin(0.5).setDepth(51).setScrollFactor(0);

    button.on("pointerdown", action);
  }
}
