# Frontend

Standalone Next.js pages application for the Amazon Granite marketing site.

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
npm run start
```

## Runtime Hardening

The current baseline includes:

- security headers in `next.config.mjs`
- same-origin enforcement for the lead endpoint
- payload normalization and validation
- a honeypot field to catch simple bots
- basic in-memory rate limiting for repeated submissions

Before a real production launch, add external monitoring, persistent rate limiting, and a verified lead-delivery integration.