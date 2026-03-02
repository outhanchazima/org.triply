// apps/triply.api/src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { AuthDatabaseModule } from '@org.triply/database';
import { SharedModule } from '@org.triply/shared';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [SharedModule, AuthDatabaseModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
