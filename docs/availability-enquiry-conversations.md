# Out-of-stock enquiries and customer conversations

An authenticated customer or dealer can ask about an unavailable product from its product page or catalogue card. The form contains only a mandatory description (up to 1,000 characters). Contacts are snapshotted from the account; a delivery address, WhatsApp number, quantity and checkout are not requested. Variants are checked individually against the live catalogue. Requests for products that are in stock, inactive or in inactive categories are rejected.

Availability enquiries have `enquiryType: out-of-stock`; existing records default to `order`. Admin lists show the out-of-stock flag and description, and the detail view shows the original description and the conversation. Availability enquiries are support requests, so completing them never deducts stock. Normal order enquiry completion keeps its existing transactional stock deduction.

Unavailable products cannot be added to carts through the API or guest cart service. Product and variant pages hide WhatsApp ordering for unavailable selections. Stale unavailable cart lines cannot be selected for order checkout; the cart links back to an availability enquiry, and direct checkout is rejected for those items. In-stock checkout and WhatsApp ordering remain available.

Admin `customerReply` responses are stored in the existing customer-visible reply history; internal notes remain private. Customers can send follow-up descriptions on the same enquiry. Both conversation views refresh while visible, with focus refresh and push-triggered customer refresh. Customer lists show the enquiry status and whether a response is new or has already been received. Opening a thread marks only the response count actually rendered as read, preserving unread responses that arrive concurrently.

A saved admin response attempts a transactional push to the enquiry owner's registered devices. Notification content points to the enquiry and does not include the private message text. Failure to deliver push does not undo the response. The open-page notification beeps after browser audio has been unlocked by a user gesture, with duplicate suppression. Background notifications request an audible OS alert and open the correct enquiry when clicked. Permission, device/browser sound settings and the availability of Firebase credentials/subscriptions control actual delivery and background sound; web apps cannot guarantee a custom background beep.

New authenticated endpoints:

- `POST /api/enquiries/availability`: `productId`, optional `variantId`, mandatory `message`.
- `POST /api/enquiries/:id/messages`: mandatory `message`; enquiry owner only.
- `POST /api/enquiries/:id/read`: nonnegative integer `replyCount`; enquiry owner only, clamped to existing replies.

Deploy backend and frontend together, including the Firebase service-worker update. No data migration is required; defaults handle existing enquiries. The tests use mocked database and messaging providers and do not send messages to real customers or establish live provider delivery.
