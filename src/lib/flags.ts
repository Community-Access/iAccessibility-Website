/**
 * Public podcast display is temporarily disabled while we migrate to Michael's
 * Pinecast feed. The current media-host enclosure URLs return AccessDenied and
 * won't play, so episode listings/players are hidden from the public site.
 * Audio submission is unaffected. Flip back to `true` once the Pinecast feed is
 * wired up.
 */
export const PODCASTS_PUBLIC_ENABLED = false;
