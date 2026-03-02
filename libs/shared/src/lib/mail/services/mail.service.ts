// libs/shared/src/lib/services/mail.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

export interface OtpEmailData {
  displayName: string;
  otp: string;
  expiresInMinutes: number;
  ipAddress?: string;
}

export interface InviteEmailData {
  firstName: string;
  inviterName: string;
  businessName: string;
  otp: string;
  loginUrl: string;
}

export interface KycEmailData {
  firstName: string;
  businessName: string;
  submittedAt?: Date;
  rejectionReason?: string;
  resubmitUrl?: string;
  loginUrl?: string;
}

export interface SecurityAlertData {
  displayName: string;
  alertType: string;
  ipAddress: string;
  timestamp: Date;
  actionUrl: string;
}

@Injectable()
export class MailService {
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.fromEmail = this.configService.get<string>(
      'MAIL_FROM',
      'noreply@triply.com',
    );
    this.fromName = this.configService.get<string>('MAIL_FROM_NAME', 'Triply');
  }

  /**
   * Send OTP login email
   */
  async sendOtpLoginEmail(to: string, data: OtpEmailData): Promise<void> {
    await this.mailerService.sendMail({
      to,
      from: `"${this.fromName}" <${this.fromEmail}>`,
      subject: 'Your Triply Login Code',
      template: 'otp-login',
      context: {
        displayName: data.displayName,
        otp: data.otp,
        expiresInMinutes: data.expiresInMinutes,
        ipAddress: data.ipAddress || 'Unknown',
      },
    });
  }

  /**
   * Send invitation email with OTP
   */
  async sendInviteEmail(to: string, data: InviteEmailData): Promise<void> {
    await this.mailerService.sendMail({
      to,
      from: `"${this.fromName}" <${this.fromEmail}>`,
      subject: `You've been invited to join ${data.businessName}`,
      template: 'otp-invite',
      context: {
        firstName: data.firstName,
        inviterName: data.inviterName,
        businessName: data.businessName,
        otp: data.otp,
        loginUrl: data.loginUrl,
      },
    });
  }

  /**
   * Send KYC submitted notification
   */
  async sendKycSubmittedEmail(to: string, data: KycEmailData): Promise<void> {
    await this.mailerService.sendMail({
      to,
      from: `"${this.fromName}" <${this.fromEmail}>`,
      subject: 'KYC Submitted - Under Review',
      template: 'kyc-submitted',
      context: {
        firstName: data.firstName,
        businessName: data.businessName,
        submittedAt: data.submittedAt,
      },
    });
  }

  /**
   * Send KYC approved notification
   */
  async sendKycApprovedEmail(to: string, data: KycEmailData): Promise<void> {
    await this.mailerService.sendMail({
      to,
      from: `"${this.fromName}" <${this.fromEmail}>`,
      subject: 'KYC Approved - Welcome to Triply!',
      template: 'kyc-approved',
      context: {
        firstName: data.firstName,
        businessName: data.businessName,
        loginUrl: data.loginUrl,
      },
    });
  }

  /**
   * Send KYC rejected notification
   */
  async sendKycRejectedEmail(to: string, data: KycEmailData): Promise<void> {
    await this.mailerService.sendMail({
      to,
      from: `"${this.fromName}" <${this.fromEmail}>`,
      subject: 'KYC Review - Action Required',
      template: 'kyc-rejected',
      context: {
        firstName: data.firstName,
        businessName: data.businessName,
        rejectionReason: data.rejectionReason,
        resubmitUrl: data.resubmitUrl,
      },
    });
  }

  /**
   * Send security alert email
   */
  async sendSecurityAlert(to: string, data: SecurityAlertData): Promise<void> {
    await this.mailerService.sendMail({
      to,
      from: `"${this.fromName}" <${this.fromEmail}>`,
      subject: `Security Alert: ${data.alertType}`,
      template: 'security-alert',
      context: {
        displayName: data.displayName,
        alertType: data.alertType,
        ipAddress: data.ipAddress,
        timestamp: data.timestamp,
        actionUrl: data.actionUrl,
      },
    });
  }
}
