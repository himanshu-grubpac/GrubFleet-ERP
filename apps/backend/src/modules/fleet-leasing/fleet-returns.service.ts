import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import type { ListFleetReturnsQueryDto } from './dto/list-fleet-returns-query.dto';
import { FleetLeasingRepository } from './repositories/fleet-leasing.repository';

@Injectable()
export class FleetReturnsService {
  constructor(private readonly repo: FleetLeasingRepository) {}

  async list(query: ListFleetReturnsQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows, total } = await this.repo.listReturnInspections({
      organizationId: query.organizationId,
      page,
      pageSize,
      contractId: query.contractId,
    });
    const items = rows.map((r) => ({
      id: r.inspection.id,
      organizationId: r.inspection.organizationId,
      contractId: r.inspection.contractId,
      contractNumber: r.contractNumber,
      vehicleId: r.inspection.vehicleId,
      registrationNo: r.registrationNo,
      odometerReading: r.inspection.odometerReading,
      registeredReturn: r.inspection.registeredReturn,
      createdAt: r.inspection.createdAt.toISOString(),
    }));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, inspectionId: string) {
    const row = await this.repo.findReturnInspectionInOrg(
      organizationId,
      inspectionId,
    );
    if (!row) throw new NotFoundException('Return inspection not found');
    return {
      id: row.inspection.id,
      organizationId: row.inspection.organizationId,
      contractId: row.inspection.contractId,
      contractNumber: row.contractNumber,
      vehicleId: row.inspection.vehicleId,
      registrationNo: row.registrationNo,
      assetClass: row.assetClass,
      odometerReading: row.inspection.odometerReading,
      conditionChecklist: row.inspection.conditionChecklist,
      damageRecordId: row.inspection.damageRecordId,
      registeredReturn: row.inspection.registeredReturn,
      createdAt: row.inspection.createdAt.toISOString(),
    };
  }
}
