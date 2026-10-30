# Eligibl

A check a person can finish before they take a number at a county office. Federal aid plus each state's headline programs, and a North Carolina map of local doors. The map also lists North Carolina State Parks campgrounds and published safe-parking lots. A screening, not a decision.

The check now asks which state you live in and covers all 50 states and Washington, DC. North Carolina has a hand-written catalog (`src/data/nc-programs.js`). Every other state gets its six headline programs — Medicaid, CHIP, SNAP, TANF cash assistance, LIHEAP, and the child care subsidy — built from `src/data/stateFacts.js` by `src/data/stateProgramBuilder.js`. To deepen a state, add a hand-written file and a case in `src/data/statePrograms.js` the way NC does. The catalog is a draft until a state or county office seeds the facts it will stand behind.

Open `#office` for the one-page brief to leave with NCDHHS or a county Department of Social Services. Open `#charlotte` for the City of Charlotte preview, or `#admin` to change that preview's icons and contact information. The preview is stored in the browser. It is not an official City of Charlotte system.

## Scripts

- `npm start` — local app
- `npm test` — resident entry, the state picker, the state catalog, the visitor counter, and the state-office brief
- `npm run build` — production bundle

## Visitor counter

The front page shows how many unique people have used the check. Each browser gets one random ID in `localStorage` (`eligibl-visitor-id`); it is sent to `/api/visitors` the first time the person reaches the form and again when they finish it. No answers, names, or IP addresses are stored.

`api/visitors.js` is a Vercel serverless function that keeps one Redis set per event and reports its size, so every person is counted exactly once. It talks to Redis over the Upstash REST protocol and reads credentials from either pair of environment variables:

- `KV_REST_API_URL` and `KV_REST_API_TOKEN` (Vercel Marketplace Upstash / KV integration), or
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (a plain Upstash database).

Without them the function answers `503` and the pill stays hidden, so the site keeps working. `REACT_APP_VISITOR_API` can point the client at a different endpoint. Run the function locally with `vercel dev`; `npm start` alone has no `/api`, and the pill stays hidden.
