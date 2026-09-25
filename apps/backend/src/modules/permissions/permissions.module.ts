import { Module } from '@nestjs/common';
import { ModulesController } from './modules.controller';
import { PermissionsController } from './permissions.controller';
import { PermissionsRepository } from './permissions.repository';
import { PermissionsService } from './permissions.service';

@Module({
  controllers: [PermissionsController, ModulesController],
  providers: [PermissionsRepository, PermissionsService],
})
export class PermissionsModule {}
