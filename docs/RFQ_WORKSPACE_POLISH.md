# RFQ Workspace Polish

This slice focuses on making the existing RFQ workspace usable before adding more workflow complexity.

## Interaction principles

- The request workspace must scroll naturally from top to bottom.
- The vendor list, conversation, and summary may use independent scrolling only on wide desktop layouts.
- Mobile and tablet must not trap content inside fixed-height panels.
- The conversation should remain readable while the first-send composer stays visually distinct.
- Primary actions must remain reachable above mobile browser chrome.
- Existing RFQ conversations are the source of truth after a vendor request is sent.

## Next slices

1. Mark already-requested vendors and remove them from new-send selection.
2. Replace generic resend behavior with Open conversation, Retry failed, and Send revision.
3. Add persistent follow-up conversations and internal notes.
