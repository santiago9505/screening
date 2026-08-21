import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateRSRatings,
  calculateRSScoreFromPerformance,
  calculateRSScoreFromPriceLevels
} from '../lib/rs-rating.js';

function closeTo(actual, expected, precision = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= precision, `Expected ${actual} to be within ${precision} of ${expected}`);
}

test('calculateRSScoreFromPerformance keeps 0% windows as valid data', () => {
  const result = calculateRSScoreFromPerformance({
    perf3M: 0,
    perf6M: 0,
    perfY: 0
  });

  assert.equal(result.score, 0);
  assert.deepEqual(result.quarters, { q1: 0, q2: 0, q3: 0, q4: 0 });
  assert.equal(result.tempRS, 50);
  assert.equal(result.exact, false);
});

test('calculateRSScoreFromPerformance reconstructs quarter returns with compounding', () => {
  const q1 = 20;
  const q2 = 10;
  const q3 = 5;
  const q4 = 5;

  const perf3M = q1;
  const perf6M = ((1 + q1 / 100) * (1 + q2 / 100) - 1) * 100;
  const perfY = ((1 + q1 / 100) * (1 + q2 / 100) * (1 + q3 / 100) * (1 + q4 / 100) - 1) * 100;

  const result = calculateRSScoreFromPerformance({ perf3M, perf6M, perfY });

  closeTo(result.quarters.q1, q1);
  closeTo(result.quarters.q2, q2);
  closeTo(result.quarters.q3, q3);
  closeTo(result.quarters.q4, q4);
  closeTo(result.score, 12);
});

test('calculateRSScoreFromPriceLevels computes exact quarter weights from price history', () => {
  const result = calculateRSScoreFromPriceLevels({
    current: 173.25,
    month3: 138.6,
    month6: 115.5,
    month9: 105,
    month12: 100
  });

  closeTo(result.quarters.q1, 25);
  closeTo(result.quarters.q2, 20);
  closeTo(result.quarters.q3, 10);
  closeTo(result.quarters.q4, 5);
  closeTo(result.score, 17);
  assert.equal(result.exact, true);
});

test('calculateRSRatings ranks deterministically and handles a single-stock universe', () => {
  const ratings = calculateRSRatings([
    { symbol: 'BBB', score: 10, quarters: { q1: 5, q2: 0, q3: 0, q4: 0 } },
    { symbol: 'AAA', score: 10, quarters: { q1: 7, q2: 0, q3: 0, q4: 0 } },
    { symbol: 'CCC', score: -5, quarters: { q1: -1, q2: 0, q3: 0, q4: 0 } }
  ], { now: 123456 });

  assert.equal(ratings.AAA.rank, 1);
  assert.equal(ratings.AAA.rating, 99);
  assert.equal(ratings.AAA.timestamp, 123456);
  assert.equal(ratings.BBB.rank, 2);
  assert.equal(ratings.BBB.rating, 50);
  assert.equal(ratings.CCC.rank, 3);
  assert.equal(ratings.CCC.rating, 1);

  const single = calculateRSRatings([
    { symbol: 'ONLY', score: 4.2, quarters: { q1: 4.2, q2: 0, q3: 0, q4: 0 } }
  ], { now: 999 });

  assert.equal(single.ONLY.rank, 1);
  assert.equal(single.ONLY.rating, 99);
  assert.equal(single.ONLY.timestamp, 999);
});
