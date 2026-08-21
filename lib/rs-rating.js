const EMPTY_QUARTERS = Object.freeze({ q1: null, q2: null, q3: null, q4: null });

function toFiniteNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function estimateTempRS(score) {
  if (!Number.isFinite(score)) {
    return 50;
  }

  return Math.max(1, Math.min(99, Math.round(50 + (score / 2))));
}

export function calculatePeriodReturn(longWindowReturn, shortWindowReturn) {
  if (!Number.isFinite(longWindowReturn) || !Number.isFinite(shortWindowReturn)) {
    return 0;
  }

  const longFactor = 1 + (longWindowReturn / 100);
  const shortFactor = 1 + (shortWindowReturn / 100);

  if (longFactor <= 0 || shortFactor <= 0) {
    return Number(longWindowReturn) - Number(shortWindowReturn);
  }

  return ((longFactor / shortFactor) - 1) * 100;
}

export function splitCombinedReturnInHalf(combinedReturn) {
  if (!Number.isFinite(combinedReturn)) {
    return { q1: 0, q2: 0 };
  }

  const combinedFactor = 1 + (combinedReturn / 100);
  if (combinedFactor > 0) {
    const quarterFactor = Math.pow(combinedFactor, 0.5);
    const quarterReturn = (quarterFactor - 1) * 100;
    return { q1: quarterReturn, q2: quarterReturn };
  }

  const half = combinedReturn * 0.5;
  return { q1: half, q2: half };
}

export function calculateRSScoreFromPriceLevels(priceData = {}) {
  const current = toFiniteNumberOrNull(priceData.current);
  const month3 = toFiniteNumberOrNull(priceData.month3);
  const month6 = toFiniteNumberOrNull(priceData.month6);
  const month9 = toFiniteNumberOrNull(priceData.month9);
  const month12 = toFiniteNumberOrNull(priceData.month12);

  if (![current, month3, month6, month9, month12].every((value) => Number.isFinite(value) && value > 0)) {
    return {
      score: null,
      quarters: EMPTY_QUARTERS,
      tempRS: 50,
      exact: false
    };
  }

  const q1Change = ((current - month3) / month3) * 100;
  const q2Change = ((month3 - month6) / month6) * 100;
  const q3Change = ((month6 - month9) / month9) * 100;
  const q4Change = ((month9 - month12) / month12) * 100;
  const score = (q1Change * 0.40) + (q2Change * 0.20) + (q3Change * 0.20) + (q4Change * 0.20);

  return {
    score,
    quarters: {
      q1: q1Change,
      q2: q2Change,
      q3: q3Change,
      q4: q4Change
    },
    tempRS: estimateTempRS(score),
    exact: true
  };
}

export function calculateRSScoreFromPerformance(perfData = {}) {
  const perf3M = toFiniteNumberOrNull(perfData.perf3M);
  const perf6M = toFiniteNumberOrNull(perfData.perf6M);
  const perfY = toFiniteNumberOrNull(perfData.perfY);

  if (![perf3M, perf6M, perfY].every(Number.isFinite)) {
    return {
      score: null,
      quarters: EMPTY_QUARTERS,
      tempRS: 50,
      exact: false
    };
  }

  const q1Change = perf3M;
  const q2Change = calculatePeriodReturn(perf6M, perf3M);
  const sixToTwelveMonthReturn = calculatePeriodReturn(perfY, perf6M);

  // TradingView exposes 3M, 6M and 12M cumulative returns, but not a 9M window.
  // We therefore split the 6M-to-12M compounded return into two equal 3M legs.
  const splitSixMonth = splitCombinedReturnInHalf(sixToTwelveMonthReturn);
  const q3Change = splitSixMonth.q1;
  const q4Change = splitSixMonth.q2;
  const score = (q1Change * 0.40) + (q2Change * 0.20) + (q3Change * 0.20) + (q4Change * 0.20);

  return {
    score,
    quarters: {
      q1: q1Change,
      q2: q2Change,
      q3: q3Change,
      q4: q4Change
    },
    tempRS: estimateTempRS(score),
    exact: false
  };
}

function getQuarterValue(quarters, key) {
  const value = quarters && quarters[key];
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

function compareStocksByRS(a, b) {
  if (b.score !== a.score) return b.score - a.score;

  const q1Delta = getQuarterValue(b.quarters, 'q1') - getQuarterValue(a.quarters, 'q1');
  if (q1Delta !== 0) return q1Delta;

  const q2Delta = getQuarterValue(b.quarters, 'q2') - getQuarterValue(a.quarters, 'q2');
  if (q2Delta !== 0) return q2Delta;

  return String(a.symbol || '').localeCompare(String(b.symbol || ''));
}

function calculateMedian(sortedScores) {
  if (sortedScores.length === 0) return 0;

  const middle = Math.floor(sortedScores.length / 2);
  if (sortedScores.length % 2 === 1) {
    return sortedScores[middle];
  }

  return (sortedScores[middle - 1] + sortedScores[middle]) / 2;
}

export function summarizeRSRatings(validStocks) {
  if (!Array.isArray(validStocks) || validStocks.length === 0) {
    return null;
  }

  const scores = validStocks.map((stock) => stock.score);
  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const sortedScores = [...scores].sort((a, b) => a - b);
  const median = calculateMedian(sortedScores);
  const variance = scores.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  return {
    universeSize: validStocks.length,
    average,
    median,
    stdDev,
    best: validStocks[0],
    worst: validStocks[validStocks.length - 1]
  };
}

export function calculateRSRatings(stocksWithScores = [], { now = Date.now(), onStats } = {}) {
  const validStocks = stocksWithScores
    .filter((stock) => Number.isFinite(stock?.score))
    .map((stock) => ({
      symbol: stock.symbol,
      score: stock.score,
      quarters: stock.quarters || EMPTY_QUARTERS
    }))
    .sort(compareStocksByRS);

  if (validStocks.length === 0) {
    return {};
  }

  const stats = summarizeRSRatings(validStocks);
  if (typeof onStats === 'function' && stats) {
    onStats(stats);
  }

  const ratings = {};
  const denominator = validStocks.length - 1;

  validStocks.forEach((stock, index) => {
    const percentile = denominator <= 0
      ? 99
      : ((validStocks.length - index - 1) / denominator) * 98 + 1;

    ratings[stock.symbol] = {
      rating: Math.max(1, Math.min(99, Math.round(percentile))),
      score: stock.score,
      quarters: stock.quarters,
      rank: index + 1,
      timestamp: now
    };
  });

  return ratings;
}
