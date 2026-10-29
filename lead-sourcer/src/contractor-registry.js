/**
 * City of Cincinnati registered-contractor lookup (CAGIS ezTrak).
 *
 * The registry is a public ASP.NET search form with no API. One "All types"
 * search returns every registered contractor (name, phone, email, zip, type).
 * We fetch it at most once per TTL window, cache it next to the other sourcer
 * state (runs/), and use it only to enrich permit leads that are emailed
 * internally to sales@. Contractors are never contacted by this code.
 *
 * Any failure degrades to "no enrichment"; it never fails the run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REGISTRY_URL = 'https://cagis.hamilton-co.org/opal/registeredContractors.aspx?entcode=cinc';
const FORM_PREFIX = '_ctl0:ContentPlaceHolder_main_content:';
const USER_AGENT = 'UrbanStoneLeadSourcer/1.0 (+https://www.urbanstone.co)';
const DEFAULT_TTL_DAYS = 7;
const DEFAULT_TIMEOUT_MS = 60000;

const NAME_SUFFIX_TOKENS = new Set(['LLC', 'L L C', 'INC', 'INCORPORATED', 'CO', 'COMPANY', 'CORP', 'CORPORATION', 'LTD', 'LLP', 'PLLC', 'THE']);

export function getRegistryCachePath(env = process.env) {
    return env.LEAD_SOURCER_REGISTRY_CACHE_FILE || path.resolve(__dirname, '..', 'runs', 'contractor-registry.json');
}

function getTtlMs(env = process.env) {
    const days = Number(env.LEAD_SOURCER_REGISTRY_TTL_DAYS || DEFAULT_TTL_DAYS);
    return (Number.isFinite(days) && days > 0 ? days : DEFAULT_TTL_DAYS) * 24 * 60 * 60 * 1000;
}

function decodeEntities(text) {
    return String(text || '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

function cellText(html) {
    return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * Normalize a company name for matching permit `companyname` values against
 * registry names: case, quotes, punctuation, "&" vs "AND" and legal suffixes.
 */
export function normalizeCompanyName(name) {
    const cleaned = String(name || '')
        .toUpperCase()
        .replace(/&/g, ' AND ')
        .replace(/[^A-Z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const tokens = cleaned.split(' ').filter(Boolean);
    while (tokens.length > 1 && NAME_SUFFIX_TOKENS.has(tokens[tokens.length - 1])) tokens.pop();
    while (tokens.length > 1 && tokens[0] === 'THE') tokens.shift();
    return tokens.join(' ');
}

function normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    if (digits.length === 11 && digits.startsWith('1')) return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    return '';
}

function normalizeEmail(email) {
    const value = String(email || '').trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : '';
}

/** Parse the registry results table into entries merged by normalized name. */
export function parseRegistryHtml(html) {
    const byKey = new Map();
    const rows = String(html || '').match(/<tr class="tr(?:row|alternaterow)"[\s\S]*?<\/tr>/g) || [];

    for (const row of rows) {
        const cells = (row.match(/<td[^>]*>[\s\S]*?<\/td>/g) || []).map(cellText);
        if (cells.length < 7) continue;
        const [name, phone, address, email, zip, type, number] = cells;
        const key = normalizeCompanyName(name);
        if (!key) continue;

        const existing = byKey.get(key) || {
            key, name, phone: '', email: '', address: '', zip: '', types: [], registrationNumbers: [],
        };
        existing.phone = existing.phone || normalizePhone(phone);
        existing.email = existing.email || normalizeEmail(email);
        existing.address = existing.address || address;
        existing.zip = existing.zip || zip;
        if (type && !existing.types.includes(type)) existing.types.push(type);
        if (number && !existing.registrationNumbers.includes(number)) existing.registrationNumbers.push(number);
        byKey.set(key, existing);
    }

    return [...byKey.values()];
}

function extractHiddenInputs(html) {
    const fields = {};
    for (const match of String(html || '').matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
        const tag = match[0];
        const name = tag.match(/name="([^"]+)"/)?.[1];
        const value = tag.match(/value="([^"]*)"/)?.[1] ?? '';
        if (name) fields[name] = decodeEntities(value);
    }
    return fields;
}

/** Fetch the full registry (all contractor types) via the public search form. */
export async function fetchRegistryHtml({ fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const headers = { 'User-Agent': USER_AGENT };
    const formPage = await fetchImpl(REGISTRY_URL, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (!formPage.ok) throw new Error(`registry form HTTP ${formPage.status}`);
    const hidden = extractHiddenInputs(await formPage.text());
    if (!hidden.__VIEWSTATE) throw new Error('registry form missing __VIEWSTATE (markup changed?)');

    const body = new URLSearchParams({
        ...hidden,
        [`${FORM_PREFIX}ddlWildCard`]: 'Contains',
        [`${FORM_PREFIX}tbNameFilter`]: '',
        [`${FORM_PREFIX}ddlContractorTypes`]: '',
        [`${FORM_PREFIX}Button1`]: 'Search',
    });
    const results = await fetchImpl(REGISTRY_URL, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(timeoutMs),
    });
    if (!results.ok) throw new Error(`registry search HTTP ${results.status}`);
    return results.text();
}

function readCache(cachePath) {
    try {
        const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        if (!Array.isArray(data?.entries) || !data.fetchedAt) return null;
        return data;
    } catch {
        return null;
    }
}

function writeCache(cachePath, entries, now) {
    try {
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        fs.writeFileSync(cachePath, JSON.stringify({ fetchedAt: now.toISOString(), entries }));
    } catch (error) {
        console.warn(`[registry] Could not write cache: ${error?.message || error}`);
    }
}

export function buildRegistryIndex(entries = []) {
    return new Map(entries.map((entry) => [entry.key || normalizeCompanyName(entry.name), entry]));
}

export function lookupContractor(index, companyName) {
    if (!index || !companyName) return null;
    return index.get(normalizeCompanyName(companyName)) || null;
}

/**
 * Load the registry index, preferring a fresh cache, then a live fetch, then a
 * stale cache. Returns an empty index (status "unavailable") on total failure.
 */
export async function loadContractorRegistry({
    fetchImpl = fetch,
    env = process.env,
    now = new Date(),
    cachePath = getRegistryCachePath(env),
    timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
    const cached = readCache(cachePath);
    const cacheAgeMs = cached ? now.getTime() - new Date(cached.fetchedAt).getTime() : Infinity;

    if (cached && cacheAgeMs >= 0 && cacheAgeMs < getTtlMs(env)) {
        return { index: buildRegistryIndex(cached.entries), status: 'cache', count: cached.entries.length, fetchedAt: cached.fetchedAt };
    }

    try {
        const entries = parseRegistryHtml(await fetchRegistryHtml({ fetchImpl, timeoutMs }));
        if (entries.length === 0) throw new Error('registry returned 0 contractors (markup changed?)');
        writeCache(cachePath, entries, now);
        return { index: buildRegistryIndex(entries), status: 'live', count: entries.length, fetchedAt: now.toISOString() };
    } catch (error) {
        console.warn(`[registry] Contractor registry fetch failed; continuing ${cached ? 'with stale cache' : 'without enrichment'}: ${error?.message || error}`);
        if (cached) {
            return { index: buildRegistryIndex(cached.entries), status: 'stale-cache', count: cached.entries.length, fetchedAt: cached.fetchedAt };
        }
        return { index: new Map(), status: 'unavailable', count: 0, fetchedAt: null };
    }
}
