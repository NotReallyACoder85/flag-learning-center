// Field geometry. 360 x 400 SVG space, 12 px = 1 yard, line of scrimmage at y = 300.
export const LOS = 300;
export const PX = 12;
export const QB = [180, 348];
export const FIELD_W = 360;

// Receiver order in a call: A, B, Y, Z left to right, then the center C.
export const LET = ['A', 'B', 'Y', 'Z', 'C'];
export const SKILL = ['A', 'B', 'Y', 'Z'];

export const DEFENSES = ['none', 'c3', 'c2', 'man'];
export const DEF_NAME = { c3: 'Cover 3', c2: 'Cover 2', man: 'Man' };
export const MOTION_TAGS = ['cross', 'enter', 'exit'];

// Play timeline (seconds)
export const MOTION_TIME = 1.4;
export const ROUTE_TIME = 3.6;
export const ROUTE_TIME_SLOW = 7;
export const OPEN_SEPARATION_YDS = 2.2; // below this, "covered on every route"
