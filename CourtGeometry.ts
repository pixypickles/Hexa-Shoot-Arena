import Phaser from "phaser";
import { COURT } from "../config/GameConfig";

export interface WallSegment {
  a: Phaser.Math.Vector2;
  b: Phaser.Math.Vector2;
  normal: Phaser.Math.Vector2;
}

function segment(a: Phaser.Math.Vector2, b: Phaser.Math.Vector2, inwardHint: Phaser.Math.Vector2): WallSegment {
  const tangent = b.clone().subtract(a).normalize();
  const normalA = new Phaser.Math.Vector2(-tangent.y, tangent.x);
  const normalB = normalA.clone().scale(-1);
  const midpoint = a.clone().add(b).scale(0.5);
  const towardInside = inwardHint.clone().subtract(midpoint);
  const normal = normalA.dot(towardInside) > normalB.dot(towardInside) ? normalA : normalB;
  return { a, b, normal };
}

function quadraticBezier(
  p0: Phaser.Math.Vector2,
  p1: Phaser.Math.Vector2,
  p2: Phaser.Math.Vector2,
  t: number
): Phaser.Math.Vector2 {
  const u = 1 - t;
  return new Phaser.Math.Vector2(
    u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
  );
}

export function createCourtWalls(): WallSegment[] {
  const c = new Phaser.Math.Vector2(COURT.centerX, COURT.centerY);
  const topLeft = new Phaser.Math.Vector2(COURT.leftX + COURT.shoulderInset, COURT.topY);
  const topRight = new Phaser.Math.Vector2(COURT.rightX - COURT.shoulderInset, COURT.topY);
  const upperLeft = new Phaser.Math.Vector2(COURT.leftX, COURT.centerY - 155);
  const lowerLeft = new Phaser.Math.Vector2(COURT.leftX, COURT.centerY + 155);
  const bottomLeft = new Phaser.Math.Vector2(COURT.leftX + COURT.shoulderInset, COURT.bottomY);
  const bottomRight = new Phaser.Math.Vector2(COURT.rightX - COURT.shoulderInset, COURT.bottomY);
  const lowerRight = new Phaser.Math.Vector2(COURT.rightX, COURT.centerY + 155);
  const upperRight = new Phaser.Math.Vector2(COURT.rightX, COURT.centerY - 155);

  const walls: WallSegment[] = [
    segment(topLeft, upperLeft, c),
    segment(upperLeft, lowerLeft, c),
    segment(lowerLeft, bottomLeft, c),
    segment(bottomRight, lowerRight, c),
    segment(lowerRight, upperRight, c),
    segment(upperRight, topRight, c)
  ];

  const goalHalf = COURT.goalWidth / 2;
  const addCurvedGoalSide = (top: boolean, left: boolean) => {
    const y = top ? COURT.topY : COURT.bottomY;
    const goalEdgeX = COURT.centerX + (left ? -goalHalf : goalHalf);
    const outerX = COURT.centerX + (left ? -(goalHalf + 125) : goalHalf + 125);
    const p0 = new Phaser.Math.Vector2(outerX, y);
    const p2 = new Phaser.Math.Vector2(goalEdgeX, y);
    const bendY = y + (top ? COURT.curveDepth : -COURT.curveDepth);
    const p1 = new Phaser.Math.Vector2((outerX + goalEdgeX) / 2, bendY);

    let previous = p0;
    for (let i = 1; i <= COURT.curveSegments; i += 1) {
      const point = quadraticBezier(p0, p1, p2, i / COURT.curveSegments);
      walls.push(segment(previous, point, c));
      previous = point;
    }
  };

  addCurvedGoalSide(true, true);
  addCurvedGoalSide(true, false);
  addCurvedGoalSide(false, true);
  addCurvedGoalSide(false, false);

  return walls;
}

export function closestPointOnSegment(
  point: Phaser.Math.Vector2,
  a: Phaser.Math.Vector2,
  b: Phaser.Math.Vector2
): Phaser.Math.Vector2 {
  const ab = b.clone().subtract(a);
  const denominator = ab.lengthSq();
  if (denominator === 0) return a.clone();
  const t = Phaser.Math.Clamp(point.clone().subtract(a).dot(ab) / denominator, 0, 1);
  return a.clone().add(ab.scale(t));
}
