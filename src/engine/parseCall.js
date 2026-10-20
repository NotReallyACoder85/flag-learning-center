import { formations } from '../data/index.js';

const CALL_RE = /^(dubs[\s-]?tight|dubs|chiefs|trips|quads)[\s-]*(\d{5})(?:[\s-]+([abyz])[\s-]*(cross|enter|exit))?$/;
export const CALL_EXAMPLE = 'Dubs 21129 Y Cross';

const cap = (s) => s[0].toUpperCase() + s.slice(1);

/** Parse a play call. Returns { form, digits, motion } or null. Case-insensitive; tolerant of spaces and hyphens. */
export function parseCall(input) {
  const m = String(input).trim().toLowerCase().match(CALL_RE);
  if (!m) return null;
  return {
    form: m[1].replace(/[\s-]/g, ''),
    digits: m[2].split('').map(Number),
    motion: m[3] ? { who: m[3].toUpperCase(), tag: m[4] } : null,
  };
}

/** Like parseCall, but explains what is wrong. Returns { play } or { error }. */
export function checkCall(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { error: `Type a call, like ${CALL_EXAMPLE}.` };
  const play = parseCall(raw);
  if (play) return { play };
  const s = raw.toLowerCase();
  const fm = s.match(/^(dubs[\s-]?tight|dubs|chiefs|trips|quads)[\s-]*(.*)$/);
  if (!fm) return { error: `Start with a formation: Dubs, Dubs Tight, Chiefs, Trips or Quads. Example: ${CALL_EXAMPLE}.` };
  const rest = fm[2];
  const dm = rest.match(/^(\S*)\s*(.*)$/);
  const digits = dm[1];
  if (!/^\d+$/.test(digits)) return { error: `After the formation, type five route numbers, like 21129. Example: ${CALL_EXAMPLE}.` };
  if (digits.length !== 5) return { error: `Use exactly five route numbers (A, B, Y, Z, then C). You typed ${digits.length}. Example: ${CALL_EXAMPLE}.` };
  if (dm[2]) return { error: `Motion is a letter (A, B, Y or Z) plus Cross, Enter or Exit. Example: ${CALL_EXAMPLE}.` };
  return { error: `Not a valid call. Example: ${CALL_EXAMPLE}.` };
}

/** Route digits as text. A receiver with no route shows as _ (so a half-built play reads "Dubs 2_1_9"). */
export const digitsText = (digits) => digits.map((d) => (d == null ? '_' : d)).join('');

/** Canonical text for a play, e.g. "Dubs 21129 Y Cross". */
export function callText(p) {
  return `${formations[p.form].name} ${digitsText(p.digits)}${p.motion ? ` ${p.motion.who} ${cap(p.motion.tag)}` : ''}`;
}
