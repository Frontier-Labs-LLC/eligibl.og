import STATE_FACTS, { US_STATES, getStateName } from './stateFacts';
import { getStatePrograms, getAllStatePrograms, STATE_COUNT } from './statePrograms';
import NC_PROGRAMS from './nc-programs';
import PROGRAMS from './programs';
import { matchPrograms } from '../lib/matchingEngine';

const REQUIRED_FIELDS = [
  'id', 'name', 'fullName', 'category', 'level', 'state', 'status', 'description',
  'howToApply', 'applicationUrl', 'website', 'documentsNeeded', 'benefit', 'rules',
  'tags', 'relatedPrograms', 'lastVerified', 'sourceUrl',
];

test('the catalog covers all 50 states and the District of Columbia', () => {
  expect(STATE_COUNT).toBe(51);
  expect(US_STATES).toHaveLength(51);
  expect(US_STATES.map((s) => s.name)).toEqual([...US_STATES.map((s) => s.name)].sort((a, b) => a.localeCompare(b)));
  expect(getStateName('TX')).toBe('Texas');
  expect(getStateName('ZZ')).toBe('');
});

test('North Carolina keeps its hand-written catalog', () => {
  expect(getStatePrograms('NC')).toBe(NC_PROGRAMS);
  expect(getStatePrograms('ZZ')).toEqual([]);
});

test('every other state has its six headline programs with complete records', () => {
  Object.keys(STATE_FACTS).filter((code) => code !== 'NC').forEach((code) => {
    const programs = getStatePrograms(code);
    expect(programs).toHaveLength(6);
    expect(programs.map((p) => p.category).sort()).toEqual(
      ['cash', 'childcare', 'food', 'healthcare', 'healthcare', 'utilities'],
    );
    programs.forEach((program) => {
      REQUIRED_FIELDS.forEach((field) => {
        expect(program).toHaveProperty(field);
      });
      expect(program.state).toBe(code);
      expect(program.level).toBe('state');
      expect(program.id).toMatch(new RegExp(`^${code.toLowerCase()}-`));
      expect(program.website).toMatch(/^https:\/\//);
      expect(program.applicationUrl).toMatch(/^https:\/\//);
      expect(program.documentsNeeded.length).toBeGreaterThan(2);
      expect(program.benefit.description.length).toBeGreaterThan(10);
      expect(program.rules.incomeLimitType).toBe('fpl_percent');
      expect(program.rules.incomeLimitPercent).toBeGreaterThan(0);
    });
  });
});

test('program ids are unique across federal and every state catalog', () => {
  const ids = [...PROGRAMS, ...getAllStatePrograms()].map((p) => p.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(getAllStatePrograms().length).toBe(NC_PROGRAMS.length + 6 * 50);
});

test('non-expansion states never show adult Medicaid as likely', () => {
  const texasMedicaid = getStatePrograms('TX').find((p) => p.id === 'tx-medicaid');
  const coloradoMedicaid = getStatePrograms('CO').find((p) => p.id === 'co-medicaid');
  expect(texasMedicaid.rules.alwaysPossibly).toBe(true);
  expect(texasMedicaid.description).toMatch(/has not adopted full Medicaid expansion/);
  expect(coloradoMedicaid.rules.alwaysPossibly).toBe(false);
  expect(coloradoMedicaid.rules.incomeLimitPercent).toBe(138);
});

function texasProfile(overrides = {}) {
  return {
    residentState: 'TX',
    age: 34,
    citizenship: 'citizen',
    maritalStatus: 'single',
    householdSize: 3,
    hasChildren: true,
    numberOfChildren: 2,
    childrenAgeGroups: ['under5'],
    hasElderly: false,
    hasDisabled: false,
    hasPregnant: false,
    isNursing: false,
    employmentStatus: 'part_time',
    monthlyIncome: 1800,
    incomeSources: ['wages'],
    housingStatus: 'rent',
    monthlyRent: 900,
    rentStatus: 'current',
    hasUtilityTrouble: true,
    isVeteran: false,
    veteranDischarge: '',
    isStudent: false,
    studentEnrollment: '',
    hasHouseholdDisability: false,
    isBusinessOwner: false,
    currentBenefits: [],
    ...overrides,
  };
}

test('a Texas family is matched to Texas programs and never to another state', () => {
  const programs = [...PROGRAMS, ...getStatePrograms('TX'), ...getStatePrograms('NC')];
  const results = matchPrograms(texasProfile(), programs);
  const ids = results.map((r) => r.program.id);

  expect(ids).toEqual(expect.arrayContaining(['tx-snap', 'tx-chip', 'tx-liheap', 'tx-childcare']));
  expect(ids.some((id) => id.startsWith('nc-'))).toBe(false);
  expect(results.find((r) => r.program.id === 'tx-snap').confidence).toBe('likely');
  expect(results.find((r) => r.program.id === 'tx-childcare').confidence).toBe('possibly');
  // Texas has not expanded Medicaid: 81% FPL is above the parent limit.
  expect(results.find((r) => r.program.id === 'tx-medicaid')).toBeUndefined();
  // TANF limits are low; this family earns too much for the 60% FPL screen.
  expect(results.find((r) => r.program.id === 'tx-tanf')).toBeUndefined();

  const noIncome = matchPrograms(texasProfile({ monthlyIncome: 0, employmentStatus: 'unemployed', incomeSources: ['none'] }), programs);
  const tanf = noIncome.find((r) => r.program.id === 'tx-tanf');
  expect(tanf.confidence).toBe('possibly');
  expect(noIncome.find((r) => r.program.id === 'tx-medicaid').confidence).toBe('possibly');
});

test('state programs already received are hidden through benefitKey', () => {
  const programs = [...PROGRAMS, ...getStatePrograms('TX')];
  const results = matchPrograms(texasProfile({ currentBenefits: ['snap', 'chip'] }), programs);
  const ids = results.map((r) => r.program.id);
  expect(ids).not.toContain('tx-snap');
  expect(ids).not.toContain('tx-chip');
  expect(ids).not.toContain('snap');
  expect(ids).toContain('tx-liheap');
});
