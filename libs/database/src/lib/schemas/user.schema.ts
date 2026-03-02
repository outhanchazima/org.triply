// libs/database/src/lib/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import { OtpPurpose } from './enums';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      delete ret.otpCode;
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
})
export class User extends Document {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email!: string;

  @Prop({
    sparse: true,
    unique: true,
    index: true,
  })
  googleId!: string;

  @Prop({
    type: [String],
    enum: ['otp', 'google'],
    default: [],
  })
  authProviders!: ('otp' | 'google')[];

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ type: String, default: null })
  avatarUrl!: string | null;

  @Prop({ type: String, default: null })
  phone!: string | null;

  @Prop({ type: Boolean, default: false })
  isTraveller!: boolean;

  @Prop({ type: Boolean, default: false })
  isSystemUser!: boolean;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Boolean, default: false })
  isEmailVerified!: boolean;

  // OTP fields (select: false to exclude by default)
  @Prop({ type: String, select: false })
  otpCode!: string | null;

  @Prop({ type: Date, select: false })
  otpExpires!: Date | null;

  @Prop({
    type: String,
    enum: Object.values(OtpPurpose),
    select: false,
  })
  otpPurpose!: OtpPurpose | null;

  // Account security
  @Prop({ type: Number, default: 0 })
  loginAttempts!: number;

  @Prop({ type: Date, default: null })
  lockUntil!: Date | null;

  @Prop({ type: Date, default: null })
  lastLoginAt!: Date | null;

  @Prop({ type: String, default: null })
  lastLoginIp!: string | null;

  // Timestamps (added by mongoose automatically)
  createdAt!: Date;
  updatedAt!: Date;

  /**
   * Check if account is currently locked
   */
  isLocked(): boolean {
    return !!(this.lockUntil && this.lockUntil > new Date());
  }

  /**
   * Increment login attempts
   */
  async incrementLoginAttempts(): Promise<void> {
    // Reset attempts if lock has expired
    if (this.lockUntil && this.lockUntil < new Date()) {
      this.loginAttempts = 1;
      this.lockUntil = null;
    } else {
      this.loginAttempts += 1;
    }

    // Lock after 5 failed attempts
    if (this.loginAttempts >= 5 && !this.isLocked()) {
      this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }

    await this.save();
  }

  /**
   * Reset login attempts on successful login
   */
  async resetLoginAttempts(): Promise<void> {
    this.loginAttempts = 0;
    this.lockUntil = null;
    await this.save();
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ isActive: 1, isTraveller: 1 });
UserSchema.index({ isActive: 1, isSystemUser: 1 });
UserSchema.index({ createdAt: -1 });

// Instance methods
UserSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

UserSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  if (this.lockUntil && this.lockUntil < new Date()) {
    this.loginAttempts = 1;
    this.lockUntil = null;
  } else {
    this.loginAttempts += 1;
  }

  if (this.loginAttempts >= 5 && !this.isLocked()) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
  }

  await this.save();
};

UserSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  this.loginAttempts = 0;
  this.lockUntil = null;
  await this.save();
};
