import { create } from 'zustand';

const initialState = {
  // Step 1 — Location
  residentState: '',

  // Step 2 — About You
  age: '',
  citizenship: '',      // 'citizen' | 'qualified' | 'non_citizen' | 'prefer_not'
  maritalStatus: '',    // 'single' | 'married' | 'separated' | 'widowed'

  // Step 3 — Household
  householdSize: 1,
  hasChildren: null,
  numberOfChildren: 1,
  childrenAgeGroups: [],  // ['under5', 'age5to12', 'age13to17']
  hasElderly: null,
  hasDisabled: null,
  hasPregnant: null,
  isNursing: null,    // breastfeeding/nursing household member

  // Step 4 — Income & Employment
  employmentStatus: '',   // 'full_time' | 'part_time' | 'self_employed' | 'unemployed' | 'retired' | 'unable_to_work' | 'student' | 'caregiver'
  monthlyIncome: '',      // gross household, before taxes
  incomeSources: [],      // checkboxes

  // Step 5 — Housing
  housingStatus: '',      // 'own' | 'rent' | 'with_others' | 'homeless'

  // own-specific
  homeValueRange: '',     // 'under100k' | '100k_250k' | '250k_500k' | '500k_1m' | 'over1m' | 'prefer_not'
  hasMortgage: null,
  mortgageStatus: '',     // 'current' | 'behind_1_2' | 'behind_3plus'
  monthlyHousingCost: '',

  // rent-specific
  monthlyRent: '',
  rentStatus: '',         // 'current' | 'behind'

  // homeless-specific
  homelessSituation: [],  // checkboxes

  // all housing
  hasUtilityTrouble: null,

  // Step 6 — Details
  isVeteran: null,
  veteranDischarge: '',   // 'honorable' | 'general' | 'other' | 'still_active' | 'unknown'
  isStudent: null,
  studentEnrollment: '',  // 'full_time' | 'part_time'
  hasHouseholdDisability: null,
  isBusinessOwner: null,  // owns or wants to start a small business
  currentBenefits: [],    // programs already receiving
};

const useOnboardingStore = create((set) => ({
  ...initialState,

  // Set a single field
  set: (key, value) => set({ [key]: value }),

  // Toggle an item in an array field (for checkboxes)
  toggle: (key, item) =>
    set((state) => {
      const arr = state[key] || [];
      return {
        [key]: arr.includes(item)
          ? arr.filter((i) => i !== item)
          : [...arr, item],
      };
    }),

  // Reset entire form
  reset: () => set(initialState),
}));

export default useOnboardingStore;
