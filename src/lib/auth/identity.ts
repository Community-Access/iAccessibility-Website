import "server-only";

// The auth provider's notion of the signed-in identity, normalized to the few
// fields we need to upsert and key our users table on. Whatever SDK we bind
// (Stack Auth or Better Auth), the adapter in ./provider maps the provider's
// session/user object onto this shape.
export type AuthIdentity = {
  // Stable provider user id (Stack user id / Better Auth user id). Stored on
  // users.stackUserId; unique per identity.
  authUserId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};
