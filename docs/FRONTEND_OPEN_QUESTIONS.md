# Vinexus Frontend Open Questions & Architectural Clarifications

## Status Summary
**No blocking frontend questions found.**

All requirements outlined in the PRD map cleanly 1-to-1 with the 77 operational REST API endpoints implemented and verified in the backend.

---

## Architectural Decisions & Implementation Guidelines

### 1. Token Storage & Security
- **Question**: Where should JWT Access Tokens and Refresh Tokens be stored on the client side?
- **Decision**: 
  - Store the Access Token in React application memory / state (Context API or Zustand store).
  - Store the Refresh Token in secure persistent storage (e.g. `localStorage` or `httpOnly` cookie where supported).
  - Attach the Access Token to every outgoing request via Axios request interceptor: `Authorization: Bearer <accessToken>`.
  - Configure Axios response interceptor to handle HTTP `401 Unauthorized` by calling `POST /api/auth/refresh-token` and retrying the failed request seamlessly.

### 2. KYC Document File Upload Protocol
- **Question**: Should file uploads be handled as JSON base64 or Multipart Form Data?
- **Decision**:
  - Use `multipart/form-data` with field name `file` to post to `/api/dealers/kyc/documents` or `/api/admin/upload`.
  - The backend returns `{ file: { url, publicId } }`. The returned `url` is then stored in the document array of the profile or product payload.

### 3. CMS Script Injection Defense
- **Question**: How should rich text or HTML content in CMS static pages be handled?
- **Decision**:
  - The backend validator (`validate.js` & `noScriptTag`) strictly rejects payloads containing `<script>` tags with `400 Bad Request`.
  - The frontend should sanitize raw HTML content before rendering using `DOMPurify` to prevent DOM XSS vulnerabilities.

### 4. Active Session Conflict UX
- **Question**: What happens when a user attempts to log in while an active session exists on another device?
- **Decision**:
  - The API returns HTTP `200 OK` with `{ sessionConflict: true, conflictTicket: "..." }`.
  - The frontend MUST prompt the user with a modal: *"You are currently logged in on another device. Logging in here will log out the other session. Continue?"*
  - Clicking "Continue" dispatches `POST /api/auth/force-login` with `{ conflictTicket }`.
