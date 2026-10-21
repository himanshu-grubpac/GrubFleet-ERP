import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { RequireAnyPermissions } from '../auth/authorization/decorators/require-any-permissions.decorator';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import {
  WorkshopPermissionKeys,
  WorkshopWriteAny,
} from './constants/workshop-permission-keys';
import { CreateLaborJobCardDto } from './dto/create-labor-job-card.dto';
import { ListLaborJobCardsQueryDto } from './dto/list-labor-job-cards-query.dto';
import { UpdateLaborJobCardDto } from './dto/update-labor-job-card.dto';
import { UpdateLaborJobCardStatusDto } from './dto/update-labor-job-card-status.dto';
import { LaborJobCardsService } from './labor-job-cards.service';

@ApiTags('workshop')
@ApiBearerAuth()
@Controller('workshop/labor-job-cards')
export class LaborJobCardsController {
  constructor(private readonly laborJobCards: LaborJobCardsService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(WorkshopPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List labor job card templates (paginated)',
    description:
      'Saved workshop labor job cards with parts and labor charge. Default sort: createdAt desc.',
  })
  list(@Query() query: ListLaborJobCardsQueryDto) {
    return this.laborJobCards.list(query);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(WorkshopPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Labor job card template detail with parts' })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.laborJobCards.getById(organizationId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...WorkshopWriteAny.CREATE)
  @ApiOperation({ summary: 'Create labor job card template' })
  create(@Body() dto: CreateLaborJobCardDto) {
    return this.laborJobCards.create(dto);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...WorkshopWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update labor job card template' })
  update(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLaborJobCardDto,
  ) {
    return this.laborJobCards.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...WorkshopWriteAny.UPDATE)
  @ApiOperation({
    summary:
      'Activate or deactivate labor job card (reason required for deactivate)',
  })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLaborJobCardStatusDto,
  ) {
    return this.laborJobCards.updateStatus(
      user.userId,
      organizationId,
      id,
      dto,
    );
  }
}
