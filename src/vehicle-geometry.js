export const ARCH_X = .55;
export const ARCH_Y_RADIUS = .61;
export const ARCH_CENTER_Y = -.62;
export const SILL_Y = -.34;
export const ARCH_RADIUS = ARCH_X; // legacy display export
export const WELL_X=.65, WELL_Y=.92;
export function archPoint(x,angle,inset=0){return {x:x+(WELL_X-inset)*Math.cos(angle),y:ARCH_CENTER_Y+(WELL_Y-inset)*Math.sin(angle)};}
