import crypto from 'crypto';
import type { EncryptionKey, SecurityConfig } from '../types/Security.js';

// Simple logger implementation
const logger = {
  info: (message: string, meta?: any) =>
    console.log(`[INFO] ${message}`, meta || ''),
  warn: (message: string, meta?: any) =>
    console.warn(`[WARN] ${message}`, meta || ''),
  error: (message: string, meta?: any) =>
    console.error(`[ERROR] ${message}`, meta || ''),
  debug: (message: string, meta?: any) =>
    console.debug(`[DEBUG] ${message}`, meta || ''),
};

/**
 * Advanced Encryption Service
 *
 * Provides enterprise-grade encryption with key management, rotation,
 * and field-level encryption for sensitive data protection.
 */
export class AdvancedEncryptionService {
  private config: SecurityConfig;
  private encryptionKeys: Map<string, EncryptionKey> = new Map();
  private currentKeyId: string;
  private isActive: boolean = false;
  private keyRotationInterval?: NodeJS.Timeout;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.currentKeyId = 'primary';
    this.initializePrimaryKey();
    logger.info('AdvancedEncryptionService initialized');
  }

  /**
   * Initialize the primary encryption key
   */
  private initializePrimaryKey(): void {
    const primaryKey = this.generateEncryptionKey(this.currentKeyId);
    this.encryptionKeys.set(this.currentKeyId, primaryKey);
    logger.info('Primary encryption key initialized', {
      keyId: this.currentKeyId,
    });
  }

  /**
   * Start encryption service and key rotation
   */
  public start(): void {
    this.isActive = true;
    this.startKeyRotation();
    logger.info('Encryption service started with automatic key rotation');
  }

  /**
   * Stop encryption service
   */
  public stop(): void {
    this.isActive = false;
    if (this.keyRotationInterval) {
      clearInterval(this.keyRotationInterval);
    }
    logger.info('Encryption service stopped');
  }

  /**
   * Encrypt sensitive text data
   */
  public encryptText(
    plaintext: string,
    keyId?: string
  ): {
    ciphertext: string;
    keyId: string;
    iv: string;
    tag: string;
  } {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }

    const useKeyId = keyId || this.currentKeyId;
    const encryptionKey = this.encryptionKeys.get(useKeyId);

    if (!encryptionKey) {
      throw new Error(`Encryption key not found: ${useKeyId}`);
    }

    try {
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipher('aes-256-gcm', encryptionKey.key);

      // Encrypt the data
      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Update key usage
      encryptionKey.lastUsed = new Date();

      const result = {
        ciphertext,
        keyId: useKeyId,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
      };

      logger.debug('Text encrypted successfully', {
        keyId: useKeyId,
        plaintextLength: plaintext.length,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Text encryption failed', {
        error: errorMessage,
        keyId: useKeyId,
      });
      throw new Error(`Encryption failed: ${errorMessage}`);
    }
  }

  /**
   * Decrypt sensitive text data
   */
  public decryptText(
    ciphertext: string,
    keyId: string,
    iv: string,
    tag: string
  ): string {
    if (!ciphertext || !keyId || !iv || !tag) {
      throw new Error('All decryption parameters are required');
    }

    const encryptionKey = this.encryptionKeys.get(keyId);

    if (!encryptionKey) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    try {
      // Create decipher
      const decipher = crypto.createDecipher('aes-256-gcm', encryptionKey.key);
      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      // Decrypt the data
      let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');

      // Update key usage
      encryptionKey.lastUsed = new Date();

      logger.debug('Text decrypted successfully', {
        keyId,
        ciphertextLength: ciphertext.length,
      });

      return plaintext;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Text decryption failed', { error: errorMessage, keyId });
      throw new Error(`Decryption failed: ${errorMessage}`);
    }
  }

  /**
   * Encrypt memory content with metadata preservation
   */
  public encryptMemoryContent(content: {
    text: string;
    metadata?: Record<string, any>;
    sensitiveFields?: string[];
  }): {
    encryptedText: string;
    encryptedMetadata?: string;
    encryptionInfo: {
      textKeyId: string;
      textIv: string;
      textTag: string;
      metadataKeyId?: string;
      metadataIv?: string;
      metadataTag?: string;
    };
  } {
    // Always encrypt the main text content
    const textEncryption = this.encryptText(content.text);

    let metadataEncryption: any = null;

    // Encrypt sensitive metadata fields
    if (
      content.metadata &&
      content.sensitiveFields &&
      content.sensitiveFields.length > 0
    ) {
      const sensitiveMetadata: Record<string, any> = {};

      for (const field of content.sensitiveFields) {
        if (content.metadata[field] !== undefined) {
          sensitiveMetadata[field] = content.metadata[field];
        }
      }

      if (Object.keys(sensitiveMetadata).length > 0) {
        metadataEncryption = this.encryptText(
          JSON.stringify(sensitiveMetadata)
        );
      }
    }

    const result = {
      encryptedText: textEncryption.ciphertext,
      encryptedMetadata: metadataEncryption?.ciphertext,
      encryptionInfo: {
        textKeyId: textEncryption.keyId,
        textIv: textEncryption.iv,
        textTag: textEncryption.tag,
        metadataKeyId: metadataEncryption?.keyId,
        metadataIv: metadataEncryption?.iv,
        metadataTag: metadataEncryption?.tag,
      },
    };

    logger.debug('Memory content encrypted', {
      hasMetadata: !!metadataEncryption,
      sensitiveFields: content.sensitiveFields?.length || 0,
    });

    return result;
  }

  /**
   * Decrypt memory content with metadata restoration
   */
  public decryptMemoryContent(encryptedData: {
    encryptedText: string;
    encryptedMetadata?: string;
    encryptionInfo: {
      textKeyId: string;
      textIv: string;
      textTag: string;
      metadataKeyId?: string;
      metadataIv?: string;
      metadataTag?: string;
    };
  }): {
    text: string;
    metadata?: Record<string, any>;
  } {
    // Decrypt main text content
    const text = this.decryptText(
      encryptedData.encryptedText,
      encryptedData.encryptionInfo.textKeyId,
      encryptedData.encryptionInfo.textIv,
      encryptedData.encryptionInfo.textTag
    );

    let metadata: Record<string, any> | undefined;

    // Decrypt metadata if present
    if (
      encryptedData.encryptedMetadata &&
      encryptedData.encryptionInfo.metadataKeyId &&
      encryptedData.encryptionInfo.metadataIv &&
      encryptedData.encryptionInfo.metadataTag
    ) {
      try {
        const metadataJson = this.decryptText(
          encryptedData.encryptedMetadata,
          encryptedData.encryptionInfo.metadataKeyId,
          encryptedData.encryptionInfo.metadataIv,
          encryptedData.encryptionInfo.metadataTag
        );
        metadata = JSON.parse(metadataJson);
      } catch (error) {
        logger.warn('Failed to decrypt metadata, continuing without it', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.debug('Memory content decrypted', {
      hasMetadata: !!metadata,
    });

    return { text, metadata };
  }

  /**
   * Generate hash for data integrity verification
   */
  public generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify data integrity using hash
   */
  public verifyHash(data: string, expectedHash: string): boolean {
    const actualHash = this.generateHash(data);
    return actualHash === expectedHash;
  }

  /**
   * Generate a new encryption key
   */
  private generateEncryptionKey(keyId: string): EncryptionKey {
    const key = crypto.randomBytes(32); // 256-bit key for AES-256
    const now = new Date();

    return {
      id: keyId,
      algorithm: this.config.encryption.algorithm,
      key,
      createdAt: now,
      lastUsed: now,
      rotationDue: new Date(
        now.getTime() + this.config.encryption.rotationIntervalMs
      ),
    };
  }

  /**
   * Rotate encryption keys
   */
  public async rotateKeys(): Promise<void> {
    if (!this.isActive) {
      logger.warn('Cannot rotate keys - encryption service not active');
      return;
    }

    try {
      // Generate new primary key
      const newKeyId = `key_${Date.now()}`;
      const newKey = this.generateEncryptionKey(newKeyId);

      // Add new key to the store
      this.encryptionKeys.set(newKeyId, newKey);

      // Update current key ID
      const oldKeyId = this.currentKeyId;
      this.currentKeyId = newKeyId;

      logger.info('Encryption key rotated', {
        oldKeyId,
        newKeyId,
        totalKeys: this.encryptionKeys.size,
      });

      // Schedule old key removal (keep for decryption of existing data)
      setTimeout(
        () => {
          this.cleanupOldKeys();
        },
        24 * 60 * 60 * 1000
      ); // 24 hours
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Key rotation failed', { error: errorMessage });
      throw new Error(`Key rotation failed: ${errorMessage}`);
    }
  }

  /**
   * Clean up old encryption keys
   */
  private cleanupOldKeys(): void {
    const now = new Date();
    const retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
    const keysToRemove: string[] = [];

    for (const [keyId, key] of this.encryptionKeys) {
      // Don't remove current key
      if (keyId === this.currentKeyId) continue;

      // Remove keys older than retention period
      if (now.getTime() - key.createdAt.getTime() > retentionPeriod) {
        keysToRemove.push(keyId);
      }
    }

    for (const keyId of keysToRemove) {
      this.encryptionKeys.delete(keyId);
    }

    if (keysToRemove.length > 0) {
      logger.info('Old encryption keys cleaned up', {
        removedKeys: keysToRemove.length,
        remainingKeys: this.encryptionKeys.size,
      });
    }
  }

  /**
   * Start automatic key rotation
   */
  private startKeyRotation(): void {
    if (this.keyRotationInterval) {
      clearInterval(this.keyRotationInterval);
    }

    this.keyRotationInterval = setInterval(
      async () => {
        if (!this.isActive) return;

        const currentKey = this.encryptionKeys.get(this.currentKeyId);
        if (currentKey && new Date() >= currentKey.rotationDue) {
          try {
            await this.rotateKeys();
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            logger.error('Automatic key rotation failed', {
              error: errorMessage,
            });
          }
        }
      },
      60 * 60 * 1000
    ); // Check every hour

    logger.info('Automatic key rotation scheduled');
  }

  /**
   * Get encryption statistics
   */
  public getStatistics(): {
    totalKeys: number;
    currentKeyId: string;
    keyUsage: Array<{ keyId: string; lastUsed: Date; age: number }>;
    nextRotation: Date | null;
    encryptionOverhead: number;
  } {
    const keyUsage = Array.from(this.encryptionKeys.entries()).map(
      ([keyId, key]) => ({
        keyId,
        lastUsed: key.lastUsed,
        age: Date.now() - key.createdAt.getTime(),
      })
    );

    const currentKey = this.encryptionKeys.get(this.currentKeyId);
    const nextRotation = currentKey?.rotationDue || null;

    return {
      totalKeys: this.encryptionKeys.size,
      currentKeyId: this.currentKeyId,
      keyUsage,
      nextRotation,
      encryptionOverhead: this.calculateEncryptionOverhead(),
    };
  }

  /**
   * Calculate encryption performance overhead
   */
  private calculateEncryptionOverhead(): number {
    // This would measure actual encryption performance
    // For now, return estimated overhead
    return 0.5; // 0.5ms estimated overhead
  }

  /**
   * Export key for backup (encrypted)
   */
  public exportKeyForBackup(keyId: string, backupPassword: string): string {
    const key = this.encryptionKeys.get(keyId);
    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }

    // Encrypt the key with backup password
    const backupCipher = crypto.createCipher('aes-256-cbc', backupPassword);
    let encryptedKey = backupCipher.update(
      key.key.toString('hex'),
      'utf8',
      'hex'
    );
    encryptedKey += backupCipher.final('hex');

    const backupData = {
      keyId: key.id,
      algorithm: key.algorithm,
      encryptedKey,
      createdAt: key.createdAt.toISOString(),
      metadata: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
      },
    };

    logger.info('Encryption key exported for backup', { keyId });
    return JSON.stringify(backupData);
  }

  /**
   * Import key from backup
   */
  public importKeyFromBackup(backupData: string, backupPassword: string): void {
    try {
      const parsed = JSON.parse(backupData);

      // Decrypt the key
      const backupDecipher = crypto.createDecipher(
        'aes-256-cbc',
        backupPassword
      );
      let keyHex = backupDecipher.update(parsed.encryptedKey, 'hex', 'utf8');
      keyHex += backupDecipher.final('utf8');

      const restoredKey: EncryptionKey = {
        id: parsed.keyId,
        algorithm: parsed.algorithm,
        key: Buffer.from(keyHex, 'hex'),
        createdAt: new Date(parsed.createdAt),
        lastUsed: new Date(),
        rotationDue: new Date(
          Date.now() + this.config.encryption.rotationIntervalMs
        ),
      };

      this.encryptionKeys.set(parsed.keyId, restoredKey);
      logger.info('Encryption key restored from backup', {
        keyId: parsed.keyId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Key import from backup failed', { error: errorMessage });
      throw new Error(`Key import failed: ${errorMessage}`);
    }
  }

  /**
   * Clear all encryption data (for testing)
   */
  public clearData(): void {
    this.encryptionKeys.clear();
    this.initializePrimaryKey();
    logger.info('Encryption data cleared and reinitialized');
  }
}
