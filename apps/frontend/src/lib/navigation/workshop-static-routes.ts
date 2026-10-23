/**
 * Static export (S3 + CloudFront): path-only shells; entity id in secure nav store.
 * @see lib/navigation/secure-entity-navigation.ts
 */

export type WorkshopEntityQueryKey =
  | "workOrderId"
  | "tierId"
  | "scheduleId"
  | "subscriberCode"
  | "laborJobCardId";

const WORK_ORDER_BASE = "/workshop/work-order";
const AMC_TIER_BASE = "/workshop/amc-maintenance/tier";
const AMC_SCHEDULE_BASE = "/workshop/amc-maintenance/schedule";
const AMC_SUBSCRIBER_BASE = "/workshop/amc-maintenance/subscriber";

function detailHref(base: string): string {
  return `${base}/detail/`;
}

function editHref(base: string): string {
  return `${base}/edit/`;
}

export const workshopWorkOrderListHref = `${WORK_ORDER_BASE}/`;
export const workshopWorkOrderCreateHref = `${WORK_ORDER_BASE}/create/`;

export const workshopWorkOrderDetailHref = (workOrderId: string) => {
  void workOrderId;
  return detailHref(WORK_ORDER_BASE);
};

export const workshopWorkOrderEditHref = (workOrderId: string) => {
  void workOrderId;
  return editHref(WORK_ORDER_BASE);
};

export const workshopWorkOrderAddHref = (workOrderId: string) => {
  void workOrderId;
  return `${WORK_ORDER_BASE}/add/`;
};

export const workshopAmcMaintenanceListHref = "/workshop/amc-maintenance/";
export const workshopAmcScheduleCreateHref =
  "/workshop/amc-maintenance/schedule/create/";

export const workshopAmcTierCreateHref =
  "/workshop/amc-maintenance/tier/create/";

const LABOUR_RATE_CARD_BASE = "/workshop/service-packages";

export const workshopLabourRateCardListHref = `${LABOUR_RATE_CARD_BASE}/`;
export const workshopLabourRateCardCreateHref = `${LABOUR_RATE_CARD_BASE}/create/`;

export const workshopLabourRateCardDetailHref = (id: string) => {
  void id;
  return detailHref(LABOUR_RATE_CARD_BASE);
};

export const workshopLabourRateCardEditHref = (id: string) => {
  void id;
  return editHref(LABOUR_RATE_CARD_BASE);
};

export const workshopAmcTierDetailHref = (tierId: string) => {
  void tierId;
  return detailHref(AMC_TIER_BASE);
};

export const workshopAmcTierEditHref = (tierId: string) => {
  void tierId;
  return editHref(AMC_TIER_BASE);
};

export const workshopAmcScheduleDetailHref = (scheduleId: string) => {
  void scheduleId;
  return detailHref(AMC_SCHEDULE_BASE);
};

export const workshopAmcScheduleEditHref = (scheduleId: string) => {
  void scheduleId;
  return editHref(AMC_SCHEDULE_BASE);
};

export const workshopAmcSubscriberDetailHref = (subscriberCode: string) => {
  void subscriberCode;
  return detailHref(AMC_SUBSCRIBER_BASE);
};

/** Detail/edit shells share one component; dev has no trailing slash, static export uses `/edit/`. */
export function isWorkshopStaticEditPath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  return /\/edit\/?$/.test(pathname);
}
