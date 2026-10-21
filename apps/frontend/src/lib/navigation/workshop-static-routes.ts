/**
 * Static export (S3 + CloudFront): fixed shells; runtime id in query string.
 * @see docs/deployment/s3-cloudfront-portal.md
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

function detailHref(
  base: string,
  queryKey: WorkshopEntityQueryKey,
  id: string,
): string {
  const trimmed = id.trim();
  const path = `${base}/detail/`;
  if (!trimmed) {
    return path;
  }
  return `${path}?${queryKey}=${encodeURIComponent(trimmed)}`;
}

function editHref(
  base: string,
  queryKey: WorkshopEntityQueryKey,
  id: string,
): string {
  const trimmed = id.trim();
  const path = `${base}/edit/`;
  if (!trimmed) {
    return path;
  }
  return `${path}?${queryKey}=${encodeURIComponent(trimmed)}`;
}

export const workshopWorkOrderListHref = `${WORK_ORDER_BASE}/`;
export const workshopWorkOrderCreateHref = `${WORK_ORDER_BASE}/create/`;

export const workshopWorkOrderDetailHref = (workOrderId: string) =>
  detailHref(WORK_ORDER_BASE, "workOrderId", workOrderId);

export const workshopWorkOrderEditHref = (workOrderId: string) =>
  editHref(WORK_ORDER_BASE, "workOrderId", workOrderId);

export const workshopWorkOrderAddHref = (workOrderId: string) => {
  const trimmed = workOrderId.trim();
  const path = `${WORK_ORDER_BASE}/add/`;
  if (!trimmed) {
    return path;
  }
  return `${path}?workOrderId=${encodeURIComponent(trimmed)}`;
};

export const workshopAmcMaintenanceListHref = "/workshop/amc-maintenance/";
export const workshopAmcScheduleCreateHref =
  "/workshop/amc-maintenance/schedule/create/";

export const workshopAmcTierCreateHref =
  "/workshop/amc-maintenance/tier/create/";

const LABOUR_RATE_CARD_BASE = "/workshop/labour-rate-cards";

export const workshopLabourRateCardListHref = `${LABOUR_RATE_CARD_BASE}/`;
export const workshopLabourRateCardCreateHref = `${LABOUR_RATE_CARD_BASE}/create/`;

export const workshopLabourRateCardDetailHref = (id: string) =>
  detailHref(LABOUR_RATE_CARD_BASE, "laborJobCardId", id);

export const workshopLabourRateCardEditHref = (id: string) =>
  editHref(LABOUR_RATE_CARD_BASE, "laborJobCardId", id);

export const workshopAmcTierDetailHref = (tierId: string) =>
  detailHref(AMC_TIER_BASE, "tierId", tierId);

export const workshopAmcTierEditHref = (tierId: string) =>
  editHref(AMC_TIER_BASE, "tierId", tierId);

export const workshopAmcScheduleDetailHref = (scheduleId: string) =>
  detailHref(AMC_SCHEDULE_BASE, "scheduleId", scheduleId);

export const workshopAmcScheduleEditHref = (scheduleId: string) =>
  editHref(AMC_SCHEDULE_BASE, "scheduleId", scheduleId);

export const workshopAmcSubscriberDetailHref = (subscriberCode: string) =>
  detailHref(AMC_SUBSCRIBER_BASE, "subscriberCode", subscriberCode);

/** Detail/edit shells share one component; dev has no trailing slash, static export uses `/edit/`. */
export function isWorkshopStaticEditPath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  return /\/edit\/?$/.test(pathname);
}
