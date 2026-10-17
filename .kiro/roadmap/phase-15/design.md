# Phase 15 Design

The preferred product sequence is simulate first, then operate in a managed real-console sandbox for familiarity and independent evidence. The control plane selects a compatible provider bundle and returns public session metadata plus, when approved, a one-time console federation launch URL. Raw credentials and provisioning roles never cross the server boundary.

The Console opens in a separate browser window because cross-origin and frame policies make iframe embedding unreliable. Grill Me tracks guidance state independently and periodically asks the server for resource-state validation. It does not inspect or automate the learner's live browser session.

The provider sequence is `scenario intent -> semantic simulator adapter | sandbox adapter | managed AWS adapter`. All adapters implement typed operations and observable-state queries. A session pins its policy, account assignment, region, mappings, template, and validator bundle.

Bring-your-own-account is out of scope initially. If later justified, it requires a separate architecture and threat decision using delegated roles, external IDs, short-lived sessions, uninstall/revocation, and no pasted long-lived keys.
