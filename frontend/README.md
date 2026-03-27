# Frontend

Standalone Next.js pages application for the Amazon Granite marketing site.

This frontend includes the current live mobile layout pass for navigation, hero spacing, supplier browsing, and quote capture.

## Requirements

- Node.js 20.11 or newer
- npm 10 or newer

## Local Development

1. `npm install`
2. `cp .env.example .env.local`
3. Set `LEAD_WEBHOOK_URL` to the HTTPS endpoint that should receive quote requests.
4. `npm run dev`

## Environment Variables

- `NEXT_PUBLIC_COMPANY_PHONE`: phone number rendered in the UI.
- `NEXT_PUBLIC_LEAD_EMAIL`: fallback email address rendered in the UI.
- `LEAD_WEBHOOK_URL`: required for successful lead delivery from `/api/lead`.

If `LEAD_WEBHOOK_URL` is not set, the form stays visible but the API intentionally returns a configuration error instead of silently dropping leads.

## Quality Gates

- `npm run lint`
- `npm run test`
- `npm run build`

For a production-like local verification pass, run:

- `HOSTNAME=127.0.0.1 PORT=3000 npm run start`

## Deployment

### Container

Build and run the included Docker image:

```bash
docker build -t amazon-granite-frontend .
docker run --rm -p 3000:3000 --env-file .env.local amazon-granite-frontend
```

### Process Hosting

The app builds with Next.js standalone output enabled.

```bash
npm run build
HOSTNAME=127.0.0.1 PORT=3000 npm run start
```

The `start` script runs `node .next/standalone/server.js`.

The production server requires `sharp` to be installed because the site uses Next image optimization in standalone mode.

Recommended release sequence:

1. install dependencies in `frontend`
2. set `LEAD_WEBHOOK_URL` and any public contact environment values
3. run lint, test, and build
4. start the production server from `frontend` or deploy the `frontend` directory through your host

## Runtime Hardening

The current baseline includes:

- security headers in `next.config.mjs`
- same-origin enforcement for the lead endpoint
- payload normalization and validation
- a honeypot field to catch simple bots
- basic in-memory rate limiting for repeated submissions

Before a real production launch, add external monitoring, persistent rate limiting, and a verified lead-delivery integration.
