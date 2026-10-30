import PROGRAMS from '../data/programs';
import NC_PROGRAMS from '../data/nc-programs';
import NC_MAP_LOCATIONS from '../data/nc-map-data';
import { STATE_COUNT } from '../data/statePrograms';
import './OfficeBrief.css';

const SEED_FIRST = ['snap', 'nc-medicaid', 'nc-work-first', 'nc-child-care-subsidy', 'nc-cip'];

const CATALOG = [...PROGRAMS, ...NC_PROGRAMS];

function findProgram(id) {
  return CATALOG.find((program) => program.id === id);
}

export default function OfficeBrief({ onBack, onRunCheck, onOpenMap }) {
  const draftPrograms = SEED_FIRST.map(findProgram).filter(Boolean);

  return (
    <div className="ob-page">
      <a href="#ob-main" className="skip-link">Skip to the brief</a>
      <div className="ob-container" id="ob-main">
        <header className="ob-header">
          <button type="button" className="ob-logo" onClick={onBack} aria-label="Eligibl, back to the resident check">
            <span className="ob-logo-e" aria-hidden="true">E</span>ligibl
          </button>
          <p className="ob-tagline">Federal &amp; state aid — found fast.</p>
        </header>

        <p className="ob-kicker">For NCDHHS and a county Department of Social Services</p>
        <h1 className="ob-title">Seed the facts. Then tell residents to use it.</h1>
        <p className="ob-lede">
          Eligibl is the check a person can finish before they take a number.
          It is a screening, not a decision, and it does not file an application
          in ePASS or NC FAST. North Carolina is the launch state. The catalog
          below is a draft until your office says the facts are yours.
        </p>

        <dl className="ob-stats">
          <div>
            <dt>Federal programs in the draft</dt>
            <dd>{PROGRAMS.length}</dd>
          </div>
          <div>
            <dt>North Carolina programs in the draft</dt>
            <dd>{NC_PROGRAMS.length}</dd>
          </div>
          <div>
            <dt>Places on the NC resource map</dt>
            <dd>{NC_MAP_LOCATIONS.length}</dd>
          </div>
          <div>
            <dt>States with headline programs in the draft</dt>
            <dd>{STATE_COUNT}</dd>
          </div>
        </dl>

        <div className="ob-actions no-print">
          <button type="button" className="ob-btn ob-btn-primary" onClick={onRunCheck}>
            Run the resident check
          </button>
          <button type="button" className="ob-btn" onClick={onOpenMap}>
            Open the NC map
          </button>
          <button type="button" className="ob-btn" onClick={() => window.print()}>
            Print this brief
          </button>
        </div>

        <section className="ob-split" aria-label="Support and seeding">
          <article className="ob-card">
            <h2>Support</h2>
            <p>
              Support is a sentence you publish after the facts are yours.
              One line on the agency site, a card at the DSS window, or a line
              for the call center: not sure which program to ask for, use eligibl.org
              before you take a number.
            </p>
            <p>We are not asking you to endorse the draft.</p>
          </article>
          <article className="ob-card">
            <h2>Seeding</h2>
            <p>
              Seeding is your office giving us the public facts you already say
              at the window. The name residents use, who it is for, the income
              line you will stand behind, what to bring, the official apply link,
              a phone number, and a person who can correct us.
            </p>
            <p>Our January 2026 review is not your review.</p>
          </article>
        </section>

        <section className="ob-section">
          <h2>Start with these five</h2>
          <p className="ob-note">
            Food and Nutrition Services is in the federal list as SNAP. The other
            four are already written as North Carolina programs. Each one is still
            marked draft.
          </p>
          <div className="ob-table-wrap">
            <table className="ob-table">
              <caption className="sr-only">Programs to seed first, and what the draft currently says</caption>
              <thead>
                <tr>
                  <th scope="col">Program</th>
                  <th scope="col">Draft says</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {draftPrograms.map((program) => (
                  <tr key={program.id}>
                    <th scope="row">
                      {program.name}
                      <span>{program.fullName}</span>
                    </th>
                    <td>
                      {program.rules && program.rules.incomeLimitType === 'fpl_percent'
                        ? `Income line in the draft: ${program.rules.incomeLimitPercent}% of poverty. `
                        : null}
                      {program.phone ? `Phone on file: ${program.phone}. ` : null}
                      Last touched {program.lastVerified}.
                    </td>
                    <td>Draft. Not supplied by your office.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ob-section">
          <h2>What you would hand us</h2>
          <ol className="ob-fields">
            <li>The name residents already use, such as Food and Nutrition Services or Work First.</li>
            <li>Who it is for, in the sentence your workers use.</li>
            <li>The income guidance you are willing to publish. If you do not want a number public, say that and we will send people to the window instead of guessing.</li>
            <li>What to bring, and what should not stop someone from applying.</li>
            <li>The official apply link and phone. For most of these, that is ePASS, NC Medicaid, or the county DSS.</li>
            <li>A name and email that can correct a wrong fact the same week.</li>
          </ol>
        </section>

        <section className="ob-section">
          <h2>What we will not do</h2>
          <ul className="ob-plain">
            <li>Decide a case, or tell someone they are approved.</li>
            <li>File an application, or write into NC FAST.</li>
            <li>Ask for a Social Security number to use the check.</li>
            <li>Replace a caseworker or the county lobby.</li>
            <li>Publish a rule you did not give us, once you have seeded that program.</li>
          </ul>
        </section>

        <section className="ob-section">
          <h2>Ninety days, one county</h2>
          <p>
            Pick one DSS office. Seed the five programs above, or tell us to hide
            any you will not stand behind. Residents in that county can use the
            check and the map. Either side can stop. Unseeded programs stay
            labeled draft, or you tell us to take them off.
          </p>
          <div className="ob-card ob-scripture">
            <p className="ob-card-label">The card at the window, after you seed</p>
            <p>
              Not sure which program to ask for? Use eligibl.org on your phone
              before you take a number. It is free. It does not decide your case.
              It does not ask for a Social Security number. Bring photo ID and
              proof of income if you have them.
            </p>
          </div>
        </section>

        <section className="ob-section">
          <h2>Decide before we leave</h2>
          <ul className="ob-ticks">
            <li><label><input type="checkbox" /> Name a contact who can correct a fact</label></li>
            <li><label><input type="checkbox" /> Seed the five programs, or name the ones to hide</label></li>
            <li><label><input type="checkbox" /> Pick one county office for 90 days</label></li>
            <li><label><input type="checkbox" /> Say whether draft programs stay visible</label></li>
          </ul>
          <p className="ob-sign">Contact ____________________ &nbsp; Office ____________________ &nbsp; Date ____________________</p>
          <p className="ob-sign">Not ready, and why: ________________________________________________</p>
        </section>

        <details className="ob-notes no-print">
          <summary>If you are the person walking this in</summary>
          <ol>
            <li>Open this page. Say you are not asking them to replace ePASS or NC FAST.</li>
            <li>Hand them the laptop and run the resident check. Then open the map.</li>
            <li>Come back here. Seeding is their facts. Support is the sentence they publish after that.</li>
            <li>Leave the printed brief. Ask for a contact, the five programs, and one county.</li>
          </ol>
        </details>
      </div>
    </div>
  );
}
