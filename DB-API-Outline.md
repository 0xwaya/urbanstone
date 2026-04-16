# Database Schema & API Endpoints

## Tables

- Suppliers: id, name, website, contact
- Stones: id, supplier_id, tier, name, image_url, description, is_featured, created_at
- StoneVariants: id, stone_id, slab_length_in, slab_width_in, thickness_cm, finish, wholesale_price, margin_pct, retail_price, updated_at
- PriceLists: id, stone_id, variant_id, currency, retail_price, notes, effective_date
- Leads: id, name, email, phone, message, preferred_appointment, created_at
- Appointments: id, lead_id, date_time, status, notes
- Disclosures: id, title, content, version, is_active, created_at
- Contractors: id (uuid), email (unique), company_name, website, approved (bool, default false), created_at, last_login_at
- MagicLinks: id (uuid), contractor_id (fk → contractors.id), token_hash, expires_at, used (bool)

## API Endpoints

- GET /suppliers - list all suppliers
- GET /stones?supplier_id=&tier=&featured= - filter stones by supplier, tier, and featured flag
- GET /stones/{id}/variants - list slab sizes and pricing
- POST /leads - create a new lead
- GET /leads/{id} - get lead details
- POST /appointments - create new appointment
- GET /appointments/{id} - get appointment detail
- GET /disclosures - list active disclosures / liability waivers

## Contractor Portal API Endpoints

- POST /api/contractor/register - register a new contractor (writes to contractors table; auto-approves if email is in admin/approved list)
- POST /api/contractor/request-link - issue a one-time magic link to an approved/admin email (inserts magic_links row, sends email via Resend)
- GET /api/contractor/verify?token=... - verify magic link token, set signed HttpOnly session cookie, redirect to /contractors
- POST /api/contractor/logout - clear session cookie

## Contractor Access Model

- Admin emails: hard-coded in `frontend/lib/contractor-access.js` STATIC_ADMIN_EMAILS; runtime additions via CONTRACTOR_ADMIN_EMAILS env var
- Approved emails: hard-coded in STATIC_APPROVED_EMAILS; runtime additions via CONTRACTOR_APPROVED_EMAILS env var
- All other registrations: approved=false until manually set in Supabase
