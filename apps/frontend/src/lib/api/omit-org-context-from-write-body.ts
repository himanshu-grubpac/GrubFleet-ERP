/**
 * Org tenancy is carried on `x-organization-id` (and query on some routes).
 * Update DTOs use forbidNonWhitelisted — never send these keys in PATCH/PUT bodies.
 */
const SERVER_ONLY_WRITE_BODY_KEYS = [
  "organizationId",
  "id",
  "createdAt",
  "updatedAt",
] as const;

type ServerOnlyWriteBodyKey = (typeof SERVER_ONLY_WRITE_BODY_KEYS)[number];

export type OmitOrgContextFromWriteBody<T extends object> = Omit<
  T,
  ServerOnlyWriteBodyKey
>;

export function omitOrgContextFromWriteBody<T extends object>(
  body: T,
): OmitOrgContextFromWriteBody<T> {
  const record = { ...body } as T & Partial<Record<ServerOnlyWriteBodyKey, unknown>>;
  for (const key of SERVER_ONLY_WRITE_BODY_KEYS) {
    delete record[key];
  }
  return record as OmitOrgContextFromWriteBody<T>;
}

/** JSON body for PATCH/PUT after stripping org context and read-only metadata. */
export function serializeOrgScopedPatchBody(body: object): string {
  return JSON.stringify(omitOrgContextFromWriteBody(body));
}
