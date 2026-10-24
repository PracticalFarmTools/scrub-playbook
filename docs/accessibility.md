# Accessibility

The target is WCAG 2.2 Level AA, the level hospitals are usually asked to meet for staff-facing software and the level HHS's 2024 Section 504 rule points to (WCAG 2.1 AA) for recipients' web content and apps. This page says what has been built and checked, how it was checked, and what has not been checked yet. It is not a third-party audit or a conformance report.

## Built and checked

| Area | What the app does | How it was checked |
| --- | --- | --- |
| Touch targets | Every button, link, and field is at least 44 by 44 points (`tap-icon`, `min-h-11`) | A browser probe measures every control on the home list, the editor, the case view, the share sheet, and the import sheet at 390 px wide and reports any under 44 px: none |
| Text size | Nothing under 12 px on the home list; the case view uses large type for the room | Same probe |
| Contrast | Body text on white uses slate-600 or darker; error text uses rose-700. Both meet 4.5:1 for small text. | Colors chosen against the Tailwind palette values; spot-checked |
| Zoom and reflow | The page allows pinch zoom (no `maximum-scale` or `user-scalable=no`), and the layout reflows at 320 px without sideways scrolling | A probe at 320 px checks the home list, an open card, the editor, the case view, Import, Places, and Share for sideways scrolling: none. The header was also checked at 360 and 390 px. |
| Dialogs | Every sheet and dialog is a labeled `role="dialog"` with `aria-modal`, moves focus inside when it opens, keeps Tab inside, closes on Escape when closing is allowed, locks the page behind it, and returns focus to the control that opened it (`useDialog.js`) | Unit tests (`useDialog.test.jsx`) and a probe that tabs 80 times through the editor without leaving it |
| Patient-detail pause | An `alertdialog` that covers the screen and takes focus | Probe |
| Dropdowns | The glove and product pickers are comboboxes with a listbox, arrow keys, Enter, and Escape that closes only the list | Probe |
| Forms | Every field has a visible label or an `aria-label`; errors use `role="alert"` | Probe counts unnamed fields in the editor: none |
| Status messages | Save, undo, copy, scan, and update messages use `role="status"` or `aria-live` | Code review |
| Motion | `prefers-reduced-motion` turns off animations, transitions, and smooth scrolling (`index.css`, `App.jsx`) | Code review |
| Case view | A dark mode, a print layout, checkboxes named after each item, and a request to keep the screen on | Unit tests and probe |
| Dictation | Optional, never required; every field can be typed | Code review |
| Camera | Scanning a code is optional; every code's text can be pasted instead | Unit tests |
| Language | `lang="en"` on the page | Code review |

## Not yet checked

These need a person with the assistive technology, on real phones, before the app is called conformant:

- VoiceOver on iPhone and TalkBack on Android, reading through the home list, a card, the editor, the case view, and the import flow.
- Switch Control and Voice Control on iPhone.
- iOS text size (Dynamic Type) and Android font scale. The app uses fixed rem sizes, so it follows browser zoom but not the system text size inside Safari.
- Windows High Contrast and forced colors, for the desktop case.
- A full contrast measurement of every state (hover, disabled, dark case view).
- Cognitive load review with new and travel techs during the pilot (`docs/pilot.md`).

## Known limits

- Disabled buttons are shown at reduced opacity, which can fall below 4.5:1. WCAG does not require contrast for disabled controls, but some users will still find them hard to read.
- A QR code cannot be read by a screen reader. The same card is always available as text to copy or send.
- The print layout is designed for paper and has not been checked with a screen reader.

## Reporting a problem

Tell [contact email] what you were doing, the phone and browser, and the assistive technology. Accessibility problems are fixed ahead of new features.
