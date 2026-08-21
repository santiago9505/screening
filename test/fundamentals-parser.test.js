import test from 'node:test';
import assert from 'node:assert/strict';

import { parseQuarterlyFundamentals, pickMetricValue } from '../lib/fundamentals-parser.js';

const concept = (name, value, unit = 'usd') => ({ concept: name, value, unit });

function oscarQuarter({
  endDate,
  startDate,
  acceptedDate,
  year,
  quarter,
  revenue,
  otherRevenue,
  premium,
  medical,
  sga,
  operatingIncome,
  netIncome,
  eps,
  basicShares,
  dilutedShares
}) {
  return {
    endDate,
    startDate,
    acceptedDate,
    year,
    quarter,
    form: '10-Q',
    report: {
      ic: [
        // This line intentionally appears first: it caused the production bug.
        concept('us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax', otherRevenue),
        concept('us-gaap_Revenues', revenue),
        concept('us-gaap_PremiumsEarnedNet', premium),
        concept('us-gaap_PolicyholderBenefitsAndClaimsIncurredNet', medical),
        concept('us-gaap_SellingGeneralAndAdministrativeExpense', sga),
        concept('us-gaap_OperatingIncomeLoss', operatingIncome),
        concept('us-gaap_NetIncomeLoss', netIncome),
        concept('us-gaap_EarningsPerShareDiluted', eps, 'usd/share'),
        concept('us-gaap_WeightedAverageNumberOfSharesOutstandingBasic', basicShares, 'shares'),
        concept('us-gaap_WeightedAverageNumberOfDilutedSharesOutstanding', dilutedShares, 'shares')
      ]
    }
  };
}

const oscarFilings = [
  oscarQuarter({
    endDate: '2024-03-31', startDate: '2024-01-01', acceptedDate: '2024-05-07', year: 2024, quarter: 1,
    revenue: 2142305000, otherRevenue: 5634000, premium: 2093682000, medical: 1554774000,
    sga: 394162000, operatingIncome: 185558000, netIncome: 177368000, eps: 0.62,
    basicShares: 231443000, dilutedShares: 293796000
  }),
  oscarQuarter({
    endDate: '2024-06-30', startDate: '2024-01-01', acceptedDate: '2024-08-07', year: 2024, quarter: 2,
    revenue: 4361646000, otherRevenue: 10865000, premium: 4257798000, medical: 3263496000,
    sga: 829368000, operatingIncome: 253370000, netIncome: 233575000, eps: 0.82,
    basicShares: 235056000, dilutedShares: 299186000
  }),
  oscarQuarter({
    endDate: '2024-09-30', startDate: '2024-01-01', acceptedDate: '2024-11-07', year: 2024, quarter: 3,
    revenue: 6785128000, otherRevenue: 15764000, premium: 6626055000, medical: 5267475000,
    sga: 1289745000, operatingIncome: 204996000, netIncome: 178979000, eps: 0.65,
    basicShares: 237759000, dilutedShares: 301459000
  }),
  oscarQuarter({
    endDate: '2025-03-31', startDate: '2025-01-01', acceptedDate: '2025-05-07', year: 2025, quarter: 1,
    revenue: 3046263000, otherRevenue: 4330000, premium: 2995821000, medical: 2259651000,
    sga: 482759000, operatingIncome: 297123000, netIncome: 275271000, eps: 0.92,
    basicShares: 251279000, dilutedShares: 305938000
  }),
  oscarQuarter({
    endDate: '2025-06-30', startDate: '2025-01-01', acceptedDate: '2025-08-07', year: 2025, quarter: 2,
    revenue: 5910208000, otherRevenue: 10827000, premium: 5799265000, medical: 4812624000,
    sga: 1017244000, operatingIncome: 66640000, netIncome: 46910000, eps: 0.17,
    basicShares: 253417000, dilutedShares: 270244000
  }),
  oscarQuarter({
    endDate: '2025-09-30', startDate: '2025-01-01', acceptedDate: '2025-11-06', year: 2025, quarter: 3,
    revenue: 8896192000, otherRevenue: 19628000, premium: 8723233000, medical: 7398954000,
    sga: 1538836000, operatingIncome: -62610000, netIncome: -90540000, eps: -0.35,
    basicShares: 255419000, dilutedShares: 255419000
  })
];

test('exact concept matching never confuses OtherRevenues with total Revenues', () => {
  const value = pickMetricValue([
    concept('us-gaap_OtherRevenues', 8801000),
    concept('us-gaap_Revenues', 2985984000)
  ], ['Revenues']);

  assert.equal(value, 2985984000);
});

test('OSCR revenue, EPS and insurer ratios match the filed quarterly values', () => {
  const rows = parseQuarterlyFundamentals(oscarFilings, { now: new Date('2026-01-01') });
  const byPeriod = Object.fromEntries(rows.map((row) => [row.periodEnd, row]));

  assert.equal(byPeriod['2024-06-30'].revenue, 2219341000);
  assert.equal(byPeriod['2024-06-30'].eps, 0.20);
  assert.equal(byPeriod['2024-06-30'].grossMargin, null);
  assert.equal(byPeriod['2024-06-30'].medicalExpenseRatio, 79.0);
  assert.equal(byPeriod['2024-06-30'].sgaExpenseRatio, 19.6);
  assert.equal(byPeriod['2024-06-30'].operatingMargin, 3.1);
  assert.equal(byPeriod['2024-06-30'].netMargin, 2.5);

  assert.equal(byPeriod['2024-09-30'].revenue, 2423482000);
  assert.equal(byPeriod['2024-09-30'].eps, -0.22);
  assert.equal(byPeriod['2024-09-30'].medicalExpenseRatio, 84.6);
  assert.equal(byPeriod['2024-09-30'].netMargin, -2.3);

  assert.equal(byPeriod['2025-03-31'].revenue, 3046263000);
  assert.equal(byPeriod['2025-03-31'].eps, 0.92);
  assert.equal(byPeriod['2025-03-31'].netMargin, 9.0);

  assert.equal(byPeriod['2025-06-30'].revenue, 2863945000);
  assert.equal(byPeriod['2025-06-30'].eps, -0.89);
  assert.equal(byPeriod['2025-06-30'].epsGrowth, -545.0);
  assert.equal(byPeriod['2025-06-30'].revenueGrowth, 29.0);
  assert.equal(byPeriod['2025-06-30'].medicalExpenseRatio, 91.1);
  assert.equal(byPeriod['2025-06-30'].sgaExpenseRatio, 18.7);
  assert.equal(byPeriod['2025-06-30'].operatingMargin, -8.0);
  assert.equal(byPeriod['2025-06-30'].netMargin, -8.0);

  assert.equal(byPeriod['2025-09-30'].revenue, 2985984000);
  assert.equal(byPeriod['2025-09-30'].eps, -0.53);
  assert.equal(byPeriod['2025-09-30'].epsGrowth, -140.9);
  assert.equal(byPeriod['2025-09-30'].revenueGrowth, 23.2);
  assert.equal(byPeriod['2025-09-30'].medicalExpenseRatio, 88.5);
  assert.equal(byPeriod['2025-09-30'].sgaExpenseRatio, 17.5);
  assert.equal(byPeriod['2025-09-30'].operatingMargin, -4.3);
  assert.equal(byPeriod['2025-09-30'].netMargin, -4.6);
});

test('missing concepts remain null instead of becoming fabricated zero margins', () => {
  const [row] = parseQuarterlyFundamentals([{
    endDate: '2025-03-31',
    startDate: '2025-01-01',
    acceptedDate: '2025-05-01',
    year: 2025,
    quarter: 1,
    report: { ic: [concept('us-gaap_Revenues', 1000000)] }
  }], { now: new Date('2026-01-01') });

  assert.equal(row.grossMargin, null);
  assert.equal(row.operatingMargin, null);
  assert.equal(row.netMargin, null);
  assert.equal(row.eps, null);
  assert.equal(row.epsGrowth, null);
});
