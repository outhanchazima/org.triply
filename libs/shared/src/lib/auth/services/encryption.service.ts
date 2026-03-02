// libs/shared/src/lib/services/encryption.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

/**
 * Service for encrypting sensitive data at rest using AES-256-GCM
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    // Derive a 32-byte key from the provided key using scrypt
    this.key = scryptSync(encryptionKey, 'salt', 32);
  }

  /**
   * Encrypt a string value
   * @param text - Plain text to encrypt
   * @returns Encrypted string in format: iv:authTag:ciphertext (base64)
   */
  encrypt(text: string): string {
    const iv = randomBytes(16); // 128-bit IV for GCM
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Combine iv:authTag:ciphertext
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt an encrypted string value
   * @param encryptedText - Encrypted string in format: iv:authTag:ciphertext (base64)
   * @returns Decrypted plain text
   */
  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Check if a string appears to be encrypted (has the correct format)
   * @param text - Text to check
   * @returns True if the text appears to be encrypted
   */
  isEncrypted(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    const parts = text.split(':');
    return parts.length === 3 && parts.every((p) => p.length > 0);
  }
}
