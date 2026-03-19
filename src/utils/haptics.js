/**
 * Haptic feedback utilities for mobile.
 * Uses the Vibration API (Android) and falls back gracefully on iOS/desktop.
 */

export function hapticLight() {
  if (navigator.vibrate) navigator.vibrate(10);
}

export function hapticSuccess() {
  if (navigator.vibrate) navigator.vibrate([15, 50, 15]);
}

