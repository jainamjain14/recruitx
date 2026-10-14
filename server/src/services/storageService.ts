import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  buffer?: Buffer;
  mimeType?: string;
  fileName?: string;
  sizeBytes?: number;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Megabytes
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export class StorageService {
  private static uploadBaseDir = path.resolve(process.cwd(), 'uploads');

  /**
   * Validate uploaded base64 or buffer payload against security rules
   */
  static validateUpload(
    base64OrBuffer: string | Buffer,
    declaredMimeType: string = 'application/pdf',
    originalFileName: string = 'document.pdf'
  ): FileValidationResult {
    let buffer: Buffer;

    if (typeof base64OrBuffer === 'string') {
      const cleanBase64 = base64OrBuffer.includes(',')
        ? base64OrBuffer.split(',')[1]
        : base64OrBuffer;

      try {
        buffer = Buffer.from(cleanBase64, 'base64');
      } catch {
        return { valid: false, error: 'Malformed base64 file data' };
      }
    } else {
      buffer = base64OrBuffer;
    }

    // 1. File size enforcement
    if (buffer.length === 0) {
      return { valid: false, error: 'Uploaded file is empty (0 bytes)' };
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size exceeds 5MB limit (current: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`,
      };
    }

    // 2. MIME type whitelist check
    const normalizedMime = declaredMimeType.toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
      return {
        valid: false,
        error: `File type '${declaredMimeType}' is not allowed. Supported formats: PDF, PNG, JPEG, WebP.`,
      };
    }

    // 3. Magic bytes / header inspection
    if (normalizedMime === 'application/pdf') {
      const header = buffer.subarray(0, 4).toString('utf-8');
      if (!header.startsWith('%PDF')) {
        return { valid: false, error: 'File claims to be PDF but has invalid signature' };
      }
    }

    return {
      valid: true,
      buffer,
      mimeType: normalizedMime,
      fileName: originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_'),
      sizeBytes: buffer.length,
    };
  }

  /**
   * Save uploaded file to secure storage and return public relative URL
   */
  static async saveFile(
    studentId: string,
    buffer: Buffer,
    fileName: string,
    category: 'resumes' | 'avatars' = 'resumes'
  ): Promise<{ fileUrl: string; filePath: string }> {
    const targetDir = path.join(this.uploadBaseDir, category, studentId);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const safeName = `${Date.now()}_${randomSuffix}_${fileName}`;
    const fullPath = path.join(targetDir, safeName);

    await fs.promises.writeFile(fullPath, buffer);

    const relativeUrl = `/uploads/${category}/${studentId}/${safeName}`;
    return { fileUrl: relativeUrl, filePath: fullPath };
  }
}
