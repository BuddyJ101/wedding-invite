/**
 * Amber & Junaid RSVP Backend (Google Apps Script)
 *
 * Sheets required:
 *  - Invites:  inviteKey | displayName | maxGuests | namedGuests | allowUnnamed | notAllowedExtras
 *  - RSVPs:    inviteKey | displayName | attending | guestCount | selectedNamedGuests | extraGuestNames | message | submittedAt
 *  - Settings: key | value  (expects: rsvpDeadline = YYYY-MM-DD)
 *
 * URL usage:
 *  GET  .../exec?invite=granny-grandpa   -> returns config/locked/closed + deadline
 *  POST .../exec                         -> submit RSVP (JSON body)
 *
 * Timezone: Africa/Johannesburg (your project settings should match; we also enforce it here).
 */

const SHEET_INVITES = "Invites";
const SHEET_RSVPS = "RSVPs";
const SHEET_SETTINGS = "Settings";

const SETTINGS_DEADLINE_KEY = "rsvpDeadline";
const TZ = "Africa/Johannesburg";

// Cache TTLs (seconds)
const INVITES_CACHE_TTL = 15 * 60; // 15 minutes
const SETTINGS_CACHE_TTL = 15 * 60; // 15 minutes

// ---------------- Entry points ----------------

function doGet(e) {
  try {
    const inviteKey = normalizeInviteKey_(e?.parameter?.invite);

    if (!inviteKey) {
      return json_({
        ok: false,
        error: "MISSING_INVITE",
        message: "Missing ?invite= in the URL.",
      });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Cached (fast)
    const deadlineInfo = getDeadlineInfoCached_(ss);
    const invite = getInviteCached_(ss, inviteKey);

    if (!invite) {
      return json_({
        ok: false,
        error: "INVITE_NOT_FOUND",
        message: "Invite not found. Please use the RSVP link you were sent.",
        deadline: deadlineInfo,
      });
    }

    // Fast lock check via TextFinder (no full table scan)
    const existing = findRsvpFast_(ss, inviteKey);
    if (existing) {
      return json_({
        ok: true,
        locked: true,
        closed: deadlineInfo.closed,
        deadline: deadlineInfo,
        rsvp: existing,
      });
    }

    if (deadlineInfo.closed) {
      return json_({
        ok: true,
        locked: false,
        closed: true,
        deadline: deadlineInfo,
      });
    }

    return json_({
      ok: true,
      locked: false,
      closed: false,
      deadline: deadlineInfo,
      config: invite,
    });
  } catch (err) {
    return json_({
      ok: false,
      error: "SERVER_ERROR",
      message: String(err && err.message ? err.message : err),
    });
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ✅ Accept both: JSON (if server-to-server) AND form-urlencoded (browser)
    const body = parseRequestBody_(e);
    if (!body) {
      return json_({
        ok: false,
        error: "BAD_BODY",
        message: "Request body missing or invalid.",
      });
    }

    const inviteKey = normalizeInviteKey_(body.inviteKey);
    if (!inviteKey) {
      return json_({
        ok: false,
        error: "MISSING_INVITE",
        message: "inviteKey is required.",
      });
    }

    const deadlineInfo = getDeadlineInfoCached_(ss);
    const invite = getInviteCached_(ss, inviteKey);

    if (!invite) {
      return json_({
        ok: false,
        error: "INVITE_NOT_FOUND",
        message: "Invite not found. Please use the RSVP link you were sent.",
        deadline: deadlineInfo,
      });
    }

    // Locking: no overwriting
    const existing = findRsvpFast_(ss, inviteKey);
    if (existing) {
      return json_({
        ok: true,
        locked: true,
        closed: deadlineInfo.closed,
        deadline: deadlineInfo,
        rsvp: existing,
        message: "RSVP already submitted for this invite.",
      });
    }

    // Deadline blocks new submissions
    if (deadlineInfo.closed) {
      return json_({
        ok: true,
        locked: false,
        closed: true,
        deadline: deadlineInfo,
        error: "RSVP_CLOSED",
        message: `RSVPs closed on ${deadlineInfo.date}. Please contact us.`,
      });
    }

    // Validate payload vs invite rules
    const validation = validateSubmission_(invite, body);
    if (!validation.ok) {
      return json_({
        ok: false,
        error: validation.error || "VALIDATION_FAILED",
        message: validation.message || "Validation failed.",
        details: validation.details || null,
      });
    }

    // Write RSVP row
    const now = new Date();
    const submittedAtIso = Utilities.formatDate(
      now,
      TZ,
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    );

    const outRow = {
      inviteKey: invite.inviteKey,
      displayName: invite.displayName,
      attending: validation.normalized.attending,
      guestCount: validation.normalized.guestCount,
      selectedNamedGuests: validation.normalized.selectedNamedGuests.join(", "),
      extraGuestNames: validation.normalized.extraGuestNames.join(", "),
      message: validation.normalized.message,
      submittedAt: submittedAtIso,
    };

    appendRsvp_(ss, outRow);

    return json_({
      ok: true,
      locked: true,
      closed: false,
      deadline: deadlineInfo,
      rsvp: {
        attending: outRow.attending,
        guestCount: outRow.guestCount,
        selectedNamedGuests: splitList_(outRow.selectedNamedGuests),
        extraGuestNames: splitList_(outRow.extraGuestNames),
        message: outRow.message,
        submittedAt: outRow.submittedAt,
      },
      message: "RSVP received.",
    });
  } catch (err) {
    return json_({
      ok: false,
      error: "SERVER_ERROR",
      message: String(err && err.message ? err.message : err),
    });
  }
}

// ---------------- Caching: Invites + Settings ----------------

function getDeadlineInfoCached_(ss) {
  const cache = CacheService.getScriptCache();
  const key = "deadlineInfo:v1";
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);

  const info = getDeadlineInfo_(ss);
  cache.put(key, JSON.stringify(info), SETTINGS_CACHE_TTL);
  return info;
}

function getInviteCached_(ss, inviteKey) {
  const cache = CacheService.getScriptCache();
  const mapKey = "invitesMap:v1";
  const cached = cache.get(mapKey);

  let map;
  if (cached) {
    map = JSON.parse(cached);
  } else {
    map = buildInvitesMap_(ss);
    cache.put(mapKey, JSON.stringify(map), INVITES_CACHE_TTL);
  }

  const invite = map[inviteKey];
  if (!invite) return null;

  // Convert allowUnnamed back to boolean (JSON keeps it fine, but be explicit)
  invite.allowUnnamed = !!invite.allowUnnamed;
  return invite;
}

function buildInvitesMap_(ss) {
  const sh = ss.getSheetByName(SHEET_INVITES);
  if (!sh) throw new Error(`Missing sheet: ${SHEET_INVITES}`);

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) return {};

  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const header = headerIndex_(values[0]);

  // required cols
  if (header["inviteKey"] == null)
    throw new Error(`Invites sheet missing 'inviteKey' column.`);
  const map = {};

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const key = normalizeInviteKey_(row[header["inviteKey"]]);
    if (!key) continue;

    map[key] = {
      inviteKey: key,
      displayName: String(row[header["displayName"]] ?? "").trim(),
      maxGuests: toInt_(row[header["maxGuests"]]),
      namedGuests: splitList_(row[header["namedGuests"]]),
      allowUnnamed: toBool_(row[header["allowUnnamed"]]),
      notAllowedExtras: splitList_(row[header["notAllowedExtras"]]),
    };
  }

  return map;
}

// ---------------- Fast RSVP lookup (TextFinder) ----------------

function findRsvpFast_(ss, inviteKey) {
  const sh = ss.getSheetByName(SHEET_RSVPS);
  if (!sh) throw new Error(`Missing sheet: ${SHEET_RSVPS}`);

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) return null;

  // Invite key is first column (A)
  const finder = sh
    .getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(inviteKey)
    .matchEntireCell(true);

  const cell = finder.findNext();
  if (!cell) return null;

  const rowIndex = cell.getRow();
  const rowValues = sh.getRange(rowIndex, 1, 1, lastCol).getValues()[0];

  // Need header to map columns (read once)
  const headerValues = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const header = headerIndex_(headerValues);

  return {
    attending: String(rowValues[header["attending"]] ?? "")
      .trim()
      .toUpperCase(),
    guestCount: toInt_(rowValues[header["guestCount"]]),
    selectedNamedGuests: splitList_(rowValues[header["selectedNamedGuests"]]),
    extraGuestNames: splitList_(rowValues[header["extraGuestNames"]]),
    message: String(rowValues[header["message"]] ?? "").trim(),
    submittedAt: String(rowValues[header["submittedAt"]] ?? "").trim(),
  };
}

// ---------------- Deadline (supports text OR Date cell) ----------------

function getDeadlineInfo_(ss) {
  const sh = ss.getSheetByName(SHEET_SETTINGS);
  if (!sh) throw new Error(`Missing sheet: ${SHEET_SETTINGS}`);

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) return { date: null, tz: TZ, closed: false };

  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const header = headerIndex_(values[0]);

  if (header["key"] == null || header["value"] == null) {
    throw new Error(`Settings sheet must have columns: key, value`);
  }

  let deadlineValue = null;
  for (let r = 1; r < values.length; r++) {
    const k = String(values[r][header["key"]] ?? "").trim();
    if (k === SETTINGS_DEADLINE_KEY) {
      deadlineValue = values[r][header["value"]];
      break;
    }
  }

  if (!deadlineValue) return { date: null, tz: TZ, closed: false };

  let y, mo, d, deadlineStr;

  if (deadlineValue instanceof Date && !isNaN(deadlineValue.getTime())) {
    y = deadlineValue.getFullYear();
    mo = deadlineValue.getMonth();
    d = deadlineValue.getDate();
    deadlineStr = Utilities.formatDate(deadlineValue, TZ, "yyyy-MM-dd");
  } else {
    deadlineStr = String(deadlineValue).trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadlineStr);
    if (!m)
      throw new Error(
        `Invalid rsvpDeadline format in Settings. Use YYYY-MM-DD. Got: ${deadlineStr}`,
      );
    y = Number(m[1]);
    mo = Number(m[2]) - 1;
    d = Number(m[3]);
  }

  const endOfDay = new Date(y, mo, d, 23, 59, 59);
  const closed = new Date().getTime() > endOfDay.getTime();

  return { date: deadlineStr, tz: TZ, closed };
}

// ---------------- Writing RSVP ----------------

function appendRsvp_(ss, rsvpRow) {
  const sh = ss.getSheetByName(SHEET_RSVPS);
  if (!sh) throw new Error(`Missing sheet: ${SHEET_RSVPS}`);

  const lastCol = sh.getLastColumn();
  const headerValues = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const header = headerIndex_(headerValues);

  const row = new Array(lastCol).fill("");
  setIfCol_(row, header, "inviteKey", rsvpRow.inviteKey);
  setIfCol_(row, header, "displayName", rsvpRow.displayName);
  setIfCol_(row, header, "attending", rsvpRow.attending);
  setIfCol_(row, header, "guestCount", rsvpRow.guestCount);
  setIfCol_(row, header, "selectedNamedGuests", rsvpRow.selectedNamedGuests);
  setIfCol_(row, header, "extraGuestNames", rsvpRow.extraGuestNames);
  setIfCol_(row, header, "message", rsvpRow.message);
  setIfCol_(row, header, "submittedAt", rsvpRow.submittedAt);

  sh.appendRow(row);
}

// ---------------- Validation (same logic) ----------------

function validateSubmission_(invite, body) {
  const attending = normalizeAttending_(body.attending);
  if (!attending)
    return {
      ok: false,
      error: "BAD_ATTENDING",
      message: "attending must be YES or NO.",
    };

  const message = normalizeFreeText_(body.message || "");

  if (attending === "NO") {
    return {
      ok: true,
      normalized: {
        attending,
        guestCount: 0,
        selectedNamedGuests: [],
        extraGuestNames: [],
        message,
      },
    };
  }

  const maxGuests = toInt_(invite.maxGuests);
  if (!Number.isFinite(maxGuests) || maxGuests < 1 || maxGuests > 6) {
    return {
      ok: false,
      error: "BAD_INVITE_CONFIG",
      message: "Invite maxGuests is invalid.",
    };
  }

  const guestCount = toInt_(body.guestCount);
  if (!Number.isFinite(guestCount) || guestCount < 1) {
    return {
      ok: false,
      error: "BAD_GUEST_COUNT",
      message: "guestCount must be at least 1 if attending YES.",
    };
  }
  if (guestCount > maxGuests) {
    return {
      ok: false,
      error: "GUEST_COUNT_EXCEEDS_MAX",
      message: `guestCount cannot exceed ${maxGuests}.`,
    };
  }

  const inviteNamed = (invite.namedGuests || []).map(normalizePersonName_);
  const selectedNamed = normalizeNameArray_(body.selectedNamedGuests);

  for (const nm of selectedNamed) {
    if (!inviteNamed.includes(nm)) {
      return {
        ok: false,
        error: "NAME_NOT_ON_INVITE",
        message: `The name '${nm}' is not on this invitation.`,
      };
    }
  }

  const allowUnnamed = !!invite.allowUnnamed;
  const extraNames = normalizeNameArray_(body.extraGuestNames);

  if (!allowUnnamed && extraNames.length > 0) {
    return {
      ok: false,
      error: "UNNAMED_NOT_ALLOWED",
      message: "Additional guests are not allowed on this invitation.",
    };
  }

  const notAllowed = (invite.notAllowedExtras || []).map(normalizePersonName_);
  for (const x of extraNames) {
    if (notAllowed.includes(x)) {
      return {
        ok: false,
        error: "EXTRA_NAME_BLOCKED",
        message: `The name '${x}' is not allowed on this invitation.`,
      };
    }
  }

  const combined = [...selectedNamed, ...extraNames];
  const dup = findDuplicate_(combined);
  if (dup)
    return {
      ok: false,
      error: "DUPLICATE_NAME",
      message: `Please don’t enter the same name twice ('${dup}').`,
    };

  if (combined.length !== guestCount) {
    return {
      ok: false,
      error: "COUNT_MISMATCH",
      message: `You selected/typed ${combined.length} name(s) but guestCount is ${guestCount}.`,
      details: {
        selected: selectedNamed.length,
        extras: extraNames.length,
        guestCount,
      },
    };
  }

  return {
    ok: true,
    normalized: {
      attending,
      guestCount,
      selectedNamedGuests: selectedNamed,
      extraGuestNames: extraNames,
      message,
    },
  };
}

// ---------------- Utilities ----------------

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function parseJsonBody_(e) {
  const text = e?.postData?.contents;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseRequestBody_(e) {
  // 1) Try JSON (existing behavior)
  const json = parseJsonBody_(e);
  if (json) return json;

  // 2) Try application/x-www-form-urlencoded or multipart/form-data
  // Apps Script populates e.parameter for these
  const p = e && e.parameter ? e.parameter : null;
  if (!p || Object.keys(p).length === 0) return null;

  return {
    inviteKey: p.inviteKey,
    attending: p.attending,
    guestCount: p.guestCount,

    // These come as JSON strings from the browser
    selectedNamedGuests: safeJsonParse_(p.selectedNamedGuests, []),
    extraGuestNames: safeJsonParse_(p.extraGuestNames, []),

    message: p.message || "",
  };
}

function safeJsonParse_(text, fallback) {
  try {
    if (text == null || text === "") return fallback;
    return JSON.parse(text);
  } catch (e) {
    return fallback;
  }
}

function headerIndex_(headerRow) {
  const map = {};
  for (let i = 0; i < headerRow.length; i++) {
    const key = String(headerRow[i] ?? "").trim();
    if (key) map[key] = i;
  }
  return map;
}

function setIfCol_(rowArr, headerMap, colName, value) {
  const idx = headerMap[colName];
  if (idx == null) return;
  rowArr[idx] = value;
}

function normalizeInviteKey_(v) {
  if (v == null) return "";
  return String(v).trim().toLowerCase();
}

function normalizeAttending_(v) {
  if (v == null) return null;
  if (typeof v === "boolean") return v ? "YES" : "NO";
  const s = String(v).trim().toUpperCase();
  if (["YES", "Y", "TRUE", "1"].includes(s)) return "YES";
  if (["NO", "N", "FALSE", "0"].includes(s)) return "NO";
  return null;
}

function splitList_(v) {
  const s = String(v ?? "").trim();
  if (!s) return [];
  return s
    .split(",")
    .map((x) => normalizePersonName_(x))
    .filter(Boolean);
}

function normalizeNameArray_(v) {
  if (v == null) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr
    .flat()
    .map((x) => normalizePersonName_(x))
    .filter(Boolean);
}

function normalizePersonName_(v) {
  if (v == null) return "";
  return String(v).trim().replace(/\s+/g, " ");
}

function normalizeFreeText_(v) {
  if (v == null) return "";
  return String(v).trim().slice(0, 2000);
}

function toInt_(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

function toBool_(v) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "")
    .trim()
    .toUpperCase();
  return s === "TRUE" || s === "YES" || s === "1";
}

function findDuplicate_(arr) {
  const seen = new Set();
  for (const x of arr) {
    const k = x.toLowerCase();
    if (seen.has(k)) return x;
    seen.add(k);
  }
  return null;
}
