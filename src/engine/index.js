// Public surface of the engine. No DOM access anywhere in this folder.
export * from './constants.js';
export * from './math.js';
export { parseCall, checkCall, callText, digitsText, describePlay, CALL_EXAMPLE } from './parseCall.js';
export { makeRng } from './rng.js';
export { rankFor, answerXp, starXp, roundStars } from './progress.js';
export { mutatePlay, explainDiff, callQuestion, callRound, readRound, gradePlay } from './quiz.js';
export { ROUTES, routeFor, hasRoute } from './routes.js';
export { motionDest, sides } from './motion.js';
export { buildScene } from './scene.js';
export { evaluate, whyText } from './evaluate.js';
export { callouts } from './callouts.js';
export { overloadShift } from './defenses.js';
export { erasedPlay, setRoute, setMotionWho, setMotionTag } from './edit.js';
