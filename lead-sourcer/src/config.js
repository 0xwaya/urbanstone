/**
 * Loads local env files for development runs. Values already in the process
 * environment (GitHub Actions vars/secrets) always win.
 *
 * Live sources are the permit feeds only (src/permits.js, src/permits-accela.js).
 * Reddit, Craigslist and Apify/Facebook were retired on 2026-10-30; their
 * env vars (LEAD_SOURCER_ENABLE_REDDIT, LEAD_SOURCER_ENABLE_CRAIGSLIST,
 * LEAD_SOURCER_ENABLE_APIFY, APIFY_*) are ignored if still set.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
for (const envPath of [
    path.resolve(configDirectory, '..', '.env.local'),
    path.resolve(configDirectory, '..', '.env'),
    path.resolve(configDirectory, '..', '..', '.vercel', '.env.production.local'),
]) {
    dotenv.config({ path: envPath, override: false });
}

/** Retired sources. Their switches are ignored; kept here so tooling can say so. */
export const RETIRED_SOURCES = Object.freeze(['reddit', 'craigslist', 'apify']);
