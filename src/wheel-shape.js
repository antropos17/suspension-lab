// Local wheel coordinates: x tangent to ground, y toward the ground.
// The hub is the origin; only the rubber contour changes shape.
export function tirePoint(angle, radius, compression) {
  const squash = Math.max(0, Math.min(radius * .26, compression));
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const bulge = 1 + squash / radius * .22 * Math.max(0, Math.sin(angle));
  return { x: x * bulge, y: Math.min(y, radius - squash) };
}

// Hub and rigid rim share a center. The contact patch follows the actual mesh.
export function groundedTirePoint(angle, hub, radius, surface, grounded = true) {
  const distance = hub.y - surface(hub.x);
  const compression = grounded ? Math.max(0, Math.min(radius * .26, radius - distance)) : 0;
  const p = tirePoint(angle, radius, compression);
  const x = hub.x + p.x;
  // Apply the surface constraint even on the frame before a contact begins.
  return { x, y: Math.max(hub.y - p.y, surface(x) + .006) };
}
