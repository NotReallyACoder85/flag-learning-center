import { describe, it, expect } from 'vitest';
import {
  makeRng, callRound, callQuestion, readRound, mutatePlay, explainDiff, gradePlay, rankFor, answerXp, starXp, roundStars,
  parseCall, callText, describePlay, buildScene, LET,
} from '../src/engine/index.js';
import { plays, settings, concepts, formations } from '../src/data/index.js';

const library = plays.map((p) => p.call);

describe('rng', () => {
  it('is repeatable for the same seed and different for different seeds', () => {
    const a = makeRng(7), b = makeRng(7), c = makeRng(8);
    const seq = (r) => [r(), r(), r()].join();
    expect(seq(a)).toBe(seq(b));
    expect(seq(makeRng(7))).not.toBe(seq(c));
  });
  it('shuffle keeps every item', () => {
    expect(makeRng(1).shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('call quiz', () => {
  it('every question has 4 distinct, valid options and the right one is where the answer says', () => {
    for (let seed = 1; seed <= 60; seed++) {
      callRound(makeRng(seed), library, 5).forEach((q) => {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        q.options.forEach((o) => expect(parseCall(o), o).toBeTruthy());
        expect(q.options[q.answer]).toBe(callText(q.play));
      });
    }
  });
  it('a round uses distinct plays and alternates the two question types', () => {
    const r = callRound(makeRng(3), library, 5);
    expect(new Set(r.map((q) => callText(q.play))).size).toBe(5);
    expect(r.map((q) => q.kind)).toEqual(['pickCall', 'pickPicture', 'pickCall', 'pickPicture', 'pickCall']);
  });
  it('round length follows the setting (5 by default)', () => {
    expect(settings.quizLength).toBe(5);
  });
  it('mutatePlay always returns a different, valid play', () => {
    const rng = makeRng(11);
    for (let i = 0; i < 200; i++) {
      const base = parseCall(library[i % library.length]);
      const m = mutatePlay(base, rng);
      expect(callText(m)).not.toBe(callText(base));
      expect(parseCall(callText(m))).toBeTruthy();
    }
  });
  it('explainDiff names the receiver, formation or motion that differs', () => {
    const right = parseCall('Dubs 21129');
    expect(explainDiff(right, parseCall('Dubs 21329'))).toMatch(/^Y runs a Speed Out \(1\), not a Whip \(3\)\./);
    expect(explainDiff(right, parseCall('Trips 21129'))).toMatch(/formation is Dubs, not Trips/);
    expect(explainDiff(right, parseCall('Dubs 21129 Y Cross'))).toMatch(/no motion/);
    expect(explainDiff(parseCall('Dubs 21129 Y Cross'), right)).toMatch(/Y goes in motion \(Cross\)/);
    expect(explainDiff(right, parseCall('Dubs 25129'))).toMatch(/^B runs a Speed Out \(1\), not an Out \(5\)\./);
    expect(explainDiff(right, right)).toMatch(/Look at the routes/);
  });
  it('describePlay puts a play in words', () => {
    expect(describePlay(parseCall('Dubs 21129 Y Cross'))).toBe('Dubs. A Slant, B Speed Out, Y Speed Out, Z Slant, C Fade/Go. Y goes in motion (cross).');
  });
});

describe('read the defense', () => {
  it('has a mix of man and zone, always with motion, and the answer matches the defense', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = readRound(makeRng(seed), library, 5);
      expect(r).toHaveLength(5);
      expect(r.filter((q) => q.answer === 'man').length).toBeGreaterThanOrEqual(2);
      expect(r.filter((q) => q.answer === 'zone').length).toBeGreaterThanOrEqual(2);
      r.forEach((q) => {
        expect(q.play.motion).toBeTruthy();
        expect(q.answer === 'man').toBe(q.play.def === 'man');
        expect(q.follower).toBe(q.answer === 'man' ? 'D' + q.who : null);
      });
    }
  });
  it('in man, the defender on the motion man really does go with him', () => {
    for (let seed = 1; seed <= 30; seed++) {
      readRound(makeRng(seed), library, 5).filter((q) => q.answer === 'man').forEach((q) => {
        const s = buildScene({ ...q.play, slow: false });
        const at = s.stateAt(s.ts);
        expect(Math.hypot(at.def[q.follower][0] - at.off[q.who][0], at.def[q.follower][1] - at.off[q.who][1])).toBeLessThan(60);
      });
    }
  });
});

describe('beat the coverage grading', () => {
  it('needs every receiver to have a route', () => {
    expect(gradePlay({ form: 'dubs', digits: [9, 9, null, 9, 9], motion: null }, 'c3')).toEqual({ complete: false });
  });
  it('stars come from the thresholds in settings, per defense', () => {
    const t = { c3: [5, 6, 7] };
    const g = gradePlay({ form: 'dubs', digits: [2, 1, 1, 2, 9], motion: null }, 'c3', t); // best separation is about 8
    expect(g.stars).toBe(3);
    expect(gradePlay({ form: 'dubs', digits: [2, 1, 1, 2, 9], motion: null }, 'c3', { c3: [50, 60, 70] })).toMatchObject({ stars: 0, passed: false });
  });
  it('has thresholds for every defense in the rotation, in increasing order', () => {
    settings.beat.order.forEach((d) => {
      const t = settings.beat.thresholds[d];
      expect(t).toHaveLength(3);
      expect(t[0]).toBeLessThan(t[1]);
      expect(t[1]).toBeLessThan(t[2]);
    });
  });
  it('a reasonable share of random complete plays pass, so it is a game and not a gimme', () => {
    const rng = makeRng(99);
    settings.beat.order.forEach((d) => {
      let pass = 0, n = 300;
      for (let i = 0; i < n; i++) {
        const digits = Array.from({ length: 5 }, () => rng.int(10));
        if (gradePlay({ form: rng.pick(Object.keys(formations)), digits, motion: null }, d).passed) pass++;
      }
      expect(pass / n, d).toBeGreaterThan(0.2);
      expect(pass / n, d).toBeLessThan(0.85);
    });
  });
});

describe('ranks and xp', () => {
  it('finds the right rank and progress to the next', () => {
    expect(rankFor(0).rank.name).toBe('Rookie');
    expect(rankFor(99).rank.name).toBe('Rookie');
    expect(rankFor(100).rank.name).toBe('Starter');
    expect(rankFor(120)).toMatchObject({ toNext: 180, pct: 10 });
    expect(rankFor(9999)).toMatchObject({ next: null, toNext: 0, pct: 100 });
    expect(rankFor(9999).rank.name).toBe('All-Pro');
  });
  it('right answers earn more on a streak, up to a cap', () => {
    expect(answerXp(1)).toBe(10);
    expect(answerXp(2)).toBe(12);
    expect(answerXp(6)).toBe(20);
    expect(answerXp(50)).toBe(20);
  });
  it('stars are worth XP, and a round earns stars by score', () => {
    expect(starXp(3)).toBe(45);
    expect([5, 4, 3, 2, 0].map((c) => roundStars(c, 5))).toEqual([3, 2, 1, 0, 0]);
  });
});

describe('concept cards', () => {
  it('each card is complete, short, and points at a real play', () => {
    expect(concepts.cards.length).toBeGreaterThanOrEqual(6);
    const ids = new Set();
    concepts.cards.forEach((c) => {
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);
      expect(c.title.length).toBeLessThan(26);
      expect(c.tagline.length).toBeLessThan(90);
      expect(c.how).toHaveLength(3);
      c.how.forEach((h) => expect(h.length).toBeLessThan(90));
      expect(parseCall(c.watch.call), c.id).toBeTruthy();
      expect(['c3', 'c2', 'man']).toContain(c.watch.def);
      expect(library).toContain(c.watch.call);
    });
  });
  it("the card's example play really does get someone open in the app (or shows the tell)", () => {
    concepts.cards.forEach((c) => {
      const s = buildScene({ ...parseCall(c.watch.call), def: c.watch.def, slow: false });
      expect(s.result, c.id).toBeTruthy();
    });
  });
  it('uses the receiver letters A B Y Z C only', () => {
    expect(LET).toEqual(['A', 'B', 'Y', 'Z', 'C']);
  });
});
