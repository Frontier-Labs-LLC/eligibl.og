import { useSyncExternalStore } from 'react';

export const ICON_OPTIONS = [
  { id: 'dss', label: 'Social services' },
  { id: 'food', label: 'Food' },
  { id: 'housing', label: 'Housing' },
  { id: 'health', label: 'Health' },
  { id: 'phone', label: 'Phone' },
  { id: 'work', label: 'Work' },
  { id: 'child', label: 'Children' },
  { id: 'transit', label: 'Transit' },
];

const ICON_IDS = new Set(ICON_OPTIONS.map((icon) => icon.id));

export const CITY_DISCLAIMER = 'Preview for a City of Charlotte conversation. Not an official City of Charlotte system. Program facts remain a draft until an office confirms them.';

export const CHARLOTTE_PRESET = {
  placeName: 'City of Charlotte',
  tagline: 'Federal, state, and Mecklenburg County aid — found fast.',
  mark: 'C',
  intro: 'Configured for Charlotte and Mecklenburg County. The check still covers North Carolina programs. It is a screening, not a decision, and it does not file in ePASS or NC FAST.',
  contactName: 'Mecklenburg County Department of Social Services',
  contactPhone: '980-314-5500',
  contactAddress: '301 Billingsley Rd, Charlotte, NC 28211',
  contactWebsite: 'https://www.mecknc.gov/dss',
  services: [
    { icon: 'dss', label: 'Mecklenburg DSS' },
    { icon: 'food', label: 'Food' },
    { icon: 'housing', label: 'Housing' },
    { icon: 'health', label: 'Health' },
    { icon: 'phone', label: 'Call 211' },
    { icon: 'work', label: 'Work' },
  ],
  mapCenter: [35.2271, -80.8431],
  mapZoom: 11,
  placeNeedles: ['Charlotte', 'Mecklenburg', 'Matthews', 'Huntersville', 'Cornelius', 'Pineville', 'Mint Hill'],
};

const STORAGE_KEY = 'eligibl-city-v1';

function clonePreset() {
  return {
    ...CHARLOTTE_PRESET,
    mapCenter: [...CHARLOTTE_PRESET.mapCenter],
    placeNeedles: [...CHARLOTTE_PRESET.placeNeedles],
    services: CHARLOTTE_PRESET.services.map((service) => ({ ...service })),
  };
}

function cleanText(value, max) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

export function sanitizeCharlotte(input) {
  const source = input && typeof input === 'object' ? input : {};
  const mark = cleanText(source.mark, 1).toUpperCase();
  const website = cleanText(source.contactWebsite, 200);
  const services = Array.isArray(source.services) ? source.services : CHARLOTTE_PRESET.services;
  return {
    placeName: cleanText(source.placeName, 80) || CHARLOTTE_PRESET.placeName,
    tagline: cleanText(source.tagline, 140) || CHARLOTTE_PRESET.tagline,
    mark: /^[A-Z]$/.test(mark) ? mark : CHARLOTTE_PRESET.mark,
    intro: cleanText(source.intro, 400) || CHARLOTTE_PRESET.intro,
    contactName: cleanText(source.contactName, 120) || CHARLOTTE_PRESET.contactName,
    contactPhone: cleanText(source.contactPhone, 24).replace(/[^0-9+\-().\s]/g, '') || CHARLOTTE_PRESET.contactPhone,
    contactAddress: cleanText(source.contactAddress, 160) || CHARLOTTE_PRESET.contactAddress,
    contactWebsite: website.startsWith('https://') ? website : CHARLOTTE_PRESET.contactWebsite,
    services: services.slice(0, 6).map((service, index) => ({
      icon: ICON_IDS.has(service && service.icon) ? service.icon : CHARLOTTE_PRESET.services[index % CHARLOTTE_PRESET.services.length].icon,
      label: cleanText(service && service.label, 24) || 'Service',
    })),
    mapCenter: [...CHARLOTTE_PRESET.mapCenter],
    mapZoom: CHARLOTTE_PRESET.mapZoom,
    placeNeedles: [...CHARLOTTE_PRESET.placeNeedles],
  };
}

function defaultState() {
  return { activeId: 'statewide', charlotte: clonePreset() };
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      activeId: parsed.activeId === 'charlotte' ? 'charlotte' : 'statewide',
      charlotte: sanitizeCharlotte(parsed.charlotte),
    };
  } catch {
    return defaultState();
  }
}

let snapshot = readStored();
const listeners = new Set();

function emit(next) {
  snapshot = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeId: next.activeId,
      charlotte: next.charlotte,
    }));
  } catch {
    // The preview still works for this page load if storage is blocked.
  }
  listeners.forEach((listener) => listener());
}

export function getCitySnapshot() {
  return snapshot;
}

export function subscribeCity(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setActiveCity(activeId) {
  const nextId = activeId === 'charlotte' ? 'charlotte' : 'statewide';
  if (snapshot.activeId === nextId) return;
  emit({ ...snapshot, activeId: nextId });
}

export function updateCharlotte(partial) {
  emit({
    ...snapshot,
    charlotte: sanitizeCharlotte({ ...snapshot.charlotte, ...partial }),
  });
}

export function resetCharlotte() {
  emit({ activeId: snapshot.activeId, charlotte: clonePreset() });
}

export function resetCityStore() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures in tests.
  }
  snapshot = defaultState();
  listeners.forEach((listener) => listener());
}

export function useCityConfig() {
  return useSyncExternalStore(subscribeCity, getCitySnapshot, getCitySnapshot);
}

export function activeCity(state = snapshot) {
  if (state.activeId !== 'charlotte') return null;
  return state.charlotte;
}
