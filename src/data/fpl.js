/**
 * Federal Poverty Level (FPL) — 2026
 * Source: HHS ASPE — published January 2026
 * Alaska and Hawaii have separate schedules per federal law.
 */

// Annual FPL by household size — contiguous 48 states + DC
const FPL_2026_BASE = {
  1: 15650,
  2: 21150,
  3: 26650,
  4: 32150,
  5: 37650,
  6: 43150,
  7: 48650,
  8: 54150,
};
// Each additional person beyond 8: +$5,500

const FPL_2026_ALASKA = {
  1: 19560,
  2: 26440,
  3: 33310,
  4: 40190,
  5: 47060,
  6: 53940,
  7: 60810,
  8: 67690,
};

const FPL_2026_HAWAII = {
  1: 17990,
  2: 24320,
  3: 30650,
  4: 36980,
  5: 43310,
  6: 49640,
  7: 55970,
  8: 62300,
};

/**
 * Get annual FPL for a given household size and state.
 * @param {number} householdSize
 * @param {string} state - 2-letter state code
 * @returns {number} annual FPL in dollars
 */
export function getAnnualFPL(householdSize, state = 'TX') {
  const size = Math.max(1, Math.min(householdSize, 8));
  const extra = householdSize > 8 ? (householdSize - 8) * 5500 : 0;

  let base;
  if (state === 'AK') base = FPL_2026_ALASKA[size] + (householdSize > 8 ? (householdSize - 8) * 6880 : 0);
  else if (state === 'HI') base = FPL_2026_HAWAII[size] + (householdSize > 8 ? (householdSize - 8) * 6330 : 0);
  else base = FPL_2026_BASE[size] + extra;

  return base;
}

/**
 * Get monthly FPL.
 */
export function getMonthlyFPL(householdSize, state = 'TX') {
  return Math.round(getAnnualFPL(householdSize, state) / 12);
}

/**
 * Calculate what percentage of FPL a household's gross monthly income represents.
 * @param {number} monthlyIncome
 * @param {number} householdSize
 * @param {string} state
 * @returns {number} percentage (e.g. 85 = 85% FPL)
 */
export function getIncomeAsFPLPercent(monthlyIncome, householdSize, state = 'TX') {
  const monthlyFPL = getMonthlyFPL(householdSize, state);
  if (!monthlyFPL) return 999;
  return Math.round((monthlyIncome / monthlyFPL) * 100);
}
