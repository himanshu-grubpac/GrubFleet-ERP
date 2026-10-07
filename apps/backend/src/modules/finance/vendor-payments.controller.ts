import {
  Body,
  Controller,
  Delete,
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
import {
  FinancePermissionKeys,
  FinanceWriteAny,
} from './constants/finance-permission-keys';
import { CreateVendorPaymentDto } from './dto/create-vendor-payment.dto';
import {
  ListVendorPaymentPurchaseInvoicesQueryDto,
  ListVendorPaymentsQueryDto,
  VendorPaymentDetailQueryDto,
} from './dto/list-vendor-payments-query.dto';
import { VendorPaymentsService } from './vendor-payments.service';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance/vendor-payments')
export class VendorPaymentsController {
  constructor(private readonly vendorPayments: VendorPaymentsService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(FinancePermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List vendor payments against purchase invoices',
  })
  list(@Query() query: ListVendorPaymentsQueryDto) {
    return this.vendorPayments.list(query);
  }

  @Get('purchase-invoices/catalog')
  @RequireOrganizationContext()
  @RequirePermissions(FinancePermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Purchase invoices with balance due (record payment dropdown)',
  })
  purchaseInvoiceCatalog(
    @Query() query: ListVendorPaymentPurchaseInvoicesQueryDto,
  ) {
    return this.vendorPayments.listPurchaseInvoiceCatalog(query);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(FinancePermissionKeys.VIEW)
  @ApiOperation({ summary: 'Vendor payment detail' })
  getById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: VendorPaymentDetailQueryDto,
  ) {
    return this.vendorPayments.getById(query.organizationId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FinanceWriteAny.CREATE, ...FinanceWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Record vendor payment against a purchase invoice',
  })
  record(
    @Body() dto: CreateVendorPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vendorPayments.record(dto, user?.userId);
  }

  @Delete(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FinanceWriteAny.DELETE)
  @ApiOperation({
    summary: 'Remove latest vendor payment on an invoice (LIFO unwind)',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: VendorPaymentDetailQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vendorPayments.remove(query.organizationId, id, user?.userId);
  }
}
