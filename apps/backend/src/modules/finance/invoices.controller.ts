import {
  Body,
  Controller,
  Delete,
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
  FinancePermissionKeys,
  FinanceWriteAny,
} from './constants/finance-permission-keys';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { CreateBillingInvoiceDto } from './dto/create-billing-invoice.dto';
import { CreatePurchaseSparePartsInvoiceDto } from './dto/create-purchase-spare-parts-invoice.dto';
import { CreatePurchaseVehicleInvoiceDto } from './dto/create-purchase-vehicle-invoice.dto';
import { CreateSaleInvoiceDto } from './dto/create-sale-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { RecordInvoicePaymentDto } from './dto/record-invoice-payment.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance/invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(FinancePermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List finance invoices (paginated)',
    description:
      'Search matches invoice number, party name, or description. Cancelled invoices are excluded unless status=cancelled.',
  })
  list(@Query() query: ListInvoicesQueryDto) {
    return this.invoices.list(query);
  }

  @Get('payment-methods/catalog')
  @RequireOrganizationContext()
  @RequirePermissions(FinancePermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Payment method options for sale/billing invoice payments',
  })
  listPaymentMethods() {
    return this.invoices.listPaymentMethods();
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(FinancePermissionKeys.VIEW)
  @ApiOperation({ summary: 'Invoice detail with line items' })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoices.getById(organizationId, id);
  }

  @Post('purchase/vehicle')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FinanceWriteAny.CREATE)
  @ApiOperation({ summary: 'Create purchase invoice — vehicle line' })
  createPurchaseVehicle(
    @Body() dto: CreatePurchaseVehicleInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoices.createPurchaseVehicle(dto, user?.userId);
  }

  @Post('purchase/spare-parts')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FinanceWriteAny.CREATE)
  @ApiOperation({ summary: 'Create purchase invoice — spare parts line' })
  createPurchaseSpareParts(
    @Body() dto: CreatePurchaseSparePartsInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoices.createPurchaseSpareParts(dto, user?.userId);
  }

  @Post('sale')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FinanceWriteAny.CREATE)
  @ApiOperation({ summary: 'Create sale invoice for fleet register vehicle' })
  createSale(
    @Body() dto: CreateSaleInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoices.createSale(dto, user?.userId);
  }

  @Post('billing/lease')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FinanceWriteAny.CREATE)
  @ApiOperation({ summary: 'Create lease billing invoice' })
  createBilling(
    @Body() dto: CreateBillingInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoices.createBilling(dto, user?.userId);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FinanceWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update unpaid invoice fields' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoices.updateUnpaid(
      dto.organizationId,
      id,
      dto,
      user?.userId,
    );
  }

  @Post(':id/payments')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FinanceWriteAny.UPDATE)
  @ApiOperation({ summary: 'Record payment against invoice balance' })
  recordPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordInvoicePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoices.recordPayment(
      dto.organizationId,
      id,
      dto,
      user?.userId,
    );
  }

  @Patch(':id/cancel')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FinanceWriteAny.DELETE)
  @ApiOperation({ summary: 'Cancel invoice with optional reason' })
  cancelWithReason(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoices.cancel(dto.organizationId, id, user?.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FinanceWriteAny.DELETE)
  @ApiOperation({
    summary: 'Remove unpaid purchase invoice (hard delete)',
    description:
      'Permanently removes an unpaid purchase invoice with no vendor payments. Sale/billing invoices must use PATCH cancel.',
  })
  removePurchase(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoices.removeUnpaidPurchase(organizationId, id, user?.userId);
  }
}
