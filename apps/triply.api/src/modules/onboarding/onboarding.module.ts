// apps/triply.api/src/modules/onboarding/onboarding.module.ts
import { Module } from '@nestjs/common';
import { AuthDatabaseModule } from '@org.triply/database';
import { SharedModule } from '@org.triply/shared';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [SharedModule, AuthDatabaseModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
