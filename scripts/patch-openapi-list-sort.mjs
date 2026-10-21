/**
 * Insert sortBy + SortOrderParam after PageSizeParam on list GET paths.
 */
import fs from 'node:fs';
import path from 'node:path';

const OPENAPI = path.join(process.cwd(), 'docs/api/openapi.yaml');

const LIST_SORT = {
  '/organisation/locations:': ['createdAt', 'name', 'updatedAt'],
  '/organisation/clients:': ['createdAt', 'name', 'updatedAt'],
  '/organisation/employees:': [
    'createdAt',
    'fullName',
    'employeeCode',
    'department',
    'dateOfJoining',
    'updatedAt',
  ],
  '/organisation/drivers:': ['createdAt', 'name', 'licenseExpiry', 'updatedAt'],
  '/organisation/drivers/assignable-vehicles:': ['registrationNo', 'assetClass'],
  '/inventory/stock-register:': ['createdAt', 'name', 'sku', 'updatedAt'],
  '/inventory/stock-receipts:': ['createdAt', 'receiptNumber'],
  '/inventory/stock-balance:': ['createdAt', 'name', 'sku', 'updatedAt'],
  '/inventory/parts-requests:': ['requestedAt', 'status', 'requestNumber'],
  '/finance/invoices:': ['invoiceDate', 'invoiceNumber', 'status', 'createdAt'],
  '/finance/vendor-payments:': ['paymentDate', 'paymentNumber', 'createdAt'],
  '/finance/client-statements:': ['periodStart', 'clientName'],
  '/finance/inventory-parts:': ['name', 'sku'],
  '/fleet-leasing/lease-contracts:': [
    'createdAt',
    'contractNumber',
    'status',
    'startDate',
    'endDate',
  ],
  '/fleet-leasing/renewals-extensions:': ['createdAt', 'contractNumber'],
  '/fleet-leasing/clients:': ['companyName', 'createdAt', 'updatedAt'],
  '/fleet-leasing/vehicles:': ['registrationNo', 'assetClass', 'createdAt'],
  '/fleet-leasing/vehicle-allocations:': ['createdAt', 'status'],
  '/fleet-leasing/lease-contracts/{contractId}/vehicle-allocations:': [
    'createdAt',
    'status',
  ],
  '/fleet-leasing/returns:': ['createdAt', 'status'],
  '/fleet-leasing/asset-classes:': ['assetClass', 'registrationNo'],
  '/fleet-leasing/support/replacement-candidates:': [
    'registrationNo',
    'assetClass',
  ],
  '/asset-register/asset-classes:': [
    'createdAt',
    'name',
    'brand',
    'modelName',
    'updatedAt',
  ],
  '/asset-register/vehicles:': [
    'createdAt',
    'fleetCode',
    'registrationNumber',
    'operationalStatus',
    'updatedAt',
  ],
  '/asset-register/compliance:': [
    'registrationNumber',
    'fleetCode',
    'complianceDueDate',
  ],
  '/workshop/work-orders:': [
    'createdAt',
    'workOrderNumber',
    'status',
    'closedAt',
  ],
  '/workshop/labor-job-cards:': ['createdAt', 'jobCardNumber', 'status'],
  '/workshop/technicians:': ['fullName', 'openWorkOrderCount'],
  '/workshop/amc/tiers:': ['name', 'createdAt'],
  '/workshop/amc/schedules:': ['name', 'createdAt'],
  '/workshop/amc/schedules/{id}/vehicles:': ['fleetCode', 'registrationNumber'],
  '/workshop/amc/subscribers:': ['subscriberCode', 'createdAt'],
  '/users:': ['email', 'fullName', 'createdAt', 'lastLoginAt'],
  '/roles:': ['createdAt', 'name', 'updatedAt'],
  '/audit:': ['createdAt', 'action', 'resourceType'],
  '/permissions:': ['moduleKey', 'key', 'label'],
  '/organizations:': ['createdAt', 'name', 'updatedAt'],
};

function sortBlock(enums) {
  return [
    '        - name: sortBy',
    '          in: query',
    '          schema:',
    '            type: string',
    `            enum: [${enums.join(', ')}]`,
    "        - $ref: '#/components/parameters/SortOrderParam'",
  ].join('\n');
}

let yaml = fs.readFileSync(OPENAPI, 'utf8');
let patched = 0;
let missing = 0;

for (const [pathLine, enums] of Object.entries(LIST_SORT)) {
  let pathIdx = yaml.indexOf(`  ${pathLine}\r\n`);
  if (pathIdx === -1) pathIdx = yaml.indexOf(`  ${pathLine}\n`);
  if (pathIdx === -1) {
    console.warn('Path not found:', pathLine);
    missing++;
    continue;
  }
  const getIdx = yaml.indexOf('\n    get:', pathIdx);
  if (getIdx === -1 || getIdx > pathIdx + 200) {
    console.warn('GET not found for', pathLine);
    missing++;
    continue;
  }
  const paramsIdx = yaml.indexOf("PageSizeParam'", getIdx);
  if (paramsIdx === -1 || paramsIdx > getIdx + 4000) {
    console.warn('PageSizeParam not found for', pathLine);
    missing++;
    continue;
  }
  const insertAt = paramsIdx + "PageSizeParam'".length;
  const after = yaml.slice(insertAt, insertAt + 400);
  if (after.includes('name: sortBy')) {
    continue;
  }
  yaml =
    yaml.slice(0, insertAt) + '\n' + sortBlock(enums) + yaml.slice(insertAt);
  patched++;
}

fs.writeFileSync(OPENAPI, yaml);
console.log(`Patched ${patched} paths; ${missing} missing.`);
