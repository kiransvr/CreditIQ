# Database Schema Draft (Sprint 1)

## 1. Core Tables

### institutions
- id (PK)
- institution_code (unique)
- institution_name
- created_at

### users
- id (PK)
- institution_id (FK institutions.id)
- username (unique)
- role_code
- is_active
- created_at

### uploads
- id (PK)
- institution_id (FK institutions.id)
- file_name
- file_type
- template_version
- status
- uploaded_by (FK users.id)
- uploaded_at

### upload_rows
- id (PK)
- upload_id (FK uploads.id)
- row_number
- raw_payload_json
- is_valid
- created_at

### validation_issues
- id (PK)
- upload_id (FK uploads.id)
- row_number
- field_name
- issue_type (error or warning)
- issue_code
- issue_message
- created_at

### audit_events
- id (PK)
- actor_user_id (FK users.id)
- action_type
- object_type
- object_id
- metadata_json
- event_at

## 2. Indexing Recommendations

- uploads(institution_id, uploaded_at desc)
- validation_issues(upload_id, issue_type)
- audit_events(object_type, object_id)

## 3. Data Integrity Rules

- uploads.status values constrained by enum:
  - received
  - validating
  - validated
  - failed
- validation_issues.issue_type constrained to error or warning.

## 4. Migration Notes

- Keep scoring tables separate for Sprint 2.
- Preserve upload raw payload for audit and replay.
