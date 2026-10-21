import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PortalSearchQueryDto } from './dto/portal-search-query.dto';
import { PortalSearchService } from './portal-search.service';

@ApiTags('portal')
@ApiBearerAuth()
@Controller('portal/search')
export class PortalSearchController {
  constructor(private readonly portalSearch: PortalSearchService) {}

  @Get()
  @RequireOrganizationContext()
  @ApiOperation({
    summary: 'Global portal search (RBAC-filtered, capped)',
    description:
      'Search-as-you-type across modules the caller can view. Each hit includes module/entity labels, navigation hints, and product-relevant links. No dedicated permission key — results filtered by effective `{module}.view` keys.',
  })
  search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PortalSearchQueryDto,
  ) {
    return this.portalSearch.search(user.userId, query);
  }
}
