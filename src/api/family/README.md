# Family default boards

This folder contains the versioned default board snapshot for this local family fork.

- Board edits made in the app are local to the current browser profile and are persisted in IndexedDB.
- Export all boards before and after large edits so the current local state can be recovered.
- When an edit is intentionally promoted to the app defaults, commit the exported JSON snapshot in this folder and wire it through `src/helpers.js` if needed.
- Existing browsers with persisted state receive updated code-owned family boards through the Redux persistence migration. The migration only replaces boards in `DEFAULT_BOARDS.family` and removes stale `family-*` boards owned by `family@example.local`; user-created or imported boards are preserved.
