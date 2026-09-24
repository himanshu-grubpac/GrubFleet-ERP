export type AuthenticatedUser = {
  userId: string;
  email: string;
};

export type JwtAccessPayload = {
  sub: string;
  email: string;
};
