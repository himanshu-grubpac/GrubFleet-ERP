import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_PAGE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { AuditService } from '../audit/audit.service';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';
import type { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto';
import type { EmployeeRow } from './repositories/organisation.repository';
import { OrganisationRepository } from './repositories/organisation.repository';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly repo: OrganisationRepository,
    private readonly audit: AuditService,
  ) {}

  async listDepartments(organizationId: string) {
    const items =
      await this.repo.listDistinctEmployeeDepartments(organizationId);
    return { items };
  }

  async list(query: ListEmployeesQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? 50;
    const isActive =
      query.status === 'active'
        ? true
        : query.status === 'inactive'
          ? false
          : undefined;
    const { rows, total } = await this.repo.listEmployees(
      query.organizationId,
      page,
      pageSize,
      {
        search: query.search,
        department: query.department,
        isActive,
      },
    );
    const reportsToIds = rows
      .map((row) => row.reportsToEmployeeId)
      .filter((id): id is string => Boolean(id));
    const reportsToRows = await this.repo.getEmployeesByIds(
      query.organizationId,
      reportsToIds,
    );
    const reportsToNameById = new Map(
      reportsToRows.map((row) => [row.id, row.fullName]),
    );
    const items = rows.map((row) => this.toListItem(row, reportsToNameById));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, employeeId: string) {
    const row = await this.repo.getEmployeeInOrg(organizationId, employeeId);
    if (!row) throw new NotFoundException('Employee not found');
    return this.toDetail(row);
  }

  async create(dto: CreateEmployeeDto) {
    if (dto.reportsToEmployeeId) {
      await this.assertEmployeeAssignable(
        dto.organizationId,
        dto.reportsToEmployeeId,
        { mustBeActive: true, allowSelf: false },
      );
    }
    const location = await this.repo.getLocationInOrg(
      dto.organizationId,
      dto.locationId,
    );
    if (!location) {
      throw new BadRequestException('Invalid location for organization');
    }
    const inserted = await this.repo.insertEmployee({
      organizationId: dto.organizationId,
      employeeCode: this.generateEmployeeCode(),
      fullName: dto.fullName.trim(),
      designation: dto.designation.trim(),
      department: dto.department.trim(),
      branchLocationLabel: dto.branchLocationLabel?.trim() ?? null,
      locationId: dto.locationId,
      reportsToEmployeeId: dto.reportsToEmployeeId ?? null,
      employmentType: dto.employmentType,
      dateOfJoining: dto.dateOfJoining.trim(),
      mobile: dto.phone.trim(),
      companyEmail: dto.email.trim(),
      isActive: true,
    });
    return this.getById(dto.organizationId, inserted.id);
  }

  async update(
    organizationId: string,
    employeeId: string,
    dto: UpdateEmployeeDto,
  ) {
    const existing = await this.repo.getEmployeeInOrg(
      organizationId,
      employeeId,
    );
    if (!existing) throw new NotFoundException('Employee not found');
    if (!existing.isActive) {
      throw new BadRequestException(
        'Inactive employees cannot be edited until reactivated',
      );
    }
    if (dto.reportsToEmployeeId) {
      if (dto.reportsToEmployeeId === employeeId) {
        throw new BadRequestException('Employee cannot report to themselves');
      }
      await this.assertEmployeeAssignable(
        organizationId,
        dto.reportsToEmployeeId,
        { mustBeActive: true, allowSelf: false },
      );
    }
    if (dto.locationId) {
      const location = await this.repo.getLocationInOrg(
        organizationId,
        dto.locationId,
      );
      if (!location) {
        throw new BadRequestException('Invalid location for organization');
      }
    }
    await this.repo.updateEmployee(organizationId, employeeId, {
      ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
      ...(dto.designation !== undefined
        ? { designation: dto.designation?.trim() ?? null }
        : {}),
      ...(dto.department !== undefined
        ? { department: dto.department?.trim() ?? null }
        : {}),
      ...(dto.branchLocationLabel !== undefined
        ? {
            branchLocationLabel: dto.branchLocationLabel?.trim() ?? null,
          }
        : {}),
      ...(dto.locationId !== undefined ? { locationId: dto.locationId } : {}),
      ...(dto.reportsToEmployeeId !== undefined
        ? { reportsToEmployeeId: dto.reportsToEmployeeId }
        : {}),
      ...(dto.employmentType !== undefined
        ? { employmentType: dto.employmentType }
        : {}),
      ...(dto.dateOfJoining !== undefined
        ? { dateOfJoining: dto.dateOfJoining?.trim() || null }
        : {}),
      ...(dto.phone !== undefined ? { mobile: dto.phone?.trim() ?? null } : {}),
      ...(dto.email !== undefined
        ? { companyEmail: dto.email?.trim() ?? null }
        : {}),
    });
    return this.getById(organizationId, employeeId);
  }

  async updateStatus(
    userId: string,
    organizationId: string,
    employeeId: string,
    dto: UpdateEmployeeStatusDto,
  ) {
    const existing = await this.repo.getEmployeeInOrg(
      organizationId,
      employeeId,
    );
    if (!existing) throw new NotFoundException('Employee not found');

    if (dto.action === 'deactivate') {
      if (!dto.reasonType) {
        throw new BadRequestException('Deactivate reason type is required');
      }
      if (!existing.isActive) {
        throw new BadRequestException('Employee is already inactive');
      }
      await this.repo.updateEmployee(organizationId, employeeId, {
        isActive: false,
        offBoardReasonType: dto.reasonType,
        offBoardComment: dto.comment?.trim() ?? null,
        offBoardedAt: new Date(),
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'organisation.employee.deactivate',
        resourceType: 'organisation_employee',
        resourceId: employeeId,
        status: 'SUCCESS',
        metadata: {
          reasonType: dto.reasonType,
          comment: dto.comment?.trim() ?? null,
        },
      });
    } else {
      if (existing.isActive) {
        throw new BadRequestException('Employee is already active');
      }
      await this.repo.updateEmployee(organizationId, employeeId, {
        isActive: true,
        offBoardReasonType: null,
        offBoardComment: null,
        offBoardedAt: null,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'organisation.employee.activate',
        resourceType: 'organisation_employee',
        resourceId: employeeId,
        status: 'SUCCESS',
        metadata: null,
      });
    }
    return this.getById(organizationId, employeeId);
  }

  async assertEmployeeAssignable(
    organizationId: string,
    employeeId: string,
    options: { mustBeActive: boolean; allowSelf?: boolean },
  ): Promise<EmployeeRow> {
    const [row] = await this.repo.getEmployeesByIds(organizationId, [
      employeeId,
    ]);
    if (!row) {
      throw new BadRequestException('Invalid employee for organization');
    }
    if (options.mustBeActive && !row.isActive) {
      throw new BadRequestException(
        'Selected employee must be active in the register',
      );
    }
    return row;
  }

  employeeDisplayName(row: EmployeeRow | undefined): string {
    return row?.fullName?.trim() ?? '';
  }

  private generateEmployeeCode(): string {
    return `EMP-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  private toListItem(
    row: EmployeeRow & { linkedLocationName?: string | null },
    reportsToNameById: Map<string, string>,
  ) {
    const locationLabel =
      row.linkedLocationName?.trim() || row.branchLocationLabel?.trim() || '';
    return {
      id: row.id,
      fullName: row.fullName,
      designation: row.designation ?? '',
      department: row.department ?? '',
      location: locationLabel,
      reportsToId: row.reportsToEmployeeId,
      reportsToName: row.reportsToEmployeeId
        ? (reportsToNameById.get(row.reportsToEmployeeId) ?? null)
        : null,
      employmentType: row.employmentType,
      dateOfJoining: row.dateOfJoining
        ? String(row.dateOfJoining).slice(0, 10)
        : '',
      phone: row.mobile ?? '',
      email: row.companyEmail ?? '',
      status: row.isActive ? ('active' as const) : ('inactive' as const),
    };
  }

  private toDetail(
    row: NonNullable<
      Awaited<ReturnType<OrganisationRepository['getEmployeeInOrg']>>
    >,
  ) {
    const reportsToNameById = new Map<string, string>();
    if (row.reportsToEmployeeId && row.reportsToName) {
      reportsToNameById.set(row.reportsToEmployeeId, row.reportsToName);
    }
    return {
      ...this.toListItem(
        { ...row, linkedLocationName: row.locationName },
        reportsToNameById,
      ),
      reportsToName: row.reportsToName,
      deactivateReasonType: row.offBoardReasonType,
      deactivateComment: row.offBoardComment,
      locationId: row.locationId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
