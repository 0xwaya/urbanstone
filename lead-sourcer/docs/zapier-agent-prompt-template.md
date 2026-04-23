# Lead Sourcer Field Contract Validation (Zapier Agent Prompt)

Title: Lead Sourcer Field Contract Validation

Purpose:
Validate Lead Sourcer -> Zapier field mappings against the current field contract and generate migration guidance if Zap fields changed.

Context:
- Contract file: `lead-sourcer/docs/lead-sourcer-zap-field-contract.md`
- Validate mappings for namespace `357570886`
- Lead Sourcer emits canonical payload plus mapped flat keys
- Namespace migration target:
  - `requestId` => `357570886__requestId` (not metadata namespace)
  - `dedupeKey` => `357570886__dedupeKey` (not metadata namespace)

Actions:
1. Verify incoming Lead Sourcer outputs map to each Zap field per contract.
2. If unmapped fields appear, propose a default mapping or flag as follow-up.
3. If Zap fields changed, generate:
   - an updated mapping block
   - a migration checklist
   - one test payload aligned to the new structure

Output Format (JSON):
```json
{
  "mapped_fields": [
    {
      "canonical": "lead.name",
      "zap_field": "357570886__lead__name",
      "status": "ok"
    }
  ],
  "unmapped_fields": [
    {
      "field": "metadata.someNewField",
      "reason": "no destination field configured"
    }
  ],
  "suggested_changes": [
    {
      "type": "mapping_update",
      "details": "Add metadata.someNewField -> 357570886__metadata__someNewField"
    }
  ],
  "test_payload": {
    "357570886__source": "reddit",
    "357570886__lead__name": "Example Lead",
    "357570886__requestId": "lead-sourcer/reddit/reddit:abc123",
    "357570886__dedupeKey": "reddit:abc123",
    "357570886__submittedAt": "2026-04-23T12:00:00.000Z"
  }
}
```

Validation Notes:
- Missing optional fields must be `""`.
- Do not emit `null` for mapped Zap fields.
- Preserve `requestId`, `submittedAt`, and `dedupeKey` traceability in recommendations.
- Flag any remaining use of legacy aliases:
  - `357570886__metadata__requestId`
  - `357570886__metadata__dedupeKey`
