/**
 * State program loader.
 * Returns state-specific programs for the given 2-letter state code.
 *
 * North Carolina has a hand-written catalog (nc-programs.js). Every other
 * state and DC gets its six headline programs built from stateFacts.js.
 * To deepen a state, add a hand-written file and a case below like NC.
 */

import NC_PROGRAMS from './nc-programs';
import STATE_FACTS from './stateFacts';
import { buildStatePrograms } from './stateProgramBuilder';

const cache = new Map();

export function getStatePrograms(stateCode) {
  switch (stateCode) {
    case 'NC': return NC_PROGRAMS;
    default: {
      if (!STATE_FACTS[stateCode]) return [];
      if (!cache.has(stateCode)) cache.set(stateCode, buildStatePrograms(stateCode));
      return cache.get(stateCode);
    }
  }
}

/** Every state program in the catalog, across all states. */
export function getAllStatePrograms() {
  return Object.keys(STATE_FACTS).flatMap(getStatePrograms);
}

/** Number of states (plus DC) with programs in the catalog. */
export const STATE_COUNT = Object.keys(STATE_FACTS).length;
