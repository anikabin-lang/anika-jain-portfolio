// Shared "stage direction" — the scroll-driven sections write to this object
// and the badge stage reads it every frame. Values are 0..1 unless noted.

export const STAGE_LAYOUT = "stage:layout";

export const direction = {
  shift: 0, // badge slides from the hero column to the identity-check mark
  zoom: 0, // camera push-in during the identity check
  scan: 0, // scanner beam position
  light: 0, // studio light during the scan
  steady: 0, // extra drag so the badge holds still under the scanner
  push: 0, // one-off horizontal impulse (px/s)
  frame: { x: 0, y: 0, width: 0, height: 0 }, // badge rect at the identity mark
  placed: false, // badge has settled on the identity mark
  air: 0, // slow shared breeze, -1..1
  closing: {
    lower: 0, // badge comes back down for the contact section
    zoom: 0,
    turn: 0, // 0 = front, 1 = flipped to the contact side
    sun: 0,
    steady: 0,
    frame: { x: 0, y: 0, width: 0, height: 0 },
    floor: 0,
  },
};
