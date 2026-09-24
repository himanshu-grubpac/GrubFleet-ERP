import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MeUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  fullName!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  emailVerifiedAt!: string | null;
}

export class MeRoleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['system', 'organization'] })
  scope!: 'system' | 'organization';
}

export class MeMembershipDto {
  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  organizationName!: string;

  @ApiProperty()
  organizationSlug!: string;

  @ApiProperty({ enum: ['invited', 'active', 'suspended'] })
  status!: 'invited' | 'active' | 'suspended';

  @ApiPropertyOptional()
  joinedAt!: string | null;

  @ApiProperty({ type: [MeRoleDto] })
  roles!: MeRoleDto[];

  @ApiProperty({
    type: [String],
    description: 'Permission keys effective in this organization context',
  })
  permissionKeys!: string[];

  @ApiProperty({
    description: 'Module-level access for sidebar nav (accessLevel !== NONE)',
  })
  moduleAccess!: Array<{
    moduleId: string;
    accessLevel: 'VIEW' | 'FULL' | 'CUSTOM';
  }>;
}

export class MeResponseDto {
  @ApiProperty({ type: MeUserDto })
  user!: MeUserDto;

  @ApiProperty({ type: [MeMembershipDto] })
  memberships!: MeMembershipDto[];

  @ApiProperty({
    type: [String],
    description: 'Union of all effective permission keys across memberships',
  })
  permissionKeys!: string[];

  @ApiProperty({
    description:
      'Union of module access across memberships (for default org picker / nav)',
  })
  moduleAccess!: Array<{
    moduleId: string;
    accessLevel: 'VIEW' | 'FULL' | 'CUSTOM';
  }>;
}
