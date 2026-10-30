# Eligibl

A check a person can finish before they take a number at a county office. Federal aid plus each state's headline programs, and a North Carolina map of local doors. A screening, not a decision.

The check asks which state you live in and covers all 50 states and Washington, DC. North Carolina has a hand-written catalog (`src/data/nc-programs.js`). Every other state gets its six headline programs — Medicaid, CHIP, SNAP, TANF cash assistance, LIHEAP, and the child care subsidy — built from `src/data/stateFacts.js` by `src/data/stateProgramBuilder.js`. To deepen a state, add a hand-written file and a case in `src/data/statePrograms.js` the way NC does.

Open `#charlotte` for the City of Charlotte preview. The preview is stored in the browser. It is not an official City of Charlotte system. Campgrounds and safe parking are not on the map right now.

## Scripts

- `npm start` — local app
- `npm test` — resident entry, the state picker, the state catalog, and the visitor counter
- `npm run build` — production bundle

## Visitor counts

The front page shows a pill with how many unique people have tried the form. That number is the size of the `started` set in Redis. Each browser gets one random ID in `localStorage` (`eligibl-visitor-id`); it is sent to `/api/visitors` the first time the person reaches the form and again when they finish it. No answers, names, or IP addresses are stored. Until Redis answers, the pill stays hidden. It never shows a stand-in number.

`api/visitors.js` is a Vercel serverless function that keeps one Redis set per event and reports its size, so every person is counted exactly once. It talks to Redis over the Upstash REST protocol. Set one pair on the Vercel project (server only — do not prefix with `REACT_APP_`), then redeploy:

- `KV_REST_API_URL` and `KV_REST_API_TOKEN` (filled in automatically by the Vercel Marketplace Upstash / KV integration), or
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

`VISITOR_KEY_PREFIX` is optional and defaults to `eligibl:visitors:`. Without a pair the function answers `503` and the rest of the site keeps working. Run the function locally with `vercel dev`; `npm start` alone has no `/api`.
