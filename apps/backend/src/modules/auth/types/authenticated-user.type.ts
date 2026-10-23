export type AuthenticatedUser = {
  userId: string;
  email: string;
};

export type JwtAccessPayload = {
  sub: string;
  email: string;
  /** Must match users.credentials_revision or access token is rejected. */
  credRev?: number;
};
