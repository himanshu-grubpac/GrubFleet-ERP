/** Figma Vehicle Returns hub — pipeline tabs above search (Screen 1). */
export const FLEET_RETURN_LIST_PIPELINE_TABS = [
  'all_open',
  'expected',
  'overdue',
  'to_inspect',
  'in_inspection',
  'workshop',
  'closed',
] as const;

export type FleetReturnListPipelineTab =
  (typeof FLEET_RETURN_LIST_PIPELINE_TABS)[number];

export type FleetReturnListTabCounts = Record<
  FleetReturnListPipelineTab,
  number
>;

/** Figma Vehicle Returns hub KPI row (Screen 1) — not a pipeline tab. */
export type FleetReturnListHubMetrics = {
  releasedThisMonth: number;
};
