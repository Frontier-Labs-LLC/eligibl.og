import { useState, useEffect } from 'react';
import useOnboardingStore from '../store/useOnboardingStore';
import './OnboardingForm.css';

// ── Constants ──────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

const STEP_META = [
  { number: 1, title: 'Your Location',        subtitle: 'Eligibl currently serves North Carolina residents.' },
  { number: 2, title: 'About You',             subtitle: 'Basic information used to check program requirements.' },
  { number: 3, title: 'Your Household',        subtitle: 'Who you live with affects eligibility for many programs.' },
  { number: 4, title: 'Income & Employment',   subtitle: 'Most programs use income to determine eligibility.' },
  { number: 5, title: 'Your Housing',          subtitle: 'Your housing situation unlocks specific programs.' },
  { number: 6, title: 'A Few More Details',    subtitle: 'Last step — just a few more things that matter.' },
];

// US_STATES kept for future multi-state expansion
// eslint-disable-next-line no-unused-vars
const US_STATES = [
  { code: 'AL', name: 'Alabama' },       { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },       { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },    { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },   { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },       { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },        { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },      { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },          { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },      { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },         { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },     { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },      { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },      { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },    { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },{ code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },          { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },        { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },         { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },       { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },    { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },     { code: 'WY', name: 'Wyoming' },
];

// ── Reusable UI primitives ───────────────────────────────────────────────────

function OptionCard({ title, description, icon, selected, onClick }) {
  return (
    <button
      type="button"
      className={`of-option-card${selected ? ' of-option-card--selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {icon && <span className="of-option-icon" aria-hidden="true">{icon}</span>}
      <span className="of-option-title">{title}</span>
      {description && <span className="of-option-desc">{description}</span>}
      {selected && (
        <span className="of-option-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </button>
  );
}

function YesNo({ value, onChange }) {
  return (
    <div className="of-option-grid of-option-grid--2">
      <OptionCard title="Yes" selected={value === true}  onClick={() => onChange(true)}  />
      <OptionCard title="No"  selected={value === false} onClick={() => onChange(false)} />
    </div>
  );
}

function CheckCard({ label, checked, onChange }) {
  return (
    <label className={`of-check-card${checked ? ' of-check-card--checked' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="of-check-input" />
      <span className="of-check-box" aria-hidden="true">
        {checked && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="of-check-label">{label}</span>
    </label>
  );
}

function Stepper({ value, onChange, min = 1, max = 8, maxLabel = '+' }) {
  const num = parseInt(value) || min;
  const atMax = num >= max;
  return (
    <div className="of-stepper">
      <button type="button" className="of-stepper-btn" onClick={() => onChange(Math.max(min, num - 1))} disabled={num <= min} aria-label="Decrease">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
      </button>
      <span className="of-stepper-value">{atMax ? `${max}${maxLabel}` : num}</span>
      <button type="button" className="of-stepper-btn" onClick={() => onChange(Math.min(max, num + 1))} disabled={atMax} aria-label="Increase">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}

function SectionLabel({ children, note }) {
  return (
    <div className="of-section-label-wrap">
      <p className="of-section-label">{children}</p>
      {note && <p className="of-section-note">{note}</p>}
    </div>
  );
}

function Conditional({ show, children }) {
  if (!show) return null;
  return <div className="of-conditional">{children}</div>;
}

function MoneyInput({ value, onChange, placeholder = '0', suffix = '/ month' }) {
  return (
    <div className="of-money-input">
      <span className="of-money-prefix">$</span>
      <input
        type="number"
        className="of-input of-input--money"
        placeholder={placeholder}
        min="0"
        value={value}
        onChange={onChange}
      />
      <span className="of-money-suffix">{suffix}</span>
    </div>
  );
}

// ── Step 1: Location ─────────────────────────────────────────────────────────

function StepLocation({ store }) {
  useEffect(() => {
    if (store.residentState !== 'NC') store.set('residentState', 'NC');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="of-step-content">
      <div className="of-field-group">
        <SectionLabel note="Eligibl is launching in North Carolina first. More states are coming soon!">
          Your State
        </SectionLabel>
        <div className="of-location-locked" aria-label="State locked to North Carolina">
          <span aria-hidden="true">📍</span>
          <span>North Carolina</span>
        </div>
        <p className="of-field-hint">✅ You're in our launch region — let's find what you qualify for!</p>
      </div>
    </div>
  );
}

// ── Step 2: About You ────────────────────────────────────────────────────────

function StepAboutYou({ store }) {
  return (
    <div className="of-step-content">
      <div className="of-field-group">
        <SectionLabel note="Used to check age-specific programs like Medicare (65+), CHIP (children under 19), and more.">
          How old are you?
        </SectionLabel>
        <div className="of-input-row">
          <input
            type="number"
            className="of-input of-input--short"
            placeholder="e.g. 34"
            min="0"
            max="120"
            value={store.age}
            onChange={e => store.set('age', e.target.value)}
          />
          <span className="of-input-suffix">years old</span>
        </div>
      </div>

      <div className="of-field-group">
        <SectionLabel note="Many programs require U.S. citizenship or a qualified immigration status to participate.">
          What is your citizenship or immigration status?
        </SectionLabel>
        <div className="of-option-grid of-option-grid--2">
          {[
            { value: 'citizen',     title: 'U.S. Citizen',             desc: 'Born in the U.S. or naturalized' },
            { value: 'qualified',   title: 'Qualified Non-Citizen',    desc: 'Green card, refugee, asylee, or certain visa holders' },
            { value: 'non_citizen', title: 'Not a U.S. Citizen',       desc: 'Other immigration status' },
            { value: 'prefer_not',  title: 'Prefer Not to Say',        desc: "We'll show programs that may apply" },
          ].map(opt => (
            <OptionCard
              key={opt.value}
              title={opt.title}
              description={opt.desc}
              selected={store.citizenship === opt.value}
              onClick={() => store.set('citizenship', opt.value)}
            />
          ))}
        </div>
      </div>

      <div className="of-field-group">
        <SectionLabel>What is your marital status?</SectionLabel>
        <div className="of-option-grid of-option-grid--4">
          {[
            { value: 'single',    title: 'Single' },
            { value: 'married',   title: 'Married' },
            { value: 'separated', title: 'Separated / Divorced' },
            { value: 'widowed',   title: 'Widowed' },
          ].map(opt => (
            <OptionCard
              key={opt.value}
              title={opt.title}
              selected={store.maritalStatus === opt.value}
              onClick={() => store.set('maritalStatus', opt.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Household ────────────────────────────────────────────────────────

function StepHousehold({ store }) {
  return (
    <div className="of-step-content">
      <div className="of-field-group">
        <SectionLabel note="Include yourself, your spouse or partner, and everyone you buy and prepare food with.">
          How many people are in your household?
        </SectionLabel>
        <Stepper value={store.householdSize} onChange={v => store.set('householdSize', v)} min={1} max={8} maxLabel="+" />
      </div>

      <div className="of-field-group">
        <SectionLabel>Are there any children under 18 in your household?</SectionLabel>
        <YesNo value={store.hasChildren} onChange={v => store.set('hasChildren', v)} />
        <Conditional show={store.hasChildren === true}>
          <div className="of-sub-section">
            <div className="of-sub-field">
              <SectionLabel>How many children under 18?</SectionLabel>
              <Stepper value={store.numberOfChildren} onChange={v => store.set('numberOfChildren', v)} min={1} max={10} maxLabel="+" />
            </div>
            <div className="of-sub-field">
              <SectionLabel>What age groups? (select all that apply)</SectionLabel>
              <div className="of-check-grid">
                {[
                  { value: 'under5',    label: 'Under 5 years old' },
                  { value: 'age5to12',  label: '5 to 12 years old' },
                  { value: 'age13to17', label: '13 to 17 years old' },
                ].map(opt => (
                  <CheckCard
                    key={opt.value}
                    label={opt.label}
                    checked={store.childrenAgeGroups.includes(opt.value)}
                    onChange={() => store.toggle('childrenAgeGroups', opt.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        </Conditional>
      </div>

      <div className="of-field-group">
        <SectionLabel note="Helps identify programs with special rules for older adults — Medicare Savings Programs, SNAP senior deductions, and more.">
          Are there any adults 60 or older in your household?
        </SectionLabel>
        <YesNo value={store.hasElderly} onChange={v => store.set('hasElderly', v)} />
      </div>

      <div className="of-field-group">
        <SectionLabel note="A physical, mental, or developmental condition that limits major life activities.">
          Is anyone in your household living with a disability?
        </SectionLabel>
        <YesNo value={store.hasDisabled} onChange={v => store.set('hasDisabled', v)} />
      </div>

      <div className="of-field-group">
        <SectionLabel note="Pregnancy may qualify household members for WIC, expanded Medicaid, and other programs.">
          Is anyone in your household currently pregnant?
        </SectionLabel>
        <YesNo value={store.hasPregnant} onChange={v => store.set('hasPregnant', v)} />
      </div>

      <div className="of-field-group">
        <SectionLabel note="Breastfeeding mothers may qualify for WIC nutrition support and related programs.">
          Is anyone in your household currently breastfeeding or nursing?
        </SectionLabel>
        <YesNo value={store.isNursing} onChange={v => store.set('isNursing', v)} />
      </div>
    </div>
  );
}

// ── Step 4: Income & Employment ──────────────────────────────────────────────

function StepIncome({ store }) {
  return (
    <div className="of-step-content">
      <div className="of-field-group">
        <SectionLabel>What best describes your current employment situation?</SectionLabel>
        <div className="of-option-grid of-option-grid--4">
          {[
            { value: 'full_time',     title: 'Employed Full-Time',        icon: '💼' },
            { value: 'part_time',     title: 'Employed Part-Time',        icon: '⏱' },
            { value: 'self_employed', title: 'Self-Employed',             icon: '🧾' },
            { value: 'unemployed',    title: 'Unemployed / Job Seeking',  icon: '🔍' },
            { value: 'retired',       title: 'Retired',                   icon: '🌅' },
            { value: 'unable',        title: 'Unable to Work',            icon: '🏥' },
            { value: 'student',       title: 'Student',                   icon: '🎓' },
            { value: 'caregiver',     title: 'Stay-at-Home Caregiver',    icon: '🤝' },
          ].map(opt => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              title={opt.title}
              selected={store.employmentStatus === opt.value}
              onClick={() => store.set('employmentStatus', opt.value)}
            />
          ))}
        </div>
      </div>

      <div className="of-field-group">
        <SectionLabel note="Include all income from everyone in your household — wages, benefits, Social Security, child support, and any other sources. Before taxes.">
          What is your total monthly household income?
        </SectionLabel>
        <MoneyInput
          value={store.monthlyIncome}
          onChange={e => store.set('monthlyIncome', e.target.value)}
        />
        <p className="of-field-hint">Enter 0 if your household currently has no income.</p>
      </div>

      <div className="of-field-group">
        <SectionLabel>Where does your household income come from? (Select all that apply)</SectionLabel>
        <div className="of-check-grid of-check-grid--3">
          {[
            { value: 'wages',           label: 'Wages or salary' },
            { value: 'self_employment', label: 'Self-employment income' },
            { value: 'social_security', label: 'Social Security (retirement)' },
            { value: 'ssdi',            label: 'Social Security Disability (SSDI)' },
            { value: 'ssi',             label: 'SSI (Supplemental Security Income)' },
            { value: 'unemployment',    label: 'Unemployment benefits' },
            { value: 'child_support',   label: 'Child support or alimony' },
            { value: 'pension',         label: 'Pension or retirement account' },
            { value: 'investments',     label: 'Investment or rental income' },
            { value: 'none',            label: 'No income at this time' },
          ].map(opt => (
            <CheckCard
              key={opt.value}
              label={opt.label}
              checked={store.incomeSources.includes(opt.value)}
              onChange={() => store.toggle('incomeSources', opt.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 5: Housing ──────────────────────────────────────────────────────────

function StepHousing({ store }) {
  return (
    <div className="of-step-content">
      <div className="of-field-group">
        <SectionLabel>What is your current housing situation?</SectionLabel>
        <div className="of-option-grid of-option-grid--2">
          {[
            { value: 'own',         title: 'I own my home',                    desc: 'My name is on the deed or I am buying the home',          icon: '🏠' },
            { value: 'rent',        title: 'I rent my home',                   desc: 'I pay rent to a landlord or property owner',              icon: '🏘' },
            { value: 'with_others', title: 'I live with family or friends',    desc: 'No rent or mortgage payment required of me',              icon: '🤝' },
            { value: 'homeless',    title: 'I am experiencing homelessness',   desc: 'Shelter, transitional housing, vehicle, or outdoors',     icon: '🌙' },
          ].map(opt => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              title={opt.title}
              description={opt.desc}
              selected={store.housingStatus === opt.value}
              onClick={() => store.set('housingStatus', opt.value)}
            />
          ))}
        </div>
      </div>

      {/* ── OWN: expanded questions ── */}
      <Conditional show={store.housingStatus === 'own'}>
        <div className="of-conditional-card">
          <h3 className="of-conditional-title">About Your Home</h3>

          <div className="of-field-group">
            <SectionLabel>What is the approximate value of your home?</SectionLabel>
            <div className="of-option-grid of-option-grid--3">
              {[
                { value: 'under100k',  title: 'Under $100,000' },
                { value: '100k_250k',  title: '$100,000 – $250,000' },
                { value: '250k_500k',  title: '$250,000 – $500,000' },
                { value: '500k_1m',    title: '$500,000 – $1,000,000' },
                { value: 'over1m',     title: 'Over $1,000,000' },
                { value: 'prefer_not', title: 'Prefer not to say' },
              ].map(opt => (
                <OptionCard
                  key={opt.value}
                  title={opt.title}
                  selected={store.homeValueRange === opt.value}
                  onClick={() => store.set('homeValueRange', opt.value)}
                />
              ))}
            </div>
          </div>

          <div className="of-field-group">
            <SectionLabel>Do you have a mortgage on your home?</SectionLabel>
            <YesNo value={store.hasMortgage} onChange={v => store.set('hasMortgage', v)} />
          </div>

          <Conditional show={store.hasMortgage === true}>
            <div className="of-field-group">
              <SectionLabel>How current are you on your mortgage payments?</SectionLabel>
              <div className="of-option-grid of-option-grid--3">
                {[
                  { value: 'current',      title: 'Current',             desc: 'Payments are up to date' },
                  { value: 'behind_1_2',   title: '1–2 Months Behind',   desc: 'Slightly behind on payments' },
                  { value: 'behind_3plus', title: '3+ Months Behind',    desc: 'Facing possible foreclosure' },
                ].map(opt => (
                  <OptionCard
                    key={opt.value}
                    title={opt.title}
                    description={opt.desc}
                    selected={store.mortgageStatus === opt.value}
                    onClick={() => store.set('mortgageStatus', opt.value)}
                  />
                ))}
              </div>
            </div>
          </Conditional>

          <div className="of-field-group">
            <SectionLabel note="Include mortgage payment + property taxes + homeowner's insurance.">
              What are your total monthly housing costs?
            </SectionLabel>
            <MoneyInput
              value={store.monthlyHousingCost}
              onChange={e => store.set('monthlyHousingCost', e.target.value)}
            />
          </div>
        </div>
      </Conditional>

      {/* ── RENT: expanded questions ── */}
      <Conditional show={store.housingStatus === 'rent'}>
        <div className="of-conditional-card">
          <h3 className="of-conditional-title">About Your Rental</h3>

          <div className="of-field-group">
            <SectionLabel>How much is your monthly rent?</SectionLabel>
            <MoneyInput
              value={store.monthlyRent}
              onChange={e => store.set('monthlyRent', e.target.value)}
            />
          </div>

          <div className="of-field-group">
            <SectionLabel>Are you current on your rent payments?</SectionLabel>
            <div className="of-option-grid of-option-grid--2">
              {[
                { value: 'current', title: 'Yes, current on rent' },
                { value: 'behind',  title: 'No, behind on rent' },
              ].map(opt => (
                <OptionCard
                  key={opt.value}
                  title={opt.title}
                  selected={store.rentStatus === opt.value}
                  onClick={() => store.set('rentStatus', opt.value)}
                />
              ))}
            </div>
          </div>
        </div>
      </Conditional>

      {/* ── HOMELESS: expanded questions ── */}
      <Conditional show={store.housingStatus === 'homeless'}>
        <div className="of-conditional-card">
          <h3 className="of-conditional-title">Your Current Situation</h3>
          <SectionLabel>Select all that apply:</SectionLabel>
          <div className="of-check-grid">
            {[
              { value: 'shelter',      label: 'Staying in an emergency or family shelter' },
              { value: 'couch_surf',   label: 'Staying temporarily with family or friends' },
              { value: 'unsheltered',  label: 'Living in a vehicle, tent, or outdoors' },
              { value: 'transitional', label: 'In transitional or supportive housing' },
              { value: 'motel',        label: 'Staying in a motel or hotel (no permanent home)' },
            ].map(opt => (
              <CheckCard
                key={opt.value}
                label={opt.label}
                checked={store.homelessSituation.includes(opt.value)}
                onChange={() => store.toggle('homelessSituation', opt.value)}
              />
            ))}
          </div>
        </div>
      </Conditional>

      {/* Utility trouble — shown for ALL housing statuses */}
      <div className="of-field-group">
        <SectionLabel note="Programs like LIHEAP help cover gas, electric, and water bills.">
          Do you have difficulty paying your utility bills (gas, electric, water)?
        </SectionLabel>
        <YesNo value={store.hasUtilityTrouble} onChange={v => store.set('hasUtilityTrouble', v)} />
      </div>
    </div>
  );
}

// ── Step 6: Details ──────────────────────────────────────────────────────────

function StepDetails({ store }) {
  return (
    <div className="of-step-content">
      <div className="of-field-group">
        <SectionLabel note="Veterans and active duty military may qualify for VA health care, pension, education benefits, and housing assistance.">
          Are you or is anyone in your household a U.S. veteran or active duty military?
        </SectionLabel>
        <YesNo value={store.isVeteran} onChange={v => store.set('isVeteran', v)} />
        <Conditional show={store.isVeteran === true}>
          <div className="of-sub-section">
            <SectionLabel>Type of military discharge received:</SectionLabel>
            <div className="of-option-grid of-option-grid--3">
              {[
                { value: 'honorable',     title: 'Honorable' },
                { value: 'general',       title: 'General / Under Honorable Conditions' },
                { value: 'other',         title: 'Other Than Honorable' },
                { value: 'still_active',  title: 'Currently Active Duty' },
                { value: 'unknown',       title: "I'm Not Sure" },
              ].map(opt => (
                <OptionCard
                  key={opt.value}
                  title={opt.title}
                  selected={store.veteranDischarge === opt.value}
                  onClick={() => store.set('veteranDischarge', opt.value)}
                />
              ))}
            </div>
          </div>
        </Conditional>
      </div>

      <div className="of-field-group">
        <SectionLabel note="Full-time students may be ineligible for certain programs (e.g., SNAP), but may qualify for education grants and federal work-study.">
          Are you currently enrolled as a student?
        </SectionLabel>
        <YesNo value={store.isStudent} onChange={v => store.set('isStudent', v)} />
        <Conditional show={store.isStudent === true}>
          <div className="of-sub-section">
            <div className="of-option-grid of-option-grid--2">
              {[
                { value: 'full_time', title: 'Full-Time Student' },
                { value: 'part_time', title: 'Part-Time Student' },
              ].map(opt => (
                <OptionCard
                  key={opt.value}
                  title={opt.title}
                  selected={store.studentEnrollment === opt.value}
                  onClick={() => store.set('studentEnrollment', opt.value)}
                />
              ))}
            </div>
          </div>
        </Conditional>
      </div>

      <div className="of-field-group">
        <SectionLabel note="A documented disability may expand eligibility for SSI, SSDI, Medicaid, housing programs, and more.">
          Do you or anyone in your household have a documented disability?
        </SectionLabel>
        <YesNo value={store.hasHouseholdDisability} onChange={v => store.set('hasHouseholdDisability', v)} />
      </div>

      <div className="of-field-group">
        <SectionLabel note="SBA loans, microloans, and NC-specific business programs are available to small business owners and founders.">
          Do you own or are you looking to start a small business?
        </SectionLabel>
        <YesNo value={store.isBusinessOwner} onChange={v => store.set('isBusinessOwner', v)} />
      </div>

      <div className="of-field-group">
        <SectionLabel note="We'll make sure not to show you programs you're already receiving.">
          Are you currently receiving any of these benefits? (Select all that apply)
        </SectionLabel>
        <div className="of-check-grid of-check-grid--3">
          {[
            { value: 'snap',            label: 'SNAP / Food Stamps' },
            { value: 'medicaid',        label: 'Medicaid' },
            { value: 'medicare',        label: 'Medicare' },
            { value: 'section8',        label: 'Section 8 / Housing Voucher' },
            { value: 'social_security', label: 'Social Security' },
            { value: 'ssi',             label: 'SSI' },
            { value: 'tanf',            label: 'TANF / Cash Assistance' },
            { value: 'wic',             label: 'WIC' },
            { value: 'chip',            label: "CHIP (children's health)" },
            { value: 'liheap',          label: 'LIHEAP (utility assistance)' },
            { value: 'none',            label: 'None of the above' },
          ].map(opt => (
            <CheckCard
              key={opt.value}
              label={opt.label}
              checked={store.currentBenefits.includes(opt.value)}
              onChange={() => store.toggle('currentBenefits', opt.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function OnboardingForm({ selectedCategories, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const store = useOnboardingStore();

  const current   = STEP_META[currentStep - 1];
  const progress  = (currentStep / TOTAL_STEPS) * 100;
  const isLastStep = currentStep === TOTAL_STEPS;

  function canProceed() {
    return true; // Step 1 is locked to NC — always ready to proceed
  }

  function goNext() {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      submitForm();
    }
  }

  function goBack() {
    if (currentStep > 1) {
      setCurrentStep(s => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function submitForm() {
    const profile = {
      selectedCategories,
      residentState:          store.residentState,
      age:                    store.age ? parseInt(store.age) : null,
      citizenship:            store.citizenship,
      maritalStatus:          store.maritalStatus,
      householdSize:          store.householdSize,
      hasChildren:            store.hasChildren,
      numberOfChildren:       store.numberOfChildren,
      childrenAgeGroups:      store.childrenAgeGroups,
      hasElderly:             store.hasElderly,
      hasDisabled:            store.hasDisabled,
      hasPregnant:            store.hasPregnant,
      employmentStatus:       store.employmentStatus,
      monthlyIncome:          store.monthlyIncome ? parseFloat(store.monthlyIncome) : null,
      incomeSources:          store.incomeSources,
      housingStatus:          store.housingStatus,
      homeValueRange:         store.homeValueRange,
      hasMortgage:            store.hasMortgage,
      mortgageStatus:         store.mortgageStatus,
      monthlyHousingCost:     store.monthlyHousingCost ? parseFloat(store.monthlyHousingCost) : null,
      monthlyRent:            store.monthlyRent ? parseFloat(store.monthlyRent) : null,
      rentStatus:             store.rentStatus,
      homelessSituation:      store.homelessSituation,
      hasUtilityTrouble:      store.hasUtilityTrouble,
      isVeteran:              store.isVeteran,
      veteranDischarge:       store.veteranDischarge,
      isStudent:              store.isStudent,
      studentEnrollment:      store.studentEnrollment,
      hasHouseholdDisability: store.hasHouseholdDisability,
      isNursing:              store.isNursing,
      isBusinessOwner:        store.isBusinessOwner,
      currentBenefits:        store.currentBenefits,
    };
    onComplete(profile);
  }

  function renderStep() {
    switch (currentStep) {
      case 1: return <StepLocation  store={store} />;
      case 2: return <StepAboutYou  store={store} />;
      case 3: return <StepHousehold store={store} />;
      case 4: return <StepIncome    store={store} />;
      case 5: return <StepHousing   store={store} />;
      case 6: return <StepDetails   store={store} />;
      default: return null;
    }
  }

  return (
    <div className="of-page">
      <a href="#of-main" className="skip-link">Skip to form</a>
      <div className="of-container">

        {/* Logo */}
        <div className="of-logo-bar">
          <div className="of-logo"><span className="of-logo-e">E</span>ligibl</div>
          <p className="of-logo-sub">Find benefits you may qualify for — free &amp; anonymous.</p>
        </div>

        {/* Progress tracker */}
        <div className="of-progress-wrap">
          <div className="of-progress-track">
            <div className="of-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="of-progress-dots">
            {STEP_META.map(s => (
              <button
                key={s.number}
                type="button"
                className={[
                  'of-progress-dot',
                  s.number < currentStep  ? 'of-progress-dot--done'   : '',
                  s.number === currentStep ? 'of-progress-dot--active' : '',
                ].join(' ')}
                onClick={() => s.number < currentStep && setCurrentStep(s.number)}
                disabled={s.number >= currentStep}
                aria-label={`Step ${s.number}: ${s.title}`}
                title={s.title}
              >
                {s.number < currentStep ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : s.number}
              </button>
            ))}
          </div>
          <p className="of-progress-label">
            Step {currentStep} of {TOTAL_STEPS} &mdash; <strong>{current.title}</strong>
          </p>
        </div>

        {/* Form card */}
        <main id="of-main" className="of-card" aria-label={`Step ${currentStep} of ${TOTAL_STEPS}: ${current.title}`}>
          <div className="of-step-header">
            <h1 className="of-step-title">{current.title}</h1>
            <p className="of-step-subtitle">{current.subtitle}</p>
          </div>

          {renderStep()}

          {/* Navigation */}
          <div className="of-nav" role="navigation" aria-label="Form navigation">
            <div className="of-nav-left">
              {currentStep > 1 && (
                <button
                  type="button"
                  className="of-btn-back"
                  onClick={goBack}
                  aria-label={`Go back to step ${currentStep - 1}`}
                >
                  ← Back
                </button>
              )}
            </div>
            <div className="of-nav-right">
              {currentStep > 1 && (
                <p className="of-nav-hint">
                  {isLastStep ? 'Ready to see your matches!' : 'All questions are optional except your state.'}
                </p>
              )}
              <button
                type="button"
                className="of-btn-next"
                onClick={goNext}
                disabled={!canProceed()}
                aria-label={isLastStep ? 'Find my programs' : `Continue to step ${currentStep + 1}`}
              >
                {isLastStep ? 'Find My Programs →' : 'Continue →'}
              </button>
            </div>
          </div>
        </main>

        <p className="of-privacy-note">
          🔒 Your answers are private and anonymous. We never ask for your Social Security Number.
        </p>
      </div>
    </div>
  );
}
