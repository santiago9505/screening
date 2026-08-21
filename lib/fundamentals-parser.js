function normalizeConceptName(value) {
  const raw = String(value || '');
  const separatorIndex = Math.max(raw.lastIndexOf(':'), raw.lastIndexOf('_'));
  const localName = separatorIndex >= 0 ? raw.slice(separatorIndex + 1) : raw;
  return localName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function roundToOrNull(value, decimals = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function safeGrowth(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  return roundToOrNull(((current - previous) / Math.abs(previous)) * 100, 1);
}

function parseDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toISODate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCalendarQuarter(date) {
  return Math.floor(date.getUTCMonth() / 3) + 1;
}

function getPeriodDays(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const diffMs = endDate.getTime() - startDate.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return null;
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Selects only exact XBRL local concept names. Using substring matching here is
 * dangerous: for example, `OtherRevenues` must never satisfy `Revenues`.
 */
export function pickMetricValue(items, conceptNames = []) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const normalizedItems = items
    .map((item) => ({
      concept: normalizeConceptName(item && item.concept),
      value: Number(item && item.value)
    }))
    .filter((item) => item.concept && Number.isFinite(item.value));

  for (const conceptName of conceptNames) {
    const normalizedName = normalizeConceptName(conceptName);
    const match = normalizedItems.find((item) => item.concept === normalizedName);
    if (match) return match.value;
  }

  return null;
}

function deriveQuarterMetric(records, sourceField, targetField) {
  const previousRawByFiscalYear = new Map();

  records.forEach((record) => {
    const rawValue = record[sourceField];
    if (!Number.isFinite(rawValue)) {
      record[targetField] = null;
      return;
    }

    const fiscalYearKey = Number.isFinite(record.fiscalYear) ? record.fiscalYear : record.calendarYear;
    const quarterIndex = Number.isFinite(record.fiscalQuarter) ? record.fiscalQuarter : record.calendarQuarter;
    const previousRaw = previousRawByFiscalYear.get(fiscalYearKey);

    if (record.isCumulative && quarterIndex > 1 && previousRaw && Number.isFinite(previousRaw.value)) {
      record[targetField] = rawValue - previousRaw.value;
    } else {
      record[targetField] = rawValue;
    }

    previousRawByFiscalYear.set(fiscalYearKey, {
      value: rawValue,
      periodDays: record.periodDays,
      quarterIndex
    });
  });
}

function deriveQuarterAverage(records, sourceField, targetField) {
  const previousRawByFiscalYear = new Map();

  records.forEach((record) => {
    const rawValue = record[sourceField];
    if (!Number.isFinite(rawValue)) {
      record[targetField] = null;
      return;
    }

    const fiscalYearKey = Number.isFinite(record.fiscalYear) ? record.fiscalYear : record.calendarYear;
    const quarterIndex = Number.isFinite(record.fiscalQuarter) ? record.fiscalQuarter : record.calendarQuarter;
    const previousRaw = previousRawByFiscalYear.get(fiscalYearKey);
    let quarterAverage = rawValue;

    if (record.isCumulative && quarterIndex > 1 && previousRaw && Number.isFinite(previousRaw.value)) {
      const currentDays = record.periodDays;
      const previousDays = previousRaw.periodDays;
      const quarterDays = Number.isFinite(currentDays) && Number.isFinite(previousDays)
        ? currentDays - previousDays
        : null;

      if (Number.isFinite(quarterDays) && quarterDays > 0) {
        quarterAverage = ((rawValue * currentDays) - (previousRaw.value * previousDays)) / quarterDays;
      } else {
        quarterAverage = (rawValue * quarterIndex) - (previousRaw.value * (quarterIndex - 1));
      }
    }

    record[targetField] = Number.isFinite(quarterAverage) && quarterAverage > 0
      ? quarterAverage
      : rawValue;
    previousRawByFiscalYear.set(fiscalYearKey, {
      value: rawValue,
      periodDays: record.periodDays,
      quarterIndex
    });
  });
}

function deriveQuarterEPS(records) {
  const previousRawEpsByFiscalYear = new Map();

  records.forEach((record) => {
    const fiscalYearKey = Number.isFinite(record.fiscalYear) ? record.fiscalYear : record.calendarYear;
    const quarterIndex = Number.isFinite(record.fiscalQuarter) ? record.fiscalQuarter : record.calendarQuarter;
    const previousRawEps = previousRawEpsByFiscalYear.get(fiscalYearKey);
    let eps = Number.isFinite(record.epsRaw) ? record.epsRaw : null;
    let epsBasis = Number.isFinite(eps) ? 'reported' : 'derived';

    if (record.isCumulative && quarterIndex > 1) {
      const ytdDelta = Number.isFinite(record.epsRaw) && Number.isFinite(previousRawEps)
        ? record.epsRaw - previousRawEps
        : null;
      const lossShares = record.basicShares;

      // EPS is a ratio and normally cannot be subtracted across YTD periods.
      // For loss quarters, the anti-dilution rules make basic weighted shares
      // the correct denominator, which reconstructs the filed quarterly EPS.
      if (Number.isFinite(record.netIncome) && record.netIncome < 0 && Number.isFinite(lossShares) && lossShares > 0) {
        eps = record.netIncome / lossShares;
        epsBasis = 'derived-from-filing';
      } else if (Number.isFinite(ytdDelta)) {
        eps = ytdDelta;
        epsBasis = 'reported-ytd-delta';
      }
    }

    if (!Number.isFinite(eps)) {
      const shares = Number.isFinite(record.netIncome) && record.netIncome < 0
        ? record.basicShares
        : record.dilutedShares;
      if (Number.isFinite(record.netIncome) && Number.isFinite(shares) && shares > 0) {
        eps = record.netIncome / shares;
        epsBasis = 'derived-from-filing';
      }
    }

    record.eps = Number.isFinite(eps) ? eps : null;
    record.epsBasis = Number.isFinite(eps) ? epsBasis : null;
    previousRawEpsByFiscalYear.set(fiscalYearKey, record.epsRaw);
  });
}

function toFundamentalRecord(entry, now) {
  const endDate = parseDateOrNull(entry && entry.endDate);
  if (!endDate || endDate.getTime() > now.getTime()) return null;

  const startDate = parseDateOrNull(entry && entry.startDate);
  const periodDays = getPeriodDays(startDate, endDate);
  const fiscalQuarterRaw = Number(entry && entry.quarter);
  const fiscalYearRaw = Number(entry && entry.year);
  const acceptedDate = parseDateOrNull(entry && (entry.acceptedDate || entry.filedDate || entry.endDate));
  const incomeStatement = Array.isArray(entry && entry.report && entry.report.ic)
    ? entry.report.ic
    : [];

  const fiscalQuarter = Number.isFinite(fiscalQuarterRaw) && fiscalQuarterRaw >= 1 && fiscalQuarterRaw <= 4
    ? fiscalQuarterRaw
    : null;
  const fiscalYear = Number.isFinite(fiscalYearRaw) ? fiscalYearRaw : null;
  const calendarQuarter = getCalendarQuarter(endDate);
  const calendarYear = endDate.getUTCFullYear();
  const periodEnd = toISODate(endDate);
  if (!periodEnd) return null;

  return {
    periodEnd,
    periodEndMs: endDate.getTime(),
    reportedDate: acceptedDate ? toISODate(acceptedDate) : null,
    acceptedDateMs: acceptedDate ? acceptedDate.getTime() : 0,
    fiscalYear,
    fiscalQuarter,
    calendarYear,
    calendarQuarter,
    periodDays,
    isCumulative: fiscalQuarterRaw === 0 || (Number.isFinite(periodDays) && periodDays > 120),
    revenueRaw: pickMetricValue(incomeStatement, [
      'Revenues',
      'TotalRevenue',
      'SalesRevenueNet',
      'RevenuesNetOfInterestExpense',
      'OperatingRevenues',
      'RevenuesFromExternalCustomers',
      'RevenueFromContractWithCustomerExcludingAssessedTax'
    ]),
    premiumRevenueRaw: pickMetricValue(incomeStatement, [
      'PremiumsEarnedNet',
      'PremiumRevenue',
      'HealthCarePremiumRevenue'
    ]),
    medicalExpenseRaw: pickMetricValue(incomeStatement, [
      'PolicyholderBenefitsAndClaimsIncurredNet',
      'PolicyholderBenefitsAndClaimsPayableCurrentAndNoncurrent',
      'MedicalClaimsExpense'
    ]),
    sgaExpenseRaw: pickMetricValue(incomeStatement, [
      'SellingGeneralAndAdministrativeExpense',
      'SellingGeneralAndAdministrativeExpenseIncludingShareBasedCompensation'
    ]),
    grossProfitRaw: pickMetricValue(incomeStatement, ['GrossProfit']),
    operatingIncomeRaw: pickMetricValue(incomeStatement, ['OperatingIncomeLoss']),
    netIncomeRaw: pickMetricValue(incomeStatement, [
      'NetIncomeLossAvailableToCommonStockholdersDiluted',
      'NetIncomeLossAvailableToCommonStockholdersBasic',
      'NetIncomeLoss'
    ]),
    epsRaw: pickMetricValue(incomeStatement, [
      'EarningsPerShareDiluted',
      'EarningsPerShareBasicAndDiluted',
      'EarningsPerShareBasic',
      'BasicAndDilutedEarningsPerShare'
    ]),
    dilutedSharesRaw: pickMetricValue(incomeStatement, [
      'WeightedAverageNumberOfDilutedSharesOutstanding',
      'WeightedAverageNumberOfDilutedShares'
    ]),
    basicSharesRaw: pickMetricValue(incomeStatement, [
      'WeightedAverageNumberOfSharesOutstandingBasic',
      'WeightedAverageNumberOfSharesOutstanding'
    ])
  };
}

export function parseQuarterlyFundamentals(entries = [], { now = new Date() } = {}) {
  const byPeriodEnd = new Map();

  entries.forEach((entry) => {
    const record = toFundamentalRecord(entry, now);
    if (!record) return;

    const existing = byPeriodEnd.get(record.periodEnd);
    if (!existing || record.acceptedDateMs >= existing.acceptedDateMs) {
      byPeriodEnd.set(record.periodEnd, record);
    }
  });

  const records = Array.from(byPeriodEnd.values()).sort((a, b) => a.periodEndMs - b.periodEndMs);
  if (records.length === 0) return [];

  [
    ['revenueRaw', 'revenue'],
    ['premiumRevenueRaw', 'premiumRevenue'],
    ['medicalExpenseRaw', 'medicalExpense'],
    ['sgaExpenseRaw', 'sgaExpense'],
    ['grossProfitRaw', 'grossProfit'],
    ['operatingIncomeRaw', 'operatingIncome'],
    ['netIncomeRaw', 'netIncome']
  ].forEach(([sourceField, targetField]) => deriveQuarterMetric(records, sourceField, targetField));
  deriveQuarterAverage(records, 'dilutedSharesRaw', 'dilutedShares');
  deriveQuarterAverage(records, 'basicSharesRaw', 'basicShares');
  deriveQuarterEPS(records);

  const byCalendarQuarter = new Map();
  records.forEach((record) => {
    byCalendarQuarter.set(`${record.calendarYear}-Q${record.calendarQuarter}`, record);
  });

  return records
    .map((record) => {
      const previous = byCalendarQuarter.get(`${record.calendarYear - 1}-Q${record.calendarQuarter}`);
      const revenue = Number.isFinite(record.revenue) ? record.revenue : null;
      const eps = Number.isFinite(record.eps) ? record.eps : null;
      const reportedEps = roundToOrNull(eps, 2);
      const previousReportedEps = roundToOrNull(previous && previous.eps, 2);
      const canCalculateRevenueRatio = Number.isFinite(revenue) && revenue > 0;
      const canCalculateMedicalRatio = Number.isFinite(record.premiumRevenue)
        && record.premiumRevenue > 0
        && Number.isFinite(record.medicalExpense);

      return {
        quarter: `Q${record.calendarQuarter}`,
        year: record.calendarYear,
        periodEnd: record.periodEnd,
        reportedDate: record.reportedDate,
        fiscalYear: record.fiscalYear,
        fiscalQuarter: record.fiscalQuarter,
        eps: reportedEps,
        epsBasis: record.epsBasis,
        epsGrowth: safeGrowth(reportedEps, previousReportedEps),
        revenue: roundToOrNull(revenue, 0),
        revenueGrowth: safeGrowth(revenue, previous && previous.revenue),
        grossMargin: canCalculateRevenueRatio && Number.isFinite(record.grossProfit)
          ? roundToOrNull((record.grossProfit / revenue) * 100, 1)
          : null,
        medicalExpenseRatio: canCalculateMedicalRatio
          ? roundToOrNull((record.medicalExpense / record.premiumRevenue) * 100, 1)
          : null,
        sgaExpenseRatio: canCalculateRevenueRatio && Number.isFinite(record.sgaExpense)
          ? roundToOrNull((record.sgaExpense / revenue) * 100, 1)
          : null,
        operatingMargin: canCalculateRevenueRatio && Number.isFinite(record.operatingIncome)
          ? roundToOrNull((record.operatingIncome / revenue) * 100, 1)
          : null,
        netMargin: canCalculateRevenueRatio && Number.isFinite(record.netIncome)
          ? roundToOrNull((record.netIncome / revenue) * 100, 1)
          : null
      };
    })
    .filter((item) => Number.isFinite(item.eps) || Number.isFinite(item.revenue))
    .slice(-12);
}
