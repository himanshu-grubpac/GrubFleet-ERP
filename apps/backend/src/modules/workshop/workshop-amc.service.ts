import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetRegisterRepository } from '../asset-register/repositories/asset-register.repository';
import type { CreateAmcSubscriberDto } from './dto/create-amc-subscriber.dto';
import type { CreateAmcTierDto } from './dto/create-amc-tier.dto';
import { formatAmcTierPriceDisplayLabelFromPaise } from './utils/amc-tier-price.util';
import type { CreateMaintenanceScheduleDto } from './dto/create-maintenance-schedule.dto';
import type { ListSortOrder } from '../../common/constants/list-sort.constants';
import type { ListAmcSubscribersQueryDto } from './dto/list-amc-subscribers-query.dto';
import type { ListAmcTiersQueryDto } from './dto/list-amc-tiers-query.dto';
import type { ListMaintenanceSchedulesQueryDto } from './dto/list-maintenance-schedules-query.dto';
import type { MaintenanceScheduleVehicleListSortField } from './constants/workshop-list-sort.constants';
import type { UpdateAmcTierDto } from './dto/update-amc-tier.dto';
import type { UpdateMaintenanceScheduleDto } from './dto/update-maintenance-schedule.dto';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { resolveListSort } from '../../common/utils/list-sort.util';
import {
  AMC_SUBSCRIBER_LIST_DEFAULT_SORT,
  AMC_SUBSCRIBER_LIST_SORT_FIELDS,
  AMC_TIER_LIST_DEFAULT_SORT,
  AMC_TIER_LIST_SORT_FIELDS,
  MAINTENANCE_SCHEDULE_LIST_DEFAULT_SORT,
  MAINTENANCE_SCHEDULE_LIST_SORT_FIELDS,
  MAINTENANCE_SCHEDULE_VEHICLE_LIST_DEFAULT_SORT,
  MAINTENANCE_SCHEDULE_VEHICLE_LIST_SORT_FIELDS,
} from './constants/workshop-list-sort.constants';
import { AuditService } from '../audit/audit.service';
import type { UpdateWorkshopAmcStatusDto } from './dto/update-workshop-amc-status.dto';
import { WorkshopRepository } from './repositories/workshop.repository';
import { WorkOrdersService } from './work-orders.service';
import {
  isOdometerThresholdReached,
  parseOdometerIntervalKm,
} from './utils/maintenance-schedule-threshold.util';

@Injectable()
export class WorkshopAmcService {
  constructor(
    private readonly workshopRepo: WorkshopRepository,
    private readonly assetRegisterRepo: AssetRegisterRepository,
    private readonly audit: AuditService,
    private readonly workOrders: WorkOrdersService,
  ) {}

  async listTiers(query: ListAmcTiersQueryDto) {
    const p = query.page ?? DEFAULT_PAGE;
    const ps = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const sort = resolveListSort(
      AMC_TIER_LIST_SORT_FIELDS,
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      AMC_TIER_LIST_DEFAULT_SORT,
    );
    const { rows, total } = await this.workshopRepo.listAmcTiers(
      query.organizationId,
      p,
      ps,
      sort,
    );
    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      priceDisplayLabel: row.priceDisplayLabel,
      subscriberCount: row.subscriberCount,
      status: row.isActive ? ('active' as const) : ('inactive' as const),
    }));
    return toPaginatedResult(items, p, ps, total);
  }

  async getTier(organizationId: string, id: string) {
    const row = await this.workshopRepo.getAmcTierInOrg(organizationId, id);
    if (!row) throw new NotFoundException('AMC tier not found');
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      priceDisplayLabel: row.priceDisplayLabel,
      subscriberCount: row.subscriberCount,
      status: row.isActive ? ('active' as const) : ('inactive' as const),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listSchedules(query: ListMaintenanceSchedulesQueryDto) {
    const p = query.page ?? DEFAULT_PAGE;
    const ps = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const sort = resolveListSort(
      MAINTENANCE_SCHEDULE_LIST_SORT_FIELDS,
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      MAINTENANCE_SCHEDULE_LIST_DEFAULT_SORT,
    );
    const { rows, total } = await this.workshopRepo.listMaintenanceSchedules(
      query.organizationId,
      p,
      ps,
      sort,
    );
    const items = rows.map((row) => this.mapScheduleListItem(row));
    return toPaginatedResult(items, p, ps, total);
  }

  async getSchedule(organizationId: string, id: string) {
    const row = await this.workshopRepo.getMaintenanceScheduleInOrg(
      organizationId,
      id,
    );
    if (!row) throw new NotFoundException('Maintenance schedule not found');
    await this.syncScheduleVehicleMetrics(organizationId, row);
    const refreshed = await this.workshopRepo.getMaintenanceScheduleInOrg(
      organizationId,
      id,
    );
    return this.mapScheduleDetail(refreshed ?? row);
  }

  async listScheduleVehicles(
    organizationId: string,
    scheduleId: string,
    page?: number,
    pageSize?: number,
    sortBy?: MaintenanceScheduleVehicleListSortField,
    sortOrder?: ListSortOrder,
  ) {
    const schedule = await this.workshopRepo.getMaintenanceScheduleInOrg(
      organizationId,
      scheduleId,
    );
    if (!schedule) {
      throw new NotFoundException('Maintenance schedule not found');
    }

    const p = page ?? DEFAULT_PAGE;
    const ps = pageSize ?? DEFAULT_PAGE_SIZE;
    const intervalKm = parseOdometerIntervalKm(
      schedule.intervalLabel,
      schedule.intervalType,
    );

    const sort = resolveListSort(
      MAINTENANCE_SCHEDULE_VEHICLE_LIST_SORT_FIELDS,
      { sortBy, sortOrder },
      MAINTENANCE_SCHEDULE_VEHICLE_LIST_DEFAULT_SORT,
    );
    const { rows, total } =
      await this.workshopRepo.listMaintenanceScheduleMatchedVehicles(
        organizationId,
        schedule.assetClassLabel ?? '',
        schedule.vehicleApplicability,
        p,
        ps,
        sort,
      );

    const vehicleIds = rows.map((row) => row.vehicleId);
    const baselines = await this.workshopRepo.getLastClosedPmBaselineOdometers(
      organizationId,
      scheduleId,
      vehicleIds,
    );

    const openPmMap =
      await this.workshopRepo.findOpenPmWorkOrdersByScheduleVehicles(
        organizationId,
        scheduleId,
        vehicleIds,
      );

    if (intervalKm != null) {
      for (const row of rows) {
        const baseline = baselines.get(row.vehicleId) ?? 0;
        const thresholdReached = isOdometerThresholdReached(
          row.odometer,
          baseline,
          intervalKm,
        );
        if (!thresholdReached) continue;
        if (openPmMap.has(row.vehicleId)) continue;
        const created =
          await this.workOrders.createAutoPmFromMaintenanceSchedule({
            organizationId,
            maintenanceScheduleId: scheduleId,
            scheduleName: schedule.name,
            vehicleId: row.vehicleId,
            odometerReading: row.odometer,
          });
        openPmMap.set(row.vehicleId, created.id);
      }
    }

    await this.syncScheduleVehicleMetrics(organizationId, schedule);

    const items = rows.map((row) => {
      const baseline = baselines.get(row.vehicleId) ?? 0;
      const thresholdReached =
        intervalKm != null &&
        isOdometerThresholdReached(row.odometer, baseline, intervalKm);
      return {
        vehicleId: row.vehicleId,
        fleetCode: row.fleetCode,
        assetClassName: row.assetClassName,
        odometer: row.odometer,
        thresholdStatus: thresholdReached
          ? ('threshold_reached' as const)
          : ('on_schedule' as const),
        pmWorkOrderId: thresholdReached
          ? (openPmMap.get(row.vehicleId) ?? null)
          : null,
      };
    });

    return toPaginatedResult(items, p, ps, total);
  }

  async listSubscribers(query: ListAmcSubscribersQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const sort = resolveListSort(
      AMC_SUBSCRIBER_LIST_SORT_FIELDS,
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      AMC_SUBSCRIBER_LIST_DEFAULT_SORT,
    );
    const { rows, total } = await this.workshopRepo.listAmcSubscribers(
      query.organizationId,
      page,
      pageSize,
      { amcTierId: query.amcTierId, sort },
    );
    const items = rows.map((row) => ({
      id: row.id,
      subscriberCode: row.subscriberCode,
      amcTierId: row.amcTierId,
      tierName: row.tierName,
      vehicleId: row.vehicleId,
      fleetCode: row.fleetCode,
      registrationNumber: row.registrationNumber,
      assetClassName: row.assetClassName,
      startedAt: row.startedAt ?? null,
    }));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getSubscriberByCode(organizationId: string, subscriberCode: string) {
    const row = await this.workshopRepo.getAmcSubscriberByCodeInOrg(
      organizationId,
      subscriberCode,
    );
    if (!row) throw new NotFoundException('AMC subscriber not found');
    return {
      id: row.id,
      subscriberCode: row.subscriberCode,
      amcTierId: row.amcTierId,
      tierName: row.tierName,
      tierDescription: row.tierDescription,
      priceDisplayLabel: row.priceDisplayLabel,
      vehicleId: row.vehicleId,
      fleetCode: row.fleetCode,
      registrationNumber: row.registrationNumber,
      assetClassName: row.assetClassName,
      startedAt: row.startedAt ?? null,
      endedAt: row.endedAt ?? null,
      status: row.isActive ? ('active' as const) : ('inactive' as const),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async createSubscriber(dto: CreateAmcSubscriberDto) {
    const tier = await this.workshopRepo.getAmcTierInOrg(
      dto.organizationId,
      dto.amcTierId,
    );
    if (!tier) throw new NotFoundException('AMC tier not found');
    if (!tier.isActive) {
      throw new BadRequestException('Cannot subscribe to an inactive AMC tier');
    }
    const vehicle = await this.assetRegisterRepo.getVehicleInOrg(
      dto.organizationId,
      dto.vehicleId,
    );
    if (!vehicle || !vehicle.isActive) {
      throw new BadRequestException('Active fleet vehicle is required');
    }
    const subscriberCode = vehicle.fleetCode.trim();
    if (!subscriberCode) {
      throw new BadRequestException('Vehicle fleet code is required');
    }
    try {
      const row = await this.workshopRepo.insertAmcSubscriber({
        organizationId: dto.organizationId,
        amcTierId: dto.amcTierId,
        vehicleId: dto.vehicleId,
        subscriberCode,
        startedAt: dto.startedAt ?? null,
        isActive: true,
      });
      if (!row) throw new Error('Failed to create AMC subscriber');
      await this.workshopRepo.incrementAmcTierSubscriberCount(
        dto.organizationId,
        dto.amcTierId,
        1,
      );
      return this.getSubscriberByCode(dto.organizationId, subscriberCode);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'This vehicle is already subscribed to this tier',
        );
      }
      throw error;
    }
  }

  async createTier(dto: CreateAmcTierDto) {
    try {
      const row = await this.workshopRepo.insertAmcTier({
        organizationId: dto.organizationId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        priceDisplayLabel:
          dto.pricePaise !== undefined
            ? formatAmcTierPriceDisplayLabelFromPaise(dto.pricePaise)
            : null,
        subscriberCount: 0,
        isActive: true,
      });
      if (!row) throw new Error('Failed to create AMC tier');
      return this.getTier(dto.organizationId, row.id);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('AMC tier name already exists');
      }
      throw error;
    }
  }

  async updateTier(organizationId: string, id: string, dto: UpdateAmcTierDto) {
    const existing = await this.workshopRepo.getAmcTierInOrg(
      organizationId,
      id,
    );
    if (!existing) throw new NotFoundException('AMC tier not found');
    if (!existing.isActive) {
      throw new BadRequestException(
        'Inactive AMC tier cannot be edited until reactivated',
      );
    }
    try {
      await this.workshopRepo.updateAmcTier(organizationId, id, {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() ?? null }
          : {}),
        ...(dto.pricePaise !== undefined
          ? {
              priceDisplayLabel:
                dto.pricePaise === null
                  ? null
                  : formatAmcTierPriceDisplayLabelFromPaise(dto.pricePaise),
            }
          : {}),
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('AMC tier name already exists');
      }
      throw error;
    }
    return this.getTier(organizationId, id);
  }

  async createSchedule(dto: CreateMaintenanceScheduleDto) {
    try {
      const row = await this.workshopRepo.insertMaintenanceSchedule({
        organizationId: dto.organizationId,
        name: dto.name.trim(),
        assetClassLabel: dto.assetClassLabel?.trim() ?? null,
        intervalLabel: dto.intervalLabel?.trim() ?? null,
        maintenanceType: dto.maintenanceType?.trim() ?? null,
        intervalType: dto.intervalType?.trim() ?? null,
        vehicleApplicability: dto.vehicleApplicability?.trim() ?? null,
        description: dto.description?.trim() ?? null,
        vehicleCount: 0,
        thresholdReachedCount: 0,
        isActive: true,
      });
      if (!row) throw new Error('Failed to create maintenance schedule');
      return this.getSchedule(dto.organizationId, row.id);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Maintenance schedule name already exists');
      }
      throw error;
    }
  }

  async updateSchedule(
    organizationId: string,
    id: string,
    dto: UpdateMaintenanceScheduleDto,
  ) {
    const existing = await this.workshopRepo.getMaintenanceScheduleInOrg(
      organizationId,
      id,
    );
    if (!existing)
      throw new NotFoundException('Maintenance schedule not found');
    if (!existing.isActive) {
      throw new BadRequestException(
        'Inactive maintenance schedule cannot be edited until reactivated',
      );
    }
    try {
      await this.workshopRepo.updateMaintenanceSchedule(organizationId, id, {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.assetClassLabel !== undefined
          ? { assetClassLabel: dto.assetClassLabel?.trim() ?? null }
          : {}),
        ...(dto.intervalLabel !== undefined
          ? { intervalLabel: dto.intervalLabel?.trim() ?? null }
          : {}),
        ...(dto.maintenanceType !== undefined
          ? { maintenanceType: dto.maintenanceType?.trim() ?? null }
          : {}),
        ...(dto.intervalType !== undefined
          ? { intervalType: dto.intervalType?.trim() ?? null }
          : {}),
        ...(dto.vehicleApplicability !== undefined
          ? {
              vehicleApplicability: dto.vehicleApplicability?.trim() ?? null,
            }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() ?? null }
          : {}),
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Maintenance schedule name already exists');
      }
      throw error;
    }
    return this.getSchedule(organizationId, id);
  }

  async updateTierStatus(
    userId: string,
    organizationId: string,
    id: string,
    dto: UpdateWorkshopAmcStatusDto,
  ) {
    const existing = await this.workshopRepo.getAmcTierInOrg(
      organizationId,
      id,
    );
    if (!existing) throw new NotFoundException('AMC tier not found');

    if (dto.action === 'deactivate') {
      const reason = dto.reason?.trim();
      if (!reason) {
        throw new BadRequestException('Deactivate reason is required');
      }
      if (!existing.isActive) {
        throw new BadRequestException('AMC tier is already inactive');
      }
      await this.workshopRepo.updateAmcTier(organizationId, id, {
        isActive: false,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'workshop.amc_tier.deactivate',
        resourceType: 'workshop_amc_tier',
        resourceId: id,
        status: 'SUCCESS',
        metadata: { reason },
      });
    } else {
      if (existing.isActive) {
        throw new BadRequestException('AMC tier is already active');
      }
      await this.workshopRepo.updateAmcTier(organizationId, id, {
        isActive: true,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'workshop.amc_tier.activate',
        resourceType: 'workshop_amc_tier',
        resourceId: id,
        status: 'SUCCESS',
      });
    }

    return this.getTier(organizationId, id);
  }

  async updateScheduleStatus(
    userId: string,
    organizationId: string,
    id: string,
    dto: UpdateWorkshopAmcStatusDto,
  ) {
    const existing = await this.workshopRepo.getMaintenanceScheduleInOrg(
      organizationId,
      id,
    );
    if (!existing) {
      throw new NotFoundException('Maintenance schedule not found');
    }

    if (dto.action === 'deactivate') {
      const reason = dto.reason?.trim();
      if (!reason) {
        throw new BadRequestException('Deactivate reason is required');
      }
      if (!existing.isActive) {
        throw new BadRequestException(
          'Maintenance schedule is already inactive',
        );
      }
      await this.workshopRepo.updateMaintenanceSchedule(organizationId, id, {
        isActive: false,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'workshop.maintenance_schedule.deactivate',
        resourceType: 'workshop_maintenance_schedule',
        resourceId: id,
        status: 'SUCCESS',
        metadata: { reason },
      });
    } else {
      if (existing.isActive) {
        throw new BadRequestException('Maintenance schedule is already active');
      }
      await this.workshopRepo.updateMaintenanceSchedule(organizationId, id, {
        isActive: true,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'workshop.maintenance_schedule.activate',
        resourceType: 'workshop_maintenance_schedule',
        resourceId: id,
        status: 'SUCCESS',
      });
    }

    return this.getSchedule(organizationId, id);
  }

  private async syncScheduleVehicleMetrics(
    organizationId: string,
    schedule: {
      id: string;
      assetClassLabel: string | null;
      vehicleApplicability: string | null;
      intervalLabel: string | null;
      intervalType: string | null;
    },
  ): Promise<void> {
    const assetClassLabel = schedule.assetClassLabel?.trim() ?? '';
    if (!assetClassLabel) {
      await this.workshopRepo.updateMaintenanceSchedule(
        organizationId,
        schedule.id,
        { vehicleCount: 0, thresholdReachedCount: 0 },
      );
      return;
    }

    const intervalKm = parseOdometerIntervalKm(
      schedule.intervalLabel,
      schedule.intervalType,
    );
    const allVehicles =
      await this.workshopRepo.listAllMaintenanceScheduleMatchedVehicles(
        organizationId,
        assetClassLabel,
        schedule.vehicleApplicability,
      );
    const vehicleCount = allVehicles.length;
    let thresholdReachedCount = 0;

    if (intervalKm != null && allVehicles.length > 0) {
      const vehicleIds = allVehicles.map((row) => row.vehicleId);
      const baselines =
        await this.workshopRepo.getLastClosedPmBaselineOdometers(
          organizationId,
          schedule.id,
          vehicleIds,
        );
      for (const vehicle of allVehicles) {
        const baseline = baselines.get(vehicle.vehicleId) ?? 0;
        if (
          isOdometerThresholdReached(vehicle.odometer, baseline, intervalKm)
        ) {
          thresholdReachedCount += 1;
        }
      }
    }

    await this.workshopRepo.updateMaintenanceSchedule(
      organizationId,
      schedule.id,
      { vehicleCount, thresholdReachedCount },
    );
  }

  private mapScheduleListItem(row: {
    id: string;
    name: string;
    assetClassLabel: string | null;
    intervalLabel: string | null;
    maintenanceType: string | null;
    intervalType: string | null;
    vehicleApplicability: string | null;
    description: string | null;
    vehicleCount: number;
    thresholdReachedCount: number;
    isActive: boolean;
  }) {
    return {
      id: row.id,
      name: row.name,
      assetClassLabel: row.assetClassLabel,
      intervalLabel: row.intervalLabel,
      maintenanceType: row.maintenanceType,
      intervalType: row.intervalType,
      vehicleApplicability: row.vehicleApplicability,
      description: row.description,
      vehicleCount: row.vehicleCount,
      thresholdReachedCount: row.thresholdReachedCount,
      status: row.isActive ? ('active' as const) : ('inactive' as const),
    };
  }

  private mapScheduleDetail(row: {
    id: string;
    name: string;
    assetClassLabel: string | null;
    intervalLabel: string | null;
    maintenanceType: string | null;
    intervalType: string | null;
    vehicleApplicability: string | null;
    description: string | null;
    vehicleCount: number;
    thresholdReachedCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...this.mapScheduleListItem(row),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    if (this.collectPostgresErrorCodes(error).includes('23505')) {
      return true;
    }
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('duplicate key') &&
      (message.includes('workshop_amc_subscribers') ||
        message.includes('workshop_amc_tiers') ||
        message.includes('workshop_amc_schedules'))
    );
  }

  private collectPostgresErrorCodes(err: unknown, depth = 0): string[] {
    if (depth > 4 || err === null || err === undefined) {
      return [];
    }
    const codes: string[] = [];
    if (typeof err === 'object' && 'code' in err) {
      const code = err.code;
      if (typeof code === 'string') {
        codes.push(code);
      }
    }
    if (typeof err === 'object' && 'cause' in err) {
      codes.push(...this.collectPostgresErrorCodes(err.cause, depth + 1));
    }
    return codes;
  }
}
