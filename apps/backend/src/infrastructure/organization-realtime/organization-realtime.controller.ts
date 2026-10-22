import {
  Controller,
  Get,
  Header,
  HttpException,
  HttpStatus,
  Req,
  ServiceUnavailableException,
  Sse,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import type { Env } from '../../config/env.schema';
import { RequireOrganizationContext } from '../../modules/auth/authorization/decorators/require-organization-context.decorator';
import { RequireAnyPermissions } from '../../modules/auth/authorization/decorators/require-any-permissions.decorator';
import { AssetRegisterPermissionKeys } from '../../modules/asset-register/constants/asset-register-permission-keys';
import { FleetLeasingPermissionKeys } from '../../modules/fleet-leasing/constants/fleet-leasing-permission-keys';
import type { OrganizationDomainEventPayload } from './organization-domain-event.types';
import { OrganizationRealtimeHubService } from './organization-realtime-hub.service';

type SseMessage =
  { data: OrganizationDomainEventPayload } | { data: { ping: true } };

@Controller('events')
export class OrganizationRealtimeController {
  constructor(
    private readonly hub: OrganizationRealtimeHubService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Org-scoped SSE stream. EventSource cannot send Authorization headers — pass
   * `access_token` query param (same JWT as REST). Organization via `organizationId` query.
   *
   * Multi-instance: publishers use Redis pub/sub; subscriber degradation is logged at boot.
   * Staging/production: prefer long-lived API (ALB/ECS) — API Gateway + Lambda is not suitable for SSE.
   */
  @Get('stream')
  @Sse()
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('Connection', 'keep-alive')
  @Header('X-Accel-Buffering', 'no')
  @RequireOrganizationContext()
  @RequireAnyPermissions(
    AssetRegisterPermissionKeys.VIEW,
    FleetLeasingPermissionKeys.VIEW,
  )
  stream(@Req() req: Request): Observable<{ data: string }> {
    if (!this.config.get('ORG_REALTIME_ENABLED', { infer: true })) {
      throw new ServiceUnavailableException({
        code: 'ORG_REALTIME_DISABLED',
        message:
          'Organization realtime stream is disabled on this deployment tier',
      });
    }

    const organizationId = req.organizationId as string;
    const release = this.hub.tryRegisterStreamConnection(organizationId);
    if (!release) {
      throw new HttpException(
        {
          code: 'ORG_REALTIME_CONNECTION_LIMIT',
          message:
            'Too many concurrent realtime connections for this organization',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return this.hub.streamForOrganization(organizationId).pipe(
      map((message: SseMessage) => ({
        data: JSON.stringify(message.data),
      })),
      finalize(() => release()),
    );
  }
}
