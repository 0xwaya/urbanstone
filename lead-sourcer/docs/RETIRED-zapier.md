# Zapier catch-hook — retired 2026-10-30

Status: **retired**. Do not turn it back on.

## What it was

Zap `357570886` was a Catch Hook. The site and the lead sourcer posted JSON to `LEAD_WEBHOOK_URL`. Zapier filtered, deduped in Zapier Storage, and sent Outlook mail.

## Why it stopped

Mail already goes straight to sales@urbanstone.co through Resend. The hook was a second copy of the same email, and the URL had been exposed in git history. On Oct 28–29 the sourcer stopped posting to it (`LEAD_SOURCER_WEBHOOK_SECONDARY=false`). On Oct 30 the send path was removed.

Nothing in the live site reads `LEAD_WEBHOOK_URL`:

- Quote, chat, and contractor estimate forms email sales@ via Resend (`frontend/pages/api/lead.js`).
- The lead sourcer emails sales@ via Resend (`lead-sourcer/src/relay.js`). `LEAD_WEBHOOK_URL` is ignored.

A different, optional setting, `CONTRACTOR_REGISTRATION_WEBHOOK_URL`, is not this zap. Leave it alone.

## What to delete

1. GitHub Actions secret `LEAD_WEBHOOK_URL` on `0xwaya/urbanstone`.
2. The same name in Vercel, if it is still there.
3. The Zapier zap itself, and rotate the hook in Zapier so the old URL cannot be reused.
4. Any local `.env` copy of `LEAD_WEBHOOK_URL`.

The URL remains in old commits. Deleting the secret does not erase git history. Do not paste the URL into a new file.

## What still runs

The lead sourcer GitHub Action at 8:00, 12:00, and 5:00 ET. Delivery is the sales inbox only.
