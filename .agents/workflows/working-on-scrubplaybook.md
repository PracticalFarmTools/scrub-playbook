---
description: How to work on the ScrubPlaybook codebase without crashing from context overload
---

# ScrubPlaybook — Working Safely

// turbo-all

> **Root**: `C:\Users\kyles\.gemini\antigravity\scratch\scrub-playbook`

## Golden Rules (read these FIRST)

1. **Never read more than 3 source files in parallel.** The codebase has 32 source files. Reading too many at once causes context overload and crashes.
2. **Only read the files you need to edit.** Use the Architecture Map below to find the right file without exploring.
3. **Make changes in small batches** — one component or one feature at a time. Commit / verify between batches.
4. **Use the Architecture Map** below to find the right file. Don't re-scan the entire project.

---

## Architecture Map

### Entry Point
| File | Lines | Purpose |
|---|---|---|
| `src/main.jsx` | ~10 | ReactDOM render entry |
| `src/App.jsx` | ~242 | Root orchestrator — hospital workspace, surgeon CRUD, search, drag-reorder, modal/tray state |
| `src/index.css` | ~200 | Design tokens, animations, utility classes |
| `index.html` | ~40 | HTML shell, meta tags, font imports |

### Hooks (`src/hooks/`)
| File | Lines | Exports |
|---|---|---|
| `usePlaybook.js` | ~91 | `useLocalStorage(key, default)`, `useSearch(surgeons, vendors, query)` |
| `useAuditLog.js` | ~35 | `useAuditLog(key)` → `{ log, addEntry }` |
| `useNetworkStatus.js` | ~20 | `useNetworkStatus()` → `{ isOnline }` |

### Data (`src/data/`)
| File | Size | Purpose |
|---|---|---|
| `defaults.js` | 12KB | `DEMO_SURGEONS` array, `migrateSurgeonData()` |
| `trays.js` | 11KB | `MASTER_TRAYS`, `SORT_GROUPS`, `sortByStringerLogic()` |
| `vendors.js` | 9KB | `SURGICAL_VENDORS` array |
| `hospitals.js` | 8KB | `HOSPITALS`, `DEFAULT_HOSPITAL` |
| `sutures.js` | 6KB | `SURGICAL_SUTURES` array |
| `gloves.js` | 4KB | `SURGICAL_GLOVES` array |
| `needles.js` | 2KB | `NEEDLE_TYPES` array |
| `constants.js` | 2KB | LocalStorage key helpers: `makeStorageKey()`, `makeAuditKey()`, `makeOrderKey()`, `makeLatexKey()`, `makeTrayKey()` |
| `draping.js` | 1KB | `makeDefaultDraping()`, default draping config |

### Components (`src/components/`)

#### Top-level components
| File | Size | Purpose |
|---|---|---|
| `SurgeonCard.jsx` | 10KB | Orchestrator for a single surgeon card — delegates to sub-components |
| `AddSurgeonModal.jsx` | 9KB | Modal wrapper for add-surgeon form (lazy-loaded) |
| `AppHeader.jsx` | 6KB | Sticky header — search, specialty filter, latex toggle, vendor/tray buttons |
| `HospitalSelector.jsx` | 5KB | Hospital picker modal (lazy-loaded) |
| `SearchableDropdown.jsx` | 5KB | Reusable dropdown with search filtering |
| `VendorPanels.jsx` | 3KB | `VendorResults` + `VendorLibrary` |
| `RecentActivity.jsx` | 3KB | Audit log display (3 recent + expand) |
| `EmptyState.jsx` | 1KB | "No surgeons" placeholder |

#### Surgeon Card sub-components (`src/components/surgeon-card/`)
| File | Size | Purpose |
|---|---|---|
| `CardHeader.jsx` | 8KB | Header, procedure tabs, on-call badge, add/delete/reorder procedures |
| `SurgicalTeam.jsx` | 6KB | Assists list — add/remove team members |
| `InlineGloveEdit.jsx` | 6KB | Inline glove editor (double-glove, under-glove) |
| `InlineDrapingEdit.jsx` | 5KB | Inline draping steps editor |
| `NicknameSection.jsx` | 5KB | Instrument nicknames — add/remove |
| `LibrarianLinks.jsx` | 5KB | Vendor quick-links section |
| `DrapingSection.jsx` | 5KB | Draping display + interactive stepper |
| `InlineSutureEdit.jsx` | 4KB | Inline suture editor |
| `SutureSection.jsx` | 3KB | Suture pills display |
| `GloveSection.jsx` | 3KB | Glove badge display |
| `TipsSection.jsx` | 2KB | Tips / notes display |
| `CardHistory.jsx` | 2KB | Per-surgeon audit history |
| `InlineGownEdit.jsx` | 2KB | Inline gown size/type editor |
| `ExpandedDetails.jsx` | 1KB | Expandable "More Detail" wrapper |
| `helpers.js` | 1KB | Shared helpers (color lookups, etc.) |

#### Add Surgeon sub-components (`src/components/add-surgeon/`)
| File | Size | Purpose |
|---|---|---|
| `ProcedureForm.jsx` | 13KB | Full procedure form (glove, suture, equipment pickers) |
| `AssistForm.jsx` | 3KB | Team assist glove/gown picker |
| `ModalHeader.jsx` | 1KB | Modal title bar |

#### Tray components (`src/components/tray/`)
| File | Size | Purpose |
|---|---|---|
| `TrayCountSheet.jsx` | 9KB | Count sheet table — qty, name, specs, amber alerts |
| `TraySelector.jsx` | 4KB | Browse + import master trays |

### Utils (`src/utils/`)
| File | Purpose |
|---|---|
| `formatters.js` | Date/time formatting helpers |
| `haptics.js` | `hapticLight()`, `hapticSuccess()` — vibration feedback |

---

## Props Flow (key interfaces)

### App.jsx → SurgeonCard
```
surgeon, onDelete, onUpdate, onAudit, auditLog,
vendorLinks, latexFree, index,
onDragStart, onDragOver, onDrop, isDragging
```

### App.jsx → AppHeader
```
search, onSearch, specialty, setSpecialty, specialties,
latexFree, setLatexFree, showVendors, setShowVendors,
onAddSurgeon, isOnline, hospital, onHospitalClick, onTraysClick
```

---

## Dev Commands

1. Start dev server:
```
npm run dev
```

2. Production build check:
```
npm run build
```

---

## How to Make Changes Safely

1. **Identify which file(s) to edit** using the Architecture Map above.
2. **Read only those files** — don't read files you won't touch.
3. **Make edits** in a single batch for one feature.
4. **Run `npm run build`** to verify no compile errors.
5. **Browser-test** if UI changes were made.
6. **Move to the next feature.**

