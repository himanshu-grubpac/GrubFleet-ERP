import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RolesController } from './roles.controller';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

@Module({
  imports: [AuditModule],
  controllers: [RolesController],
  providers: [RolesRepository, RolesService],
})
export class RolesModule {}
