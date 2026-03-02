// apps/triply.api/src/modules/onboarding/onboarding.controller.ts
import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  BusinessInitDto,
  KycDetailsDto,
  KycDocumentsDto,
  Permission,
} from '@org.triply/database';
import {
  CurrentUser,
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
} from '@org.triply/shared';
import type { Request } from 'express';
import type { JwtPayload } from '@org.triply/shared';
import { OnboardingService } from './onboarding.service';

@ApiTags('Onboarding')
@Controller('onboarding/business')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @UseGuards(JwtAuthGuard)
  @Post('init')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize business onboarding' })
  @ApiResponse({ status: 201, description: 'Business initialized' })
  async initBusiness(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BusinessInitDto,
    @Req() request: Request,
  ): Promise<{ businessId: string; nextStep: string }> {
    return this.onboardingService.initBusiness(user, dto, request);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':businessId/kyc/details')
  @ApiBearerAuth()
  @RequirePermissions(Permission.KYC_SUBMIT)
  @ApiOperation({ summary: 'Submit business KYC details' })
  async submitKycDetails(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Body() dto: KycDetailsDto,
    @Req() request: Request,
  ): Promise<{ nextStep: string }> {
    return this.onboardingService.submitKycDetails(
      user,
      businessId,
      dto,
      request,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':businessId/kyc/documents')
  @ApiBearerAuth()
  @RequirePermissions(Permission.KYC_SUBMIT)
  @ApiOperation({ summary: 'Upload business KYC documents' })
  async uploadKycDocuments(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Body() dto: KycDocumentsDto,
    @Req() request: Request,
  ): Promise<{ uploadedCount: number; nextStep: string }> {
    return this.onboardingService.uploadKycDocuments(
      user,
      businessId,
      dto,
      request,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':businessId/kyc/submit')
  @ApiBearerAuth()
  @RequirePermissions(Permission.KYC_SUBMIT)
  @ApiOperation({ summary: 'Submit KYC for review' })
  async submitKyc(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Req() request: Request,
  ): Promise<{ status: string; message: string }> {
    return this.onboardingService.submitKyc(user, businessId, request);
  }
}
