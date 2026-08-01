# Pricing workspace interaction inventory

This inventory traces the visible pricing controls after the functional-parity repair. The shared request drawer and RFQ composer are now used at mobile, tablet, and desktop widths; layout changes by CSS, while handlers, Supabase actions, status calculations, and error states remain shared.

| Area / component | Visible interaction | Actual and intended behavior | Mobile / tablet / desktop | Audit result |
| --- | --- | --- | --- | --- |
| Main navigation (`App.tsx`) | Overview, Requests, Quotes, Vendors, Customers | Hash routes open the corresponding module. Requests is the RFQ Inbox entry. | Bottom dock on mobile; stable rail on tablet/desktop. | Wired; labels describe destinations. |
| Main navigation (`App.tsx`) | New | Opens the existing public freight-request route. | Header action where space permits. | Wired. The disconnected notification and menu icons were removed. |
| RFQ Inbox (`App.tsx`, `DesktopWorkspaceQueue.tsx`) | Search, status filters, archive switch, list/card switch | Filters shared loaded records locally; desktop context queue preserves selection in `?request=`. | Compact queue on desktop/tablet; request list controls on mobile. | Wired; no decorative filters. |
| Request rows (`App.tsx`, `DesktopWorkspaceQueue.tsx`) | Customer request row/card | Navigates to `/requests?request=<id>&view=summary`; refresh restores the request. | Same canonical URL at every width. | Fixed: legacy rows previously only changed local state while desktop rows used a URL. |
| Global search (`App.tsx`) | Request result | Navigates to the canonical selected-request URL and closes search. | Same behavior at all widths. | Fixed: previously opened local-only state. |
| Request detail (`RequestWorkspace.tsx`) | Summary, Cargo, Rates, Activity tabs | Switch shared request content; Rates exposes comparison actions; Activity shows documents and timeline. | Drawer/stacked mobile presentation and wide desktop/tablet presentation consume the same data. | Wired. Empty states are explicit. |
| Request detail (`RequestWorkspace.tsx`) | Close, overflow, archive, delete | Close returns to Inbox; menu opens archive/delete; destructive actions confirm and report database errors. | Same handlers across widths. | Wired; loading disables mutations. |
| Request detail (`RequestWorkspace.tsx`) | Request vendor RFQ / pricing decision | Opens the shared RFQ composer with vendor selection. | Same composer; responsive panels/tabs. | Wired. |
| Request detail (`RequestWorkspace.tsx`) | Compare/View rates | Opens the existing responsive vendor-rate workspace. | Same data/actions, layout-specific rendering. | Wired; the no-RFQ state explains the next action. |
| Request detail (`RequestWorkspace.tsx`) | Create/Open quote | Opens `/quotes?request=<id>` or the existing quote record. | Canonical quote workspace at every width. | Wired. |
| RFQ composer (`RfqComposer.tsx`) | Vendors, Messages, Summary | Changes the responsive workspace step; desktop keeps all three panels visible while mobile uses tabs. | Equivalent actions and state at all widths. | Wired; duplicate desktop-only request implementation removed. |
| Vendor selection (`RfqComposer.tsx`) | Vendor rows | Selects eligible vendors. Vendors without an email are visibly disabled and explain the missing prerequisite. | 44px minimum touch controls on mobile; keyboard-native buttons elsewhere. | Fixed misleading selectable rows. |
| Vendor selection (`RfqComposer.tsx`) | Manage | Closes the composer and opens the vendor directory. | Same route at all widths. | Wired. |
| RFQ conversation (`RfqComposer.tsx`) | Existing RFQ row/card | Selects the RFQ and opens Messages, showing outbound/inbound records, delivery state, failure detail, and attachments. | Stacked conversation on mobile; conversation panel on tablet/desktop. | Fixed desktop parity by using the same composer. |
| RFQ conversation (`RfqComposer.tsx`) | Refresh | Reloads RFQs/messages and shows a localized refreshing label. Realtime failure tells the user to refresh. | Same action at all widths. | Wired with loading and recovery state. |
| RFQ composer (`RfqComposer.tsx`) | Subject, message, Template | Edits the draft; Template opens existing template selection/editor and supports apply/save. | Same draft state across responsive views. | Wired. |
| RFQ composer (`RfqComposer.tsx`) | Send RFQ | Inserts drafts, invokes the current Resend edge action, updates request/activity, prevents duplicates while busy, and reports partial/full error or success. | Same mutation at all widths. | Fixed: disabled reasons are visible. Missing `RESEND_API_KEY`, no vendor, empty subject, and empty body are explicit. |
| RFQ summary (`RfqComposer.tsx`) | Rates | Opens the existing rate workspace through the request owner callback. | Same action across widths. | Wired. |
| RFQ summary (`RfqComposer.tsx`) | View/Hide shipment | Expands/collapses cargo detail. | Same state, responsive wrapping. | Wired. |
| RFQ summary (`RfqComposer.tsx`) | Retry unsent | Retries only unsent RFQ IDs, prevents duplicate retry, refreshes status, and reports errors. | Same handler across widths. | Wired; disabled with configuration explanation when Resend is unavailable. |
| Rate workspace (`ResponsiveVendorRateWorkspace.tsx`) | RFQ rows, edit response, save, select vendor, close | Loads existing RFQs and rates, persists response data, and updates selected status. | Responsive implementation chooses layout, not business rules. | Wired; no-rate and no-RFQ states are deliberate. |
| Quote workspace (`QuoteRoute.tsx`) | Direct quote/request links | Loads the existing quote builder from `request` or `quote` query state. | Same canonical route at all widths. | Wired. |
| Responsive navigation | Browser refresh/direct URL/back/close | `request`, `view`, and optional `rfq` query parameters are parsed centrally; request selection survives refresh. Closing returns to the request list without clearing its in-memory search/filter state. | Same source of truth at all widths. | Fixed local-state/URL divergence. |

## Dead or misleading controls removed

- The header notification icon had no handler or destination.
- The compact mobile menu icon had no handler.
- The quick-actions “Settings” entry routed to Overview and implied a settings screen that does not exist.
- The separate desktop `AppleRequestWorkspace` portal duplicated request data and exposed only summary actions, so it was removed from the active desktop queue path in favor of `RequestWorkspace` and `RfqComposer`.

## Intentionally unavailable states

- Email send/retry is unavailable when the Supabase `RESEND_API_KEY` secret is not configured. Viewing vendors, prior RFQs, conversations, shipment summary, rates, and quote actions remains available.
- A vendor without a usable contact or general email cannot be selected for sending until its vendor record is updated.
- Rates remain an explicit empty state until an RFQ response/rate exists; the user can still open the rate-entry workspace.
- Quote creation remains an explicit action; “Quote not created” is informational rather than a dead link.
