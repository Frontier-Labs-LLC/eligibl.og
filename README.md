# Eligibl

A check a person can finish before they take a number at a county office. Federal aid plus each state's headline programs, and a North Carolina map of local doors. The map also lists North Carolina State Parks campgrounds and published safe-parking lots. A screening, not a decision.

The check opens on the questions. There is no page that asks someone to choose why they need aid. They do not have to know the program name. The state is the only required answer.

The check now asks which state you live in and covers all 50 states and Washington, DC. North Carolina has a hand-written catalog (`src/data/nc-programs.js`). Every other state gets its six headline programs — Medicaid, CHIP, SNAP, TANF cash assistance, LIHEAP, and the child care subsidy — built from `src/data/stateFacts.js` by `src/data/stateProgramBuilder.js`. To deepen a state, add a hand-written file and a case in `src/data/statePrograms.js` the way NC does. The catalog is a draft until a state or county office seeds the facts it will stand behind.

Open `#office` for the one-page brief to leave with NCDHHS or a county Department of Social Services. Open `#charlotte` for the City of Charlotte preview, or `#admin` to change that preview's icons and contact information and to read the live usage counts. The preview is stored in the browser. It is not an official City of Charlotte system.

## A flow for students

A flow for students is a good idea, and it is the next path to build. Recorded November 2, 2026.

Today a student is one question on the last step of the household check: enrolled or not, then full-time or part-time. Pell, federal work-study, the NC Need-Based Scholarship, and Longleaf match only when that answer is yes. A full-time student is flagged on SNAP, because the student rules have exceptions for work, dependents, and being unable to work. Someone who came for tuition or a campus meal plan has to finish the county-office questions before they see any of that.

The household check stays the front door. The student flow is a second path from that screen, for someone who already knows they are in school. It asks school level (K-12 or college) and enrollment before the long household form. Results still include food, health, and cash aid when those may fit, along with the education programs. It stays a screening: no Social Security number, and it does not file in ePASS, NC FAST, or the FAFSA. School level is not asked yet. Catalog facts stay a draft until an office confirms them.

## Scripts

- `npm start` — local app
- `npm test` — resident entry, the state picker, the state catalog, the visitor counter, and the state-office brief
- `npm run build` — production bundle

## Visitor counts

The public pages never show a count. `#admin` reads the live totals: how many unique people started the form, and how many finished it. Each browser gets one random ID in `localStorage` (`eligibl-visitor-id`); it is sent to `/api/visitors` the first time the person reaches the form and again when they finish it. No answers, names, or IP addresses are stored. A zero on that page is a real zero. Until Redis is connected, the page shows the missing variable names and no number.

`api/visitors.js` is a Vercel serverless function that keeps one Redis set per event and reports its size, so every person is counted exactly once. It talks to Redis over the Upstash REST protocol. Set one pair on the Vercel project (server only — do not prefix with `REACT_APP_`), then redeploy:

- `KV_REST_API_URL` and `KV_REST_API_TOKEN` (filled in automatically by the Vercel Marketplace Upstash / KV integration), or
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

`VISITOR_KEY_PREFIX` is optional and defaults to `eligibl:visitors:`. Without a pair the function answers `503` and the rest of the site keeps working. Run the function locally with `vercel dev`; `npm start` alone has no `/api`.
