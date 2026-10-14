# Email and Firebase push campaigns

Open **Admin → Marketing → Email & Push Campaigns** (`/admin/campaigns`). Super admins already have access; grant employees the new **Email & push campaigns** section in Team & Access. Read permission allows viewing; write permission allows draft changes, tests and sending. Campaign database changes appear in the super admin logbook with the existing actor, timestamp and available location metadata.

## Configure delivery

Keep credentials in environment variables. Do not commit them.

Backend:

- `PUSH_PROVIDER=firebase`
- Alternatively, set `FIREBASE_SERVICE_ACCOUNT_JSON` to the complete service-account JSON on one physical line, wrapped in single quotes. JSON credentials take precedence over separate fields. Never put this value in the frontend environment.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` from a Firebase service account for the same project as the web app. Escaped `\n` in the private key is supported.
- `EMAIL_PROVIDER=smtp`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`. Authenticate the sending domain with your mail provider's SPF/DKIM/DMARC configuration. Sender display names and reply-to addresses are customizable; the authenticated From address stays server controlled.
- `PUBLIC_SITE_URL=https://your-storefront.example` for notification fallback links and unsubscribe pages. Mandatory for production campaigns.
- `PUBLIC_API_URL=https://your-api.example/api` for API image URLs and signed one-click email unsubscribe headers. Include the API prefix; this URL must be reachable publicly. With HTTPS configured, campaign emails include RFC 8058 unsubscribe headers as well as a visible unsubscribe footer.
- Production campaign images use the existing Cloudinary storage configuration. Development uploads use real local files in `backend/var/theme-assets`; persist this directory if using local storage beyond development. Images must be publicly reachable for email clients and Firebase notifications.

Frontend: set the `VITE_FIREBASE_*` public web-app configuration and `VITE_FIREBASE_VAPID_KEY` shown in `frontend/.env.example`. Enable the Firebase Cloud Messaging API and generate a Web Push certificate key in the same Firebase project. Rebuild the frontend after changing these variables. The service worker receives this public configuration automatically; it contains no service-account secret and requires no manual editing. Deploy `/firebase-messaging-sw.js` as a real JavaScript asset at the storefront origin, including its query string. Use HTTPS (localhost is supported for development).

Firebase uses the Admin SDK on the backend and Messaging SDK in browsers. Campaign messages are data-only so the worker displays one rich notification, including the image, action buttons and click destination. Browser/OS support controls how images, badges, persistent notifications and actions appear. Firebase receive behavior: https://firebase.google.com/docs/cloud-messaging/web/receive-messages

## Subscribers and permissions

Existing customers are **not automatically subscribed**. Signup includes an optional, unchecked email marketing checkbox. Customers and dealers can open **My account → Notification preferences** (`/account/notifications`) to choose email and push subscriptions. Enabling push requires an explicit browser permission action and saving preferences. Quiet visits refresh already-authorized tokens without opening a permission prompt. Tokens move to the latest account using that browser and detach on normal logout. After successful API registration, the frontend also mirrors the token in local storage: `vinexus_fcm_token` for customers/dealers and `vinexus_admin_fcm_token` for admins. Renewal replaces the saved value. Logout can read the token after a page reload and clears the local value even if its unregister request fails. Restricted browser storage does not block database registration. The database remains the source used for sending notifications. Campaign subscriptions do not disable transactional account/order messages.

Audience options: all subscribers, customers, dealers, approved dealers, or selected subscribers. Email addresses are deduplicated. Accounts must remain active. Opt-outs and unavailable devices are checked again immediately before each delivery. A signed email unsubscribe link works without login; GET only shows preferences, while an explicit POST changes them. The optional one-click endpoint accepts mail-provider POST requests. Unsubscribe links remain valid until the signing secret changes.

## Compose and send

Email: headings, text, images, buttons, dividers and spacers; reorder, duplicate or remove blocks; customize colors, fonts, alignment, padding and width. Custom HTML supports safe tables and inline styles. Scripts, forms, unsafe schemes and unsafe styles are removed; the unsubscribe footer is always appended. Use `{{name}}` in copy or subject for recipient personalization. The preview uses an isolated iframe; click **Preview** to load the server-sanitized version.

Firebase push: title, message, destination, image, icon, badge, up to two action buttons, expiry and grouping tag. Optional `{{name}}` personalization is supported. Destination and action links can point to any HTTP(S) website. Pasted domains such as `example.com/products` receive an HTTPS prefix, and `/products` paths resolve against the storefront URL. Image links must point to a publicly accessible image. Validation shows the exact field beside its input and in a clickable summary; hidden delivery options open when an error is selected. Inactive email fields do not block push campaigns, and vice versa. Push payloads are size checked. Expiry is passed to Firebase as TTL and enforced by the browser worker.

Save a draft and test only to your own admin email or registered browsers. Test sends require explicit confirmation and are rate limited. The admin can enable the current browser for push tests from the editor. Explicit registration renews cached Firebase tokens, including revoked tokens. The first registration retires the obsolete unique raw-token index from older releases; the current hash primary key still enforces one owner per browser. Review & send displays the exact eligible count and whether delivery is live or simulated. Changing the audience or draft after review invalidates the confirmation. Queued campaigns cannot be edited; duplicate one to create another draft. Only drafts can be deleted. Cancellation skips pending recipients; a message already in flight may still finish.

## Queue and delivery records

The running backend starts the campaign worker after MongoDB connects. Run the normal backend server continuously (not an ephemeral request-only deployment). MongoDB must support transactions, as required by POS and audit logging: use a replica set or Atlas. Campaign queue creation and recipient records commit together. Atomic job claims support multiple backend instances without duplicate claims. Each campaign supports up to 10,000 unique recipients; selected-recipient audiences support up to 1,000 accounts. There is no automatic retry of failed or ambiguous external sends.

Statuses: pending, processing, accepted by provider, failed, skipped, simulated, or uncertain. Accepted does not mean delivered, opened or clicked. A worker interrupted during delivery marks a stale processing job uncertain after ten minutes instead of automatically resending. SMTP/network failure can also leave provider acceptance ambiguous; no automatic resend occurs. Check the provider before choosing to send a replacement campaign. Provider-wide failure should be resolved before starting new sends.

`EMAIL_PROVIDER=development` / `PUSH_PROVIDER=development` are explicit simulations. They record results without contacting real delivery services. The studio clearly labels these modes. Configure Firebase for real push delivery.

## Verification

- `npm run test:unit` tests validation, sanitization, personalization, signed unsubscribe tokens and Firebase message construction alongside existing regression tests.
- `npm run test:e2e -- tests/e2e/campaigns.spec.js` checks the desktop email flow, mobile push composer, read-only roles and subscriber preferences with mocked APIs.
- `npm --prefix backend run test:campaigns` uses a disposable database on the temporary replica set `127.0.0.1:27019`, replSet `vinexusAccessTest`; tests transaction rollback, concurrent duplicate prevention, role checks, opt-outs, Firebase batching, invalid tokens, cancellation and auditing. External providers are stubbed, and the temporary database is dropped afterward.
