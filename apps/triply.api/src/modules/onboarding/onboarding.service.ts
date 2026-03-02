// apps/triply.api/src/modules/onboarding/onboarding.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Request } from 'express';
import {
  AuditAction,
  BusinessInitDto,
  BusinessMembershipRepository,
  BusinessRepository,
  BusinessRole,
  BusinessStatus,
  KycDetailsDto,
  KycDocumentType,
  KycDocumentsDto,
  MembershipStatus,
  UserRepository,
} from '@org.triply/database';
import type { JwtPayload } from '@org.triply/shared';
import { AuditService, MailService } from '@org.triply/shared';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly businessRepository: BusinessRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly userRepository: UserRepository,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Step 1 - Initialize business onboarding.
   */
  async initBusiness(
    actor: JwtPayload,
    dto: BusinessInitDto,
    request?: Request,
  ): Promise<{ businessId: string; nextStep: string }> {
    if (actor.isSystemUser) {
      throw new ForbiddenException('System users cannot create businesses');
    }

    const exists = await this.businessRepository.existsByRegistrationNumber(
      dto.registrationNumber,
    );
    if (exists) {
      throw new ConflictException(
        'Business registration number already exists',
      );
    }

    const business = await this.businessRepository.create({
      name: dto.businessName,
      registrationNumber: dto.registrationNumber.toUpperCase().trim(),
      status: BusinessStatus.PENDING_KYC,
      ownerId: actor.sub,
      industry: dto.industry || null,
      kyc: {
        businessType: dto.businessType,
        taxId: null,
        incorporationDate: null,
        address: null,
        documents: [],
        submittedAt: null,
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
      },
    } as any);

    await this.membershipRepository.create({
      userId: actor.sub,
      businessId: business.id,
      role: BusinessRole.BUSINESS_OWNER,
      status: MembershipStatus.ACTIVE,
      invitedBy: null,
      invitedAt: null,
      joinedAt: new Date(),
    } as any);

    this.eventEmitter.emit('onboarding.business.initiated', {
      actorId: actor.sub,
      businessId: business.id,
    });

    await this.auditService.log(
      {
        action: AuditAction.BUSINESS_CREATED,
        resource: 'Business',
        resourceId: business.id,
        after: {
          name: business.name,
          registrationNumber: business.registrationNumber,
          status: business.status,
        },
      },
      actor,
      request,
    );

    return {
      businessId: business.id,
      nextStep: 'kyc_details',
    };
  }

  /**
   * Step 2 - Submit KYC details.
   */
  async submitKycDetails(
    actor: JwtPayload,
    businessId: string,
    dto: KycDetailsDto,
    request?: Request,
  ): Promise<{ nextStep: string }> {
    await this.assertBusinessOwner(actor, businessId);

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    await this.businessRepository.updateKycDetails(businessId, {
      taxId: dto.taxId || null,
      incorporationDate: dto.incorporationDate
        ? new Date(dto.incorporationDate)
        : null,
      address: dto.address,
    });

    await this.auditService.log(
      {
        action: AuditAction.KYC_DETAILS_SUBMITTED,
        resource: 'Business',
        resourceId: businessId,
      },
      actor,
      request,
    );

    return { nextStep: 'documents' };
  }

  /**
   * Step 3 - Upload KYC documents.
   */
  async uploadKycDocuments(
    actor: JwtPayload,
    businessId: string,
    dto: KycDocumentsDto,
    request?: Request,
  ): Promise<{ uploadedCount: number; nextStep: string }> {
    await this.assertBusinessOwner(actor, businessId);

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    await Promise.all(
      dto.documents.map((document) =>
        this.businessRepository.addKycDocument(businessId, {
          type: document.type,
          url: document.url,
          uploadedAt: new Date(),
          verified: false,
        }),
      ),
    );

    await this.auditService.log(
      {
        action: AuditAction.KYC_DOCUMENTS_UPLOADED,
        resource: 'Business',
        resourceId: businessId,
        metadata: { uploadedCount: dto.documents.length },
      },
      actor,
      request,
    );

    return {
      uploadedCount: dto.documents.length,
      nextStep: 'submit',
    };
  }

  /**
   * Step 4 - Submit KYC for review.
   */
  async submitKyc(
    actor: JwtPayload,
    businessId: string,
    request?: Request,
  ): Promise<{ status: string; message: string }> {
    await this.assertBusinessOwner(actor, businessId);

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const requiredTypes = [
      KycDocumentType.REGISTRATION_CERT,
      KycDocumentType.TAX_CERT,
      KycDocumentType.DIRECTOR_ID,
      KycDocumentType.BANK_STATEMENT,
    ];

    const submittedTypes = new Set(
      (business.kyc?.documents || []).map((document) => document.type),
    );

    const missing = requiredTypes.filter((type) => !submittedTypes.has(type));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required KYC documents: ${missing.join(', ')}`,
      );
    }

    await this.businessRepository.submitKyc(businessId);

    this.eventEmitter.emit('onboarding.kyc.submitted', {
      actorId: actor.sub,
      businessId,
    });

    const owner = await this.userRepository.findById(actor.sub);
    if (owner) {
      await this.mailService.sendKycSubmittedEmail(owner.email, {
        firstName: owner.displayName.split(' ')[0] || owner.displayName,
        businessName: business.name,
        submittedAt: new Date(),
      });
    }

    await this.auditService.log(
      {
        action: AuditAction.KYC_SUBMITTED,
        resource: 'Business',
        resourceId: businessId,
      },
      actor,
      request,
    );

    return {
      status: BusinessStatus.KYC_SUBMITTED,
      message: 'Under review',
    };
  }

  private async assertBusinessOwner(
    actor: JwtPayload,
    businessId: string,
  ): Promise<void> {
    if (actor.isSystemUser) {
      throw new ForbiddenException(
        'System users cannot access business endpoints',
      );
    }

    const membership = await this.membershipRepository.findByUserAndBusiness(
      actor.sub,
      businessId,
    );

    if (
      !membership ||
      membership.status !== MembershipStatus.ACTIVE ||
      membership.role !== BusinessRole.BUSINESS_OWNER
    ) {
      throw new ForbiddenException(
        'Business owner role required for this action',
      );
    }
  }
}
