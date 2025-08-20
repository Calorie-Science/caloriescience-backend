# Client Email Uniqueness Implementation

## Overview
This document describes the implementation of unique email constraints for the clients table to ensure data integrity and prevent duplicate client records.

## Changes Made

### 1. Database Schema Updates
- **Main Schema**: Updated `database/schema.sql` to include `UNIQUE` constraint on the `email` field in the `clients` table
- **Base Migration**: Updated `database/migrations/000_base_schema.sql` to include the unique constraint
- **New Migration**: Created `database/migrations/034_add_unique_email_constraint_to_clients.sql` to apply the constraint to existing databases

### 2. API Error Handling
- **Client Creation**: Enhanced error handling in `api/clients/index.ts` to return HTTP 409 (Conflict) when attempting to create a client with a duplicate email
- **Client Updates**: Enhanced error handling in `api/clients/[id].ts` to return HTTP 409 (Conflict) when attempting to update a client with a duplicate email

### 3. Helper Scripts
- **Duplicate Check**: Created `check-duplicate-emails.sql` to identify existing duplicate emails before applying the migration

## Migration Process

### Pre-Migration Steps
1. **Check for Duplicates**: Run the helper script to identify any existing duplicate emails:
   ```sql
   \i check-duplicate-emails.sql
   ```

2. **Resolve Duplicates**: If duplicates exist, resolve them using one of these approaches:
   - Update duplicate emails to be unique (e.g., add numbers or prefixes)
   - Merge duplicate client records if they represent the same person
   - Delete duplicate records if they're truly redundant

### Apply Migration
1. **Run Migration**: Apply the unique constraint migration:
   ```sql
   \i database/migrations/034_add_unique_email_constraint_to_clients.sql
   ```

2. **Verify Constraint**: Confirm the constraint was applied successfully:
   ```sql
   \d clients
   ```

## API Behavior Changes

### Before Migration
- Clients could be created/updated with duplicate email addresses
- No validation at the database level for email uniqueness

### After Migration
- **Client Creation**: Returns HTTP 409 with error code `DUPLICATE_EMAIL` if email already exists
- **Client Updates**: Returns HTTP 409 with error code `DUPLICATE_EMAIL` if email already exists
- **Database Level**: PostgreSQL enforces uniqueness constraint, preventing duplicate emails

## Error Response Format
```json
{
  "error": "Email already exists",
  "message": "A client with this email address already exists",
  "code": "DUPLICATE_EMAIL"
}
```

## Benefits
1. **Data Integrity**: Prevents duplicate client records
2. **Better User Experience**: Clear error messages when duplicate emails are attempted
3. **Database Consistency**: Enforced at the database level
4. **API Consistency**: Standardized error handling across create and update operations

## Considerations
1. **Existing Data**: Migration will fail if duplicate emails exist
2. **Email Case Sensitivity**: Emails are converted to lowercase before storage
3. **NULL Emails**: The constraint allows NULL emails (clients without email addresses)
4. **Performance**: Minimal impact on query performance

## Rollback Plan
If the migration needs to be rolled back:
```sql
ALTER TABLE clients DROP CONSTRAINT clients_email_unique;
```

## Testing
1. **Test Duplicate Prevention**: Attempt to create/update clients with existing emails
2. **Test Error Handling**: Verify proper HTTP 409 responses
3. **Test Valid Operations**: Ensure normal client operations still work
4. **Test NULL Emails**: Verify clients without emails can still be created
