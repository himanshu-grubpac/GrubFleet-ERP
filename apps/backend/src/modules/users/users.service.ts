import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import type { Env } from '../../config/env.schema';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
  type PaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { AuditService } from '../audit/audit.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

export type UserMemberDto = {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  membershipStatus: 'invited' | 'active' | 'suspended';
  joinedAt: string | null;
};

export type CreateUserResponseDto = UserMemberDto & {
  temporaryPassword?: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditService: AuditService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async listUsersInOrg(
    organizationId: string,
    page = DEFAULT_PAGE,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedResult<UserMemberDto>> {
    const { rows, total } = await this.usersRepository.listMembersInOrg(
      organizationId,
      page,
      pageSize,
    );
    return toPaginatedResult(
      rows.map((r) => this.toDto(r)),
      page,
      pageSize,
      total,
    );
  }

  async createUser(
    actorUserId: string,
    dto: CreateUserDto,
  ): Promise<CreateUserResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.usersRepository.findUserByEmail(email);
    if (existing) {
      throw new ConflictException({
        message: 'User with this email already exists',
        code: 'USER_EMAIL_CONFLICT',
      });
    }

    const appEnv = this.config.get('APP_ENV', { infer: true });
    let temporaryPassword: string | undefined;
    let passwordPlain = dto.password;
    if (!passwordPlain) {
      if (appEnv === 'production') {
        throw new ConflictException({
          message: 'Password is required in production',
          code: 'PASSWORD_REQUIRED',
        });
      }
      temporaryPassword = randomBytes(12).toString('base64url');
      passwordPlain = temporaryPassword;
    }

    const passwordHash = await bcrypt.hash(passwordPlain, 12);
    const user = await this.usersRepository.insertUser({
      email,
      passwordHash,
      fullName: dto.fullName ?? null,
      isActive: dto.isActive ?? true,
    });

    await this.usersRepository.upsertMembership({
      userId: user.id,
      organizationId: dto.organizationId,
      status: 'active',
    });

    await this.auditService.log({
      userId: actorUserId,
      organizationId: dto.organizationId,
      action: 'users.create',
      resourceType: 'user',
      resourceId: user.id,
      metadata: { email },
    });

    const member = await this.usersRepository.findUserInOrg(
      user.id,
      dto.organizationId,
    );
    if (!member) {
      throw new NotFoundException({
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    return {
      ...this.toDto(member),
      ...(temporaryPassword ? { temporaryPassword } : {}),
    };
  }

  async updateUserInOrg(
    actorUserId: string,
    organizationId: string,
    userId: string,
    dto: UpdateUserDto,
  ): Promise<UserMemberDto> {
    const existing = await this.usersRepository.findUserInOrg(
      userId,
      organizationId,
    );
    if (!existing) {
      throw new NotFoundException({
        message: 'User not found in organization',
        code: 'USER_NOT_FOUND',
      });
    }

    if (dto.fullName === undefined && dto.isActive === undefined) {
      return this.toDto(existing);
    }

    await this.usersRepository.updateUser(userId, {
      fullName: dto.fullName,
      isActive: dto.isActive,
    });

    await this.auditService.log({
      userId: actorUserId,
      organizationId,
      action: 'users.update',
      resourceType: 'user',
      resourceId: userId,
      metadata: { ...dto },
    });

    const updated = await this.usersRepository.findUserInOrg(
      userId,
      organizationId,
    );
    if (!updated) {
      throw new NotFoundException({
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }
    return this.toDto(updated);
  }

  private toDto(row: {
    id: string;
    email: string;
    fullName: string | null;
    isActive: boolean;
    membershipStatus: 'invited' | 'active' | 'suspended';
    joinedAt: Date | null;
  }): UserMemberDto {
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      isActive: row.isActive,
      membershipStatus: row.membershipStatus,
      joinedAt: row.joinedAt?.toISOString() ?? null,
    };
  }
}
