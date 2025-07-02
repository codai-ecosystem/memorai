/**
 * BINARY PROTOCOL - High-Performance Binary Communication
 * Optimized binary protocol for maximum throughput and minimal latency
 */

import { Buffer } from 'buffer';

export enum MessageType {
  REQUEST = 0x01,
  RESPONSE = 0x02,
  EVENT = 0x03,
  STREAM = 0x04,
  BATCH = 0x05,
  PING = 0x06,
  PONG = 0x07,
}

export enum DataType {
  NULL = 0x00,
  BOOLEAN = 0x01,
  INT8 = 0x02,
  INT16 = 0x03,
  INT32 = 0x04,
  INT64 = 0x05,
  FLOAT32 = 0x06,
  FLOAT64 = 0x07,
  STRING = 0x08,
  BUFFER = 0x09,
  ARRAY = 0x0a,
  OBJECT = 0x0b,
  COMPRESSED = 0x0c,
}

export interface BinaryMessage {
  id: string;
  type: MessageType;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: string;
  event?: string;
  data?: unknown;
  timestamp: number;
}

export class BinaryProtocol {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  /**
   * Encode message to binary format
   */
  encode(message: BinaryMessage): Buffer {
    const chunks: Buffer[] = [];

    // Message header (fixed 16 bytes)
    const header = Buffer.alloc(16);
    let offset = 0;

    // Magic bytes (4 bytes) - 'MCP3'
    header.writeUInt32BE(0x4d435033, offset);
    offset += 4;

    // Message type (1 byte)
    header.writeUInt8(message.type, offset);
    offset += 1;

    // Flags (1 byte) - reserved for compression, encryption, etc.
    const flags = 0x00;
    header.writeUInt8(flags, offset);
    offset += 1;

    // Timestamp (8 bytes)
    header.writeBigUInt64BE(BigInt(message.timestamp), offset);
    offset += 8;

    // Reserved (2 bytes)
    header.writeUInt16BE(0x0000, offset);

    chunks.push(header);

    // Message ID
    const idBuffer = this.encodeString(message.id);
    chunks.push(this.encodeLength(idBuffer.length));
    chunks.push(idBuffer);

    // Method (if present)
    if (message.method) {
      const methodBuffer = this.encodeString(message.method);
      chunks.push(this.encodeLength(methodBuffer.length));
      chunks.push(methodBuffer);
    } else {
      chunks.push(this.encodeLength(0));
    }

    // Event (if present)
    if (message.event) {
      const eventBuffer = this.encodeString(message.event);
      chunks.push(this.encodeLength(eventBuffer.length));
      chunks.push(eventBuffer);
    } else {
      chunks.push(this.encodeLength(0));
    }

    // Error (if present)
    if (message.error) {
      const errorBuffer = this.encodeString(message.error);
      chunks.push(this.encodeLength(errorBuffer.length));
      chunks.push(errorBuffer);
    } else {
      chunks.push(this.encodeLength(0));
    }

    // Params (if present)
    if (message.params !== undefined) {
      const paramsBuffer = this.encodeValue(message.params);
      chunks.push(this.encodeLength(paramsBuffer.length));
      chunks.push(paramsBuffer);
    } else {
      chunks.push(this.encodeLength(0));
    }

    // Result (if present)
    if (message.result !== undefined) {
      const resultBuffer = this.encodeValue(message.result);
      chunks.push(this.encodeLength(resultBuffer.length));
      chunks.push(resultBuffer);
    } else {
      chunks.push(this.encodeLength(0));
    }

    // Data (if present)
    if (message.data !== undefined) {
      const dataBuffer = this.encodeValue(message.data);
      chunks.push(this.encodeLength(dataBuffer.length));
      chunks.push(dataBuffer);
    } else {
      chunks.push(this.encodeLength(0));
    }

    // Calculate total length and create final buffer
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const messageBuffer = Buffer.alloc(4 + totalLength);

    // Write total length at the beginning
    messageBuffer.writeUInt32BE(totalLength, 0);

    let pos = 4;
    for (const chunk of chunks) {
      chunk.copy(messageBuffer, pos);
      pos += chunk.length;
    }

    return messageBuffer;
  }

  /**
   * Decode binary message
   */
  decode(buffer: Buffer): BinaryMessage {
    let offset = 0;

    // Read total length
    const totalLength = buffer.readUInt32BE(offset);
    offset += 4;

    // Verify buffer size
    if (buffer.length < totalLength + 4) {
      throw new Error('Incomplete message buffer');
    }

    // Read header
    const magic = buffer.readUInt32BE(offset);
    if (magic !== 0x4d435033) {
      throw new Error('Invalid magic bytes');
    }
    offset += 4;

    const type = buffer.readUInt8(offset) as MessageType;
    offset += 1;

    const flags = buffer.readUInt8(offset);
    offset += 1;

    const timestamp = Number(buffer.readBigUInt64BE(offset));
    offset += 8;

    // Skip reserved bytes
    offset += 2;

    // Read message ID
    const idLength = this.decodeLength(buffer, offset);
    offset += 4;
    const id = this.decodeString(buffer.subarray(offset, offset + idLength));
    offset += idLength;

    // Read method
    const methodLength = this.decodeLength(buffer, offset);
    offset += 4;
    const method =
      methodLength > 0
        ? this.decodeString(buffer.subarray(offset, offset + methodLength))
        : undefined;
    offset += methodLength;

    // Read event
    const eventLength = this.decodeLength(buffer, offset);
    offset += 4;
    const event =
      eventLength > 0
        ? this.decodeString(buffer.subarray(offset, offset + eventLength))
        : undefined;
    offset += eventLength;

    // Read error
    const errorLength = this.decodeLength(buffer, offset);
    offset += 4;
    const error =
      errorLength > 0
        ? this.decodeString(buffer.subarray(offset, offset + errorLength))
        : undefined;
    offset += errorLength;

    // Read params
    const paramsLength = this.decodeLength(buffer, offset);
    offset += 4;
    const params =
      paramsLength > 0
        ? this.decodeValue(buffer.subarray(offset, offset + paramsLength))
        : undefined;
    offset += paramsLength;

    // Read result
    const resultLength = this.decodeLength(buffer, offset);
    offset += 4;
    const result =
      resultLength > 0
        ? this.decodeValue(buffer.subarray(offset, offset + resultLength))
        : undefined;
    offset += resultLength;

    // Read data
    const dataLength = this.decodeLength(buffer, offset);
    offset += 4;
    const data =
      dataLength > 0
        ? this.decodeValue(buffer.subarray(offset, offset + dataLength))
        : undefined;

    return {
      id,
      type,
      method,
      params,
      result,
      error,
      event,
      data,
      timestamp,
    };
  }

  /**
   * Encode string to buffer
   */
  private encodeString(str: string): Buffer {
    return Buffer.from(this.encoder.encode(str));
  }

  /**
   * Decode string from buffer
   */
  private decodeString(buffer: Buffer): string {
    return this.decoder.decode(buffer);
  }

  /**
   * Encode length as 4-byte integer
   */
  private encodeLength(length: number): Buffer {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32BE(length, 0);
    return buffer;
  }

  /**
   * Decode length from buffer
   */
  private decodeLength(buffer: Buffer, offset: number): number {
    return buffer.readUInt32BE(offset);
  }

  /**
   * Encode value with type information
   */
  private encodeValue(value: unknown): Buffer {
    const chunks: Buffer[] = [];

    if (value === null || value === undefined) {
      chunks.push(Buffer.from([DataType.NULL]));
    } else if (typeof value === 'boolean') {
      chunks.push(Buffer.from([DataType.BOOLEAN, value ? 1 : 0]));
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        if (value >= -128 && value <= 127) {
          const buffer = Buffer.alloc(2);
          buffer.writeUInt8(DataType.INT8, 0);
          buffer.writeInt8(value, 1);
          chunks.push(buffer);
        } else if (value >= -32768 && value <= 32767) {
          const buffer = Buffer.alloc(3);
          buffer.writeUInt8(DataType.INT16, 0);
          buffer.writeInt16BE(value, 1);
          chunks.push(buffer);
        } else if (value >= -2147483648 && value <= 2147483647) {
          const buffer = Buffer.alloc(5);
          buffer.writeUInt8(DataType.INT32, 0);
          buffer.writeInt32BE(value, 1);
          chunks.push(buffer);
        } else {
          const buffer = Buffer.alloc(9);
          buffer.writeUInt8(DataType.INT64, 0);
          buffer.writeBigInt64BE(BigInt(value), 1);
          chunks.push(buffer);
        }
      } else {
        const buffer = Buffer.alloc(9);
        buffer.writeUInt8(DataType.FLOAT64, 0);
        buffer.writeDoubleLE(value, 1);
        chunks.push(buffer);
      }
    } else if (typeof value === 'string') {
      const strBuffer = this.encodeString(value);
      const header = Buffer.alloc(5);
      header.writeUInt8(DataType.STRING, 0);
      header.writeUInt32BE(strBuffer.length, 1);
      chunks.push(header);
      chunks.push(strBuffer);
    } else if (Buffer.isBuffer(value)) {
      const header = Buffer.alloc(5);
      header.writeUInt8(DataType.BUFFER, 0);
      header.writeUInt32BE(value.length, 1);
      chunks.push(header);
      chunks.push(value);
    } else if (Array.isArray(value)) {
      chunks.push(Buffer.from([DataType.ARRAY]));
      chunks.push(this.encodeLength(value.length));
      for (const item of value) {
        const itemBuffer = this.encodeValue(item);
        chunks.push(this.encodeLength(itemBuffer.length));
        chunks.push(itemBuffer);
      }
    } else if (typeof value === 'object') {
      chunks.push(Buffer.from([DataType.OBJECT]));
      const entries = Object.entries(value as Record<string, unknown>);
      chunks.push(this.encodeLength(entries.length));

      for (const [key, val] of entries) {
        const keyBuffer = this.encodeString(key);
        chunks.push(this.encodeLength(keyBuffer.length));
        chunks.push(keyBuffer);

        const valBuffer = this.encodeValue(val);
        chunks.push(this.encodeLength(valBuffer.length));
        chunks.push(valBuffer);
      }
    } else {
      // Fallback to JSON encoding
      const jsonStr = JSON.stringify(value);
      const strBuffer = this.encodeString(jsonStr);
      const header = Buffer.alloc(5);
      header.writeUInt8(DataType.STRING, 0);
      header.writeUInt32BE(strBuffer.length, 1);
      chunks.push(header);
      chunks.push(strBuffer);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Decode value with type information
   */
  private decodeValue(buffer: Buffer): unknown {
    if (buffer.length === 0) return null;

    let offset = 0;
    const type = buffer.readUInt8(offset) as DataType;
    offset += 1;

    switch (type) {
      case DataType.NULL:
        return null;

      case DataType.BOOLEAN:
        return buffer.readUInt8(offset) === 1;

      case DataType.INT8:
        return buffer.readInt8(offset);

      case DataType.INT16:
        return buffer.readInt16BE(offset);

      case DataType.INT32:
        return buffer.readInt32BE(offset);

      case DataType.INT64:
        return Number(buffer.readBigInt64BE(offset));

      case DataType.FLOAT32:
        return buffer.readFloatLE(offset);

      case DataType.FLOAT64:
        return buffer.readDoubleLE(offset);

      case DataType.STRING: {
        const length = buffer.readUInt32BE(offset);
        offset += 4;
        return this.decodeString(buffer.subarray(offset, offset + length));
      }

      case DataType.BUFFER: {
        const length = buffer.readUInt32BE(offset);
        offset += 4;
        return buffer.subarray(offset, offset + length);
      }

      case DataType.ARRAY: {
        const length = this.decodeLength(buffer, offset);
        offset += 4;
        const array: unknown[] = [];

        for (let i = 0; i < length; i++) {
          const itemLength = this.decodeLength(buffer, offset);
          offset += 4;
          const item = this.decodeValue(
            buffer.subarray(offset, offset + itemLength)
          );
          array.push(item);
          offset += itemLength;
        }

        return array;
      }

      case DataType.OBJECT: {
        const entryCount = this.decodeLength(buffer, offset);
        offset += 4;
        const obj: Record<string, unknown> = {};

        for (let i = 0; i < entryCount; i++) {
          // Read key
          const keyLength = this.decodeLength(buffer, offset);
          offset += 4;
          const key = this.decodeString(
            buffer.subarray(offset, offset + keyLength)
          );
          offset += keyLength;

          // Read value
          const valLength = this.decodeLength(buffer, offset);
          offset += 4;
          const val = this.decodeValue(
            buffer.subarray(offset, offset + valLength)
          );
          offset += valLength;

          obj[key] = val;
        }

        return obj;
      }

      default:
        throw new Error(`Unknown data type: ${type}`);
    }
  }

  /**
   * Create ping message
   */
  createPing(id?: string): Buffer {
    return this.encode({
      id: id || this.generateId(),
      type: MessageType.PING,
      timestamp: Date.now(),
    });
  }

  /**
   * Create pong message
   */
  createPong(id?: string): Buffer {
    return this.encode({
      id: id || this.generateId(),
      type: MessageType.PONG,
      timestamp: Date.now(),
    });
  }

  /**
   * Compress buffer (placeholder for actual compression)
   */
  compress(buffer: Buffer): Buffer {
    // Implement compression algorithm (e.g., LZ4, Snappy)
    // For now, just return the original buffer
    return buffer;
  }

  /**
   * Decompress buffer (placeholder for actual decompression)
   */
  decompress(buffer: Buffer): Buffer {
    // Implement decompression algorithm
    // For now, just return the original buffer
    return buffer;
  }

  /**
   * Calculate message size overhead
   */
  getOverhead(message: BinaryMessage): number {
    const overhead =
      4 + // Total length
      16 + // Header
      4 +
      (message.id?.length || 0) + // ID
      4 +
      (message.method?.length || 0) + // Method
      4 +
      (message.event?.length || 0) + // Event
      4 +
      (message.error?.length || 0) + // Error
      4 +
      4 +
      4; // Params, result, data length fields

    return overhead;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate message structure
   */
  validateMessage(message: BinaryMessage): boolean {
    return (
      typeof message.id === 'string' &&
      typeof message.type === 'number' &&
      Object.values(MessageType).includes(message.type) &&
      typeof message.timestamp === 'number'
    );
  }

  /**
   * Get protocol statistics
   */
  getStats(messages: BinaryMessage[]): {
    averageSize: number;
    compressionRatio: number;
    typeDistribution: Record<MessageType, number>;
  } {
    const sizes: number[] = [];
    const typeCount: Record<MessageType, number> = {} as any;

    for (const message of messages) {
      const encoded = this.encode(message);
      sizes.push(encoded.length);

      typeCount[message.type] = (typeCount[message.type] || 0) + 1;
    }

    return {
      averageSize: sizes.reduce((a, b) => a + b, 0) / sizes.length || 0,
      compressionRatio: 1.0, // Placeholder
      typeDistribution: typeCount,
    };
  }
}

export default BinaryProtocol;
