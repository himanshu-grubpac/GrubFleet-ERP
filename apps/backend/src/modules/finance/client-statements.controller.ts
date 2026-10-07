import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { RequireAnyPermissions } from '../auth/authorization/decorators/require-any-permissions.decorator';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import { ClientStatementsService } from './client-statements.service';
import {
  FinancePermissionKeys,
  FinanceWriteAny,
} from './constants/finance-permission-keys';
import {
  ClientStatementDetailQueryDto,
  ListClientStatementsQueryDto,
} from './dto/list-client-statements-query.dto';
import { SendClientStatementDto } from './dto/send-client-statement.dto';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance/client-statements')
export class ClientStatementsController {
  constructor(private readonly clientStatements: ClientStatementsService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(FinancePermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List client statement aggregates by period',
    description:
      'One row per organisation client for the period. Totals exclude cancelled billing invoices; sale and purchase invoices are excluded.',
  })
  list(@Query() query: ListClientStatementsQueryDto) {
    return this.clientStatements.list(query);
  }

  @Get(':clientId')
  @RequireOrganizationContext()
  @RequirePermissions(FinancePermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Client statement detail for a period',
    description:
      'Billing invoices in period (including cancelled on the list). Summary totals exclude cancelled invoices.',
  })
  getDetail(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Query() query: ClientStatementDetailQueryDto,
  ) {
    return this.clientStatements.getDetail(clientId, query);
  }

  @Post(':clientId/send')
  @HttpCode(HttpStatus.OK)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FinanceWriteAny.CREATE, ...FinanceWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Record client statement send (email deferred)',
    description:
      'Writes an audit log entry only until outbound email is wired. Does not send email.',
  })
  sendStatement(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: SendClientStatementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientStatements.sendStatement(clientId, dto, user?.userId);
  }
}
