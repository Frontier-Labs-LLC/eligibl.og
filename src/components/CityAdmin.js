import { useState } from 'react';
import {
  CHARLOTTE_PRESET,
  CITY_DISCLAIMER,
  ICON_OPTIONS,
  resetCharlotte,
  setActiveCity,
  updateCharlotte,
  useCityConfig,
} from '../cityConfig';
import CityIcon from './CityIcons';
import './CityAdmin.css';

const FIELDS = [
  ['placeName', 'Place name', 'City of Charlotte'],
  ['tagline', 'Tagline', 'Short line under the logo'],
  ['contactName', 'Office name', 'Who residents should call'],
  ['contactPhone', 'Office phone', '980-314-5500'],
  ['contactAddress', 'Office address', 'Street, city, state, ZIP'],
  ['contactWebsite', 'Office website', 'https://'],
];

export default function CityAdmin({ onBack, onPreview }) {
  const state = useCityConfig();
  const [draft, setDraft] = useState(state.charlotte);
  const [saved, setSaved] = useState(false);

  function setField(key, value) {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setService(index, patch) {
    setSaved(false);
    setDraft((current) => ({
      ...current,
      services: current.services.map((service, serviceIndex) => (
        serviceIndex === index ? { ...service, ...patch } : service
      )),
    }));
  }

  function save(activeId) {
    updateCharlotte(draft);
    setActiveCity(activeId);
    setSaved(true);
    onPreview(activeId);
  }

  function restorePreset() {
    resetCharlotte();
    setDraft({
      ...CHARLOTTE_PRESET,
      services: CHARLOTTE_PRESET.services.map((service) => ({ ...service })),
    });
    setSaved(false);
  }

  return (
    <div className="ca-page">
      <a href="#ca-main" className="skip-link">Skip to city configuration</a>
      <div className="ca-container" id="ca-main">
        <header className="ca-header">
          <button type="button" className="ca-logo" onClick={onBack}>
            <span>E</span>ligibl
          </button>
          <p>City configuration</p>
        </header>

        <h1>Configure the Charlotte preview</h1>
        <p className="ca-lede">
          This is the version you show the City of Charlotte. Icons and contact
          details are saved in this browser. The statewide check stays available,
          and this page does not publish the preview or change program rules.
        </p>
        <p className="ca-disclaimer">{CITY_DISCLAIMER}</p>
        <p className="ca-status">
          Residents in this browser currently see the {state.activeId === 'charlotte' ? 'Charlotte preview' : 'statewide check'}.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            save('charlotte');
          }}
        >
          {FIELDS.map(([key, label, placeholder]) => (
            <label key={key} className="ca-field">
              <span>{label}</span>
              <input
                value={draft[key]}
                placeholder={placeholder}
                maxLength={key === 'mark' ? 1 : 200}
                onChange={(event) => setField(key, event.target.value)}
              />
            </label>
          ))}

          <label className="ca-field">
            <span>Information residents see</span>
            <textarea
              value={draft.intro}
              maxLength={400}
              rows={4}
              onChange={(event) => setField('intro', event.target.value)}
            />
          </label>

          <fieldset className="ca-icons">
            <legend>Icons</legend>
            {draft.services.map((service, index) => (
              <div key={index} className="ca-icon-row">
                <span className="ca-icon-preview" aria-hidden="true">
                  <CityIcon id={service.icon} />
                </span>
                <label>
                  <span className="sr-only">Icon {index + 1}</span>
                  <select
                    value={service.icon}
                    onChange={(event) => setService(index, { icon: event.target.value })}
                  >
                    {ICON_OPTIONS.map((icon) => (
                      <option key={icon.id} value={icon.id}>{icon.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Label {index + 1}</span>
                  <input
                    value={service.label}
                    maxLength={24}
                    onChange={(event) => setService(index, { label: event.target.value })}
                  />
                </label>
              </div>
            ))}
          </fieldset>

          <div className="ca-actions">
            <button type="submit" className="ca-btn ca-btn-primary">
              Show the Charlotte version
            </button>
            <button
              type="button"
              className="ca-btn"
              onClick={() => save('statewide')}
            >
              Show the statewide version
            </button>
            <button type="button" className="ca-btn" onClick={restorePreset}>
              Restore Charlotte preset
            </button>
          </div>
          {saved && <p role="status">Saved in this browser.</p>}
        </form>
      </div>
    </div>
  );
}
