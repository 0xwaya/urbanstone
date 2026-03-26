# Database Schema & API Endpoints

## Tables:
- Suppliers: id, name, website, contact
- Stones: id, supplier_id, tier, name, image_url, description, is_featured, created_at
- StoneVariants: id, stone_id, slab_length_in, slab_width_in, thickness_cm, finish, wholesale_price, margin_pct, retail_price, updated_at
- PriceLists: id, stone_id, variant_id, currency, retail_price, notes, effective_date
- Leads: id, name, email, phone, message, preferred_appointment, created_at
- Appointments: id, lead_id, date_time, status, notes
- Disclosures: id, title, content, version, is_active, created_at

## API Endpoints:
- GET /suppliers - list all suppliers
- GET /stones?supplier_id=&tier=&featured= - filter stones by supplier, tier, and featured flag
- GET /stones/{id}/variants - list slab sizes and pricing
- POST /leads - create a new lead
- GET /leads/{id} - get lead details
- POST /appointments - create new appointment
- GET /appointments/{id} - get appointment detail
- GET /disclosures - list active disclosures / liability waivers

