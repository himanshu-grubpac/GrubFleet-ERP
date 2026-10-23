import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthorizationService } from '../auth/authorization/authorization.service';
import { AssetClassesService } from '../asset-register/asset-classes.service';
import { AssetRegisterVehiclesService } from '../asset-register/asset-register-vehicles.service';
import { AssetRegisterPermissionKeys } from '../asset-register/constants/asset-register-permission-keys';
import { FleetLeasingPermissionKeys } from '../fleet-leasing/constants/fleet-leasing-permission-keys';
import { LeaseContractsService } from '../fleet-leasing/lease-contracts.service';
import { FinancePermissionKeys } from '../finance/constants/finance-permission-keys';
import { InvoicesService } from '../finance/invoices.service';
import { InventoryPermissionKeys } from '../inventory/constants/inventory-permission-keys';
import { StockRegisterService } from '../inventory/stock-register.service';
import { ClientsService } from '../organisation/clients.service';
import { OrganisationPermissionKeys } from '../organisation/constants/organisation-permission-keys';
import { DriversService } from '../organisation/drivers.service';
import { EmployeesService } from '../organisation/employees.service';
import { LocationsService } from '../organisation/locations.service';
import { SuppliersService } from '../organisation/suppliers.service';
import { LaborJobCardsService } from '../workshop/labor-job-cards.service';
import { WorkshopPermissionKeys } from '../workshop/constants/workshop-permission-keys';
import { WorkOrdersService } from '../workshop/work-orders.service';
import {
  PORTAL_SEARCH_DEFAULT_LIMIT_PER_TYPE,
  PORTAL_SEARCH_MAX_TOTAL_HITS,
  PORTAL_SEARCH_MIN_QUERY_LENGTH,
} from './constants/portal-search.constants';
import type { PortalSearchQueryDto } from './dto/portal-search-query.dto';
import type {
  PortalSearchHit,
  PortalSearchLink,
  PortalSearchResponse,
} from './types/portal-search.types';

type SearchSlice = {
  moduleKey: string;
  hits: PortalSearchHit[];
};

@Injectable()
export class PortalSearchService {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly employees: EmployeesService,
    private readonly locations: LocationsService,
    private readonly suppliers: SuppliersService,
    private readonly clients: ClientsService,
    private readonly drivers: DriversService,
    private readonly leaseContracts: LeaseContractsService,
    private readonly assetClasses: AssetClassesService,
    private readonly assetVehicles: AssetRegisterVehiclesService,
    private readonly invoices: InvoicesService,
    private readonly stockRegister: StockRegisterService,
    private readonly workOrders: WorkOrdersService,
    private readonly laborJobCards: LaborJobCardsService,
  ) {}

  async search(
    userId: string,
    query: PortalSearchQueryDto,
  ): Promise<PortalSearchResponse> {
    const trimmed = query.q.trim();
    if (trimmed.length < PORTAL_SEARCH_MIN_QUERY_LENGTH) {
      throw new BadRequestException('Search query must not be empty');
    }

    const limitPerType =
      query.limitPerType ?? PORTAL_SEARCH_DEFAULT_LIMIT_PER_TYPE;

    const permissionKeys = await this.authorization.getEffectivePermissionKeys(
      userId,
      query.organizationId,
    );
    const held = new Set(permissionKeys);

    const slices: SearchSlice[] = [];

    if (held.has(OrganisationPermissionKeys.VIEW)) {
      slices.push({
        moduleKey: 'organisation',
        hits: await this.searchOrganisation(
          query.organizationId,
          trimmed,
          limitPerType,
        ),
      });
    }

    if (held.has(FleetLeasingPermissionKeys.VIEW)) {
      slices.push({
        moduleKey: 'fleet_leasing',
        hits: await this.searchFleetLeasing(
          query.organizationId,
          trimmed,
          limitPerType,
        ),
      });
    }

    if (held.has(AssetRegisterPermissionKeys.VIEW)) {
      slices.push({
        moduleKey: 'asset_register',
        hits: await this.searchAssetRegister(
          query.organizationId,
          trimmed,
          limitPerType,
        ),
      });
    }

    if (held.has(FinancePermissionKeys.VIEW)) {
      slices.push({
        moduleKey: 'finance',
        hits: await this.searchFinance(
          query.organizationId,
          trimmed,
          limitPerType,
        ),
      });
    }

    if (held.has(InventoryPermissionKeys.VIEW)) {
      slices.push({
        moduleKey: 'inventory',
        hits: await this.searchInventory(
          query.organizationId,
          trimmed,
          limitPerType,
        ),
      });
    }

    if (held.has(WorkshopPermissionKeys.VIEW)) {
      slices.push({
        moduleKey: 'workshop',
        hits: await this.searchWorkshop(
          query.organizationId,
          trimmed,
          limitPerType,
        ),
      });
    }

    const merged = this.mergeAndCap(slices, PORTAL_SEARCH_MAX_TOTAL_HITS);
    const searchedModules = slices.map((s) => s.moduleKey);

    return {
      query: trimmed,
      items: merged.items,
      meta: {
        totalReturned: merged.items.length,
        limitPerType,
        capApplied: merged.capApplied,
        searchedModules,
      },
    };
  }

  private mergeAndCap(
    slices: SearchSlice[],
    maxTotal: number,
  ): { items: PortalSearchHit[]; capApplied: boolean } {
    const items: PortalSearchHit[] = [];
    let capApplied = false;
    outer: for (const slice of slices) {
      for (const hit of slice.hits) {
        if (items.length >= maxTotal) {
          capApplied = true;
          break outer;
        }
        items.push(hit);
      }
    }
    return { items, capApplied };
  }

  private async searchOrganisation(
    organizationId: string,
    search: string,
    limitPerType: number,
  ): Promise<PortalSearchHit[]> {
    const base = { organizationId, search, page: 1, pageSize: limitPerType };
    const [employees, locations, suppliers, clients, drivers] =
      await Promise.all([
        this.employees.list(base),
        this.locations.list(base),
        this.suppliers.list(base),
        this.clients.list(base),
        this.drivers.list(base),
      ]);

    const hits: PortalSearchHit[] = [];

    for (const row of employees.items) {
      const links: PortalSearchLink[] = [];
      if (row.location) {
        links.push({
          rel: 'location',
          label: 'Location',
          display: row.location,
        });
      }
      if (row.reportsToName) {
        links.push({
          rel: 'reports_to',
          label: 'Reports to',
          entityId: row.reportsToId ?? undefined,
          display: row.reportsToName,
        });
      }
      hits.push({
        id: row.id,
        title: row.fullName,
        subtitle: [row.designation, row.department].filter(Boolean).join(' · '),
        moduleKey: 'organisation',
        moduleLabel: 'Organisation',
        entityType: 'employee',
        entityTypeLabel: 'Employee',
        status: row.status,
        routePath: '/organisation/employees/detail/',
        routeQuery: { employeeId: row.id },
        links,
      });
    }

    for (const row of locations.items) {
      hits.push({
        id: row.id,
        title: row.name,
        subtitle: row.type,
        moduleKey: 'organisation',
        moduleLabel: 'Organisation',
        entityType: 'location',
        entityTypeLabel: 'Location',
        status: row.status,
        routePath: '/organisation/locations/detail/',
        routeQuery: { locationId: row.id },
        links: [],
      });
    }

    for (const row of suppliers.items) {
      hits.push({
        id: row.id,
        title: row.name,
        subtitle: row.type,
        moduleKey: 'organisation',
        moduleLabel: 'Organisation',
        entityType: 'supplier',
        entityTypeLabel: 'Supplier',
        status: row.status,
        routePath: '/organisation/suppliers/detail/',
        routeQuery: { supplierId: row.id },
        links: [],
      });
    }

    for (const row of clients.items) {
      hits.push({
        id: row.id,
        title: row.clientName,
        subtitle: row.primaryPoc !== '—' ? `POC: ${row.primaryPoc}` : undefined,
        moduleKey: 'organisation',
        moduleLabel: 'Organisation',
        entityType: 'client',
        entityTypeLabel: 'Client',
        status: row.status,
        routePath: '/organisation/clients/detail/',
        routeQuery: { clientId: row.id },
        links:
          row.contracts > 0
            ? [
                {
                  rel: 'lease_contracts',
                  label: 'Contracts',
                  display: String(row.contracts),
                },
              ]
            : [],
      });
    }

    for (const row of drivers.items) {
      const links: PortalSearchLink[] = [];
      if (row.supplier) {
        links.push({
          rel: 'supplier',
          label: 'Supplier',
          entityId: row.supplierId,
          display: row.supplier,
        });
      }
      if (row.assignedVehicle) {
        links.push({
          rel: 'vehicle',
          label: 'Assigned vehicle',
          display: row.assignedVehicle,
        });
      }
      hits.push({
        id: row.id,
        title: row.name,
        subtitle: row.licenseNumber,
        moduleKey: 'organisation',
        moduleLabel: 'Organisation',
        entityType: 'driver',
        entityTypeLabel: 'Driver',
        status: row.status,
        routePath: '/organisation/driver-register/detail/',
        routeQuery: { driverId: row.id },
        links,
      });
    }

    return hits;
  }

  private async searchFleetLeasing(
    organizationId: string,
    search: string,
    limitPerType: number,
  ): Promise<PortalSearchHit[]> {
    const result = await this.leaseContracts.list({
      organizationId,
      search,
      page: 1,
      pageSize: limitPerType,
    });

    return result.items.map((row) => {
      const links: PortalSearchLink[] = [];
      if (row.clientName && row.clientName !== 'Not yet selected') {
        links.push({
          rel: 'client',
          label: 'Client',
          entityId: row.clientId ?? row.organisationClientId ?? undefined,
          display: row.clientName,
        });
      }
      if (row.assetClasses && row.assetClasses !== '--') {
        links.push({
          rel: 'asset_classes',
          label: 'Asset classes',
          display: row.assetClasses,
        });
      }
      return {
        id: row.id,
        title: row.contractNumber,
        subtitle: row.clientName,
        moduleKey: 'fleet_leasing',
        moduleLabel: 'Fleet & Leasing',
        entityType: 'lease_contract',
        entityTypeLabel: 'Lease contract',
        status: row.status,
        routePath: '/fleet-leasing/lease-contracts/detail/',
        routeQuery: { leaseId: row.id },
        links,
      };
    });
  }

  private async searchAssetRegister(
    organizationId: string,
    search: string,
    limitPerType: number,
  ): Promise<PortalSearchHit[]> {
    const base = { organizationId, search, page: 1, pageSize: limitPerType };
    const [classes, vehicles] = await Promise.all([
      this.assetClasses.list(base),
      this.assetVehicles.list(base),
    ]);

    const hits: PortalSearchHit[] = [];

    for (const row of classes.items) {
      hits.push({
        id: row.id,
        title: row.name,
        subtitle: `${row.classId} · ${row.specLabel}`,
        moduleKey: 'asset_register',
        moduleLabel: 'Asset Register',
        entityType: 'asset_class',
        entityTypeLabel: 'Asset class',
        status: row.status,
        routePath: '/asset-register/assestclass/detail/',
        routeQuery: { assetClassId: row.id },
        links: [],
      });
    }

    for (const row of vehicles.items) {
      hits.push({
        id: row.id,
        title: row.fleetCode,
        subtitle: row.registrationNumber,
        moduleKey: 'asset_register',
        moduleLabel: 'Asset Register',
        entityType: 'fleet_vehicle',
        entityTypeLabel: 'Fleet vehicle',
        status: row.status,
        routePath: '/asset-register/fleetregister/detail/',
        routeQuery: { vehicleId: row.id },
        links: row.assetClassName
          ? [
              {
                rel: 'asset_class',
                label: 'Asset class',
                entityId: row.assetClassId,
                display: row.assetClassName,
              },
            ]
          : [],
      });
    }

    return hits;
  }

  private async searchFinance(
    organizationId: string,
    search: string,
    limitPerType: number,
  ): Promise<PortalSearchHit[]> {
    const result = await this.invoices.list({
      organizationId,
      search,
      page: 1,
      pageSize: limitPerType,
    });

    return result.items.map((row) => ({
      id: row.id,
      title: row.invoiceNumber,
      subtitle: row.partyName,
      moduleKey: 'finance',
      moduleLabel: 'Finance',
      entityType: 'invoice',
      entityTypeLabel: 'Invoice',
      status: row.status,
      routePath: '/finance/invoices/detail/',
      routeQuery: { invoiceId: row.id },
      links: row.description
        ? [
            {
              rel: 'description',
              label: 'Description',
              display: row.description,
            },
          ]
        : [],
    }));
  }

  private async searchInventory(
    organizationId: string,
    search: string,
    limitPerType: number,
  ): Promise<PortalSearchHit[]> {
    const result = await this.stockRegister.list({
      organizationId,
      search,
      page: 1,
      pageSize: limitPerType,
    });

    return result.items.map((row) => ({
      id: row.id,
      title: row.partName,
      subtitle: row.partNumber,
      moduleKey: 'inventory',
      moduleLabel: 'Inventory',
      entityType: 'spare_part',
      entityTypeLabel: 'Spare part',
      status: row.status,
      routePath: '/inventory/Stock-register/detail/',
      routeQuery: { partId: row.id },
      links: row.compatibleClass
        ? [
            {
              rel: 'compatible_class',
              label: 'Compatible',
              display: row.compatibleClass,
            },
          ]
        : [],
    }));
  }

  private async searchWorkshop(
    organizationId: string,
    search: string,
    limitPerType: number,
  ): Promise<PortalSearchHit[]> {
    const base = { organizationId, search, page: 1, pageSize: limitPerType };
    const [orders, jobCards] = await Promise.all([
      this.workOrders.list(base),
      this.laborJobCards.list(base),
    ]);

    const hits: PortalSearchHit[] = [];

    for (const row of orders.items) {
      const links: PortalSearchLink[] = [];
      if (row.vehicleFleetCode) {
        links.push({
          rel: 'vehicle',
          label: 'Vehicle',
          display: row.vehicleFleetCode,
        });
      }
      if (row.vehicleAssetClassName) {
        links.push({
          rel: 'asset_class',
          label: 'Asset class',
          display: row.vehicleAssetClassName,
        });
      }
      if (row.technicianName) {
        links.push({
          rel: 'technician',
          label: 'Technician',
          display: row.technicianName,
        });
      }
      hits.push({
        id: row.id,
        title: row.workOrderNumber,
        subtitle: row.status,
        moduleKey: 'workshop',
        moduleLabel: 'Workshop',
        entityType: 'work_order',
        entityTypeLabel: 'Work order',
        status: row.status,
        routePath: '/workshop/work-order/detail/',
        routeQuery: { workOrderId: row.id },
        links,
      });
    }

    for (const row of jobCards.items) {
      hits.push({
        id: row.id,
        title: row.name,
        subtitle: row.description ?? undefined,
        moduleKey: 'workshop',
        moduleLabel: 'Workshop',
        entityType: 'labor_job_card',
        entityTypeLabel: 'Labor job card',
        status: row.status,
        routePath: '/workshop/service-packages/detail/',
        routeQuery: { laborJobCardId: row.id },
        links: [],
      });
    }

    return hits;
  }
}
