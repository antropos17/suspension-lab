// Local wheel coordinates: x tangent to ground, y toward the ground.
// The hub is the origin; only the rubber contour changes shape.
export function tirePoint(angle, radius, compression) {
  const squash = Math.max(0, Math.min(radius * .26, compression));
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const bulge = 1 + squash / radius * .22 * Math.max(0, Math.sin(angle));
  return { x: x * bulge, y: Math.min(y, radius - squash) };
}
