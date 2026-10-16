import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetRegisterRepository } from '../asset-register/repositories/asset-register.repository';
import { AuthorizationService } from '../auth/authorization/authorization.service';
import { InventoryRepository } from '../inventory/repositories/inventory.repository';
import { OrganisationRepository } from '../organisation/repositories/organisation.repository';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { AuditService } from '../audit/audit.service';
import type { CreateWorkOrderDto } from './dto/create-work-order.dto';
import type { ListWorkOrdersQueryDto } from './dto/list-work-orders-query.dto';
import type { ListWorkshopTechniciansQueryDto } from './dto/list-workshop-technicians-query.dto';
import type { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import type { UpdateWorkOrderStatusDto } from './dto/update-work-order-status.dto';
import { WorkshopRepository } from './repositories/workshop.repository';
import type { WorkshopWorkOrderRow } from '../../database/schema/workshop.schema';
import { WorkshopPermissionKeys } from './constants/workshop-permission-keys';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly workshopRepo: WorkshopRepository,
    private readonly assetRegisterRepo: AssetRegisterRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly organisationRepo: OrganisationRepository,
    private readonly audit: AuditService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async list(query: ListWorkOrdersQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows, total } = await this.workshopRepo.listWorkOrders(
      query.organizationId,
      page,
      pageSize,
      { search: query.search, status: query.status },
    );
    for (const { order } of rows) {
      await this.maybeLogWorkOrderOverdue(order);
    }
    const items = rows.map(
      ({ order, fleetCode, assetClassName, technicianName }) => ({
        id: order.id,
        workOrderNumber: order.workOrderNumber,
        status: order.status,
        vehicleFleetCode: fleetCode ?? null,
        vehicleAssetClassName: assetClassName ?? null,
        technicianName: technicianName ?? null,
        expectedCompletionDate: order.expectedCompletionDate,
        netTotalMinor: order.netTotalMinor,
        createdAt: order.createdAt.toISOString(),
      }),
    );
    return toPaginatedResult(items, page, pageSize, total);
  }

  async listTechnicians(query: ListWorkshopTechniciansQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows, total } =
      await this.workshopRepo.listTechniciansWithOpenWorkOrderCounts(
        query.organizationId,
        page,
        pageSize,
        { search: query.search },
      );
    const items = rows.map((row) => ({
      employeeId: row.id,
      fullName: row.fullName,
      openWorkOrderCount: row.openWorkOrderCount,
    }));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async create(dto: CreateWorkOrderDto) {
    const vehicle = await this.assetRegisterRepo.getVehicleInOrg(
      dto.organizationId,
      dto.vehicleId,
    );
    if (!vehicle) {
      throw new NotFoundException('Fleet vehicle not found');
    }
    if (!vehicle.isActive) {
      throw new BadRequestException(
        'Inactive fleet vehicle cannot be used on a work order',
      );
    }

    if (dto.technicianEmployeeId) {
      await this.assertWorkshopTechnician(
        dto.organizationId,
        dto.technicianEmployeeId,
      );
    }

    let templateCard:
      | Awaited<ReturnType<WorkshopRepository['getLaborJobCardInOrg']>>
      | undefined;
    if (dto.laborJobCardId) {
      templateCard = await this.workshopRepo.getLaborJobCardInOrg(
        dto.organizationId,
        dto.laborJobCardId,
      );
      if (!templateCard) {
        throw new NotFoundException('Labor job card not found');
      }
      if (!templateCard.isActive) {
        throw new BadRequestException(
          'Inactive labor job card cannot be applied to a work order',
        );
      }
    }

    const partLines: Array<{
      inventoryPartId: string;
      quantity: number;
      unitCostMinor: number;
      lineSource: 'template' | 'additional';
    }> = [];
    const laborLines: Array<{
      description: string;
      amountMinor: number;
      lineSource: 'template' | 'additional';
    }> = [];

    if (templateCard) {
      const templateParts = await this.workshopRepo.listLaborJobCardParts(
        templateCard.id,
      );
      for (const { line } of templateParts) {
        const unitCostMinor =
          await this.workshopRepo.averageUnitCostMinorForPart(
            dto.organizationId,
            line.inventoryPartId,
          );
        partLines.push({
          inventoryPartId: line.inventoryPartId,
          quantity: line.quantity,
          unitCostMinor,
          lineSource: 'template',
        });
      }
      if (templateCard.laborChargeMinor > 0) {
        laborLines.push({
          description: templateCard.name,
          amountMinor: templateCard.laborChargeMinor,
          lineSource: 'template',
        });
      }
    }

    for (const line of dto.additionalParts ?? []) {
      const part = await this.inventoryRepo.getSparePartInOrg(
        dto.organizationId,
        line.partId,
      );
      if (!part) {
        throw new BadRequestException('Additional inventory part not found');
      }
      if (!part.isActive) {
        throw new BadRequestException(
          'Inactive inventory part cannot be added to a work order',
        );
      }
      const unitCostMinor =
        line.unitCostMinor ??
        (await this.workshopRepo.averageUnitCostMinorForPart(
          dto.organizationId,
          line.partId,
        ));
      partLines.push({
        inventoryPartId: line.partId,
        quantity: line.quantity,
        unitCostMinor,
        lineSource: 'additional',
      });
    }

    for (const line of dto.additionalLabor ?? []) {
      laborLines.push({
        description: line.description.trim(),
        amountMinor: line.amountMinor,
        lineSource: 'additional',
      });
    }

    const partsTotalMinor = partLines.reduce(
      (sum, line) => sum + line.unitCostMinor * line.quantity,
      0,
    );
    const laborTotalMinor = laborLines.reduce(
      (sum, line) => sum + line.amountMinor,
      0,
    );
    const netTotalMinor = partsTotalMinor + laborTotalMinor;

    await this.assertSufficientStockForPartLines(dto.organizationId, partLines);

    const workOrderNumber = await this.workshopRepo.nextWorkOrderNumber(
      dto.organizationId,
    );

    const partLinesWithReservations = await this.attachPartReservations(
      dto.organizationId,
      workOrderNumber,
      vehicle.fleetCode,
      partLines,
    );

    const { order: inserted } = await this.workshopRepo.insertWorkOrder(
      {
        organizationId: dto.organizationId,
        workOrderNumber,
        status: 'open',
        vehicleId: dto.vehicleId,
        laborJobCardId: dto.laborJobCardId ?? null,
        technicianEmployeeId: dto.technicianEmployeeId ?? null,
        expectedCompletionDate: dto.expectedCompletionDate ?? null,
        reportedBy: dto.reportedBy?.trim() ?? null,
        odometerReading: dto.odometerReading ?? null,
        issueDescription: dto.issueDescription?.trim() ?? null,
        notes: dto.notes?.trim() ?? null,
        partsTotalMinor,
        laborTotalMinor,
        netTotalMinor,
      },
      partLinesWithReservations,
      laborLines,
    );

    return this.getById(dto.organizationId, inserted.id);
  }

  async createAutoPmFromMaintenanceSchedule(input: {
    organizationId: string;
    maintenanceScheduleId: string;
    scheduleName: string;
    vehicleId: string;
    odometerReading: number;
  }) {
    const vehicle = await this.assetRegisterRepo.getVehicleInOrg(
      input.organizationId,
      input.vehicleId,
    );
    if (!vehicle || !vehicle.isActive) {
      throw new BadRequestException('Active fleet vehicle is required');
    }

    const existingOpen =
      await this.workshopRepo.findOpenPmWorkOrdersByScheduleVehicles(
        input.organizationId,
        input.maintenanceScheduleId,
        [input.vehicleId],
      );
    const existingId = existingOpen.get(input.vehicleId);
    if (existingId) {
      return this.getById(input.organizationId, existingId);
    }

    const technicianEmployeeId =
      await this.workshopRepo.pickTechnicianForAutoPm(input.organizationId);

    const workOrderNumber = await this.workshopRepo.nextWorkOrderNumber(
      input.organizationId,
    );

    const { order: inserted } = await this.workshopRepo.insertWorkOrder(
      {
        organizationId: input.organizationId,
        workOrderNumber,
        status: 'open',
        workOrderType: 'pm',
        workOrderSource: 'maintenance_schedule',
        maintenanceScheduleId: input.maintenanceScheduleId,
        vehicleId: input.vehicleId,
        laborJobCardId: null,
        technicianEmployeeId,
        expectedCompletionDate: null,
        reportedBy: 'System',
        odometerReading: input.odometerReading,
        issueDescription: `Preventive maintenance — ${input.scheduleName.trim()}`,
        notes: null,
        partsTotalMinor: 0,
        laborTotalMinor: 0,
        netTotalMinor: 0,
      },
      [],
      [],
    );

    return this.getById(input.organizationId, inserted.id);
  }

  async update(organizationId: string, id: string, dto: UpdateWorkOrderDto) {
    const existing = await this.workshopRepo.getWorkOrderInOrg(
      organizationId,
      id,
    );
    if (!existing) throw new NotFoundException('Work order not found');
    if (existing.status === 'closed' || existing.status === 'cancelled') {
      throw new BadRequestException(
        'Closed or cancelled work orders cannot be edited',
      );
    }

    if (dto.technicianEmployeeId) {
      await this.assertWorkshopTechnician(
        organizationId,
        dto.technicianEmployeeId,
      );
    }

    const patch: Partial<typeof existing> = {};
    if (dto.technicianEmployeeId !== undefined) {
      patch.technicianEmployeeId = dto.technicianEmployeeId;
    }
    if (dto.expectedCompletionDate !== undefined) {
      patch.expectedCompletionDate = dto.expectedCompletionDate;
    }
    if (dto.reportedBy !== undefined) {
      patch.reportedBy = dto.reportedBy?.trim() ?? null;
    }
    if (dto.odometerReading !== undefined) {
      patch.odometerReading = dto.odometerReading;
    }
    if (dto.issueDescription !== undefined) {
      patch.issueDescription = dto.issueDescription?.trim() ?? null;
    }
    if (dto.notes !== undefined) {
      patch.notes = dto.notes?.trim() ?? null;
    }

    if (Object.keys(patch).length > 0) {
      await this.workshopRepo.updateWorkOrder(organizationId, id, patch);
    }

    const hasAdditionalLines =
      (dto.additionalParts?.length ?? 0) > 0 ||
      (dto.additionalLabor?.length ?? 0) > 0;
    if (hasAdditionalLines) {
      const partLines: Array<{
        inventoryPartId: string;
        quantity: number;
        unitCostMinor: number;
        lineSource: 'additional';
      }> = [];
      for (const line of dto.additionalParts ?? []) {
        const part = await this.inventoryRepo.getSparePartInOrg(
          organizationId,
          line.partId,
        );
        if (!part) {
          throw new BadRequestException('Additional inventory part not found');
        }
        if (!part.isActive) {
          throw new BadRequestException(
            'Inactive inventory part cannot be added to a work order',
          );
        }
        const unitCostMinor =
          line.unitCostMinor ??
          (await this.workshopRepo.averageUnitCostMinorForPart(
            organizationId,
            line.partId,
          ));
        partLines.push({
          inventoryPartId: line.partId,
          quantity: line.quantity,
          unitCostMinor,
          lineSource: 'additional',
        });
      }
      if (partLines.length > 0) {
        await this.assertSufficientStockForPartLines(organizationId, partLines);
        const vehicle = await this.assetRegisterRepo.getVehicleInOrg(
          organizationId,
          existing.vehicleId,
        );
        const fleetCode = vehicle?.fleetCode ?? '—';
        const withReservations = await this.attachPartReservations(
          organizationId,
          existing.workOrderNumber,
          fleetCode,
          partLines,
        );
        await this.workshopRepo.appendWorkOrderAdditionalLines(
          id,
          withReservations.map((line) => ({
            inventoryPartId: line.inventoryPartId,
            quantity: line.quantity,
            unitCostMinor: line.unitCostMinor,
            inventoryPartsRequestId: line.inventoryPartsRequestId,
          })),
          (dto.additionalLabor ?? []).map((line) => ({
            description: line.description.trim(),
            amountMinor: line.amountMinor,
          })),
        );
      } else {
        const laborLines = (dto.additionalLabor ?? []).map((line) => ({
          description: line.description.trim(),
          amountMinor: line.amountMinor,
        }));
        await this.workshopRepo.appendWorkOrderAdditionalLines(
          id,
          [],
          laborLines,
        );
      }
      await this.workshopRepo.refreshWorkOrderTotals(organizationId, id);
    }

    return this.getById(organizationId, id);
  }

  async updateStatus(
    userId: string,
    organizationId: string,
    id: string,
    dto: UpdateWorkOrderStatusDto,
  ) {
    const existing = await this.workshopRepo.getWorkOrderInOrg(
      organizationId,
      id,
    );
    if (!existing) throw new NotFoundException('Work order not found');

    if (dto.action === 'start' || dto.action === 'close') {
      await this.assertAssignedTechnicianOrManage(
        userId,
        organizationId,
        existing,
        dto.action,
      );
    }

    let nextStatus: WorkshopWorkOrderRow['status'] | undefined;
    let closedAt: Date | null | undefined;

    if (dto.action === 'start') {
      if (existing.status !== 'open') {
        throw new BadRequestException('Only open work orders can be started');
      }
      if (!existing.technicianEmployeeId) {
        throw new BadRequestException(
          'Assign a technician before starting the work order',
        );
      }
      nextStatus = 'in_progress';
    } else if (dto.action === 'close') {
      if (existing.status !== 'open' && existing.status !== 'in_progress') {
        throw new BadRequestException(
          'Only open or in-progress work orders can be closed',
        );
      }
      nextStatus = 'closed';
      closedAt = new Date();
    } else {
      if (existing.status !== 'open' && existing.status !== 'in_progress') {
        throw new BadRequestException(
          'Only open or in-progress work orders can be cancelled',
        );
      }
      nextStatus = 'cancelled';
      closedAt = new Date();
    }

    await this.workshopRepo.updateWorkOrder(organizationId, id, {
      status: nextStatus,
      ...(closedAt !== undefined ? { closedAt } : {}),
    });

    if (dto.action === 'start') {
      await this.issueReservedParts(
        organizationId,
        existing.workOrderNumber,
        id,
      );
    } else if (dto.action === 'cancel') {
      await this.releaseReservedParts(
        organizationId,
        existing.workOrderNumber,
        id,
      );
    }

    const auditAction =
      dto.action === 'start'
        ? 'workshop.work_order.start'
        : dto.action === 'close'
          ? 'workshop.work_order.close'
          : 'workshop.work_order.cancel';

    await this.audit.log({
      organizationId,
      userId,
      action: auditAction,
      resourceType: 'workshop_work_order',
      resourceId: id,
      status: 'SUCCESS',
    });

    return this.getById(organizationId, id);
  }

  async getById(organizationId: string, id: string, viewerUserId?: string) {
    const row = await this.workshopRepo.getWorkOrderInOrg(organizationId, id);
    if (!row) throw new NotFoundException('Work order not found');
    await this.maybeLogWorkOrderOverdue(row);

    const vehicle = await this.assetRegisterRepo.getVehicleWithRelationsInOrg(
      organizationId,
      row.vehicleId,
    );
    const partRows = await this.workshopRepo.listWorkOrderPartLines(row.id);
    const laborRows = await this.workshopRepo.listWorkOrderLaborLines(row.id);

    let technicianLabel: string | null = null;
    if (row.technicianEmployeeId) {
      const tech = await this.organisationRepo.getEmployeeInOrg(
        organizationId,
        row.technicianEmployeeId,
      );
      technicianLabel = tech?.fullName ?? null;
    }

    const scheduleName =
      row.maintenanceScheduleId != null
        ? ((
            await this.workshopRepo.getMaintenanceScheduleInOrg(
              organizationId,
              row.maintenanceScheduleId,
            )
          )?.name ?? null)
        : null;

    const statusBanner = this.buildWorkOrderStatusBanner(row, scheduleName);

    const partsFulfillmentSummary = this.summarizePartsFulfillment(partRows);
    const sourceLabel = this.buildWorkOrderSourceLabel(row);
    const availableActions = viewerUserId
      ? await this.buildWorkOrderAvailableActions(
          viewerUserId,
          organizationId,
          row,
        )
      : undefined;

    return {
      id: row.id,
      workOrderNumber: row.workOrderNumber,
      status: row.status,
      workOrderType: row.workOrderType,
      workOrderSource: row.workOrderSource,
      maintenanceScheduleId: row.maintenanceScheduleId,
      maintenanceScheduleName: scheduleName,
      sourceLabel,
      partsFulfillmentSummary,
      statusBanner,
      availableActions,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            fleetCode: vehicle.fleetCode,
            registrationNumber: vehicle.registrationNumber,
            assetClassName: vehicle.assetClass.name,
            odometer: vehicle.odometer,
          }
        : null,
      laborJobCardId: row.laborJobCardId,
      technicianEmployeeId: row.technicianEmployeeId,
      technicianName: technicianLabel,
      expectedCompletionDate: row.expectedCompletionDate,
      reportedBy: row.reportedBy,
      odometerReading: row.odometerReading,
      issueDescription: row.issueDescription,
      notes: row.notes,
      partsTotalMinor: row.partsTotalMinor,
      laborTotalMinor: row.laborTotalMinor,
      netTotalMinor: row.netTotalMinor,
      partLines: partRows.map(({ line, partName, partCode }) => ({
        id: line.id,
        partId: line.inventoryPartId,
        partName,
        partCode: partCode ?? null,
        quantity: line.quantity,
        unitCostMinor: line.unitCostMinor,
        lineTotalMinor: line.unitCostMinor * line.quantity,
        lineSource: line.lineSource,
        fulfillmentStatus: line.fulfillmentStatus,
      })),
      laborLines: laborRows.map((line) => ({
        id: line.id,
        description: line.description,
        amountMinor: line.amountMinor,
        lineSource: line.lineSource,
      })),
      closedAt: row.closedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      isOverdue: this.isWorkOrderOverdue(row),
    };
  }

  private buildWorkOrderStatusBanner(
    row: WorkshopWorkOrderRow,
    scheduleName: string | null,
  ): { level: 'info' | 'warning' | 'success'; message: string } | null {
    if (
      row.workOrderType === 'pm' &&
      row.workOrderSource === 'maintenance_schedule' &&
      row.status === 'open'
    ) {
      const rule = scheduleName?.trim() || 'Maintenance schedule';
      return {
        level: 'info',
        message: `Auto-generated PM work order from schedule “${rule}”. Start the work order when maintenance begins.`,
      };
    }
    return null;
  }

  private isWorkOrderOverdue(row: WorkshopWorkOrderRow): boolean {
    if (!row.expectedCompletionDate) return false;
    if (row.status !== 'open' && row.status !== 'in_progress') {
      return false;
    }
    const today = new Date().toISOString().slice(0, 10);
    return row.expectedCompletionDate < today;
  }

  private async assertWorkshopTechnician(
    organizationId: string,
    employeeId: string,
  ): Promise<void> {
    const tech = await this.organisationRepo.getEmployeeInOrg(
      organizationId,
      employeeId,
    );
    if (!tech) {
      throw new NotFoundException('Technician employee not found');
    }
    if (!tech.isActive) {
      throw new BadRequestException(
        'Inactive employee cannot be assigned as technician',
      );
    }
    if (!tech.isWorkshopTechnician) {
      throw new BadRequestException(
        'Employee is not marked as a workshop technician',
      );
    }
  }

  private async assertSufficientStockForPartLines(
    organizationId: string,
    partLines: Array<{ inventoryPartId: string; quantity: number }>,
  ): Promise<void> {
    const qtyByPart = new Map<string, number>();
    for (const line of partLines) {
      qtyByPart.set(
        line.inventoryPartId,
        (qtyByPart.get(line.inventoryPartId) ?? 0) + line.quantity,
      );
    }
    for (const [partId, quantity] of qtyByPart) {
      const onHand = await this.inventoryRepo.onHandTotalForPart(
        organizationId,
        partId,
      );
      if (onHand < quantity) {
        throw new BadRequestException(
          'Insufficient inventory stock for one or more parts on this work order',
        );
      }
    }
  }

  private async attachPartReservations(
    organizationId: string,
    workOrderNumber: string,
    vehicleFleetCode: string,
    partLines: Array<{
      inventoryPartId: string;
      quantity: number;
      unitCostMinor: number;
      lineSource: 'template' | 'additional';
    }>,
  ) {
    const result: Array<{
      inventoryPartId: string;
      quantity: number;
      unitCostMinor: number;
      lineSource: 'template' | 'additional';
      inventoryPartsRequestId: string | null;
    }> = [];
    let index = 0;
    for (const line of partLines) {
      index += 1;
      const request = await this.inventoryRepo.createWorkOrderPartReservation({
        organizationId,
        workOrderNumber,
        vehicleFleetCode,
        partId: line.inventoryPartId,
        quantity: line.quantity,
        lineKey: String(index),
      });
      result.push({
        ...line,
        inventoryPartsRequestId: request.id,
      });
    }
    return result;
  }

  private async issueReservedParts(
    organizationId: string,
    workOrderNumber: string,
    workOrderId: string,
  ): Promise<void> {
    await this.inventoryRepo.transitionPartsRequestsByWorkOrderRef(
      organizationId,
      workOrderNumber,
      'reserved',
      'fulfilled',
    );
    await this.workshopRepo.updatePartLinesFulfillmentForWorkOrder(
      workOrderId,
      'reserved',
      'issued',
    );
  }

  private async releaseReservedParts(
    organizationId: string,
    workOrderNumber: string,
    workOrderId: string,
  ): Promise<void> {
    await this.inventoryRepo.transitionPartsRequestsByWorkOrderRef(
      organizationId,
      workOrderNumber,
      'reserved',
      'cancelled',
    );
    await this.workshopRepo.updatePartLinesFulfillmentForWorkOrder(
      workOrderId,
      'reserved',
      'cancelled',
    );
  }

  private summarizePartsFulfillment(
    partRows: Awaited<ReturnType<WorkshopRepository['listWorkOrderPartLines']>>,
  ): 'none' | 'reserved' | 'issued' | 'mixed' {
    if (partRows.length === 0) return 'none';
    const statuses = new Set(
      partRows.map(({ line }) => line.fulfillmentStatus),
    );
    if (statuses.size === 1) {
      const only = [...statuses][0];
      if (only === 'issued') return 'issued';
      if (only === 'reserved') return 'reserved';
      return 'mixed';
    }
    return 'mixed';
  }

  private buildWorkOrderSourceLabel(row: WorkshopWorkOrderRow): string {
    if (row.workOrderSource === 'maintenance_schedule') {
      return 'Maintenance schedule';
    }
    if (row.workOrderSource === 'lease_return') {
      return 'Lease return';
    }
    return 'Manual log';
  }

  private async buildWorkOrderAvailableActions(
    userId: string,
    organizationId: string,
    row: WorkshopWorkOrderRow,
  ) {
    const permissionKeys =
      await this.authorizationService.getEffectivePermissionKeys(
        userId,
        organizationId,
      );
    const canManage = permissionKeys.includes(WorkshopPermissionKeys.MANAGE);
    const canUpdate =
      canManage || permissionKeys.includes(WorkshopPermissionKeys.UPDATE);
    const terminal = row.status === 'closed' || row.status === 'cancelled';
    const technicianOk = await this.isViewerAssignedTechnician(
      userId,
      organizationId,
      row,
      canManage,
    );

    return {
      edit: canUpdate && !terminal,
      start:
        canUpdate &&
        row.status === 'open' &&
        !!row.technicianEmployeeId &&
        technicianOk,
      complete:
        canUpdate &&
        row.status === 'in_progress' &&
        !!row.technicianEmployeeId &&
        technicianOk,
    };
  }

  private async isViewerAssignedTechnician(
    userId: string,
    organizationId: string,
    row: WorkshopWorkOrderRow,
    hasManage: boolean,
  ): Promise<boolean> {
    if (hasManage) return true;
    if (!row.technicianEmployeeId) return false;
    const viewerEmployeeId =
      await this.organisationRepo.findEmployeeIdByLinkedUserInOrg(
        organizationId,
        userId,
      );
    return viewerEmployeeId === row.technicianEmployeeId;
  }

  private async assertAssignedTechnicianOrManage(
    userId: string,
    organizationId: string,
    row: WorkshopWorkOrderRow,
    action: 'start' | 'close',
  ): Promise<void> {
    const permissionKeys =
      await this.authorizationService.getEffectivePermissionKeys(
        userId,
        organizationId,
      );
    const canManage = permissionKeys.includes(WorkshopPermissionKeys.MANAGE);
    if (canManage) return;

    if (!row.technicianEmployeeId) {
      throw new BadRequestException(
        action === 'start'
          ? 'Assign a technician before starting the work order'
          : 'Assign a technician before completing the work order',
      );
    }

    const allowed = await this.isViewerAssignedTechnician(
      userId,
      organizationId,
      row,
      false,
    );
    if (!allowed) {
      throw new ForbiddenException(
        'Only the assigned workshop technician (or a workshop manager) can start or complete this work order',
      );
    }
  }

  private async maybeLogWorkOrderOverdue(
    row: WorkshopWorkOrderRow,
  ): Promise<void> {
    if (!this.isWorkOrderOverdue(row) || !row.expectedCompletionDate) {
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const alreadyLogged = await this.workshopRepo.hasOverdueLogForUtcDate(
      row.id,
      today,
    );
    if (alreadyLogged) return;

    const expectedMs = Date.parse(`${row.expectedCompletionDate}T00:00:00Z`);
    const todayMs = Date.parse(`${today}T00:00:00Z`);
    const daysOverdue = Math.max(
      1,
      Math.round((todayMs - expectedMs) / 86_400_000),
    );

    await this.workshopRepo.insertOverdueLog({
      workOrderId: row.id,
      expectedCompletionDate: row.expectedCompletionDate,
      daysOverdue,
      note: 'Auto-logged when work order passed expected completion date',
    });
  }
}
