# Google Calendar Integration - One-Way Sync

Complete implementation of Google Calendar integration with OAuth 2.0 for nutritionists and clients to create and manage appointments.

## Features

✅ **OAuth 2.0 Authentication** - Secure Google Calendar connection
✅ **One-Way Sync** - Appointments created in app sync to Google Calendar
✅ **Auto Token Refresh** - Automatic access token renewal
✅ **Appointment Management** - Create, update, cancel appointments
✅ **Google Meet Integration** - Optional video meeting links
✅ **Email Notifications** - Attendees automatically notified
✅ **CSRF Protection** - Secure OAuth state management

## Database Schema

### Tables Created

1. **`google_calendar_connections`** - OAuth tokens and connection status
2. **`appointments`** - Appointment records with sync status
3. **`google_oauth_states`** - Temporary OAuth state for CSRF protection

### Migration

Run the migration:
```bash
psql $DATABASE_URL -f database/migrations/094_create_google_calendar_oauth.sql
```

## Environment Variables

Add these to your `.env` file:

```bash
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/calendar/oauth-callback

# Frontend URL for redirects
FRONTEND_URL=https://your-app.com
```

## Google Cloud Console Setup

### 1. Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Calendar API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: **Web application**
   - Name: "CalorieScience Calendar Integration"

5. Configure **Authorized redirect URIs**:
   ```
   https://your-domain.vercel.app/api/calendar/oauth-callback
   http://localhost:3000/api/calendar/oauth-callback  (for development)
   ```

6. Copy **Client ID** and **Client Secret** to `.env`

### 2. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. User type: **External** (unless using Google Workspace)
3. Fill in application details:
   - App name: "CalorieScience"
   - User support email: your email
   - Developer contact: your email

4. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`

5. Add test users (for development):
   - Add your email and test user emails

## API Endpoints

### OAuth Management

#### 1. Check OAuth Status
```bash
GET /api/calendar/oauth-status
Authorization: Bearer <token>

Response:
{
  "connected": true,
  "googleEmail": "user@gmail.com",
  "primaryCalendarId": "primary",
  "timezone": "America/New_York",
  "lastSyncAt": "2025-12-04T10:30:00Z",
  "tokenExpiry": "2025-12-04T11:30:00Z"
}
```

#### 2. Initiate OAuth Flow
```bash
GET /api/calendar/oauth-initiate
Authorization: Bearer <token>

Response:
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "random-state-token",
  "message": "Redirect user to authUrl to complete OAuth"
}
```

**Frontend Flow:**
```javascript
// 1. Get auth URL
const response = await fetch('/api/calendar/oauth-initiate', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { authUrl } = await response.json();

// 2. Redirect user to Google
window.location.href = authUrl;

// 3. User grants access, Google redirects to /api/calendar/oauth-callback
// 4. Backend handles callback and redirects to /settings/calendar?success=true
```

#### 3. Disconnect Calendar
```bash
POST /api/calendar/disconnect
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Google Calendar disconnected successfully"
}
```

### Appointment Management

#### 1. Create Appointment
```bash
POST /api/appointments/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientId": "uuid",           # Required if nutritionist creates
  "nutritionistId": "uuid",     # Required if client creates
  "title": "Initial Consultation",
  "description": "First meeting to discuss nutrition goals",
  "startTime": "2025-12-05T10:00:00Z",
  "endTime": "2025-12-05T11:00:00Z",
  "timezone": "America/New_York",
  "location": "123 Main St, Office 4B",
  "createMeetLink": true,       # Auto-create Google Meet link
  "notes": "Client requested morning slot"
}

Response:
{
  "success": true,
  "data": {
    "id": "appointment-uuid",
    "nutritionist_id": "uuid",
    "client_id": "uuid",
    "title": "Initial Consultation",
    "start_time": "2025-12-05T10:00:00Z",
    "end_time": "2025-12-05T11:00:00Z",
    "google_event_id": "google-calendar-event-id",
    "synced_to_calendar": true,
    "sync_status": "synced",
    "meeting_link": "https://meet.google.com/xxx-yyyy-zzz",
    "status": "scheduled",
    "nutritionist": {
      "id": "uuid",
      "name": "Dr. Jane Smith",
      "email": "jane@example.com"
    },
    "client": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "message": "Appointment created and synced to Google Calendar"
}
```

#### 2. List Appointments
```bash
GET /api/appointments/list?status=scheduled&from=2025-12-01&to=2025-12-31&limit=50&offset=0
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Follow-up Session",
      "start_time": "2025-12-10T14:00:00Z",
      "end_time": "2025-12-10T15:00:00Z",
      "status": "scheduled",
      "synced_to_calendar": true,
      "nutritionist": {...},
      "client": {...}
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 15
  }
}
```

#### 3. Update Appointment
```bash
PUT /api/appointments/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "appointmentId": "uuid",
  "title": "Rescheduled Consultation",
  "startTime": "2025-12-06T15:00:00Z",
  "endTime": "2025-12-06T16:00:00Z",
  "location": "Video Call"
}

Response:
{
  "success": true,
  "data": {...},
  "message": "Appointment updated successfully"
}
```

#### 4. Cancel Appointment
```bash
POST /api/appointments/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "appointmentId": "uuid"
}

Response:
{
  "success": true,
  "message": "Appointment cancelled successfully"
}
```

## Sync Behavior

### One-Way Sync (App → Google Calendar)

✅ **Changes in App** → Synced to Google Calendar
❌ **Changes in Google Calendar** → NOT synced back to app

### Sync Status Values

- **`pending`** - Not yet synced
- **`synced`** - Successfully synced
- **`failed`** - Sync failed (check `sync_error`)
- **`cancelled`** - Event cancelled in calendar
- **`not_connected`** - Calendar not connected

### What Gets Synced

When an appointment is created/updated in the app:

1. ✅ Event created/updated in Google Calendar
2. ✅ Attendees (nutritionist + client) added and notified
3. ✅ Google Meet link created (if requested)
4. ✅ Email invitations sent to both parties
5. ✅ Event appears in both calendars (nutritionist + client)

### What Doesn't Get Synced

- ❌ Changes made directly in Google Calendar
- ❌ Events created in Google Calendar (not imported to app)
- ❌ Internal notes (kept private in app database)

## Token Management

### Access Token Lifecycle

1. **Initial Grant**: User authorizes, receives access token (1 hour expiry)
2. **Auto Refresh**: Token automatically refreshed before expiry
3. **Refresh Failure**: Connection marked inactive, user must reconnect

### Token Refresh Logic

```typescript
// Automatically handled in googleCalendarService.ensureValidToken()
// Refreshes if token expires in < 5 minutes
if (expiry - now < 5 minutes) {
  refreshToken();
}
```

## Security Features

### CSRF Protection

- Random state token generated per OAuth request
- State stored in database with 10-minute expiry
- Validated on callback before accepting code
- Auto-cleanup of expired states

### Access Control

- Clients can only create appointments with their nutritionist
- Nutritionists can only create appointments with their clients
- Both parties can view/update/cancel appointments
- Tokens encrypted in database

## Error Handling

### Common Errors

**1. OAuth Connection Failed**
```json
{
  "connected": false,
  "expired": true,
  "message": "Access token expired and refresh failed. Please reconnect."
}
```
→ User needs to reconnect calendar

**2. Sync Failed**
```json
{
  "sync_status": "failed",
  "sync_error": "Calendar API rate limit exceeded"
}
```
→ Appointment saved in DB but not in calendar

**3. Invalid State**
```json
{
  "error": "Invalid state",
  "message": "OAuth state is invalid or expired. Please try again."
}
```
→ User took too long or state was tampered with

## Frontend Integration Example

### React Component

```typescript
import { useState, useEffect } from 'react';

function CalendarSettings() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const res = await fetch('/api/calendar/oauth-status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setStatus(data);
  };

  const connectCalendar = async () => {
    const res = await fetch('/api/calendar/oauth-initiate', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { authUrl } = await res.json();
    window.location.href = authUrl;
  };

  const disconnect = async () => {
    await fetch('/api/calendar/disconnect', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    checkStatus();
  };

  return (
    <div>
      {status?.connected ? (
        <div>
          <p>Connected: {status.googleEmail}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={connectCalendar}>Connect Google Calendar</button>
      )}
    </div>
  );
}
```

### Create Appointment

```typescript
async function createAppointment(data) {
  const response = await fetch('/api/appointments/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      clientId: 'client-uuid',
      title: 'Nutrition Consultation',
      startTime: '2025-12-05T10:00:00Z',
      endTime: '2025-12-05T11:00:00Z',
      createMeetLink: true
    })
  });

  const result = await response.json();

  if (result.data.meeting_link) {
    console.log('Google Meet link:', result.data.meeting_link);
  }
}
```

## Testing

### Manual Testing Flow

1. **Connect Calendar**
   ```bash
   curl -X GET http://localhost:3000/api/calendar/oauth-initiate \
     -H "Authorization: Bearer $TOKEN"
   ```
   - Visit returned `authUrl`
   - Grant permissions
   - Verify redirect to `/settings/calendar?success=true`

2. **Check Status**
   ```bash
   curl -X GET http://localhost:3000/api/calendar/oauth-status \
     -H "Authorization: Bearer $TOKEN"
   ```

3. **Create Appointment**
   ```bash
   curl -X POST http://localhost:3000/api/appointments/create \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "clientId": "uuid",
       "title": "Test Appointment",
       "startTime": "2025-12-10T14:00:00Z",
       "endTime": "2025-12-10T15:00:00Z",
       "createMeetLink": true
     }'
   ```

4. **Verify in Google Calendar**
   - Check if event appears in calendar
   - Verify client received email invitation
   - Test Google Meet link

## Troubleshooting

### Token Issues

**Problem**: Tokens expire frequently
**Solution**: Refresh tokens are stored and auto-renewed

**Problem**: "Invalid grant" error
**Solution**: User must reconnect (refresh token revoked)

### Sync Issues

**Problem**: Event not appearing in calendar
**Solution**: Check `sync_status` and `sync_error` fields

**Problem**: Rate limit exceeded
**Solution**: Implement retry logic with exponential backoff

### Development Issues

**Problem**: Redirect URI mismatch
**Solution**: Add `http://localhost:3000/api/calendar/oauth-callback` to Google Console

**Problem**: Scopes not granted
**Solution**: Use `prompt: 'consent'` to force re-consent

## Dependencies

Required npm packages:

```bash
npm install googleapis google-auth-library joi
```

Already installed in most projects, but verify in `package.json`.

## Next Steps

### Recommended Enhancements

1. **Webhook Support** - Listen to Google Calendar changes (optional)
2. **Bulk Sync** - Sync multiple appointments at once
3. **Conflict Detection** - Warn about scheduling conflicts
4. **Reminder Settings** - Configure appointment reminders
5. **Recurring Appointments** - Support for repeating events
6. **Timezone Auto-detection** - Use client's timezone

### Production Checklist

- [ ] Add `.env` variables to Vercel
- [ ] Configure Google Cloud Console production URLs
- [ ] Submit app for OAuth verification (if needed)
- [ ] Set up monitoring for sync failures
- [ ] Add logging for OAuth flow
- [ ] Test token refresh in production
- [ ] Document user-facing setup instructions

## Support

For issues or questions:
- Check logs in Vercel dashboard
- Review sync_error field in appointments table
- Verify Google Calendar API quotas
- Test OAuth flow in incognito mode

---

**Created**: 2025-12-04
**Version**: 1.0.0
**Status**: ✅ Ready for testing
