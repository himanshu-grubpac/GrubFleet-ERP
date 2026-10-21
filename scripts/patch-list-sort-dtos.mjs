/**
 * One-off helper: append sortBy to list query DTOs extending PaginationQueryDto.
 * Run from repo root: node scripts/patch-list-sort-dtos.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const dtoDir = path.join(ROOT, 'apps/backend/src/modules');

const mapping = [
  ['fleet-leasing/dto/list-lease-contracts-query.dto.ts', 'fleet-leasing/constants/fleet-leasing-list-sort.constants.ts', 'LEASE_CONTRACT_LIST_SORT_FIELDS', 'LeaseContractListSortField'],
  ['fleet-leasing/dto/list-fleet-clients-query.dto.ts', 'fleet-leasing/constants/fleet-leasing-list-sort.constants.ts', 'FLEET_CLIENT_LIST_SORT_FIELDS', 'FleetClientListSortField'],
  ['fleet-leasing/dto/list-fleet-returns-query.dto.ts', 'fleet-leasing/constants/fleet-leasing-list-sort.constants.ts', 'FLEET_RETURN_LIST_SORT_FIELDS', 'FleetReturnListSortField'],
  ['fleet-leasing/dto/list-vehicle-allocations-query.dto.ts', 'fleet-leasing/constants/fleet-leasing-list-sort.constants.ts', 'VEHICLE_ALLOCATION_LIST_SORT_FIELDS', 'VehicleAllocationListSortField'],
  ['fleet-leasing/dto/list-contract-vehicle-allocations-query.dto.ts', 'fleet-leasing/constants/fleet-leasing-list-sort.constants.ts', 'VEHICLE_ALLOCATION_LIST_SORT_FIELDS', 'VehicleAllocationListSortField'],
  ['fleet-leasing/dto/list-fleet-asset-classes-query.dto.ts', 'fleet-leasing/constants/fleet-leasing-list-sort.constants.ts', 'FLEET_ASSET_CLASS_LIST_SORT_FIELDS', 'FleetAssetClassListSortField'],
  ['fleet-leasing/dto/list-renewals-extensions-query.dto.ts', 'fleet-leasing/constants/fleet-leasing-list-sort.constants.ts', 'RENEWALS_EXTENSION_LIST_SORT_FIELDS', 'RenewalsExtensionListSortField'],
  ['fleet-leasing/dto/list-replacement-candidates-query.dto.ts', 'fleet-leasing/constants/fleet-leasing-list-sort.constants.ts', 'REPLACEMENT_CANDIDATE_LIST_SORT_FIELDS', 'ReplacementCandidateListSortField'],
  ['fleet-leasing/dto/list-support-paginated-query.dto.ts', 'fleet-leasing/constants/fleet-leasing-list-sort.constants.ts', 'SUPPORT_PAGINATED_LIST_SORT_FIELDS', 'SupportPaginatedListSortField'],
  ['fleet-leasing/dto/lease-contract-change-history-query.dto.ts', 'fleet-leasing/constants/fleet-leasing-list-sort.constants.ts', 'LEASE_CHANGE_HISTORY_SORT_FIELDS', 'LeaseChangeHistorySortField'],
  ['asset-register/dto/list-asset-classes-query.dto.ts', 'asset-register/constants/asset-register-list-sort.constants.ts', 'ASSET_CLASS_LIST_SORT_FIELDS', 'AssetClassListSortField'],
  ['asset-register/dto/list-asset-register-vehicles-query.dto.ts', 'asset-register/constants/asset-register-list-sort.constants.ts', 'ASSET_REGISTER_VEHICLE_LIST_SORT_FIELDS', 'AssetRegisterVehicleListSortField'],
  ['asset-register/dto/list-asset-register-compliance-query.dto.ts', 'asset-register/constants/asset-register-list-sort.constants.ts', 'ASSET_COMPLIANCE_LIST_SORT_FIELDS', 'AssetComplianceListSortField'],
  ['finance/dto/list-invoices-query.dto.ts', 'finance/constants/finance-list-sort.constants.ts', 'INVOICE_LIST_SORT_FIELDS', 'InvoiceListSortField'],
  ['finance/dto/list-vendor-payments-query.dto.ts', 'finance/constants/finance-list-sort.constants.ts', 'VENDOR_PAYMENT_LIST_SORT_FIELDS', 'VendorPaymentListSortField'],
  ['finance/dto/list-client-statements-query.dto.ts', 'finance/constants/finance-list-sort.constants.ts', 'CLIENT_STATEMENT_LIST_SORT_FIELDS', 'ClientStatementListSortField'],
  ['finance/dto/list-inventory-parts-query.dto.ts', 'finance/constants/finance-list-sort.constants.ts', 'FINANCE_INVENTORY_PART_LIST_SORT_FIELDS', 'FinanceInventoryPartListSortField'],
  ['inventory/dto/list-inventory-query.dto.ts', 'inventory/constants/inventory-list-sort.constants.ts', 'INVENTORY_PART_LIST_SORT_FIELDS', 'InventoryPartListSortField'],
  ['inventory/dto/list-parts-requests-query.dto.ts', 'inventory/constants/inventory-list-sort.constants.ts', 'PARTS_REQUEST_LIST_SORT_FIELDS', 'PartsRequestListSortField'],
  ['workshop/dto/list-work-orders-query.dto.ts', 'workshop/constants/workshop-list-sort.constants.ts', 'WORK_ORDER_LIST_SORT_FIELDS', 'WorkOrderListSortField'],
  ['workshop/dto/list-labor-job-cards-query.dto.ts', 'workshop/constants/workshop-list-sort.constants.ts', 'LABOR_JOB_CARD_LIST_SORT_FIELDS', 'LaborJobCardListSortField'],
  ['workshop/dto/list-amc-subscribers-query.dto.ts', 'workshop/constants/workshop-list-sort.constants.ts', 'AMC_SUBSCRIBER_LIST_SORT_FIELDS', 'AmcSubscriberListSortField'],
  ['workshop/dto/list-workshop-technicians-query.dto.ts', 'workshop/constants/workshop-list-sort.constants.ts', 'WORKSHOP_TECHNICIAN_LIST_SORT_FIELDS', 'WorkshopTechnicianListSortField'],
  ['workshop/dto/list-maintenance-schedule-vehicles-query.dto.ts', 'workshop/constants/workshop-list-sort.constants.ts', 'MAINTENANCE_SCHEDULE_VEHICLE_LIST_SORT_FIELDS', 'MaintenanceScheduleVehicleListSortField'],
  ['users/dto/list-users-query.dto.ts', 'users/constants/users-list-sort.constants.ts', 'USER_LIST_SORT_FIELDS', 'UserListSortField'],
  ['roles/dto/list-roles-query.dto.ts', 'roles/constants/roles-list-sort.constants.ts', 'ROLE_LIST_SORT_FIELDS', 'RoleListSortField'],
  ['audit/dto/list-audit-query.dto.ts', 'audit/constants/audit-list-sort.constants.ts', 'AUDIT_LIST_SORT_FIELDS', 'AuditListSortField'],
];

const sortByBlock = (constName, typeName) => `
  @SortByQuery(${constName})
  sortBy?: ${typeName};
`;

for (const [dtoRel, constRel, constName, typeName] of mapping) {
  const dtoPath = path.join(dtoDir, dtoRel);
  if (!fs.existsSync(dtoPath)) {
    console.warn('skip missing', dtoRel);
    continue;
  }
  let src = fs.readFileSync(dtoPath, 'utf8');
  if (src.includes('sortBy?:')) {
    console.log('already patched', dtoRel);
    continue;
  }
  if (!src.includes('PaginationQueryDto')) {
    console.warn('no PaginationQueryDto', dtoRel);
    continue;
  }
  const constImportPath = path.relative(path.dirname(dtoPath), path.join(dtoDir, constRel)).replace(/\\/g, '/').replace(/\.ts$/, '');
  if (!src.includes('SortByQuery')) {
    src = src.replace(
      "from '../../../common/dto/pagination-query.dto';",
      "from '../../../common/dto/pagination-query.dto';\nimport { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';",
    );
    if (!src.includes('SortByQuery')) {
      src = src.replace(
        "from '../../common/dto/pagination-query.dto';",
        "from '../../common/dto/pagination-query.dto';\nimport { SortByQuery } from '../../common/decorators/list-sort-by.decorator';",
      );
    }
  }
  if (!src.includes(constName)) {
    src = src.replace(
      /from '\.\.\/\.\.\/\.\.\/common\/dto\/pagination-query\.dto';/,
      `from '../../../common/dto/pagination-query.dto';\nimport { ${constName}, type ${typeName} } from '${constImportPath}';`,
    );
  }
  src = src.replace(/\n}\s*$/, `${sortByBlock(constName, typeName)}}\n`);
  fs.writeFileSync(dtoPath, src);
  console.log('patched', dtoRel);
}
