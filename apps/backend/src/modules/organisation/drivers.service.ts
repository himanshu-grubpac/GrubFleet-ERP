import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { AuditService } from '../audit/audit.service';
import type { AssignDriverVehicleDto } from './dto/assign-driver-vehicle.dto';
import type { CreateDriverDto } from './dto/create-driver.dto';
import type { ListAssignableVehiclesQueryDto } from './dto/list-assignable-vehicles-query.dto';
import type { ListDriversQueryDto } from './dto/list-drivers-query.dto';
import type { UpdateDriverDto } from './dto/update-driver.dto';
import type { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { VehicleAllocationsService } from '../fleet-leasing/vehicle-allocations.service';
import { OrganisationRepository } from './repositories/organisation.repository';
import type { DriverListRow } from './repositories/organisation.repository';
import { formatDriverAddressLocality } from './utils/format-driver-address-locality.util';
import { formatLocationAddress } from './utils/format-location-address.util';
import {
  assertValidLocationCountry,
  assertValidLocationPostal,
} from './utils/validate-location-geo.util';

@Injectable()
export class DriversService {
  constructor(
    private readonly repo: OrganisationRepository,
    private readonly audit: AuditService,
    private readonly vehicleAllocations: VehicleAllocationsService,
  ) {}

  async list(query: ListDriversQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const isActive =
      query.status === 'active'
        ? true
        : query.status === 'inactive'
          ? false
          : undefined;
    const licenseExpired = query.status === 'license-expired';
    const { rows, total } = await this.repo.listDrivers(
      query.organizationId,
      page,
      pageSize,
      {
        search: query.search,
        isActive,
        licenseExpired,
      },
    );
    const items = rows.map((row) => this.toListItem(row));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async listAssignableVehicles(query: ListAssignableVehiclesQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const assignedCodes = await this.repo.listAssignedVehicleCodes(
      query.organizationId,
    );
    return this.vehicleAllocations.listAssignableForDriverRegister(
      query.organizationId,
      page,
      pageSize,
      assignedCodes,
    );
  }

  async getById(organizationId: string, driverId: string) {
    const row = await this.repo.getDriverWithSupplierInOrg(
      organizationId,
      driverId,
    );
    if (!row) throw new NotFoundException('Driver not found');
    return this.toDetail(row);
  }

  async create(dto: CreateDriverDto) {
    await this.assertDriverSupplier(dto.organizationId, dto.supplierId);
    const addressCountry = assertValidLocationCountry(dto.addressCountry);
    assertValidLocationPostal(addressCountry, dto.addressPincode);
    try {
      const inserted = await this.repo.insertDriver({
        organizationId: dto.organizationId,
        name: dto.name.trim(),
        cprNo: dto.cprNo.trim(),
        phone: dto.phone.trim(),
        email: dto.email.trim().toLowerCase(),
        licenseNumber: dto.licenseNumber.trim(),
        licenseExpiry: dto.licenseExpiry,
        supplierId: dto.supplierId,
        addressLine1: dto.addressLine1.trim(),
        addressLine2: dto.addressLine2?.trim() ?? null,
        addressCity: dto.addressCity?.trim() ?? null,
        addressCountry,
        addressState: dto.addressState.trim(),
        addressDistrict: dto.addressDistrict.trim(),
        addressPincode: dto.addressPincode.trim(),
        isActive: false,
      });
      return this.getById(dto.organizationId, inserted.id);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'A driver with this CPR number already exists in the organisation',
        );
      }
      throw error;
    }
  }

  async update(organizationId: string, driverId: string, dto: UpdateDriverDto) {
    const existing = await this.repo.getDriverInOrg(organizationId, driverId);
    if (!existing) throw new NotFoundException('Driver not found');
    if (!existing.isActive) {
      throw new BadRequestException(
        'Inactive drivers cannot be edited until reactivated',
      );
    }
    if (dto.supplierId !== undefined) {
      await this.assertDriverSupplier(organizationId, dto.supplierId);
    }
    const nextCountry =
      dto.addressCountry !== undefined
        ? assertValidLocationCountry(dto.addressCountry)
        : existing.addressCountry;
    if (dto.addressPincode !== undefined || dto.addressCountry !== undefined) {
      const postal =
        dto.addressPincode !== undefined
          ? dto.addressPincode
          : (existing.addressPincode ?? '');
      assertValidLocationPostal(nextCountry, postal);
    }
    try {
      await this.repo.updateDriver(organizationId, driverId, {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.cprNo !== undefined ? { cprNo: dto.cprNo.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
        ...(dto.email !== undefined
          ? { email: dto.email.trim().toLowerCase() }
          : {}),
        ...(dto.licenseNumber !== undefined
          ? { licenseNumber: dto.licenseNumber.trim() }
          : {}),
        ...(dto.licenseExpiry !== undefined
          ? { licenseExpiry: dto.licenseExpiry }
          : {}),
        ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId } : {}),
        ...(dto.addressLine1 !== undefined
          ? { addressLine1: dto.addressLine1.trim() }
          : {}),
        ...(dto.addressLine2 !== undefined
          ? { addressLine2: dto.addressLine2?.trim() ?? null }
          : {}),
        ...(dto.addressCity !== undefined
          ? { addressCity: dto.addressCity?.trim() ?? null }
          : {}),
        ...(dto.addressCountry !== undefined
          ? { addressCountry: nextCountry }
          : {}),
        ...(dto.addressState !== undefined
          ? { addressState: dto.addressState.trim() }
          : {}),
        ...(dto.addressDistrict !== undefined
          ? { addressDistrict: dto.addressDistrict.trim() }
          : {}),
        ...(dto.addressPincode !== undefined
          ? { addressPincode: dto.addressPincode.trim() }
          : {}),
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'A driver with this CPR number already exists in the organisation',
        );
      }
      throw error;
    }
    return this.getById(organizationId, driverId);
  }

  async updateStatus(
    userId: string,
    organizationId: string,
    driverId: string,
    dto: UpdateDriverStatusDto,
  ) {
    const existing = await this.repo.getDriverInOrg(organizationId, driverId);
    if (!existing) throw new NotFoundException('Driver not found');

    if (dto.action === 'deactivate') {
      const reason = dto.reason?.trim();
      if (!reason) {
        throw new BadRequestException('Deactivate reason is required');
      }
      if (!existing.isActive) {
        throw new BadRequestException('Driver is already inactive');
      }
      await this.repo.updateDriver(organizationId, driverId, {
        isActive: false,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'organisation.driver.deactivate',
        resourceType: 'organisation_driver',
        resourceId: driverId,
        status: 'SUCCESS',
        metadata: { reason },
      });
    } else {
      if (existing.isActive) {
        throw new BadRequestException('Driver is already active');
      }
      await this.repo.updateDriver(organizationId, driverId, {
        isActive: true,
      });
      const reason = dto.reason?.trim();
      await this.audit.log({
        organizationId,
        userId,
        action: 'organisation.driver.activate',
        resourceType: 'organisation_driver',
        resourceId: driverId,
        status: 'SUCCESS',
        metadata: reason ? { reason } : null,
      });
    }
    return this.getById(organizationId, driverId);
  }

  async unassignVehicle(
    userId: string,
    organizationId: string,
    driverId: string,
  ) {
    const existing = await this.repo.getDriverInOrg(organizationId, driverId);
    if (!existing) throw new NotFoundException('Driver not found');
    const vehicleCode = existing.assignedVehicleCode?.trim();
    if (!vehicleCode) {
      throw new BadRequestException(
        'Driver has no vehicle assignment to remove',
      );
    }
    await this.clearVehicleAssignmentForDriver(
      organizationId,
      driverId,
      existing.vehicleTiedToContract,
    );
    await this.audit.log({
      organizationId,
      userId,
      action: 'organisation.driver.unassign',
      resourceType: 'organisation_driver',
      resourceId: driverId,
      status: 'SUCCESS',
      metadata: { vehicleCode },
    });
    return this.getById(organizationId, driverId);
  }

  /**
   * Clears organisation driver assignment when fleet removes or reassigns a vehicle.
   */
  async clearAssignmentsForActiveLease(
    organizationId: string,
    activeLeaseId: string,
    source: 'fleet_contract_inactive' | 'fleet_vehicle_removed',
  ): Promise<void> {
    const drivers = await this.repo.listDriversByActiveLeaseId(
      organizationId,
      activeLeaseId,
    );
    for (const driver of drivers) {
      await this.clearVehicleAssignmentForDriver(
        organizationId,
        driver.id,
        driver.vehicleTiedToContract,
      );
      await this.audit.log({
        organizationId,
        userId: null,
        action: 'organisation.driver.unassign',
        resourceType: 'organisation_driver',
        resourceId: driver.id,
        status: 'SUCCESS',
        metadata: {
          activeLeaseId: activeLeaseId.trim(),
          vehicleCode: driver.assignedVehicleCode,
          source,
        },
      });
    }
  }

  async clearAssignmentForVehicleCode(
    organizationId: string,
    vehicleCode: string,
    source:
      | 'fleet_reassignment'
      | 'fleet_removal'
      | 'fleet_vehicle_removed'
      | 'fleet_contract_inactive',
  ): Promise<void> {
    const trimmed = vehicleCode.trim();
    if (!trimmed) return;
    const driver = await this.repo.findDriverByAssignedVehicleCode(
      organizationId,
      trimmed,
    );
    if (!driver) return;
    await this.clearVehicleAssignmentForDriver(
      organizationId,
      driver.id,
      driver.vehicleTiedToContract,
    );
    await this.audit.log({
      organizationId,
      userId: null,
      action: 'organisation.driver.unassign',
      resourceType: 'organisation_driver',
      resourceId: driver.id,
      status: 'SUCCESS',
      metadata: { vehicleCode: trimmed, source },
    });
  }

  private async clearVehicleAssignmentForDriver(
    organizationId: string,
    driverId: string,
    vehicleTiedToContract: boolean,
  ) {
    await this.repo.updateDriver(organizationId, driverId, {
      assignedVehicleCode: null,
      assignedVehicleAssetClass: null,
      assignedActiveLeaseId: null,
      vehicleTiedToContract: false,
      ...(vehicleTiedToContract ? { isActive: false } : {}),
    });
  }

  async assignVehicle(
    organizationId: string,
    driverId: string,
    dto: AssignDriverVehicleDto,
  ) {
    const existing = await this.repo.getDriverInOrg(organizationId, driverId);
    if (!existing) throw new NotFoundException('Driver not found');
    if (this.isLicenseExpired(existing.licenseExpiry)) {
      throw new BadRequestException(
        'Cannot assign a vehicle while the driving license is expired',
      );
    }
    await this.vehicleAllocations.assertVehicleAssignableForDriver(
      organizationId,
      dto.vehicleCode,
      dto.activeLeaseId,
      dto.assetClass,
    );
    const otherDriver = await this.repo.findDriverByAssignedVehicleCode(
      organizationId,
      dto.vehicleCode,
    );
    if (otherDriver && otherDriver.id !== driverId) {
      throw new ConflictException(
        'Another driver is already assigned to this vehicle',
      );
    }
    const tied = dto.vehicleTiedToContract ?? true;
    await this.repo.updateDriver(organizationId, driverId, {
      assignedVehicleCode: dto.vehicleCode.trim(),
      assignedVehicleAssetClass: dto.assetClass.trim(),
      assignedActiveLeaseId: dto.activeLeaseId.trim(),
      vehicleTiedToContract: tied,
      isActive: true,
    });
    return this.getById(organizationId, driverId);
  }

  private async assertDriverSupplier(
    organizationId: string,
    supplierId: string,
  ) {
    const supplier = await this.repo.getSupplierInOrg(
      organizationId,
      supplierId,
    );
    if (!supplier) {
      throw new BadRequestException('Supplier not found in this organisation');
    }
    if (supplier.supplierType !== 'driver') {
      throw new BadRequestException(
        'Supplier must be of type driver for driver register',
      );
    }
    if (!supplier.isActive) {
      throw new BadRequestException(
        'Cannot link an inactive supplier to a driver',
      );
    }
  }

  private isLicenseExpired(licenseExpiry: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(`${licenseExpiry}T00:00:00.000Z`);
    return expiry.getTime() < today.getTime();
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === '23505'
    );
  }

  private toListItem(row: DriverListRow) {
    const driver = row.driver;
    return {
      id: driver.id,
      name: driver.name,
      cprNo: driver.cprNo,
      phone: driver.phone,
      email: driver.email,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry,
      supplier: row.supplierName,
      supplierId: driver.supplierId,
      assignedVehicle: driver.assignedVehicleCode ?? undefined,
      vehicleTiedToContract: driver.vehicleTiedToContract,
      status: driver.isActive ? ('active' as const) : ('inactive' as const),
    };
  }

  private toDetail(row: DriverListRow) {
    const driver = row.driver;
    return {
      ...this.toListItem(row),
      addressLocality: formatDriverAddressLocality(driver),
      address: formatLocationAddress(driver),
      addressLine1: driver.addressLine1,
      addressLine2: driver.addressLine2,
      addressCity: driver.addressCity,
      addressState: driver.addressState,
      addressDistrict: driver.addressDistrict,
      addressPincode: driver.addressPincode,
      addressCountry: driver.addressCountry,
      assignedVehicleAssetClass: driver.assignedVehicleAssetClass,
      assignedActiveLeaseId: driver.assignedActiveLeaseId,
      isActive: driver.isActive,
      createdAt: driver.createdAt.toISOString(),
      updatedAt: driver.updatedAt.toISOString(),
    };
  }
}
