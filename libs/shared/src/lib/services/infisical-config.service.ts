import { InfisicalSDK, LogLevel } from '@infisical/sdk';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class InfisicalConfigService implements OnModuleInit {
  private readonly logger = new Logger(InfisicalConfigService.name);
  private infisical: InfisicalSDK;
  private secrets: Record<string, string> = {};

  async onModuleInit() {
    try {
      await this.initializeInfisical();
      await this.loadSecrets();
    } catch (error) {
      this.logger.error('Failed to initialize Infisical', error);
      // Continue without Infisical if it fails to initialize
      // This allows the application to run in environments where Infisical is not available
    }
  }

  private async initializeInfisical() {
    this.infisical = new InfisicalSDK({
      clientId: process.env.INFISICAL_CLIENT_ID,
      clientSecret: process.env.INFISICAL_CLIENT_SECRET,
      siteUrl: process.env.INFISICAL_SITE_URL || 'https://app.infisical.com',
      logLevel: LogLevel.Error,
    });

    this.logger.log('Infisical SDK initialized successfully');
  }

  private async loadSecrets() {
    if (!this.infisical) {
      this.logger.warn('Infisical not initialized, skipping secret loading');
      return;
    }

    try {
      const projectId = process.env.INFISICAL_PROJECT_ID;
      const environment = process.env.NODE_ENV || 'development';
      const secretsPath = process.env.INFISICAL_SECRETS_PATH || '/';

      if (!projectId) {
        this.logger.warn(
          'INFISICAL_PROJECT_ID not provided, skipping secret loading'
        );
        return;
      }

      const allSecrets = await this.infisical.listSecrets({
        projectId,
        environment,
        secretsPath,
      });

      // Convert secrets array to key-value object
      this.secrets = allSecrets.reduce((acc, secret) => {
        acc[secret.secretKey] = secret.secretValue;
        return acc;
      }, {} as Record<string, string>);

      this.logger.log(
        `Loaded ${Object.keys(this.secrets).length} secrets from Infisical`
      );
    } catch (error) {
      this.logger.error('Failed to load secrets from Infisical', error);
      throw error;
    }
  }

  /**
   * Get a secret value by key
   * Falls back to process.env if secret is not found in Infisical
   */
  get(key: string, defaultValue?: string): string | undefined {
    // First check Infisical secrets
    if (this.secrets[key] !== undefined) {
      return this.secrets[key];
    }

    // Fall back to environment variables
    const envValue = process.env[key];
    if (envValue !== undefined) {
      return envValue;
    }

    // Return default value if provided
    return defaultValue;
  }

  /**
   * Get a required secret value by key
   * Throws an error if the secret is not found
   */
  getRequired(key: string): string {
    const value = this.get(key);
    if (value === undefined) {
      throw new Error(
        `Required secret '${key}' not found in Infisical or environment variables`
      );
    }
    return value;
  }

  /**
   * Get multiple secrets at once
   */
  getMultiple(keys: string[]): Record<string, string | undefined> {
    return keys.reduce((acc, key) => {
      acc[key] = this.get(key);
      return acc;
    }, {} as Record<string, string | undefined>);
  }

  /**
   * Check if a secret exists
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Get all available secrets (for debugging purposes)
   * Only works in development environment
   */
  getAllSecrets(): Record<string, string> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Getting all secrets is not allowed in production');
    }
    return { ...this.secrets };
  }

  /**
   * Refresh secrets from Infisical
   */
  async refreshSecrets(): Promise<void> {
    await this.loadSecrets();
    this.logger.log('Secrets refreshed from Infisical');
  }
}
