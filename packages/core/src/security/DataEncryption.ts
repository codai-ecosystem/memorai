/**
 * Enterprise Data Encryption - Advanced encryption and data protection
 * Part of Phase 3.2: Data Encryption for Memorai Ultimate Completion Plan
 */

import {
  createCipher,
  createDecipher,
  createHash,
  pbkdf2,
  randomBytes,
  scrypt,
} from 'crypto';
import { promisify } from 'util';
// Result type for consistent error handling
type Result<T, E> =
  | { success: true; error: undefined; data: T }
  | { success: false; error: E; data: undefined };

const scryptAsync = promisify(scrypt);
const pbkdf2Async = promisify(pbkdf2);

// Advanced Encryption Types
type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
type HashAlgorithm = 'sha256' | 'sha512' | 'blake2b512';
type KeyDerivationFunction = 'scrypt' | 'pbkdf2' | 'argon2id';

interface EncryptionConfig {
  algorithm: EncryptionAlgorithm;
  keySize: number;
  ivSize: number;
  tagSize: number;
  saltSize: number;
  iterations: number;
  memory?: number; // For Argon2
  parallelism?: number; // For Argon2
}

interface EncryptedData {
  algorithm: EncryptionAlgorithm;
  ciphertext: string;
  iv: string;
  tag?: string;
  salt: string;
  iterations: number;
  metadata?: Record<string, any>;
}

interface KeyRotationPolicy {
  maxAge: number; // milliseconds
  maxOperations: number;
  autoRotate: boolean;
  rotationSchedule?: string; // cron expression
}

interface EncryptionKey {
  id: string;
  key: Buffer;
  algorithm: EncryptionAlgorithm;
  created: Date;
  lastUsed: Date;
  operations: number;
  metadata: Record<string, any>;
}

// Field-Level Encryption Manager
class FieldLevelEncryption {
  private readonly config: Map<string, EncryptionConfig> = new Map();
  private readonly keys: Map<string, EncryptionKey> = new Map();
  private readonly rotationPolicies: Map<string, KeyRotationPolicy> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs(): void {
    // High-security config for sensitive data
    this.config.set('sensitive', {
      algorithm: 'aes-256-gcm',
      keySize: 32,
      ivSize: 16,
      tagSize: 16,
      saltSize: 32,
      iterations: 100000,
    });

    // Standard config for regular data
    this.config.set('standard', {
      algorithm: 'aes-256-cbc',
      keySize: 32,
      ivSize: 16,
      tagSize: 0,
      saltSize: 16,
      iterations: 50000,
    });

    // High-performance config for bulk data
    this.config.set('bulk', {
      algorithm: 'chacha20-poly1305',
      keySize: 32,
      ivSize: 12,
      tagSize: 16,
      saltSize: 16,
      iterations: 10000,
    });
  }

  async encryptField(
    data: string,
    fieldType: string = 'standard',
    keyId?: string
  ): Promise<Result<EncryptedData, string>> {
    try {
      const config = this.config.get(fieldType);
      if (!config) {
        return {
          success: false,
          error: `Unknown field type: ${fieldType}`,
          data: undefined,
        };
      }

      const effectiveKeyId = keyId || (await this.getOrCreateKey(fieldType));
      const key = this.keys.get(effectiveKeyId);
      if (!key) {
        return {
          success: false,
          error: `Key not found: ${effectiveKeyId}`,
          data: undefined,
        };
      }

      const salt = randomBytes(config.saltSize);
      const iv = randomBytes(config.ivSize);

      // Derive encryption key
      const derivedKey = (await scryptAsync(
        key.key,
        salt,
        config.keySize
      )) as Buffer;

      // Encrypt data
      const cipher = createCipher(config.algorithm, derivedKey);
      cipher.setAutoPadding(true);

      let ciphertext = cipher.update(data, 'utf8', 'base64');
      ciphertext += cipher.final('base64');

      // Get authentication tag for authenticated encryption
      let tag: string | undefined;
      if (
        config.algorithm === 'aes-256-gcm' ||
        config.algorithm === 'chacha20-poly1305'
      ) {
        tag = (cipher as any).getAuthTag().toString('base64');
      }

      // Update key usage
      key.lastUsed = new Date();
      key.operations++;

      const encryptedData: EncryptedData = {
        algorithm: config.algorithm,
        ciphertext,
        iv: iv.toString('base64'),
        tag,
        salt: salt.toString('base64'),
        iterations: config.iterations,
        metadata: {
          keyId: effectiveKeyId,
          fieldType,
          encrypted: new Date().toISOString(),
        },
      };

      return { success: true, error: undefined, data: encryptedData };
    } catch (error) {
      return {
        success: false,
        error: `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined,
      };
    }
  }

  async decryptField(
    encryptedData: EncryptedData
  ): Promise<Result<string, string>> {
    try {
      const keyId = encryptedData.metadata?.keyId;
      if (!keyId) {
        return {
          success: false,
          error: 'Key ID not found in metadata',
          data: undefined,
        };
      }

      const key = this.keys.get(keyId);
      if (!key) {
        return {
          success: false,
          error: `Key not found: ${keyId}`,
          data: undefined,
        };
      }

      const salt = Buffer.from(encryptedData.salt, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');

      // Derive decryption key
      const config = this.getConfigForAlgorithm(encryptedData.algorithm);
      const derivedKey = (await scryptAsync(
        key.key,
        salt,
        config.keySize
      )) as Buffer;

      // Decrypt data
      const decipher = createDecipher(encryptedData.algorithm, derivedKey);

      // Set authentication tag for authenticated encryption
      if (encryptedData.tag) {
        const tag = Buffer.from(encryptedData.tag, 'base64');
        (decipher as any).setAuthTag(tag);
      }

      let plaintext = decipher.update(
        encryptedData.ciphertext,
        'base64',
        'utf8'
      );
      plaintext += decipher.final('utf8');

      // Update key usage
      key.lastUsed = new Date();
      key.operations++;

      return { success: true, error: undefined, data: plaintext };
    } catch (error) {
      return {
        success: false,
        error: `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined,
      };
    }
  }

  private getConfigForAlgorithm(
    algorithm: EncryptionAlgorithm
  ): EncryptionConfig {
    for (const config of this.config.values()) {
      if (config.algorithm === algorithm) {
        return config;
      }
    }
    // Return default config if not found
    return this.config.get('standard')!;
  }

  private async getOrCreateKey(fieldType: string): Promise<string> {
    // Check for existing valid key
    for (const [keyId, key] of this.keys.entries()) {
      if (key.metadata.fieldType === fieldType && this.isKeyValid(keyId)) {
        return keyId;
      }
    }

    // Create new key
    const keyId = `key-${fieldType}-${Date.now()}-${randomBytes(8).toString('hex')}`;
    const config = this.config.get(fieldType)!;

    const encryptionKey: EncryptionKey = {
      id: keyId,
      key: randomBytes(config.keySize),
      algorithm: config.algorithm,
      created: new Date(),
      lastUsed: new Date(),
      operations: 0,
      metadata: { fieldType },
    };

    this.keys.set(keyId, encryptionKey);
    return keyId;
  }

  private isKeyValid(keyId: string): boolean {
    const key = this.keys.get(keyId);
    if (!key) return false;

    const policy = this.rotationPolicies.get(key.metadata.fieldType);
    if (!policy) return true;

    const age = Date.now() - key.created.getTime();
    if (age > policy.maxAge) return false;
    if (key.operations > policy.maxOperations) return false;

    return true;
  }
}

// Database Encryption Manager
class DatabaseEncryption {
  private readonly tableConfigs: Map<string, EncryptionConfig> = new Map();
  private readonly columnEncryption: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeTableConfigs();
  }

  private initializeTableConfigs(): void {
    // Memory table - high security
    this.tableConfigs.set('memories', {
      algorithm: 'aes-256-gcm',
      keySize: 32,
      ivSize: 16,
      tagSize: 16,
      saltSize: 32,
      iterations: 100000,
    });

    // User data - sensitive
    this.tableConfigs.set('users', {
      algorithm: 'aes-256-gcm',
      keySize: 32,
      ivSize: 16,
      tagSize: 16,
      saltSize: 32,
      iterations: 100000,
    });

    // Session data - standard
    this.tableConfigs.set('sessions', {
      algorithm: 'aes-256-cbc',
      keySize: 32,
      ivSize: 16,
      tagSize: 0,
      saltSize: 16,
      iterations: 50000,
    });

    // Define encrypted columns
    this.columnEncryption.set(
      'memories',
      new Set(['content', 'metadata', 'context'])
    );
    this.columnEncryption.set(
      'users',
      new Set(['email', 'profile', 'preferences'])
    );
    this.columnEncryption.set('sessions', new Set(['data', 'payload']));
  }

  async encryptRow(
    table: string,
    row: Record<string, any>
  ): Promise<Result<Record<string, any>, string>> {
    try {
      const encryptedColumns = this.columnEncryption.get(table);
      if (!encryptedColumns || encryptedColumns.size === 0) {
        return { success: true, error: undefined, data: row };
      }

      const config = this.tableConfigs.get(table);
      if (!config) {
        return {
          success: false,
          error: `No encryption config for table: ${table}`,
          data: undefined,
        };
      }

      const encryptedRow = { ...row };

      for (const column of encryptedColumns) {
        if (row[column] !== undefined && row[column] !== null) {
          const fieldEncryption = new FieldLevelEncryption();
          const encryptResult = await fieldEncryption.encryptField(
            JSON.stringify(row[column]),
            table
          );

          if (!encryptResult.success) {
            return {
              success: false,
              error: `Failed to encrypt column ${column}: ${encryptResult.error}`,
              data: undefined,
            };
          }

          encryptedRow[column] = JSON.stringify(encryptResult.data);
        }
      }

      return { success: true, error: undefined, data: encryptedRow };
    } catch (error) {
      return {
        success: false,
        error: `Row encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined,
      };
    }
  }

  async decryptRow(
    table: string,
    encryptedRow: Record<string, any>
  ): Promise<Result<Record<string, any>, string>> {
    try {
      const encryptedColumns = this.columnEncryption.get(table);
      if (!encryptedColumns || encryptedColumns.size === 0) {
        return { success: true, error: undefined, data: encryptedRow };
      }

      const decryptedRow = { ...encryptedRow };

      for (const column of encryptedColumns) {
        if (
          encryptedRow[column] !== undefined &&
          encryptedRow[column] !== null
        ) {
          try {
            const encryptedData = JSON.parse(encryptedRow[column]);
            const fieldEncryption = new FieldLevelEncryption();
            const decryptResult =
              await fieldEncryption.decryptField(encryptedData);

            if (!decryptResult.success) {
              return {
                success: false,
                error: `Failed to decrypt column ${column}: ${decryptResult.error}`,
                data: undefined,
              };
            }

            decryptedRow[column] = JSON.parse(decryptResult.data!);
          } catch (parseError) {
            // If JSON parsing fails, assume it's not encrypted
            // This allows for gradual migration to encryption
            continue;
          }
        }
      }

      return { success: true, error: undefined, data: decryptedRow };
    } catch (error) {
      return {
        success: false,
        error: `Row decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined,
      };
    }
  }
}

// Key Management System
class EnterpriseKeyManagement {
  private readonly keys: Map<string, EncryptionKey> = new Map();
  private readonly rotationPolicies: Map<string, KeyRotationPolicy> = new Map();
  private rotationInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeDefaultPolicies();
    this.startKeyRotationService();
  }

  private initializeDefaultPolicies(): void {
    // Sensitive data - rotate every 30 days
    this.rotationPolicies.set('sensitive', {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxOperations: 1000000,
      autoRotate: true,
      rotationSchedule: '0 0 * * 0', // Weekly check
    });

    // Standard data - rotate every 90 days
    this.rotationPolicies.set('standard', {
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
      maxOperations: 10000000,
      autoRotate: true,
      rotationSchedule: '0 0 1 * *', // Monthly check
    });

    // Bulk data - rotate every 180 days
    this.rotationPolicies.set('bulk', {
      maxAge: 180 * 24 * 60 * 60 * 1000, // 180 days
      maxOperations: 100000000,
      autoRotate: true,
      rotationSchedule: '0 0 1 */3 *', // Quarterly check
    });
  }

  async generateKey(
    algorithm: EncryptionAlgorithm,
    keyType: string,
    metadata: Record<string, any> = {}
  ): Promise<Result<string, string>> {
    try {
      const keyId = `${keyType}-${Date.now()}-${randomBytes(16).toString('hex')}`;
      const keySize = this.getKeySizeForAlgorithm(algorithm);

      const encryptionKey: EncryptionKey = {
        id: keyId,
        key: randomBytes(keySize),
        algorithm,
        created: new Date(),
        lastUsed: new Date(),
        operations: 0,
        metadata: { ...metadata, keyType },
      };

      this.keys.set(keyId, encryptionKey);

      return { success: true, error: undefined, data: keyId };
    } catch (error) {
      return {
        success: false,
        error: `Key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined,
      };
    }
  }

  async rotateKey(keyId: string): Promise<Result<string, string>> {
    try {
      const oldKey = this.keys.get(keyId);
      if (!oldKey) {
        return {
          success: false,
          error: `Key not found: ${keyId}`,
          data: undefined,
        };
      }

      // Generate new key
      const newKeyResult = await this.generateKey(
        oldKey.algorithm,
        oldKey.metadata.keyType,
        oldKey.metadata
      );

      if (!newKeyResult.success) {
        return newKeyResult;
      }

      // Mark old key as rotated
      oldKey.metadata.rotated = new Date().toISOString();
      oldKey.metadata.replacedBy = newKeyResult.data;

      return { success: true, error: undefined, data: newKeyResult.data! };
    } catch (error) {
      return {
        success: false,
        error: `Key rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined,
      };
    }
  }

  private getKeySizeForAlgorithm(algorithm: EncryptionAlgorithm): number {
    switch (algorithm) {
      case 'aes-256-gcm':
      case 'aes-256-cbc':
      case 'chacha20-poly1305':
        return 32;
      default:
        return 32;
    }
  }

  private startKeyRotationService(): void {
    // Check for key rotation every hour
    this.rotationInterval = setInterval(
      async () => {
        await this.checkAndRotateKeys();
      },
      60 * 60 * 1000
    );
  }

  private async checkAndRotateKeys(): Promise<void> {
    for (const [keyId, key] of this.keys.entries()) {
      const policy = this.rotationPolicies.get(key.metadata.keyType);
      if (!policy || !policy.autoRotate) continue;

      const age = Date.now() - key.created.getTime();
      const shouldRotate =
        age > policy.maxAge || key.operations > policy.maxOperations;

      if (shouldRotate && !key.metadata.rotated) {
        await this.rotateKey(keyId);
      }
    }
  }

  destroy(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
  }
}

// Secure Hash Functions
class SecureHashManager {
  static async hashPassword(
    password: string,
    saltRounds: number = 12
  ): Promise<string> {
    const salt = randomBytes(32);
    const hash = await pbkdf2Async(password, salt, 100000, 64, 'sha512');
    return `${salt.toString('hex')}:${hash.toString('hex')}`;
  }

  static async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    const [saltHex, hashHex] = hashedPassword.split(':');
    const salt = Buffer.from(saltHex, 'hex');
    const hash = Buffer.from(hashHex, 'hex');

    const verifyHash = await pbkdf2Async(password, salt, 100000, 64, 'sha512');
    return hash.equals(verifyHash);
  }

  static createSecureHash(
    data: string,
    algorithm: HashAlgorithm = 'sha256'
  ): string {
    return createHash(algorithm).update(data).digest('hex');
  }

  static createHMAC(
    data: string,
    key: string,
    algorithm: HashAlgorithm = 'sha256'
  ): string {
    const hmac = createHash(algorithm);
    hmac.update(key + data);
    return hmac.digest('hex');
  }
}

// Data Anonymization
class DataAnonymization {
  private readonly fieldMasks: Map<string, (value: any) => any> = new Map();

  constructor() {
    this.initializeFieldMasks();
  }

  private initializeFieldMasks(): void {
    // Email masking
    this.fieldMasks.set('email', (email: string) => {
      if (!email || !email.includes('@')) return '***@***.***';
      const [local, domain] = email.split('@');
      const maskedLocal =
        local.substring(0, 2) + '*'.repeat(Math.max(0, local.length - 2));
      const maskedDomain =
        domain.substring(0, 1) +
        '*'.repeat(Math.max(0, domain.length - 4)) +
        domain.slice(-3);
      return `${maskedLocal}@${maskedDomain}`;
    });

    // Phone number masking
    this.fieldMasks.set('phone', (phone: string) => {
      if (!phone) return '***-***-****';
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length >= 10) {
        return `***-***-${cleaned.slice(-4)}`;
      }
      return '***-***-****';
    });

    // Credit card masking
    this.fieldMasks.set('creditCard', (card: string) => {
      if (!card) return '****-****-****-****';
      const cleaned = card.replace(/\D/g, '');
      if (cleaned.length >= 16) {
        return `****-****-****-${cleaned.slice(-4)}`;
      }
      return '****-****-****-****';
    });

    // Name masking
    this.fieldMasks.set('name', (name: string) => {
      if (!name) return '***';
      const parts = name.split(' ');
      return parts
        .map(
          part =>
            part.substring(0, 1) + '*'.repeat(Math.max(0, part.length - 1))
        )
        .join(' ');
    });
  }

  anonymizeField(fieldType: string, value: any): any {
    const mask = this.fieldMasks.get(fieldType);
    return mask ? mask(value) : value;
  }

  anonymizeObject(
    obj: Record<string, any>,
    fieldMappings: Record<string, string>
  ): Record<string, any> {
    const anonymized = { ...obj };

    for (const [field, fieldType] of Object.entries(fieldMappings)) {
      if (anonymized[field] !== undefined) {
        anonymized[field] = this.anonymizeField(fieldType, anonymized[field]);
      }
    }

    return anonymized;
  }
}

// Export all encryption services
export {
  DataAnonymization,
  DatabaseEncryption,
  EnterpriseKeyManagement,
  FieldLevelEncryption,
  SecureHashManager,
};
