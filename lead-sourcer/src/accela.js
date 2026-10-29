/**
 * Minimal Accela Citizen Access (ACA) scraper shared by the county permit sources.
 *
 * Uses only the anonymous "General Search" on Cap/CapHome.aspx (date range) and
 * public CapDetail.aspx pages; never the reCAPTCHA-protected pages. Polite by
 * design: one request at a time with a minimum interval (default 1 req/sec),
 * per-request timeouts, a small number of retries with backoff, and a hard cap
 * on detail-page fetches per run (enforced by the caller via maxDetails).
 */

const DEFAULT_USER_AGENT = 'UrbanStoneLeadSourcer/1.0 (+https://urbanstone.co; permit research, 1 req/sec)';
const SEARCH_BUTTON_TARGET = 'ctl00$PlaceHolderMain$btnNewSearch';

export function decodeEntities(text) {
    return String(text ?? '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

function clean(text) {
    return decodeEntities(String(text ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function attr(tag, name) {
    const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
    return match ? decodeEntities(match[2] ?? match[3] ?? '') : null;
}

/** Collect the ASP.NET form state: hidden/text inputs plus the selected option of each select. */
export function parseFormFields(html) {
    const fields = {};
    for (const tag of String(html).match(/<input\b[^>]*>/gi) || []) {
        const name = attr(tag, 'name');
        if (!name) continue;
        const type = (attr(tag, 'type') || 'text').toLowerCase();
        if (['submit', 'button', 'image', 'reset', 'file'].includes(type)) continue;
        if ((type === 'checkbox' || type === 'radio') && !/\schecked\b/i.test(tag)) continue;
        fields[name] = attr(tag, 'value') ?? '';
    }
    for (const match of String(html).matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
        const name = attr(`<select ${match[1]}>`, 'name');
        if (!name) continue;
        const selected = match[2].match(/<option\b[^>]*\sselected\b[^>]*>/i) || match[2].match(/<option\b[^>]*>/i);
        fields[name] = selected ? attr(selected[0], 'value') ?? '' : '';
    }
    return fields;
}

function findField(fields, suffix) {
    return Object.keys(fields).find((key) => key.endsWith(suffix)) || null;
}

/** MM/DD/YYYY in America/New_York, which is how ACA date pickers expect it. */
export function formatAcaDate(date) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(date)
        .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
    return `${parts.month}/${parts.day}/${parts.year}`;
}

export function buildDateSearchForm(fields, { startDate, endDate }) {
    const startKey = findField(fields, 'txtGSStartDate');
    const endKey = findField(fields, 'txtGSEndDate');
    if (!startKey || !endKey) throw new Error('ACA search form has no General Search date fields (markup changed or page blocked)');
    return {
        ...fields,
        [startKey]: startDate,
        [endKey]: endDate,
        __EVENTTARGET: SEARCH_BUTTON_TARGET,
        __EVENTARGUMENT: '',
    };
}

function spanValue(rowHtml, idPattern) {
    const match = rowHtml.match(new RegExp(`<span[^>]*id="[^"]*_${idPattern}"[^>]*>([\\s\\S]*?)</span>`, 'i'));
    return match ? clean(match[1]) : '';
}

/** Parse the search results grid into records keyed by the ACA label ids. */
export function parseResultRows(html, { origin = '' } = {}) {
    const rows = [];
    for (const match of String(html).matchAll(/<tr[^>]*class="ACA_TabRow_(?:Odd|Even)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const row = match[1];
        const recordNumber = spanValue(row, 'lblPermitNumber1?');
        if (!recordNumber) continue;
        const link = row.match(/href="([^"]*\/Cap\/CapDetail\.aspx[^"]*)"/i);
        rows.push({
            recordNumber,
            recordType: spanValue(row, 'lblType'),
            description: spanValue(row, 'lblDescription'),
            date: spanValue(row, 'lblUpdatedTime'),
            address: spanValue(row, 'lblAddress').replace(/\s+,/g, ',').replace(/\s+United States$/i, ''),
            status: spanValue(row, 'lblStatus'),
            detailUrl: link ? `${origin}${decodeEntities(link[1])}` : '',
        });
    }
    return rows;
}

/** __doPostBack target of the grid's "Next" pager link, or null on the last page. */
export function findNextPageTarget(html) {
    const decoded = String(html).replace(/&#39;/g, "'");
    const match = decoded.match(/__doPostBack\('([^']*)',\s*''\)"[^>]*>\s*(?:<[^>]+>\s*)*Next/i);
    return match ? match[1] : null;
}

/** Flatten a detail page to trimmed text lines (block tags become line breaks). */
export function htmlToLines(html) {
    const text = String(html)
        .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>|<\/(td|tr|div|h1|h2|h3|p|li|table)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ');
    return decodeEntities(text).split('\n').map((line) => line.replace(/[\s\u00a0]+/g, ' ').trim()).filter(Boolean);
}

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const PHONE_RE = /\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}/;
const SECTION_LABELS = new Set([
    'Record Details', 'Project Description:', 'Owner:', 'More Details', 'Related Contacts', 'Licensed Professional:',
    'Applicant:', 'Application Information', 'Parcel Information', 'Fees', 'Inspections', 'Additional Information',
]);
const CONTACT_HEADER_RE = /^([A-Za-z /&-]+?) information\s*(.*)$/;

function sectionAfter(lines, label) {
    const start = lines.indexOf(label);
    if (start < 0) return [];
    const out = [];
    for (let i = start + 1; i < lines.length; i += 1) {
        if (SECTION_LABELS.has(lines[i])) break;
        out.push(lines[i]);
    }
    return out;
}

function valueAfter(lines, label) {
    const index = lines.findIndex((line) => line.toLowerCase() === label.toLowerCase());
    return index >= 0 && index + 1 < lines.length ? lines[index + 1] : '';
}

function looksLikeAddress(line) {
    return /^\d/.test(line) || /,\s*[A-Z]{2},?\s*\d{5}/.test(line) || /^united states$/i.test(line) || /^p\.?o\.? box/i.test(line);
}

/** Pull name / business / phone / email out of a contact block's lines. */
function parseContactLines(lines, headerName = '') {
    const contact = { name: headerName.replace(/\s*\*$/, '').trim(), business: '', phone: '', email: '', licenseType: '' };
    const textLines = [];
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (/^(primary |contact |business |mobile |home |work )?phone( \d)?:$|^fax:$|^e-?mail:$/i.test(line)) continue;
        const email = line.match(EMAIL_RE);
        if (email) { contact.email = contact.email || email[0]; continue; }
        if (PHONE_RE.test(line) && line.replace(PHONE_RE, '').replace(/[^A-Za-z]/g, '').length === 0) { contact.phone = contact.phone || line.match(PHONE_RE)[0]; continue; }
        if (looksLikeAddress(line)) continue;
        if (/^(CONTRACTOR|GENERAL CONTRACTOR|HOME IMPROVEMENT|BUILDER|ARCHITECT|ENGINEER|ELECTRICAL|PLUMBING|HVAC|OWNER|RESIDENTIAL|COMMERCIAL)\b.*\d*$/.test(line) && line === line.toUpperCase()) {
            contact.licenseType = contact.licenseType || line;
            continue;
        }
        if (/:$/.test(line)) break;
        textLines.push(line);
    }
    if (!contact.name && textLines.length > 0) contact.name = textLines.shift();
    // ACA prints the person, then the business on the next line.
    const business = textLines.find((line) => line.toLowerCase() !== contact.name.toLowerCase());
    if (business) contact.business = business;
    return contact;
}

function parseRelatedContacts(lines) {
    const start = lines.indexOf('Related Contacts');
    if (start < 0) return [];
    const contacts = [];
    let current = null;
    for (let i = start + 1; i < lines.length; i += 1) {
        const line = lines[i];
        if (line === 'Application Information' || line === 'Parcel Information' || line === 'Fees') break;
        const header = line.match(CONTACT_HEADER_RE);
        if (header && !/:$/.test(line)) {
            if (current) contacts.push(current);
            current = { role: header[1].trim(), headerName: header[2] || '', lines: [] };
            continue;
        }
        if (current) current.lines.push(line);
    }
    if (current) contacts.push(current);
    return contacts.map(({ role, headerName, lines: block }) => ({ role, ...parseContactLines(block, headerName) }));
}

function parseCost(lines) {
    for (const label of ['Estimated Value of Construction:', 'Estimated Project Cost:', 'Job Value($):', 'Job Value:', 'Valuation:', 'Construction Cost:']) {
        const raw = valueAfter(lines, label);
        const amount = Number(String(raw).replace(/[$,\s]/g, ''));
        if (raw && Number.isFinite(amount) && amount > 0) return amount;
    }
    return 0;
}

/** Extract the facts we need from a CapDetail page. Contact data stays in memory. */
export function parseDetailPage(html) {
    const lines = htmlToLines(html);
    const workLocation = [];
    const locationStart = lines.indexOf('Work Location');
    if (locationStart >= 0) {
        for (let i = locationStart + 1; i < lines.length && lines[i] !== 'Record Details'; i += 1) workLocation.push(lines[i].replace(/\s*\*$/, ''));
    }
    const projectLines = sectionAfter(lines, 'Project Description:');
    const scope = valueAfter(lines, 'SCOPE OF WORK:') || valueAfter(lines, 'Scope of Work:') || valueAfter(lines, 'Description of Work:');
    const description = [...projectLines, scope].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const ownerLines = sectionAfter(lines, 'Owner:');
    const owner = (ownerLines[0] || '').replace(/\s*\*$/, '').trim();
    const licensedLines = sectionAfter(lines, 'Licensed Professional:');
    const licensedProfessional = licensedLines.length > 0 ? { role: 'Licensed Professional', ...parseContactLines(licensedLines) } : null;
    const applicantLines = sectionAfter(lines, 'Applicant:');
    const applicant = applicantLines.length > 0 ? { role: 'Applicant', ...parseContactLines(applicantLines) } : null;
    return {
        workLocation: workLocation.join(', '),
        description,
        owner,
        licensedProfessional,
        applicant,
        contacts: parseRelatedContacts(lines),
        cost: parseCost(lines),
    };
}

const CONTACT_ROLE_PRIORITY = ['contractor', 'general contractor', 'builder', 'primary contact', 'authorizing agent', 'agent'];

function normalizeName(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\b(the|inc|llc|co|corp|company)\b/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Choose the contractor of record: the licensed professional first, then a
 * contractor/builder contact, then the primary contact/agent, skipping anyone
 * who is the property owner. Returns { contractor: null, reason } when only the
 * owner (owner-pulled) or no one is on the record.
 */
export function pickContractor(detail) {
    const candidates = [];
    if (detail.licensedProfessional) candidates.push(detail.licensedProfessional);
    for (const role of CONTACT_ROLE_PRIORITY) {
        for (const contact of detail.contacts || []) if (contact.role.toLowerCase() === role) candidates.push(contact);
    }
    if (detail.applicant) candidates.push(detail.applicant);
    const owner = normalizeName(detail.owner);
    const ownerTokens = new Set(owner.split(' ').filter((token) => token.length > 1));
    // Assessor-style owner names ("ROWLAND CHARLES L III & ALEXANDRA R") still match "Charles Rowland".
    const isOwnerName = (value) => {
        const normalized = normalizeName(value);
        if (!normalized || !owner) return false;
        if (normalized === owner) return true;
        const tokens = normalized.split(' ').filter((token) => token.length > 1);
        return tokens.length >= 2 && tokens.every((token) => ownerTokens.has(token));
    };
    let sawOwner = false;
    for (const contact of candidates) {
        const company = contact.business || contact.name;
        if (!company) continue;
        const isOwner = /\bowner\b/i.test(contact.licenseType || '') || /^owner\b/i.test(company)
            || isOwnerName(company) || (!contact.business && isOwnerName(contact.name));
        if (isOwner) {
            sawOwner = true;
            continue;
        }
        return { contractor: { ...contact, company } };
    }
    if (sawOwner) return { contractor: null, reason: 'owner-pulled' };
    return { contractor: null, reason: 'no-contractor' };
}

class CookieJar {
    constructor() { this.cookies = new Map(); }

    store(headers) {
        const list = typeof headers?.getSetCookie === 'function' ? headers.getSetCookie() : [headers?.get?.('set-cookie')].filter(Boolean);
        for (const raw of list) {
            const [pair] = String(raw).split(';');
            const eq = pair.indexOf('=');
            if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
        }
    }

    header() { return [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '); }
}

/**
 * One polite ACA session (cookie jar + rate limiter). `fetchImpl` and `sleep`
 * are injectable for tests.
 */
export function createAccelaClient({
    baseUrl,
    module = 'Building',
    fetchImpl = fetch,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    minIntervalMs = 1000,
    timeoutMs = 30000,
    retries = 2,
    userAgent = DEFAULT_USER_AGENT,
} = {}) {
    const origin = new URL(baseUrl).origin;
    const searchUrl = `${baseUrl}/Cap/CapHome.aspx?module=${encodeURIComponent(module)}&TabName=${encodeURIComponent(module)}`;
    const jar = new CookieJar();
    let lastRequestAt = 0;
    let requestCount = 0;

    async function request(url, { method = 'GET', form = null, referer = null } = {}) {
        let lastError;
        for (let attempt = 0; attempt <= retries; attempt += 1) {
            const wait = lastRequestAt + minIntervalMs * (attempt === 0 ? 1 : 2 ** attempt) - Date.now();
            if (lastRequestAt && wait > 0) await sleep(wait);
            lastRequestAt = Date.now();
            requestCount += 1;
            const headers = { 'User-Agent': userAgent, Accept: 'text/html,application/xhtml+xml' };
            const cookie = jar.header();
            if (cookie) headers.Cookie = cookie;
            if (form) {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                // ACA rejects postbacks without these as cross-site request forgery.
                headers.Referer = referer || url;
                headers.Origin = origin;
            }
            try {
                const response = await fetchImpl(url, {
                    method,
                    headers,
                    body: form ? new URLSearchParams(form).toString() : undefined,
                    redirect: 'follow',
                    signal: AbortSignal.timeout(timeoutMs),
                });
                jar.store(response.headers);
                const body = await response.text();
                if (response.status >= 500 || response.status === 429) throw new Error(`HTTP ${response.status}`);
                if (!response.ok) {
                    const error = new Error(`HTTP ${response.status}`);
                    error.permanent = true;
                    throw error;
                }
                if (/g-recaptcha|cf-challenge|Attention Required!/i.test(body) && !/txtGSStartDate|CapDetail|Work Location/i.test(body)) {
                    const error = new Error('blocked by a captcha/challenge page');
                    error.permanent = true;
                    throw error;
                }
                if (/cross-site request forgery/i.test(body)) {
                    const error = new Error('ACA rejected the postback (CSRF check)');
                    error.permanent = true;
                    throw error;
                }
                return body;
            } catch (error) {
                lastError = error;
                if (error.permanent) break;
            }
        }
        throw new Error(`ACA ${method} ${url.replace(/\?.*/, '')} failed: ${lastError?.message || lastError}`);
    }

    /** Date-range General Search, following "Next" up to maxPages. */
    async function searchByDate({ startDate, endDate, maxPages = 30 }) {
        const home = await request(searchUrl);
        let page = await request(searchUrl, { method: 'POST', form: buildDateSearchForm(parseFormFields(home), { startDate, endDate }) });
        const records = parseResultRows(page, { origin });
        let pages = 1;
        let truncated = false;
        while (pages < maxPages) {
            const next = findNextPageTarget(page);
            if (!next) break;
            page = await request(searchUrl, { method: 'POST', form: { ...parseFormFields(page), __EVENTTARGET: next, __EVENTARGUMENT: '' } });
            const rows = parseResultRows(page, { origin });
            if (rows.length === 0) break;
            records.push(...rows);
            pages += 1;
        }
        if (pages >= maxPages && findNextPageTarget(page)) truncated = true;
        const seen = new Set();
        return {
            records: records.filter((row) => (seen.has(row.recordNumber) ? false : seen.add(row.recordNumber))),
            pages,
            truncated,
        };
    }

    async function fetchDetail(detailUrl) {
        return parseDetailPage(await request(detailUrl, { referer: searchUrl }));
    }

    return { searchByDate, fetchDetail, origin, searchUrl, get requestCount() { return requestCount; } };
}
