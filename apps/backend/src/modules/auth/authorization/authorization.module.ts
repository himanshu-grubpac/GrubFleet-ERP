import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthorizationRepository } from './authorization.repository';
import { AuthorizationService } from './authorization.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionCacheService } from './permission-cache.service';

@Global()
@Module({
  providers: [
    AuthorizationRepository,
    AuthorizationService,
    PermissionCacheService,
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [AuthorizationService, AuthorizationRepository],
})
export class AuthorizationModule {}
