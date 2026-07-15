export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const COURT = {
  centerX: GAME_WIDTH / 2,
  centerY: GAME_HEIGHT / 2,
  topY: 90,
  bottomY: 630,
  leftX: 185,
  rightX: 1095,
  shoulderInset: 155,
  goalWidth: 250,
  goalDepth: 34,
  curveDepth: 46,
  curveSegments: 7
} as const;

export const PLAYER = {
  radius: 25,
  speed: 310,
  keeperReturnSpeed: 390
} as const;

export const BALL = {
  physicsRadius: 13,
  visualRadius: 15,
  dragPerSecond: 0.79,
  stopSpeed: 26,
  passSpeed: 540,
  shotSpeed: 820
} as const;

export const COLORS = {
  courtFill: 0x154e42,
  courtLine: 0xd9fff7,
  wall: 0x8ee9dd,
  centerLine: 0x7bbdb5,
  ball: 0xffffff
} as const;
