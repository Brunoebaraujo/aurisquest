export const AURIS_AVATAR_STANDARD_V1 = {
  id: "auris-avatar-standard-v1",
  width: 1024,
  height: 1536,
  guides: {
    rightHandGrip: { x: 292, y: 894 },
    leftForearmAnchor: { x: 719, y: 770 },
    waistAnchor: { x: 512, y: 780 },
    groundLine: { y: 1422 },
    chestZone: { x: 330, y: 500, width: 364, height: 290 },
    feetZone: { x: 245, y: 1190, width: 535, height: 234 },
  },
} as const;

export const normalizePoint = (x: number, y: number) => ({
  xNormalized: x / AURIS_AVATAR_STANDARD_V1.width,
  yNormalized: y / AURIS_AVATAR_STANDARD_V1.height,
});
