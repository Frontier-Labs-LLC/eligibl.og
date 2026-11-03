import { useState } from 'react';
import { recordVisitorEvent } from '../lib/visitorCount';
import './HelpSurvey.css';

const HELP = [
  { id: 'helped-yes', label: 'Yes, it helped' },
  { id: 'helped-some', label: 'A little' },
  { id: 'helped-no', label: 'No' },
];

const WHY = [
  { id: 'why-knew-next', label: 'I know what to apply for' },
  { id: 'why-new-program', label: 'I found a program I did not know about' },
  { id: 'why-still-lost', label: 'I still do not know what to do next' },
  { id: 'why-confusing', label: 'The questions were confusing' },
  { id: 'why-wrong', label: 'Something in the results looked wrong' },
];

/**
 * The call-center metric: did the check help, and why.
 * Choices only. Nothing the person typed in the check is sent with this.
 */
export default function HelpSurvey() {
  const [help, setHelp] = useState('');
  const [why, setWhy] = useState('');

  function chooseHelp(id) {
    if (help) return;
    setHelp(id);
    recordVisitorEvent(id);
  }

  function chooseWhy(id) {
    if (why) return;
    setWhy(id);
    recordVisitorEvent(id);
  }

  return (
    <section className="hs-panel" aria-labelledby="hs-heading">
      <h2 id="hs-heading">Did this help?</h2>
      <p>
        This is how we tell a call center whether the check helped someone, and why.
        It is one answer, it is not tied to your name, and it is not tied to the answers you just gave.
      </p>
      {why ? (
        <p className="hs-thanks">Thank you. That answer is the number we bring back.</p>
      ) : (
        <>
          <div className="hs-choices" role="group" aria-label="Did this help?">
            {HELP.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className={`hs-choice${help === choice.id ? ' hs-choice--on' : ''}`}
                data-track={choice.id}
                onClick={() => chooseHelp(choice.id)}
                aria-pressed={help === choice.id}
              >
                {choice.label}
              </button>
            ))}
          </div>
          {help && (
            <div className="hs-why">
              <p>Why?</p>
              <div className="hs-choices" role="group" aria-label="Why?">
                {WHY.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className="hs-choice"
                    data-track={choice.id}
                    onClick={() => chooseWhy(choice.id)}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
