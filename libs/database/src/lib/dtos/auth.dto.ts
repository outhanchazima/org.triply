// libs/database/src/lib/dtos/auth.dto.ts
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  BusinessRole,
  BusinessType,
  KycDocumentType,
  Permission,
  SystemRole,
} from '../schemas/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for sending OTP
 */
export class SendOtpDto {
  @ApiProperty({
    description: 'Email address to send OTP to',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;
}

/**
 * DTO for verifying OTP
 */
export class VerifyOtpDto {
  @ApiProperty({
    description: 'Email address associated with the OTP',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @ApiProperty({
    description: 'One-time password sent to the email',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^[0-9]{6}$/, { message: 'OTP must be numeric' })
  otp!: string;

  @ApiPropertyOptional({
    description: 'Optional device information for context',
    example: 'iPhone 12, iOS 14.4, Safari',
  })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

/**
 * DTO for switching business context
 */
export class SwitchContextDto {
  @ApiProperty({
    description: 'ID of the business to switch to (null for traveller context)',
    example: '60f7c0b5e1d2c4567890abcd',
  })
  @ValidateIf((o) => o.businessId !== null)
  @IsMongoId({ message: 'Invalid business ID format' })
  businessId!: string | null;
}

/**
 * DTO for refreshing access token
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token issued during authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

/**
 * DTO for Google OAuth callback (internal use)
 */
export class GoogleCallbackDto {
  @ApiProperty({
    description: 'Google user ID',
    example: '1234567890',
  })
  @IsString()
  googleId!: string;

  @ApiProperty({
    description: 'Email address from Google profile',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Display name from Google profile',
    example: 'John Doe',
  })
  @IsString()
  displayName!: string;

  @ApiPropertyOptional({
    description: 'Avatar URL from Google profile',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}

/**
 * Address DTO for KYC
 */
export class AddressDto {
  @ApiProperty({
    description: 'Street address',
    example: '123 Main Street',
  })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiProperty({
    description: 'City',
    example: 'New York',
  })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({
    description: 'State',
    example: 'NY',
  })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiProperty({
    description: 'Country',
    example: 'USA',
  })
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiProperty({
    description: 'Postal code',
    example: '10001',
  })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;
}

/**
 * KYC Document DTO
 */
export class KycDocumentDto {
  @ApiProperty({
    description: 'Type of KYC document',
    example: 'PASSPORT',
  })
  @IsEnum(KycDocumentType)
  type!: KycDocumentType;

  @ApiProperty({
    description: 'URL of the uploaded document',
    example: 'https://example.com/document.jpg',
  })
  @IsString()
  @Matches(/^https?:\/\//, { message: 'URL must be valid' })
  url!: string;
}

/**
 * DTO for initiating business onboarding
 */
export class BusinessInitDto {
  @ApiProperty({
    description: 'Registered legal name of the business',
    example: 'Acme Travel Ltd',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  businessName!: string;

  @ApiProperty({
    description: 'Official business registration number',
    example: 'BRN-2026-00123',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  registrationNumber!: string;

  @ApiProperty({
    description: 'Type/category of business',
    enum: BusinessType,
    example: BusinessType.CORPORATION,
  })
  @IsEnum(BusinessType)
  businessType!: BusinessType;

  @ApiPropertyOptional({
    description: 'Industry sector',
    example: 'Travel and Hospitality',
  })
  @IsOptional()
  @IsString()
  industry?: string;
}

/**
 * DTO for submitting KYC details
 */
export class KycDetailsDto {
  @ApiPropertyOptional({
    description: 'Business tax identification number',
    example: 'TIN-123456789',
  })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Business incorporation date (ISO 8601)',
    example: '2023-01-15',
  })
  @IsOptional()
  @IsISO8601()
  incorporationDate?: string;

  @ApiProperty({
    description: 'Business address details',
    type: AddressDto,
  })
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}

/**
 * DTO for uploading KYC documents
 */
export class KycDocumentsDto {
  @ApiProperty({
    description: 'List of KYC documents to submit',
    type: [KycDocumentDto],
  })
  @ValidateNested({ each: true })
  @Type(() => KycDocumentDto)
  documents!: KycDocumentDto[];
}

/**
 * DTO for inviting a member to business
 */
export class InviteMemberDto {
  @ApiProperty({
    description: 'Invitee email address',
    example: 'staff@example.com',
  })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @ApiProperty({
    description: 'Role to assign to the invited member',
    enum: BusinessRole,
    example: BusinessRole.BUSINESS_AGENT,
  })
  @IsEnum(BusinessRole)
  role!: BusinessRole;

  @ApiProperty({
    description: 'Invitee first name',
    example: 'Jane',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  firstName!: string;

  @ApiProperty({
    description: 'Invitee last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  lastName!: string;
}

/**
 * DTO for accepting invitation
 */
export class AcceptInviteDto {
  @ApiProperty({
    description: 'Email used for invitation',
    example: 'staff@example.com',
  })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @ApiProperty({
    description: '6-digit OTP from invitation email',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9]{6}$/)
  otp!: string;

  @ApiProperty({
    description: 'Business ID associated with invitation',
    example: '60f7c0b5e1d2c4567890abcd',
  })
  @IsMongoId()
  businessId!: string;
}

/**
 * DTO for activating traveller profile
 */
export class ActivateTravellerDto {
  @ApiProperty({
    description: 'Traveller first name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  firstName!: string;

  @ApiProperty({
    description: 'Traveller last name',
    example: 'Smith',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  lastName!: string;

  @ApiPropertyOptional({
    description: 'Date of birth (ISO 8601)',
    example: '1990-05-20',
  })
  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: '2-letter nationality code (ISO country code)',
    example: 'US',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  nationality?: string;
}

/**
 * DTO for creating system user (admin only)
 */
export class CreateSystemUserDto {
  @ApiProperty({
    description: 'System user email address',
    example: 'admin@example.com',
  })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @ApiProperty({
    description: 'System user first name',
    example: 'Alice',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  firstName!: string;

  @ApiProperty({
    description: 'System user last name',
    example: 'Johnson',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  lastName!: string;

  @ApiProperty({
    description: 'System role to assign',
    enum: SystemRole,
    example: SystemRole.SYSTEM_ADMIN,
  })
  @IsEnum(SystemRole)
  role!: SystemRole;

  @ApiPropertyOptional({
    description: 'Optional department name',
    example: 'Operations',
  })
  @IsOptional()
  @IsString()
  department?: string;
}

/**
 * DTO for updating member role
 */
export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New business role for the member',
    enum: BusinessRole,
    example: BusinessRole.BUSINESS_OWNER,
  })
  @IsEnum(BusinessRole)
  role!: BusinessRole;
}

/**
 * DTO for updating member permissions
 */
export class UpdateMemberPermissionsDto {
  @ApiProperty({
    description: 'Extra permissions granted to the member',
    enum: Permission,
    isArray: true,
    example: [Permission.BOOKING_CREATE],
  })
  @IsEnum(Permission, { each: true })
  extraPermissions!: Permission[];

  @ApiProperty({
    description: 'Permissions explicitly denied to the member',
    enum: Permission,
    isArray: true,
    example: [Permission.AUDIT_READ],
  })
  @IsEnum(Permission, { each: true })
  deniedPermissions!: Permission[];
}

/**
 * DTO for querying audit logs
 */
export class AuditQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by actor user ID',
    example: '60f7c0b5e1d2c4567890abce',
  })
  @IsOptional()
  @IsMongoId()
  actorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by resource name',
    example: 'business',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({
    description: 'Filter by action',
    example: 'update',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter by business ID',
    example: '60f7c0b5e1d2c4567890abcd',
  })
  @IsOptional()
  @IsMongoId()
  businessId?: string;

  @ApiPropertyOptional({
    description: 'Start date/time (ISO 8601)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'End date/time (ISO 8601)',
    example: '2026-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: '1',
  })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: '20',
  })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}

/**
 * DTO for KYC review (admin)
 */
export class KycReviewDto {
  @ApiProperty({
    description: 'KYC review decision',
    enum: ['approve', 'reject'],
    example: 'approve',
  })
  @IsEnum(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @ApiPropertyOptional({
    description: 'Reason for rejection (required when decision is reject)',
    example: 'Submitted ID document is blurry and unreadable.',
  })
  @IsOptional()
  @IsString()
  @Length(10, 500)
  rejectionReason?: string;
}

/**
 * Safe user response DTO (no sensitive data)
 */
export class SafeUserDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '60f7c0b5e1d2c4567890abcf',
  })
  id!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Display name for UI',
    example: 'John Doe',
  })
  displayName!: string;

  @ApiPropertyOptional({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  avatarUrl!: string | null;

  @ApiProperty({
    description: 'Whether user has an active traveller profile',
    example: true,
  })
  isTraveller!: boolean;

  @ApiProperty({
    description: 'Whether user is a system user',
    example: false,
  })
  isSystemUser!: boolean;

  @ApiProperty({
    description: 'Whether email is verified',
    example: true,
  })
  isEmailVerified!: boolean;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2026-03-01T10:00:00.000Z',
  })
  createdAt!: Date;
}

/**
 * Membership info for auth response
 */
export class MembershipInfoDto {
  @ApiProperty({
    description: 'Business ID',
    example: '60f7c0b5e1d2c4567890abcd',
  })
  businessId!: string;

  @ApiProperty({
    description: 'Business name',
    example: 'Acme Travel Ltd',
  })
  businessName!: string;

  @ApiPropertyOptional({
    description: 'Business logo URL',
    example: 'https://example.com/logo.png',
    nullable: true,
  })
  businessLogoUrl!: string | null;

  @ApiProperty({
    description: 'Member role in business',
    example: 'owner',
  })
  role!: string;

  @ApiProperty({
    description: 'Membership status',
    example: 'active',
  })
  status!: string;
}

/**
 * Auth feature flags
 */
export class FeatureFlagsDto {
  @ApiProperty({ description: 'Can manage business settings', example: true })
  canManageBusiness!: boolean;

  @ApiProperty({ description: 'Can invite team members', example: true })
  canInviteStaff!: boolean;

  @ApiProperty({ description: 'Can view finance data', example: false })
  canViewFinance!: boolean;

  @ApiProperty({ description: 'Can view audit logs', example: true })
  canViewAudit!: boolean;

  @ApiProperty({ description: 'Can create bookings', example: true })
  canCreateBookings!: boolean;

  @ApiProperty({ description: 'Can submit KYC information', example: true })
  canSubmitKyc!: boolean;

  @ApiProperty({ description: 'Can review KYC submissions', example: false })
  canReviewKyc!: boolean;

  @ApiProperty({ description: 'Can manage users', example: false })
  canManageUsers!: boolean;

  @ApiProperty({ description: 'Has read-only access', example: false })
  isReadOnly!: boolean;

  @ApiProperty({ description: 'Is a system user', example: false })
  isSystemUser!: boolean;
}

/**
 * Auth context info
 */
export class AuthContextDto {
  @ApiPropertyOptional({
    description: 'Currently selected business ID',
    example: '60f7c0b5e1d2c4567890abcd',
    nullable: true,
  })
  activeBusinessId!: string | null;

  @ApiPropertyOptional({
    description: 'Currently selected business name',
    example: 'Acme Travel Ltd',
    nullable: true,
  })
  activeBusinessName!: string | null;

  @ApiPropertyOptional({
    description: 'Active role in selected context',
    example: 'owner',
    nullable: true,
  })
  activeRole!: string | null;

  @ApiProperty({
    description: 'All user memberships',
    type: [MembershipInfoDto],
  })
  memberships!: MembershipInfoDto[];

  @ApiProperty({
    description: 'Computed permissions list',
    type: [String],
    example: ['booking:create', 'business:read'],
  })
  permissions!: string[];

  @ApiProperty({
    description: 'Feature flags derived from permissions and role',
    type: FeatureFlagsDto,
  })
  featureFlags!: FeatureFlagsDto;
}

/**
 * Full auth response DTO
 */
export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Whether this is a first-time login/registration flow',
    example: false,
  })
  isNewUser!: boolean;

  @ApiProperty({
    description: 'Safe user profile',
    type: SafeUserDto,
  })
  user!: SafeUserDto;

  @ApiProperty({
    description: 'Authorization context',
    type: AuthContextDto,
  })
  context!: AuthContextDto;
}

/**
 * DTO for permissions response
 */
export class PermissionsResponseDto {
  @ApiProperty({
    description: 'Resolved permissions for current user/context',
    type: [String],
    example: ['booking:create', 'business:read'],
  })
  permissions!: string[];

  @ApiProperty({
    description: 'Feature flags for current user/context',
    type: FeatureFlagsDto,
  })
  featureFlags!: FeatureFlagsDto;
}
