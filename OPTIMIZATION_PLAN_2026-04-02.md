# Urbanstone Optimization Plan - 2026-04-02

## Objectives

- remove friction from the first mobile view of the homepage
- reduce local setup drift between documentation and actual files
- eliminate build and dev noise caused by ambiguous tracing-root inference
- preserve the current supplier-browsing flow while tightening the highest-impact UI path

## Confirmed Findings

- the homepage quick-contact widget covers too much of the hero on mobile first paint
- local repo had two parallel app roots (`frontend` and `frontend-testing`), creating drift risk
- Next.js dev/build warns about multiple lockfiles and infers the wrong tracing root unless explicitly configured
- supplier gallery components are wired in the active app and should not be removed as dead code in this pass

## Implemented In This Pass

- add a real `.env.example` to the active frontend app
- configure `outputFileTracingRoot` in `next.config.mjs`
- change the quick-contact widget behavior so it does not force itself over the mobile hero after first paint
- keep the widget dismissible per session instead of reappearing immediately after a manual close
- add a browser smoke test for mobile launcher open-dismiss-reopen and `#quote` anchor navigation
- add a mobile snapshot pass script that captures homepage, one service-area page, and one material page
- promote upgraded app into `frontend` as canonical and remove `frontend-testing` to stop drift

## Next Optimization Steps

1. Run the new smoke test and snapshot pass in CI after selecting a stable preview base URL.
2. Add one desktop-width snapshot variant for each captured route to pair with the new mobile baseline.
3. Measure homepage first-load JS and image payload changes after any further component work.
4. Remove any remaining stale branding assets and references not needed for the Urban Stone live surface.

## Deferred Review Items

- persistent rate limiting for `/api/lead`
- production lead-delivery integration behind `LEAD_WEBHOOK_URL`
- route-template screenshot coverage beyond the homepage
- broader e2e coverage beyond launcher/anchor smoke checks
