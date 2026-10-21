// Question builders and grading for the Train modes. Pure functions, seeded so they are testable.
import { formations, baseFormations, routes, settings } from '../data/index.js';
import { SKILL, MOTION_TAGS } from './constants.js';
import { parseCall, callText } from './parseCall.js';
import { routeFor } from './routes.js';
import { buildScene } from './scene.js';
import { cap, withArticle } from './text.js';

const sameCall = (a, b) => callText(a) === callText(b);

/** A near-miss of a play: one route, the motion, or the formation changed. Always a valid, different play. */
export function mutatePlay(play, rng) {
  for (let tries = 0; tries < 50; tries++) {
    const next = { form: play.form, digits: play.digits.slice(), motion: play.motion ? { ...play.motion } : null };
    const kind = rng.pick(['route', 'route', 'route', 'motion', 'form']);
    if (kind === 'route') {
      const i = rng.int(5);
      next.digits[i] = (next.digits[i] + 1 + rng.int(9)) % 10;
    } else if (kind === 'motion') {
      if (!next.motion) next.motion = { who: rng.pick(SKILL), tag: rng.pick(MOTION_TAGS) };
      else if (rng.int(2)) next.motion = null;
      else next.motion = { who: rng.pick(SKILL.filter((w) => w !== next.motion.who)), tag: next.motion.tag };
    } else {
      next.form = rng.pick(baseFormations.filter((f) => f !== play.form));
    }
    if (!sameCall(next, play)) return next;
  }
  throw new Error('could not mutate play');
}

/** Say what is different between the right play and the one that was picked. */
export function explainDiff(right, picked) {
  const parts = [];
  if (right.form !== picked.form) parts.push(`The formation is ${formations[right.form].name}, not ${formations[picked.form].name}.`);
  for (let i = 0; i < 5 && parts.length < 2; i++) {
    if (right.digits[i] !== picked.digits[i]) {
      const l = 'ABYZC'[i], a = routeFor(right.digits[i]), b = routeFor(picked.digits[i]);
      parts.push(`${l} runs ${withArticle(a.name)} (${right.digits[i]}), not ${withArticle(b.name)} (${picked.digits[i]}).`);
    }
  }
  const rm = right.motion, pm = picked.motion;
  const motionKey = (m) => (m ? m.who + m.tag : '');
  if (motionKey(rm) !== motionKey(pm) && parts.length < 2) {
    parts.push(!rm ? 'There is no motion in this play.' : !pm ? `${rm.who} goes in motion (${cap(rm.tag)}).` : `The motion is ${rm.who} ${cap(rm.tag)}.`);
  }
  return parts.join(' ') || 'Look at the routes again.';
}

/** Four options for a play: the right one plus three close calls. Returns { play, options: [call text], answer }. */
export function callQuestion(rng, play, library) {
  const correct = callText(play);
  const seen = new Set([correct]);
  const others = library.map((c) => parseCall(c)).filter((p) => p && !seen.has(callText(p)));
  const sameForm = others.filter((p) => p.form === play.form);
  const picks = [];
  const take = (p) => { const t = callText(p); if (!seen.has(t)) { seen.add(t); picks.push(p); } };
  if (sameForm.length) take(rng.pick(sameForm));
  for (let guard = 0; picks.length < 3 && guard < 200; guard++) take(mutatePlay(play, rng));
  const all = rng.shuffle([play, ...picks.slice(0, 3)]);
  return { play, options: all.map(callText), optionPlays: all, answer: all.indexOf(play) };
}

/** A round of n questions: distinct library plays, alternating "see the play, pick the call" and "see the call, pick the picture". */
export function callRound(rng, library, n) {
  const order = rng.shuffle(library.map((c) => parseCall(c)).filter(Boolean));
  return Array.from({ length: n }, (_, i) => {
    const play = order[i % order.length];
    return { kind: i % 2 === 0 ? 'pickCall' : 'pickPicture', ...callQuestion(rng, play, library) };
  });
}

/** Read-the-defense round: a play with motion and a hidden defense. answer is 'man' or 'zone'. */
export function readRound(rng, library, n) {
  const wants = rng.shuffle(Array.from({ length: n }, (_, i) => (i % 2 ? 'zone' : 'man')));
  const base = library.map((c) => parseCall(c)).filter(Boolean);
  return wants.map((answer) => {
    const p = rng.pick(base);
    const who = rng.pick(SKILL);
    const tag = rng.pick(['cross', 'cross', 'cross', 'enter', 'exit']);
    const def = answer === 'man' ? 'man' : rng.pick(['c3', 'c2']);
    return { play: { form: p.form, digits: p.digits, motion: { who, tag }, def }, answer, who, follower: answer === 'man' ? 'D' + who : null };
  });
}

/** Grade a built play against a defense for Beat the Coverage. */
export function gradePlay(play, def, thresholds = settings.beat.thresholds) {
  if (play.digits.some((d) => d == null)) return { complete: false };
  const r = buildScene({ form: play.form, digits: play.digits, motion: play.motion, def, slow: false }).result;
  const t = thresholds[def];
  const stars = r.sep >= t[2] ? 3 : r.sep >= t[1] ? 2 : r.sep >= t[0] ? 1 : 0;
  return { complete: true, passed: stars > 0, stars, open: r.open, sep: r.sep, why: r.why, tight: r.tight };
}

/**
 * Route quiz round. Even questions: see the route, pick its number (all ten keys).
 * Odd questions: see the number, pick the route shape (four choices, one of them the same kind of route).
 */
export function routeRound(rng, n, routeList = routes) {
  const ids = routeList.map((r) => r.id);
  const order = rng.shuffle(ids);
  return Array.from({ length: n }, (_, i) => {
    const id = order[i % order.length];
    if (i % 2 === 0) return { kind: 'routeNumber', route: id, options: ids.slice(), answer: id };
    const kind = routeList.find((r) => r.id === id).kind;
    const sameKind = rng.shuffle(routeList.filter((r) => r.id !== id && r.kind === kind).map((r) => r.id));
    const rest = rng.shuffle(ids.filter((x) => x !== id && !sameKind.includes(x)));
    const picks = [...sameKind.slice(0, 1), ...rest].slice(0, 3);
    return { kind: 'routeShape', route: id, options: rng.shuffle([id, ...picks]), answer: id };
  });
}

/**
 * Formation quiz round. Even questions: see the formation, pick its name (all five names, always in the same order).
 * Odd questions: see the name, pick the formation (four pictures).
 */
export function formationRound(rng, n) {
  const keys = baseFormations.slice();
  const order = rng.shuffle(keys);
  return Array.from({ length: n }, (_, i) => {
    const form = order[i % order.length];
    if (i % 2 === 0) return { kind: 'formName', form, options: keys.slice(), answer: form };
    const others = rng.shuffle(keys.filter((k) => k !== form)).slice(0, 3);
    return { kind: 'formPicture', form, options: rng.shuffle([form, ...others]), answer: form };
  });
}
