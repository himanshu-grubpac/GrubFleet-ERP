import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { StructuredLoggerService } from './common/logger/structured-logger.service';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './infrastructure/health/health.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { FleetLeasingModule } from './modules/fleet-leasing/fleet-leasing.module';
import { OrganisationModule } from './modules/organisation/organisation.module';
import { AssetRegisterModule } from './modules/asset-register/asset-register.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    PermissionsModule,
    RolesModule,
    AuditModule,
    FleetLeasingModule,
    OrganisationModule,
    AssetRegisterModule,
  ],
  providers: [StructuredLoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
