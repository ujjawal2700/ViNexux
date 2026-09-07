# Vinexus Blueprint Unsupported Features Audit

This document identifies assumptions or features mentioned in early blueprint drafts that are **NOT supported** by the current MERN backend or official PRD scope.

---

## Unsupported Features Table

| Feature / Assumption | PRD Support | Backend Support | Audit Verdict | Required Frontend Adjustment |
| :--- | :---: | :---: | :---: | :--- |
| **Standalone `/api/admin/dealer-pricings` Router** | Mentioned as Phase 2 option | No separate router mounted in `index.js`. Dealer prices are managed directly via `dealerPrice` field on Product (`POST/PUT /api/admin/products`). Custom price overrides use `DealerPricing` service. | `UNSUPPORTED ROUTE` | Frontend Admin manages wholesale prices directly in the Product Form (`dealerPrice` field). No separate `/admin/dealer-pricings` page is needed. |
| **Real-time WebSockets / Push Notifications** | Out of Scope (Phase 1) | Not implemented. APIs are REST HTTP. | `NOT IMPLEMENTED` | Do NOT build WebSocket connections or real-time toast listeners. Use standard HTTP response feedback. |
| **Online Payment Gateway & Order Shipping** | Out of Scope (Phase 1) | Not implemented. Platform is Lead Generation only. | `OUT OF SCOPE` | Do NOT build checkout payment forms or order tracking pages. Cart routes strictly to "Chat on WhatsApp" or "Send Enquiry". |
| **Native Mobile App Push SDKs** | Out of Scope (Phase 1) | Not implemented. Responsive Web covers mobile. | `OUT OF SCOPE` | Focus strictly on responsive browser layout (Desktop, Tablet, Mobile). |

---

## Conclusion
Identifying these items ensures the frontend team does not waste time implementing unsupported routes or real-time sockets.
