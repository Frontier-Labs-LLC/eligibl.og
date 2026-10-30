/**
 * Builds a state's headline aid programs from the facts in stateFacts.js.
 *
 * Each record follows the same shape as the hand-written programs in
 * programs.js and nc-programs.js so the matching engine and results page can
 * treat them identically. `benefitKey` tells the engine which "already
 * receiving" checkbox on the form corresponds to the program.
 */

import STATE_FACTS from './stateFacts';

const LAST_VERIFIED = '2026-01-01';

const BASE_RULES = {
  citizenshipRequired: 'citizen_or_qualified',
  ageMin: null,
  ageMax: null,
  requiresChildren: false,
  requiresElderly: false,
  requiresDisabled: false,
  requiresPregnant: false,
  requiresVeteran: false,
  studentExclusion: false,
  requiresStudent: false,
  statesExcluded: [],
};

function commonDocuments(stateName) {
  return [
    'Photo ID for the applicant',
    `Proof of ${stateName} residency (lease, utility bill, or postmarked mail)`,
    'Proof of income for everyone in the household (pay stubs, award letters)',
    'Social Security numbers or immigration documents for household members applying',
  ];
}

function buildMedicaid(code, f) {
  const m = f.medicaid;
  const expanded = m.expanded !== false;
  const limit = expanded ? 138 : (m.parentLimit || 50);
  return {
    id: `${code.toLowerCase()}-medicaid`,
    name: m.name,
    fullName: `${f.name} Medicaid — health coverage for adults`,
    category: 'healthcare',
    level: 'state',
    state: code,
    status: 'active',
    benefitKey: 'medicaid',
    description: expanded
      ? `${m.name} is ${f.name}'s Medicaid program. Because ${f.name} adopted Medicaid expansion, adults 19–64 with household income up to about 138% of the Federal Poverty Level can get free or very low-cost health coverage, along with children, pregnant women, seniors, and people with disabilities.`
      : `${m.name} is ${f.name}'s Medicaid program. ${f.name} has not adopted full Medicaid expansion, so adults without children usually do not qualify. Parents and caretakers with very low income, children, pregnant women, seniors, and people with disabilities may qualify under separate categories.`,
    howToApply: `Apply online through ${f.agency} at ${f.portal}, by phone${f.phone ? ` at ${f.phone}` : ''}, or in person at your county or local benefits office. Applications are accepted year-round.`,
    applicationUrl: f.portal,
    website: m.url,
    phone: f.phone || null,
    documentsNeeded: [
      ...commonDocuments(f.name),
      'Proof of citizenship or qualifying immigration status',
    ],
    benefit: {
      type: 'health_insurance',
      description: 'Health coverage — doctor visits, hospital care, prescriptions, behavioral health, and preventive care',
      amountNote: expanded
        ? 'Free or very low-cost coverage; little or no cost-sharing for most services'
        : 'Free coverage for those who qualify; adult eligibility is limited in this state',
    },
    rules: {
      ...BASE_RULES,
      incomeLimitType: 'fpl_percent',
      incomeLimitPercent: limit,
      ageMin: 19,
      ageMax: 64,
      alwaysPossibly: !expanded,
      note: expanded
        ? 'Adults 19–64 qualify up to 138% FPL under expansion. Children, pregnant women, and seniors have separate categories with different limits.'
        : `Approximate parent/caretaker limit of ${limit}% FPL. Adults without dependent children generally are not covered. Verify with the state office.`,
    },
    tags: ['medicaid', 'health coverage', 'insurance', f.name, code],
    relatedPrograms: ['medicaid', `${code.toLowerCase()}-chip`],
    lastVerified: LAST_VERIFIED,
    sourceUrl: m.url,
  };
}

function buildChip(code, f) {
  const c = f.chip;
  return {
    id: `${code.toLowerCase()}-chip`,
    name: c.name,
    fullName: `${f.name} children's health coverage (Medicaid / CHIP)`,
    category: 'healthcare',
    level: 'state',
    state: code,
    status: 'active',
    benefitKey: 'chip',
    description: `${c.name} provides free or low-cost health insurance for children under 19 in ${f.name} whose families earn too much for regular Medicaid but cannot afford private coverage. Coverage includes check-ups, immunizations, dental, vision, prescriptions, and hospital care.`,
    howToApply: `Apply through ${f.agency} at ${f.portal}${f.phone ? ` or call ${f.phone}` : ''}. One application checks children for both Medicaid and CHIP.`,
    applicationUrl: f.portal,
    website: c.url,
    phone: f.phone || null,
    documentsNeeded: [
      "Child's birth certificate or proof of age",
      ...commonDocuments(f.name),
    ],
    benefit: {
      type: 'health_insurance',
      description: 'Full health coverage for children — well-child visits, dental, vision, prescriptions, and hospital care',
      amountNote: 'Free for most families; some states charge small premiums or copays at higher incomes',
    },
    rules: {
      ...BASE_RULES,
      incomeLimitType: 'fpl_percent',
      incomeLimitPercent: c.limit || 200,
      requiresChildren: true,
      note: `Approximate upper limit of ${c.limit || 200}% FPL for children's coverage in ${f.name}. Children must be under 19.`,
    },
    tags: ['chip', 'children', 'health insurance', 'kids', f.name, code],
    relatedPrograms: ['chip', `${code.toLowerCase()}-medicaid`],
    lastVerified: LAST_VERIFIED,
    sourceUrl: c.url,
  };
}

function buildSnap(code, f) {
  const s = f.snap;
  const gross = s.grossLimit || 130;
  return {
    id: `${code.toLowerCase()}-snap`,
    name: s.name,
    fullName: `${f.name} Supplemental Nutrition Assistance Program (SNAP)`,
    category: 'food',
    level: 'state',
    state: code,
    status: 'active',
    benefitKey: 'snap',
    description: `${s.name} is how ${f.name} runs SNAP. Eligible households get a monthly EBT card to buy groceries at supermarkets, farmers markets, and many online retailers. Households with very low income can get expedited benefits within 7 days.`,
    howToApply: `Apply online at ${f.portal}, by mail, or at your county or local office${f.phone ? `. Questions: ${f.phone}` : ''}. Expect an interview by phone or in person within 30 days.`,
    applicationUrl: f.portal,
    website: s.url,
    phone: f.phone || null,
    documentsNeeded: [
      ...commonDocuments(f.name),
      'Proof of expenses (rent or mortgage, utilities, child care, medical bills for members 60+ or disabled)',
    ],
    benefit: {
      type: 'ebt_card',
      description: 'Monthly EBT card loaded with funds for groceries',
      amountNote: 'Varies by household size and income; up to roughly $292/month for one person and $975/month for four (FY2025 maximums)',
    },
    rules: {
      ...BASE_RULES,
      incomeLimitType: 'fpl_percent',
      incomeLimitPercent: gross,
      studentExclusion: true,
      note: gross > 130
        ? `${f.name} uses broad-based categorical eligibility with a gross income test around ${gross}% FPL. A net income test still applies.`
        : `Gross income must generally be at or below 130% FPL and net income at or below 100% FPL. Households with a member 60+ or disabled skip the gross test.`,
    },
    tags: ['snap', 'food', 'groceries', 'EBT', f.name, code],
    relatedPrograms: ['snap', 'wic', 'school-lunch'],
    lastVerified: LAST_VERIFIED,
    sourceUrl: s.url,
  };
}

function buildTanf(code, f) {
  const t = f.tanf;
  return {
    id: `${code.toLowerCase()}-tanf`,
    name: t.name,
    fullName: `${f.name} cash assistance for families (TANF)`,
    category: 'cash',
    level: 'state',
    state: code,
    status: 'active',
    benefitKey: 'tanf',
    description: `${t.name} is ${f.name}'s TANF program. It provides monthly cash payments and employment services to very low-income families with children (and to pregnant women in many states). Adults usually must take part in work, training, or job search activities.`,
    howToApply: `Apply online at ${f.portal} or at your county or local benefits office${f.phone ? ` (${f.phone})` : ''}. You will have an interview and may be asked to sign an employment plan.`,
    applicationUrl: f.portal,
    website: t.url,
    phone: f.phone || null,
    documentsNeeded: [
      ...commonDocuments(f.name),
      "Children's birth certificates and proof of relationship",
      'Proof of school enrollment for school-age children',
    ],
    benefit: {
      type: 'cash',
      description: 'Monthly cash payment on an EBT card plus job training and work supports',
      amountNote: 'Varies by state and family size; typically a few hundred dollars a month. Lifetime limit of 60 months in most states.',
    },
    rules: {
      ...BASE_RULES,
      incomeLimitType: 'fpl_percent',
      incomeLimitPercent: 60,
      requiresChildren: true,
      alwaysPossibly: true,
      note: `TANF income limits are low and set by ${f.name}; this check uses an approximate 60% FPL screen. Work requirements and asset limits apply.`,
    },
    tags: ['tanf', 'cash assistance', 'families', 'children', f.name, code],
    relatedPrograms: ['tanf', `${code.toLowerCase()}-snap`, `${code.toLowerCase()}-childcare`],
    lastVerified: LAST_VERIFIED,
    sourceUrl: t.url,
  };
}

function buildLiheap(code, f) {
  const l = f.liheap;
  return {
    id: `${code.toLowerCase()}-liheap`,
    name: l.name,
    fullName: `${f.name} Low Income Home Energy Assistance Program (LIHEAP)`,
    category: 'utilities',
    level: 'state',
    state: code,
    status: 'active',
    benefitKey: 'liheap',
    description: `${l.name} helps ${f.name} households pay heating and cooling bills, and can pay a past-due bill or deposit to stop a shutoff. Payments usually go directly to the utility or fuel vendor. Many states open applications in the fall and run until funds are spent.`,
    howToApply: `Apply through ${f.agency} or the local community action agency listed at ${l.url}${f.phone ? `, or call ${f.phone}` : ''}. Crisis help for a shutoff notice is often handled within 48 hours.`,
    applicationUrl: l.url,
    website: l.url,
    phone: f.phone || null,
    documentsNeeded: [
      ...commonDocuments(f.name),
      'Most recent heating or electric bill (and any shutoff notice)',
    ],
    benefit: {
      type: 'utility_payment',
      description: 'One-time or seasonal payment toward heating and cooling bills; crisis payments to stop a shutoff',
      amountNote: 'Typically $200–$1,000 per season depending on income, household size, and fuel type',
    },
    rules: {
      ...BASE_RULES,
      incomeLimitType: 'fpl_percent',
      incomeLimitPercent: 150,
      note: `Most states use 150% FPL or 60% of state median income, whichever is higher. ${f.name}'s exact limit is set each program year.`,
    },
    tags: ['liheap', 'energy', 'utilities', 'heating', 'cooling', f.name, code],
    relatedPrograms: ['liheap', 'weatherization'],
    lastVerified: LAST_VERIFIED,
    sourceUrl: l.url,
  };
}

function buildChildcare(code, f) {
  const c = f.childcare;
  return {
    id: `${code.toLowerCase()}-childcare`,
    name: c.name,
    fullName: `${f.name} child care assistance (CCDF subsidy)`,
    category: 'childcare',
    level: 'state',
    state: code,
    status: 'active',
    description: `${c.name} pays part or all of the cost of child care for working, job-seeking, or studying parents in ${f.name}. Families choose a licensed or approved provider and pay a sliding-scale copay; the state pays the rest directly to the provider.`,
    howToApply: `Apply through ${f.agency} at ${c.url}${f.phone ? ` or call ${f.phone}` : ''}. Some areas keep a waiting list, so apply as early as possible.`,
    applicationUrl: c.url,
    website: c.url,
    phone: f.phone || null,
    documentsNeeded: [
      ...commonDocuments(f.name),
      "Children's birth certificates",
      'Proof of work, school, or training schedule',
      'Name and contact information of your chosen child care provider',
    ],
    benefit: {
      type: 'subsidy',
      description: 'Child care tuition paid directly to the provider; parent pays a sliding-scale copay',
      amountNote: 'Covers most of the cost of care for children under 13 (older with special needs); copays scale with income',
    },
    rules: {
      ...BASE_RULES,
      incomeLimitType: 'fpl_percent',
      incomeLimitPercent: 185,
      requiresChildren: true,
      alwaysPossibly: true,
      note: `Income limits vary by state (federal cap is 85% of state median income); this check uses an approximate 185% FPL screen. Parents usually must be working, in school, or in training.`,
    },
    tags: ['child care', 'childcare', 'subsidy', 'working parents', f.name, code],
    relatedPrograms: ['head-start', `${code.toLowerCase()}-tanf`],
    lastVerified: LAST_VERIFIED,
    sourceUrl: c.url,
  };
}

/**
 * Build the six headline programs for a state code. Returns [] for unknown codes.
 */
export function buildStatePrograms(code) {
  const f = STATE_FACTS[code];
  if (!f) return [];
  return [
    buildMedicaid(code, f),
    buildChip(code, f),
    buildSnap(code, f),
    buildTanf(code, f),
    buildLiheap(code, f),
    buildChildcare(code, f),
  ];
}
