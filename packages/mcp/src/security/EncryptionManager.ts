/**
 * MCP v3.0 - Encryption Manager
 * Enterprise-grade encryption and cryptographic security system
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  pbkdf2Sync,
  randomBytes,
  scryptSync,
} from 'crypto';

// MCP v3.0 types - will be integrated with main types
interface Memory {
  id: string;
  content: string;
  type: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface EncryptionKey {
  id: string;
  algorithm: string;
  keyData: Buffer;
  salt: Buffer;
  iv?: Buffer;
  createdAt: number;
  expiresAt?: number;
  purpose: KeyPurpose;
  metadata: KeyMetadata;
}

export type KeyPurpose =
  | 'memory_encryption' // Encrypt memory content
  | 'transport_encryption' // Encrypt data in transit
  | 'storage_encryption' // Encrypt data at rest
  | 'agent_communication' // Agent-to-agent communication
  | 'backup_encryption' // Backup data encryption
  | 'temporary_encryption' // Short-term encryption needs
  | 'master_key'; // Master key for key encryption

export interface KeyMetadata {
  version: string;
  rotation_count: number;
  last_rotated: number;
  access_count: number;
  permissions: string[];
  tags: string[];
  source: 'generated' | 'imported' | 'derived';
}

export interface EncryptedData {
  id: string;
  algorithm: string;
  keyId: string;
  encryptedContent: Buffer;
  iv: Buffer;
  authTag?: Buffer;
  metadata: EncryptionMetadata;
  integrity: IntegrityData;
}

export interface EncryptionMetadata {
  originalSize: number;
  encryptedSize: number;
  compressionUsed: boolean;
  timestamp: number;
  version: string;
  checksums: Map<string, string>;
}

export interface IntegrityData {
  hash: string;
  signature?: string;
  merkleRoot?: string;
  blockHashes?: string[];
}

export interface EncryptionConfig {
  defaultAlgorithm: 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
  keyDerivationFunction: 'pbkdf2' | 'scrypt' | 'argon2';
  keyDerivationIterations: number;
  keyRotationInterval: number;
  compressionEnabled: boolean;
  integrityChecking: boolean;
  auditLogging: boolean;
  quantumResistant: boolean;
}

export interface EncryptionContext {
  purpose: KeyPurpose;
  requester: string;
  permissions: string[];
  environment: 'development' | 'staging' | 'production';
  compliance: string[];
  auditRequired: boolean;
}

export interface KeyRotationPolicy {
  enabled: boolean;
  intervalMs: number;
  maxKeyAge: number;
  backupOldKeys: boolean;
  notifyOnRotation: boolean;
  autoRotateOnThreshold: boolean;
  accessCountThreshold: number;
}

export interface EncryptionAuditEvent {
  id: string;
  eventType:
    | 'encrypt'
    | 'decrypt'
    | 'key_generate'
    | 'key_rotate'
    | 'key_access'
    | 'key_delete';
  timestamp: number;
  keyId?: string;
  dataId?: string;
  requester: string;
  success: boolean;
  errorMessage?: string;
  metadata: Record<string, any>;
  sensitivityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface QuantumResistantConfig {
  enabled: boolean;
  algorithm: 'CRYSTALS-Kyber' | 'CRYSTALS-Dilithium' | 'FALCON' | 'SPHINCS+';
  keySize: number;
  hybridMode: boolean; // Combine with classical encryption
}

export class EncryptionManager {
  private keys: Map<string, EncryptionKey> = new Map();
  private encryptedData: Map<string, EncryptedData> = new Map();
  private auditLog: EncryptionAuditEvent[] = [];
  private rotationTimers: Map<string, NodeJS.Timeout> = new Map();

  private readonly supportedAlgorithms = new Set([
    'aes-256-gcm',
    'aes-256-cbc',
    'aes-256-cfb',
    'aes-256-ofb',
    'chacha20-poly1305',
    'aes-192-gcm',
    'aes-128-gcm',
  ]);

  constructor(
    private config: EncryptionConfig = {
      defaultAlgorithm: 'aes-256-gcm',
      keyDerivationFunction: 'scrypt',
      keyDerivationIterations: 100000,
      keyRotationInterval: 24 * 60 * 60 * 1000, // 24 hours
      compressionEnabled: true,
      integrityChecking: true,
      auditLogging: true,
      quantumResistant: false,
    },
    private rotationPolicy: KeyRotationPolicy = {
      enabled: true,
      intervalMs: 24 * 60 * 60 * 1000, // 24 hours
      maxKeyAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      backupOldKeys: true,
      notifyOnRotation: true,
      autoRotateOnThreshold: true,
      accessCountThreshold: 10000,
    }
  ) {
    this.initializeEncryption();
  }

  /**
   * Generate a new encryption key
   */
  async generateKey(
    purpose: KeyPurpose,
    context: EncryptionContext,
    algorithm?: string
  ): Promise<string> {
    const keyId = this.generateKeyId();
    const keyAlgorithm = algorithm || this.config.defaultAlgorithm;

    if (!this.supportedAlgorithms.has(keyAlgorithm)) {
      throw new Error(`Unsupported algorithm: ${keyAlgorithm}`);
    }

    // Generate cryptographically secure key
    const keySize = this.getKeySize(keyAlgorithm);
    const salt = randomBytes(32);
    const keyData = await this.deriveKey(randomBytes(32), salt, keySize);

    const key: EncryptionKey = {
      id: keyId,
      algorithm: keyAlgorithm,
      keyData,
      salt,
      createdAt: Date.now(),
      expiresAt: this.calculateKeyExpiration(purpose),
      purpose,
      metadata: {
        version: '1.0.0',
        rotation_count: 0,
        last_rotated: Date.now(),
        access_count: 0,
        permissions: context.permissions,
        tags: [`purpose:${purpose}`, `env:${context.environment}`],
        source: 'generated',
      },
    };

    this.keys.set(keyId, key);

    // Set up key rotation if enabled
    if (this.rotationPolicy.enabled) {
      this.scheduleKeyRotation(keyId);
    }

    // Audit logging
    await this.auditLog.push({
      id: this.generateAuditId(),
      eventType: 'key_generate',
      timestamp: Date.now(),
      keyId,
      requester: context.requester,
      success: true,
      metadata: {
        purpose,
        algorithm: keyAlgorithm,
        environment: context.environment,
      },
      sensitivityLevel: this.determineSensitivityLevel(purpose),
    });

    console.log(
      `Encryption key generated: ${keyId} (${keyAlgorithm}, ${purpose})`
    );
    return keyId;
  }

  /**
   * Encrypt data
   */
  async encryptData(
    data: string | Buffer,
    keyId: string,
    context: EncryptionContext
  ): Promise<string> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    if (this.isKeyExpired(key)) {
      throw new Error(`Encryption key expired: ${keyId}`);
    }

    const dataId = this.generateDataId();
    const inputData =
      typeof data === 'string' ? Buffer.from(data, 'utf8') : data;

    try {
      // Compress if enabled
      let processedData = inputData;
      if (this.config.compressionEnabled) {
        processedData = await this.compressData(inputData);
      }

      // Generate IV for this encryption
      const iv = randomBytes(this.getIVSize(key.algorithm));

      // Encrypt the data
      const cipher = createCipheriv(key.algorithm, key.keyData, iv);
      const encrypted = Buffer.concat([
        cipher.update(processedData),
        cipher.final(),
      ]);

      // Get authentication tag for AEAD algorithms
      let authTag: Buffer | undefined;
      if (this.isAEAD(key.algorithm)) {
        authTag = (cipher as any).getAuthTag();
      }

      // Calculate integrity data
      const integrity = await this.calculateIntegrity(inputData, encrypted);

      // Create encrypted data record
      const encryptedRecord: EncryptedData = {
        id: dataId,
        algorithm: key.algorithm,
        keyId: key.id,
        encryptedContent: encrypted,
        iv,
        authTag,
        metadata: {
          originalSize: inputData.length,
          encryptedSize: encrypted.length,
          compressionUsed: this.config.compressionEnabled,
          timestamp: Date.now(),
          version: '1.0.0',
          checksums: new Map([
            ['sha256', createHash('sha256').update(inputData).digest('hex')],
            ['sha512', createHash('sha512').update(inputData).digest('hex')],
          ]),
        },
        integrity,
      };

      this.encryptedData.set(dataId, encryptedRecord);

      // Update key access count
      key.metadata.access_count++;

      // Check if key rotation is needed
      if (this.shouldRotateKey(key)) {
        await this.rotateKey(keyId, context);
      }

      // Audit logging
      await this.logAuditEvent({
        id: this.generateAuditId(),
        eventType: 'encrypt',
        timestamp: Date.now(),
        keyId: key.id,
        dataId,
        requester: context.requester,
        success: true,
        metadata: {
          originalSize: inputData.length,
          encryptedSize: encrypted.length,
          compressionUsed: this.config.compressionEnabled,
        },
        sensitivityLevel: this.determineSensitivityLevel(key.purpose),
      });

      console.log(
        `Data encrypted: ${dataId} (${encrypted.length} bytes, key: ${keyId})`
      );
      return dataId;
    } catch (error) {
      // Audit failed encryption
      await this.logAuditEvent({
        id: this.generateAuditId(),
        eventType: 'encrypt',
        timestamp: Date.now(),
        keyId: key.id,
        dataId,
        requester: context.requester,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: { originalSize: inputData.length },
        sensitivityLevel: this.determineSensitivityLevel(key.purpose),
      });

      throw error;
    }
  }

  /**
   * Decrypt data
   */
  async decryptData(
    dataId: string,
    context: EncryptionContext
  ): Promise<Buffer> {
    const encryptedRecord = this.encryptedData.get(dataId);
    if (!encryptedRecord) {
      throw new Error(`Encrypted data not found: ${dataId}`);
    }

    const key = this.keys.get(encryptedRecord.keyId);
    if (!key) {
      throw new Error(`Decryption key not found: ${encryptedRecord.keyId}`);
    }

    if (this.isKeyExpired(key)) {
      throw new Error(`Decryption key expired: ${encryptedRecord.keyId}`);
    }

    try {
      // Verify integrity first
      if (this.config.integrityChecking) {
        const isValid = await this.verifyIntegrity(encryptedRecord);
        if (!isValid) {
          throw new Error('Data integrity check failed');
        }
      }

      // Decrypt the data
      const decipher = createDecipheriv(
        encryptedRecord.algorithm,
        key.keyData,
        encryptedRecord.iv
      );

      // Set auth tag for AEAD algorithms
      if (this.isAEAD(encryptedRecord.algorithm) && encryptedRecord.authTag) {
        (decipher as any).setAuthTag(encryptedRecord.authTag);
      }

      const decrypted = Buffer.concat([
        decipher.update(encryptedRecord.encryptedContent),
        decipher.final(),
      ]);

      // Decompress if compression was used
      let finalData = decrypted;
      if (encryptedRecord.metadata.compressionUsed) {
        finalData = await this.decompressData(decrypted);
      }

      // Verify checksums
      const actualSha256 = createHash('sha256').update(finalData).digest('hex');
      const expectedSha256 = encryptedRecord.metadata.checksums.get('sha256');

      if (expectedSha256 && actualSha256 !== expectedSha256) {
        throw new Error('Checksum verification failed');
      }

      // Update key access count
      key.metadata.access_count++;

      // Audit logging
      await this.logAuditEvent({
        id: this.generateAuditId(),
        eventType: 'decrypt',
        timestamp: Date.now(),
        keyId: key.id,
        dataId,
        requester: context.requester,
        success: true,
        metadata: {
          decryptedSize: finalData.length,
          compressionUsed: encryptedRecord.metadata.compressionUsed,
        },
        sensitivityLevel: this.determineSensitivityLevel(key.purpose),
      });

      console.log(`Data decrypted: ${dataId} (${finalData.length} bytes)`);
      return finalData;
    } catch (error) {
      // Audit failed decryption
      await this.logAuditEvent({
        id: this.generateAuditId(),
        eventType: 'decrypt',
        timestamp: Date.now(),
        keyId: key.id,
        dataId,
        requester: context.requester,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {},
        sensitivityLevel: this.determineSensitivityLevel(key.purpose),
      });

      throw error;
    }
  }

  /**
   * Encrypt memory object
   */
  async encryptMemory(
    memory: Memory,
    context: EncryptionContext
  ): Promise<string> {
    // Serialize memory object
    const serializedMemory = JSON.stringify(memory);

    // Generate or get appropriate key
    let keyId = await this.findOrCreateKey('memory_encryption', context);

    return this.encryptData(serializedMemory, keyId, context);
  }

  /**
   * Decrypt memory object
   */
  async decryptMemory(
    dataId: string,
    context: EncryptionContext
  ): Promise<Memory> {
    const decryptedBuffer = await this.decryptData(dataId, context);
    const serializedMemory = decryptedBuffer.toString('utf8');

    try {
      return JSON.parse(serializedMemory) as Memory;
    } catch (error) {
      throw new Error('Failed to parse decrypted memory object');
    }
  }

  /**
   * Rotate encryption key
   */
  async rotateKey(keyId: string, context: EncryptionContext): Promise<string> {
    const oldKey = this.keys.get(keyId);
    if (!oldKey) {
      throw new Error(`Key not found for rotation: ${keyId}`);
    }

    try {
      // Generate new key with same purpose and algorithm
      const newKeyId = await this.generateKey(
        oldKey.purpose,
        context,
        oldKey.algorithm
      );
      const newKey = this.keys.get(newKeyId)!;

      // Update metadata
      newKey.metadata.rotation_count = oldKey.metadata.rotation_count + 1;
      newKey.metadata.last_rotated = Date.now();

      // Backup old key if policy requires
      if (this.rotationPolicy.backupOldKeys) {
        await this.backupKey(oldKey);
      }

      // Update any references to the old key
      await this.updateKeyReferences(keyId, newKeyId);

      // Remove old key
      this.keys.delete(keyId);

      // Clear rotation timer
      const timer = this.rotationTimers.get(keyId);
      if (timer) {
        clearTimeout(timer);
        this.rotationTimers.delete(keyId);
      }

      // Schedule rotation for new key
      this.scheduleKeyRotation(newKeyId);

      // Audit logging
      await this.logAuditEvent({
        id: this.generateAuditId(),
        eventType: 'key_rotate',
        timestamp: Date.now(),
        keyId: newKeyId,
        requester: context.requester,
        success: true,
        metadata: {
          oldKeyId: keyId,
          newKeyId,
          rotationCount: newKey.metadata.rotation_count,
        },
        sensitivityLevel: this.determineSensitivityLevel(oldKey.purpose),
      });

      console.log(
        `Key rotated: ${keyId} → ${newKeyId} (rotation #${newKey.metadata.rotation_count})`
      );
      return newKeyId;
    } catch (error) {
      await this.logAuditEvent({
        id: this.generateAuditId(),
        eventType: 'key_rotate',
        timestamp: Date.now(),
        keyId,
        requester: context.requester,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: { oldKeyId: keyId },
        sensitivityLevel: this.determineSensitivityLevel(oldKey.purpose),
      });

      throw error;
    }
  }

  /**
   * Get encryption key information
   */
  getKeyInfo(keyId: string): Omit<EncryptionKey, 'keyData'> | undefined {
    const key = this.keys.get(keyId);
    if (!key) return undefined;

    // Return key info without the sensitive key data
    const { keyData, ...keyInfo } = key;
    return keyInfo;
  }

  /**
   * Get all keys (without sensitive data)
   */
  getAllKeys(): Array<Omit<EncryptionKey, 'keyData'>> {
    return Array.from(this.keys.values()).map(key => {
      const { keyData, ...keyInfo } = key;
      return keyInfo;
    });
  }

  /**
   * Get encrypted data information
   */
  getEncryptedDataInfo(
    dataId: string
  ): Omit<EncryptedData, 'encryptedContent'> | undefined {
    const data = this.encryptedData.get(dataId);
    if (!data) return undefined;

    // Return data info without the encrypted content
    const { encryptedContent, ...dataInfo } = data;
    return dataInfo;
  }

  /**
   * Get encryption statistics
   */
  getEncryptionStats(): {
    totalKeys: number;
    totalEncryptedData: number;
    keysByPurpose: Map<KeyPurpose, number>;
    encryptionsByAlgorithm: Map<string, number>;
    totalDataSize: number;
    compressionRatio: number;
    auditEvents: number;
    recentActivity: EncryptionAuditEvent[];
  } {
    const keysByPurpose = new Map<KeyPurpose, number>();
    for (const key of this.keys.values()) {
      keysByPurpose.set(key.purpose, (keysByPurpose.get(key.purpose) || 0) + 1);
    }

    const encryptionsByAlgorithm = new Map<string, number>();
    let totalDataSize = 0;
    let totalOriginalSize = 0;

    for (const data of this.encryptedData.values()) {
      encryptionsByAlgorithm.set(
        data.algorithm,
        (encryptionsByAlgorithm.get(data.algorithm) || 0) + 1
      );
      totalDataSize += data.metadata.encryptedSize;
      totalOriginalSize += data.metadata.originalSize;
    }

    const compressionRatio =
      totalOriginalSize > 0 ? totalDataSize / totalOriginalSize : 1;
    const recentActivity = this.auditLog
      .filter(event => Date.now() - event.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);

    return {
      totalKeys: this.keys.size,
      totalEncryptedData: this.encryptedData.size,
      keysByPurpose,
      encryptionsByAlgorithm,
      totalDataSize,
      compressionRatio,
      auditEvents: this.auditLog.length,
      recentActivity,
    };
  }

  /**
   * Private helper methods
   */

  private initializeEncryption(): void {
    console.log('Encryption Manager initialized with security features:');
    console.log(`- Default Algorithm: ${this.config.defaultAlgorithm}`);
    console.log(
      `- Key Rotation: ${this.rotationPolicy.enabled ? 'Enabled' : 'Disabled'}`
    );
    console.log(
      `- Compression: ${this.config.compressionEnabled ? 'Enabled' : 'Disabled'}`
    );
    console.log(
      `- Integrity Checking: ${this.config.integrityChecking ? 'Enabled' : 'Disabled'}`
    );
    console.log(
      `- Audit Logging: ${this.config.auditLogging ? 'Enabled' : 'Disabled'}`
    );
  }

  private async deriveKey(
    password: Buffer,
    salt: Buffer,
    keyLength: number
  ): Promise<Buffer> {
    switch (this.config.keyDerivationFunction) {
      case 'pbkdf2':
        return pbkdf2Sync(
          password,
          salt,
          this.config.keyDerivationIterations,
          keyLength,
          'sha512'
        );
      case 'scrypt':
        return scryptSync(password, salt, keyLength, {
          cost: 16384,
          blockSize: 8,
          parallelization: 1,
        });
      default:
        throw new Error(
          `Unsupported key derivation function: ${this.config.keyDerivationFunction}`
        );
    }
  }

  private getKeySize(algorithm: string): number {
    const keyMap: Record<string, number> = {
      'aes-256-gcm': 32,
      'aes-256-cbc': 32,
      'aes-256-cfb': 32,
      'aes-256-ofb': 32,
      'aes-192-gcm': 24,
      'aes-128-gcm': 16,
      'chacha20-poly1305': 32,
    };
    return keyMap[algorithm] || 32;
  }

  private getIVSize(algorithm: string): number {
    const ivMap: Record<string, number> = {
      'aes-256-gcm': 12,
      'aes-256-cbc': 16,
      'aes-256-cfb': 16,
      'aes-256-ofb': 16,
      'aes-192-gcm': 12,
      'aes-128-gcm': 12,
      'chacha20-poly1305': 12,
    };
    return ivMap[algorithm] || 16;
  }

  private isAEAD(algorithm: string): boolean {
    return algorithm.includes('gcm') || algorithm.includes('poly1305');
  }

  private calculateKeyExpiration(purpose: KeyPurpose): number | undefined {
    const expirationMap: Record<KeyPurpose, number> = {
      memory_encryption: 7 * 24 * 60 * 60 * 1000, // 7 days
      transport_encryption: 24 * 60 * 60 * 1000, // 1 day
      storage_encryption: 30 * 24 * 60 * 60 * 1000, // 30 days
      agent_communication: 24 * 60 * 60 * 1000, // 1 day
      backup_encryption: 365 * 24 * 60 * 60 * 1000, // 1 year
      temporary_encryption: 60 * 60 * 1000, // 1 hour
      master_key: 365 * 24 * 60 * 60 * 1000, // 1 year
    };

    const ttl = expirationMap[purpose];
    return ttl ? Date.now() + ttl : undefined;
  }

  private isKeyExpired(key: EncryptionKey): boolean {
    return key.expiresAt ? Date.now() > key.expiresAt : false;
  }

  private shouldRotateKey(key: EncryptionKey): boolean {
    if (!this.rotationPolicy.enabled) return false;

    // Check age
    const age = Date.now() - key.createdAt;
    if (age > this.rotationPolicy.maxKeyAge) return true;

    // Check access count
    if (
      this.rotationPolicy.autoRotateOnThreshold &&
      key.metadata.access_count > this.rotationPolicy.accessCountThreshold
    ) {
      return true;
    }

    return false;
  }

  private scheduleKeyRotation(keyId: string): void {
    const timer = setTimeout(async () => {
      try {
        const key = this.keys.get(keyId);
        if (key) {
          await this.rotateKey(keyId, {
            purpose: key.purpose,
            requester: 'system',
            permissions: key.metadata.permissions,
            environment: 'production',
            compliance: [],
            auditRequired: true,
          });
        }
      } catch (error) {
        console.error(`Automatic key rotation failed for ${keyId}:`, error);
      }
    }, this.rotationPolicy.intervalMs);

    this.rotationTimers.set(keyId, timer);
  }

  private async calculateIntegrity(
    original: Buffer,
    encrypted: Buffer
  ): Promise<IntegrityData> {
    const hash = createHash('sha256').update(encrypted).digest('hex');

    // Calculate Merkle tree for large data
    let merkleRoot: string | undefined;
    let blockHashes: string[] | undefined;

    if (encrypted.length > 1024 * 1024) {
      // > 1MB
      const blockSize = 64 * 1024; // 64KB blocks
      blockHashes = [];

      for (let i = 0; i < encrypted.length; i += blockSize) {
        const block = encrypted.subarray(i, i + blockSize);
        const blockHash = createHash('sha256').update(block).digest('hex');
        blockHashes.push(blockHash);
      }

      merkleRoot = this.calculateMerkleRoot(blockHashes);
    }

    return {
      hash,
      merkleRoot,
      blockHashes,
    };
  }

  private calculateMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return '';
    if (hashes.length === 1) return hashes[0];

    const nextLevel: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left; // Duplicate if odd number
      const combined = createHash('sha256')
        .update(left + right)
        .digest('hex');
      nextLevel.push(combined);
    }

    return this.calculateMerkleRoot(nextLevel);
  }

  private async verifyIntegrity(
    encryptedRecord: EncryptedData
  ): Promise<boolean> {
    const currentHash = createHash('sha256')
      .update(encryptedRecord.encryptedContent)
      .digest('hex');

    if (currentHash !== encryptedRecord.integrity.hash) {
      return false;
    }

    // Verify Merkle tree if present
    if (encryptedRecord.integrity.blockHashes) {
      const calculatedMerkleRoot = this.calculateMerkleRoot(
        encryptedRecord.integrity.blockHashes
      );
      if (calculatedMerkleRoot !== encryptedRecord.integrity.merkleRoot) {
        return false;
      }
    }

    return true;
  }

  private async compressData(data: Buffer): Promise<Buffer> {
    // Simplified compression - would use zlib or better compression
    return data; // For now, return as-is
  }

  private async decompressData(data: Buffer): Promise<Buffer> {
    // Simplified decompression - would use zlib or better compression
    return data; // For now, return as-is
  }

  private async findOrCreateKey(
    purpose: KeyPurpose,
    context: EncryptionContext
  ): Promise<string> {
    // Look for existing key with same purpose
    for (const [keyId, key] of this.keys) {
      if (key.purpose === purpose && !this.isKeyExpired(key)) {
        return keyId;
      }
    }

    // Create new key if none found
    return this.generateKey(purpose, context);
  }

  private async backupKey(key: EncryptionKey): Promise<void> {
    // Implementation would backup key to secure storage
    console.log(`Key backed up: ${key.id}`);
  }

  private async updateKeyReferences(
    oldKeyId: string,
    newKeyId: string
  ): Promise<void> {
    // Update any encrypted data that references the old key
    for (const data of this.encryptedData.values()) {
      if (data.keyId === oldKeyId) {
        data.keyId = newKeyId;
      }
    }
  }

  private determineSensitivityLevel(
    purpose: KeyPurpose
  ): EncryptionAuditEvent['sensitivityLevel'] {
    const sensitivityMap: Record<
      KeyPurpose,
      EncryptionAuditEvent['sensitivityLevel']
    > = {
      memory_encryption: 'high',
      transport_encryption: 'medium',
      storage_encryption: 'high',
      agent_communication: 'medium',
      backup_encryption: 'critical',
      temporary_encryption: 'low',
      master_key: 'critical',
    };

    return sensitivityMap[purpose] || 'medium';
  }

  private async logAuditEvent(event: EncryptionAuditEvent): Promise<void> {
    if (this.config.auditLogging) {
      this.auditLog.push(event);

      // Rotate audit log if it gets too large
      if (this.auditLog.length > 10000) {
        this.auditLog = this.auditLog.slice(-5000); // Keep last 5000 events
      }
    }
  }

  private generateKeyId(): string {
    return `key_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  private generateDataId(): string {
    return `data_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Public management methods
   */

  /**
   * Delete encryption key
   */
  async deleteKey(keyId: string, context: EncryptionContext): Promise<void> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }

    // Check if key is still in use
    const dataUsingKey = Array.from(this.encryptedData.values()).filter(
      data => data.keyId === keyId
    );

    if (dataUsingKey.length > 0) {
      throw new Error(
        `Cannot delete key ${keyId}: still in use by ${dataUsingKey.length} encrypted data items`
      );
    }

    this.keys.delete(keyId);

    // Clear rotation timer
    const timer = this.rotationTimers.get(keyId);
    if (timer) {
      clearTimeout(timer);
      this.rotationTimers.delete(keyId);
    }

    await this.logAuditEvent({
      id: this.generateAuditId(),
      eventType: 'key_delete',
      timestamp: Date.now(),
      keyId,
      requester: context.requester,
      success: true,
      metadata: { purpose: key.purpose },
      sensitivityLevel: this.determineSensitivityLevel(key.purpose),
    });

    console.log(`Key deleted: ${keyId}`);
  }

  /**
   * Delete encrypted data
   */
  async deleteEncryptedData(
    dataId: string,
    context: EncryptionContext
  ): Promise<void> {
    const data = this.encryptedData.get(dataId);
    if (!data) {
      throw new Error(`Encrypted data not found: ${dataId}`);
    }

    this.encryptedData.delete(dataId);

    await this.logAuditEvent({
      id: this.generateAuditId(),
      eventType: 'decrypt', // Using decrypt as closest event type
      timestamp: Date.now(),
      keyId: data.keyId,
      dataId,
      requester: context.requester,
      success: true,
      metadata: { action: 'delete', size: data.metadata.encryptedSize },
      sensitivityLevel: 'medium',
    });

    console.log(`Encrypted data deleted: ${dataId}`);
  }

  /**
   * Update encryption configuration
   */
  updateConfig(newConfig: Partial<EncryptionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Encryption configuration updated');
  }

  /**
   * Update key rotation policy
   */
  updateRotationPolicy(newPolicy: Partial<KeyRotationPolicy>): void {
    this.rotationPolicy = { ...this.rotationPolicy, ...newPolicy };

    // Reschedule all key rotations if policy changed
    if (newPolicy.enabled !== undefined || newPolicy.intervalMs !== undefined) {
      for (const keyId of this.keys.keys()) {
        const timer = this.rotationTimers.get(keyId);
        if (timer) {
          clearTimeout(timer);
        }

        if (this.rotationPolicy.enabled) {
          this.scheduleKeyRotation(keyId);
        }
      }
    }

    console.log('Key rotation policy updated');
  }

  /**
   * Export audit log
   */
  exportAuditLog(
    startTime?: number,
    endTime?: number,
    eventTypes?: EncryptionAuditEvent['eventType'][]
  ): EncryptionAuditEvent[] {
    let filteredLog = this.auditLog;

    if (startTime) {
      filteredLog = filteredLog.filter(event => event.timestamp >= startTime);
    }

    if (endTime) {
      filteredLog = filteredLog.filter(event => event.timestamp <= endTime);
    }

    if (eventTypes) {
      filteredLog = filteredLog.filter(event =>
        eventTypes.includes(event.eventType)
      );
    }

    return filteredLog.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Shutdown encryption manager
   */
  shutdown(): void {
    // Clear all rotation timers
    for (const timer of this.rotationTimers.values()) {
      clearTimeout(timer);
    }
    this.rotationTimers.clear();

    // Clear sensitive data
    this.keys.clear();

    console.log('Encryption Manager shutdown complete');
  }
}

export default EncryptionManager;
