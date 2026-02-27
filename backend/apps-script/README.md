# Amber & Junaid – RSVP Backend

Google Apps Script backend powering the RSVP system for the wedding website.

This backend:

- Validates invite keys
- Enforces guest limits
- Supports named + unnamed guests
- Prevents duplicate submissions (locking)
- Enforces RSVP deadline
- Writes responses to Google Sheets
- Caches invite + settings data for performance

---

## 🧱 Architecture

Frontend (GitHub Pages)  
⬇  
Google Apps Script Web App  
⬇  
Google Sheets (Data Storage)

No external server required.

---

## 🗂 Required Google Sheets Structure

The attached spreadsheet must contain **three sheets**:

---

### 1️⃣ Invites

| inviteKey | displayName | maxGuests | namedGuests | allowUnnamed | notAllowedExtras |
| --------- | ----------- | --------- | ----------- | ------------ | ---------------- |

**Column meanings:**

- `inviteKey` – Unique key used in URL (`?invite=granny-grandpa`)
- `displayName` – Name displayed on RSVP page
- `maxGuests` – Maximum total guests allowed
- `namedGuests` – Comma-separated list
- `allowUnnamed` – TRUE/FALSE
- `notAllowedExtras` – Comma-separated list of blocked names

---

### 2️⃣ RSVPs

| inviteKey | displayName | attending | guestCount | selectedNamedGuests | extraGuestNames | message | submittedAt |

This sheet is written automatically by the script.

---

### 3️⃣ Settings

| key | value |

Required setting:

rsvpDeadline | YYYY-MM-DD

Example:

rsvpDeadline | 2027-06-01

---

## 🌍 Timezone

Project timezone must be:

Africa/Johannesburg

The script also enforces this internally.

---

## 🔌 Deployment Configuration

`appsscript.json`:

```json
{
  "timeZone": "Africa/Johannesburg",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

---

## 🚀 Deployment Steps (Simple Copy Method)

1. Create a new Google Sheet

2. Add Google Apps Script to the Spreadsheet

3. Paste code.gs

4. Enable manifest in settings

5. Confirm appsscript.json matches repo

6. Deploy → Web App

7. Set:
   - Execute as: Me
   - Who has access: Anyone

8. Copy Web App URL

Frontend will call:

```
GET  /exec?invite=invite-key
POST /exec
```

---

## 🔎 API Behavior

### GET – Load Invite

```
GET /exec?invite=granny-grandpa
```

Returns:

- Invite config

- Deadline info

- Lock status

- Existing RSVP (if already submitted)

### POST – Submit RSVP

Accepts:

- JSON body

- OR form-urlencoded (browser compatible)

Validates:

- Guest count

- Named guest selection

- Unnamed guest permissions

- Duplicate names

- Deadline

- Invite locking

Returns:

- Normalized RSVP

- Lock status

- Deadline state

---

## 🔒 Locking Behavior

Once an RSVP is submitted:

- It cannot be overwritten

- Future requests return the existing RSVP

- Prevents accidental double submission

---

## ⏳ Deadline Enforcement

Deadline is read from Settings sheet.

After deadline:

- New submissions are blocked

- Existing RSVPs remain readable

---

## ⚡ Performance Optimizations

- Invite + settings caching (15 min TTL)

- TextFinder for fast RSVP lookup

- No full table scans for reads

---

## 🛡 Security Model

- Invite key required

- Guest validation enforced server-side

- No trust in frontend data

- Deadline enforced server-side

- Submission locking prevents replay edits

---

## 🧠 Design Notes

This backend was intentionally designed to:

- Avoid external hosting

- Remain low maintenance

- Scale to hundreds of invites easily

- Prevent spreadsheet corruption

- Keep logic centralized

---

## 📌 Author

Junaid Brooks
Wedding Date: 25 July 2027
Cape Town, South Africa
