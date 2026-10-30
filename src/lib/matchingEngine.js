/**
 * Eligibility Matching Engine
 * Pure functions — no side effects, no API calls, fully testable.
 *
 * matchPrograms(profile, programs) → MatchResult[]
 * MatchResult: { program, confidence, reasons, dataGaps }
 *
 * confidence:
 *   'likely'         — passed all checkable rules
 *   'possibly'       — passed hard rules but missing data prevented full check
 *   'check_manually' — unusual situation; rules unclear from standard data
 */

import { getIncomeAsFPLPercent } from '../data/fpl';

// ── Confidence levels ────────────────────────────────────────────────────────
export const CONFIDENCE = {
  LIKELY:         'likely',
  POSSIBLY:       'possibly',
  CHECK_MANUALLY: 'check_manually',
  NO:             'no',
};

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * Run all programs through the eligibility engine for a given user profile.
 * Returns only programs that are not definitively excluded.
 *
 * @param {object} profile — built from OnboardingForm
 * @param {object[]} programs — from programs.js
 * @returns {MatchResult[]} sorted: likely first, then possibly, then check_manually
 */
export function matchPrograms(profile, programs) {
  const results = programs
    .map(program => evaluateProgram(profile, program))
    .filter(r => r.confidence !== CONFIDENCE.NO);

  // Sort: likely → possibly → check_manually
  const order = { likely: 0, possibly: 1, check_manually: 2 };
  return results.sort((a, b) => order[a.confidence] - order[b.confidence]);
}

/**
 * Evaluate a single program against the user profile.
 * @param {object} profile
 * @param {object} program
 * @returns {MatchResult}
 */
export function evaluateProgram(profile, program) {
  const reasons = [];  // reasons they may qualify (affirmatives)
  const dataGaps = []; // what we don't know that could change the answer
  const rules = program.rules;

  // ── 0. STATE ELIGIBILITY — hard exclude ──────────────────────────────────
  // If program.state is set, the program is state-specific (e.g. 'NC', 'TX').
  // Only show it to users in that state.
  if (program.state) {
    if (profile.residentState && profile.residentState !== program.state) {
      return exclude(`This program is only available in ${program.state}.`);
    }
    if (!profile.residentState) {
      dataGaps.push('Your state of residence');
    }
  }

  // If any states are explicitly excluded and the user is in one, hard exclude.
  if (rules.statesExcluded && rules.statesExcluded.length > 0 && profile.residentState) {
    if (rules.statesExcluded.includes(profile.residentState)) {
      return exclude('This program is not available in your state.');
    }
  }

  // ── 1. VETERAN CHECK — hard exclude ─────────────────────────────────────
  if (rules.requiresVeteran) {
    if (profile.isVeteran === false) {
      return exclude('This program is only available to veterans or active duty military.');
    }
    if (profile.isVeteran === null) {
      dataGaps.push('Whether you or a household member is a veteran');
    } else {
      // Additional discharge check for VA Pension
      if (rules.dischargRequired && profile.veteranDischarge) {
        if (!rules.dischargRequired.includes(profile.veteranDischarge)) {
          return exclude('Requires an honorable or general discharge. Other than honorable discharge may not qualify.');
        }
      }
      reasons.push('Veteran or active military household member');
    }
  }

  // ── 2. CITIZENSHIP — hard exclude ───────────────────────────────────────
  if (rules.citizenshipRequired === 'citizen_only') {
    if (profile.citizenship === 'non_citizen') {
      return exclude('This program requires U.S. citizenship.');
    }
    if (profile.citizenship === 'qualified') {
      return exclude('This program requires U.S. citizenship only — qualified non-citizens are generally not eligible.');
    }
    if (!profile.citizenship || profile.citizenship === 'prefer_not') {
      dataGaps.push('Citizenship status');
    }
  }

  if (rules.citizenshipRequired === 'citizen_or_qualified') {
    if (profile.citizenship === 'non_citizen') {
      return exclude('This program requires citizenship or a qualified immigration status.');
    }
    if (!profile.citizenship || profile.citizenship === 'prefer_not') {
      dataGaps.push('Citizenship or immigration status');
    } else {
      reasons.push('Citizenship/immigration status meets requirements');
    }
  }
  // 'any' = no check needed

  // ── 3. AGE — hard exclude ────────────────────────────────────────────────
  if (rules.ageMin !== null && rules.ageMin !== undefined) {
    if (profile.age !== null && profile.age < rules.ageMin) {
      // EITC: no age minimum when applicant has qualifying children
      if (program.id === 'eitc' && profile.hasChildren === true) {
        // children present — age floor does not apply
      // Don't exclude if program serves the household (e.g. CSFP for 60+ in household)
      } else if (rules.requiresElderly && profile.hasElderly) {
        // elderly member satisfies this — don't exclude
      } else {
        return exclude(`This program requires applicants to be at least ${rules.ageMin} years old.`);
      }
    }
    if (profile.age === null) {
      dataGaps.push('Your age');
    }
  }

  if (rules.ageMax !== null && rules.ageMax !== undefined) {
    // For programs that serve children — check household children, not applicant age
    if (rules.requiresChildren) {
      // Child age programs — check children exist, not the applicant's age
    } else {
      if (profile.age !== null && profile.age > rules.ageMax) {
        return exclude(`This program is for people under ${rules.ageMax + 1} years old.`);
      }
      if (profile.age === null) {
        dataGaps.push('Your age');
      }
    }
  }

  // ── 4. REQUIRES CHILDREN — hard exclude ─────────────────────────────────
  if (rules.requiresChildren) {
    if (profile.hasChildren === false) {
      // Special WIC case — also serves pregnant women regardless of children
      if (program.id === 'wic' && profile.hasPregnant === true) {
        reasons.push('Pregnant household member qualifies for WIC');
      } else {
        return exclude('This program requires children under 18 in the household.');
      }
    }
    if (profile.hasChildren === null) {
      dataGaps.push('Whether there are children in your household');
    } else if (profile.hasChildren === true) {
      reasons.push('Children in household');
    }
  }

  // ── 5. REQUIRES ELDERLY ──────────────────────────────────────────────────
  if (rules.requiresElderly) {
    // Applies to the whole household, not just the applicant
    const elderlyPresent = profile.hasElderly === true || (profile.age !== null && profile.age >= 60);
    if (elderlyPresent) {
      reasons.push('Household includes someone 60 or older');
    } else if (profile.hasElderly === false && (profile.age === null || profile.age < 60)) {
      return exclude('This program is for households with adults 60 or older.');
    } else {
      dataGaps.push('Whether your household includes someone 60+');
    }
  }

  // ── 6. REQUIRES DISABILITY ───────────────────────────────────────────────
  if (rules.requiresDisabled) {
    const disabilityPresent = profile.hasDisabled === true || profile.hasHouseholdDisability === true;
    const definitelyNo = profile.hasDisabled === false && profile.hasHouseholdDisability === false;
    if (disabilityPresent) {
      reasons.push('Household member with a disability');
    } else if (definitelyNo) {
      return exclude('This program requires a qualifying disability.');
    } else {
      dataGaps.push('Whether anyone in your household has a documented disability');
    }
  }

  // ── 6a. REQUIRES DISABLED OR ELDERLY (e.g. SSI) ──────────────────────────
  if (rules.requiresDisabledOrElderly) {
    const elderlyPresent = profile.hasElderly === true || (profile.age !== null && parseInt(profile.age) >= 65);
    const disabilityPresent = profile.hasDisabled === true || profile.hasHouseholdDisability === true;
    const definitelyNo =
      profile.hasDisabled === false &&
      profile.hasHouseholdDisability === false &&
      profile.hasElderly === false &&
      profile.age !== null && parseInt(profile.age) < 65;
    if (elderlyPresent || disabilityPresent) {
      reasons.push('Household member is 65+ or has a qualifying disability');
    } else if (definitelyNo) {
      return exclude('This program requires you or a household member to be age 65+, blind, or have a qualifying disability.');
    } else {
      dataGaps.push('Whether you or a household member is 65+, blind, or has a qualifying disability');
    }
  }

  // ── 6b. REQUIRES PREGNANT OR NURSING ─────────────────────────────────────
  if (rules.requiresPregnant) {
    const qualifies = profile.hasPregnant === true || profile.isNursing === true;
    const definitelyNo = profile.hasPregnant === false && profile.isNursing === false;
    if (qualifies) {
      reasons.push('Pregnant or nursing household member qualifies');
    } else if (definitelyNo) {
      return exclude('This program is for pregnant or nursing/breastfeeding mothers only.');
    } else {
      dataGaps.push('Whether anyone in your household is currently pregnant or nursing');
    }
  }

  // ── 6c. REQUIRES BUSINESS OWNER ──────────────────────────────────────────
  if (rules.requiresBusinessOwner) {
    if (profile.isBusinessOwner === false) {
      return exclude('This program is for small business owners or entrepreneurs starting a business.');
    }
    if (profile.isBusinessOwner === null) {
      dataGaps.push('Whether you own or are interested in starting a small business');
    } else {
      reasons.push('Small business owner or entrepreneur');
    }
  }

  // ── 7. STUDENT EXCLUSION ─────────────────────────────────────────────────
  if (rules.studentExclusion) {
    if (profile.isStudent === true && profile.studentEnrollment === 'full_time') {
      // Not a hard exclude — SNAP has many exceptions for students
      // Flag as possibly instead of excluding
      dataGaps.push('Student status exemptions (students with dependents, working 20+ hrs/week, or unable to work may still qualify)');
    }
  }

  // ── 8. REQUIRES STUDENT (education programs) ─────────────────────────────
  if (rules.requiresStudent) {
    if (profile.isStudent === false) {
      return exclude('This program requires current enrollment in an accredited school or training program.');
    }
    if (profile.isStudent === null) {
      dataGaps.push('Whether you are currently enrolled as a student');
    } else {
      reasons.push('Currently enrolled as a student');
    }
  }

  // ── 9. HOUSING TYPE ──────────────────────────────────────────────────────
  if (rules.housingRequired === 'rent') {
    if (profile.housingStatus === 'own') {
      return exclude('This program is for renters only.');
    }
    if (!profile.housingStatus) {
      dataGaps.push('Your housing situation (renter or owner)');
    }
  }

  if (rules.housingRequired === 'own') {
    if (profile.housingStatus && profile.housingStatus !== 'own') {
      return exclude('This program is for homeowners only.');
    }
    if (!profile.housingStatus) {
      dataGaps.push('Your housing situation (homeowner or renter)');
    } else {
      reasons.push('Homeowner');
    }
  }

  // ── 9b. REQUIRES HOMELESS / HOUSING CRISIS ─────────────────────────────
  if (rules.requiresHomeless) {
    const isHomeless = profile.housingStatus === 'homeless';
    const atRisk = profile.housingStatus === 'rent' && profile.rentStatus === 'behind';
    const mortgageCrisis = profile.housingStatus === 'own' && (profile.mortgageStatus === 'behind_1_2' || profile.mortgageStatus === 'behind_3plus');
    if (profile.housingStatus && !isHomeless && !atRisk && !mortgageCrisis) {
      return exclude('This program is for people experiencing or at risk of homelessness.');
    }
    if (isHomeless) {
      reasons.push('Currently experiencing homelessness');
    } else if (atRisk || mortgageCrisis) {
      reasons.push('At risk of losing housing');
    } else if (!profile.housingStatus) {
      dataGaps.push('Your housing situation');
    }
  }

  // Special: WIC also applies to pregnant and nursing women regardless of age/children
  if (program.id === 'wic') {
    const wicEligible =
      profile.hasChildren === true ||
      profile.hasPregnant === true ||
      profile.isNursing === true ||
      (profile.age !== null && profile.age <= 5);

    if (!wicEligible && profile.hasChildren === false && profile.hasPregnant === false && profile.isNursing === false) {
      return exclude('WIC is for pregnant women, nursing mothers, and households with children under 5.');
    }
    if (profile.hasPregnant === true) reasons.push('Pregnant household member');
    if (profile.isNursing === true) reasons.push('Nursing/breastfeeding household member');
    if (profile.hasChildren === true && profile.childrenAgeGroups && profile.childrenAgeGroups.includes('under5')) {
      reasons.push('Child under 5 in household');
    }
  }

  // ── 9a. REQUIRES EARNED INCOME (e.g. EITC) ───────────────────────────────
  if (rules.requiresEarnedIncome) {
    const earnedStatuses = ['full_time', 'part_time', 'self_employed'];
    const hasEarnedStatus = earnedStatuses.includes(profile.employmentStatus);
    const hasEarnedSource = profile.incomeSources &&
      (profile.incomeSources.includes('wages') || profile.incomeSources.includes('self_employment'));
    const hasEarned = hasEarnedStatus || hasEarnedSource;
    const definitelyNoEarned =
      profile.employmentStatus &&
      !hasEarnedStatus &&
      profile.incomeSources && profile.incomeSources.length > 0 &&
      !hasEarnedSource;
    if (definitelyNoEarned) {
      return exclude('This program requires earned income from wages or self-employment.');
    }
    if (hasEarned) {
      reasons.push('Has earned income from work or self-employment');
    } else if (!profile.employmentStatus) {
      dataGaps.push('Your employment status and income sources');
    }
  }

  // ── 10. INCOME CHECK ─────────────────────────────────────────────────────
  const incomeResult = checkIncome(profile, program);
  if (incomeResult.result === 'fail') {
    return exclude(incomeResult.reason);
  }
  if (incomeResult.result === 'unknown') {
    dataGaps.push('Your household income');
  } else if (incomeResult.result === 'pass') {
    reasons.push(incomeResult.reason);
  }

  // ── 11. CURRENTLY RECEIVING THIS PROGRAM ────────────────────────────────
  const benefitKey = program.benefitKey || mapBenefitKey(program.id);
  if (benefitKey && profile.currentBenefits && profile.currentBenefits.includes(benefitKey)) {
    return {
      program,
      confidence: CONFIDENCE.NO,
      alreadyEnrolled: true,
      reasons: [],
      dataGaps: [],
    };
  }

  // ── Build result ─────────────────────────────────────────────────────────
  let confidence = dataGaps.length > 0
    ? (reasons.length > 0 ? CONFIDENCE.POSSIBLY : CONFIDENCE.CHECK_MANUALLY)
    : CONFIDENCE.LIKELY;

  // Programs that can never be LIKELY due to unverifiable conditions
  if (rules.alwaysPossibly && confidence === CONFIDENCE.LIKELY) {
    confidence = CONFIDENCE.POSSIBLY;
    dataGaps.push('Specific eligibility details must be confirmed with the program');
  }

  return {
    program,
    confidence,
    reasons,
    dataGaps,
    alreadyEnrolled: false,
  };
}

// ── Income evaluation ────────────────────────────────────────────────────────

function checkIncome(profile, program) {
  const rules = program.rules;

  if (rules.incomeLimitType === 'none') {
    return { result: 'pass', reason: 'No income limit for this program' };
  }

  // Income not provided
  if (profile.monthlyIncome === null || profile.monthlyIncome === '') {
    return { result: 'unknown' };
  }

  const income = parseFloat(profile.monthlyIncome);
  const householdSize = profile.householdSize || 1;
  // FPL only differs for Alaska and Hawaii; any other code uses the base table.
  const state = profile.residentState || '';

  if (rules.incomeLimitType === 'fpl_percent') {
    const fplPercent = getIncomeAsFPLPercent(income, householdSize, state);
    const limit = rules.incomeLimitPercent;

    if (fplPercent <= limit) {
      return {
        result: 'pass',
        reason: `Income is within the ${limit}% FPL limit for this program`,
      };
    } else {
      return {
        result: 'fail',
        reason: `Income appears to exceed the ${limit}% FPL limit (your income is approximately ${fplPercent}% FPL for a household of ${householdSize})`,
      };
    }
  }

  if (rules.incomeLimitType === 'absolute') {
    const limit = rules.incomeLimitMonthly;
    if (income <= limit) {
      return {
        result: 'pass',
        reason: `Income is within the $${limit.toLocaleString()}/month limit for this program`,
      };
    } else {
      return {
        result: 'fail',
        reason: `Income appears to exceed the $${limit.toLocaleString()}/month limit for this program`,
      };
    }
  }

  return { result: 'unknown' };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function exclude(reason) {
  return {
    program: null,
    confidence: CONFIDENCE.NO,
    reasons: [],
    dataGaps: [],
    excludeReason: reason,
    alreadyEnrolled: false,
  };
}

// Map program IDs to the benefit keys used in the onboarding form
function mapBenefitKey(programId) {
  const map = {
    snap:           'snap',
    medicaid:       'medicaid',
    medicare:       'medicare',
    'medicare-savings': 'medicare',
    'section-8':    'section8',
    ssi:            'ssi',
    ssdi:           'ssdi',
    tanf:           'tanf',
    wic:            'wic',
    chip:           'chip',
    liheap:         'liheap',
  };
  return map[programId] || null;
}

/**
 * Get a human-readable summary of the match for display.
 */
export function getConfidenceLabel(confidence) {
  switch (confidence) {
    case CONFIDENCE.LIKELY:         return 'Likely Eligible';
    case CONFIDENCE.POSSIBLY:       return 'Possibly Eligible';
    case CONFIDENCE.CHECK_MANUALLY: return 'May Be Eligible';
    default:                        return '';
  }
}

export function getConfidenceColor(confidence) {
  switch (confidence) {
    case CONFIDENCE.LIKELY:         return 'green';
    case CONFIDENCE.POSSIBLY:       return 'yellow';
    case CONFIDENCE.CHECK_MANUALLY: return 'gray';
    default:                        return 'gray';
  }
}
