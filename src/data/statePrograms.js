/**
 * State program loader.
 * Returns state-specific programs for the given 2-letter state code.
 * Returns an empty array for states not yet in the database.
 *
 * To add a new state: import its program file and add a case below.
 */

import NC_PROGRAMS from './nc-programs';

export function getStatePrograms(stateCode) {
  switch (stateCode) {
    case 'NC': return NC_PROGRAMS;
    default:   return [];
  }
}
