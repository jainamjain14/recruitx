import crypto from 'crypto';

/**
 * Derives a consistent 32-byte encryption key from system secret
 */
function getEncryptionKey(): Buffer {
  const secret = (process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'recruitx_secure_token_encryption_default_key_2026_production').trim();
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive OAuth tokens using AES-256-GCM authenticated encryption.
 * Format: iv:authTag:encryptedData (hex encoded)
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts sensitive OAuth tokens using AES-256-GCM.
 * Validates integrity via the authTag to prevent tampering.
 */
export function decryptToken(encryptedString: string): string {
  if (!encryptedString) return '';
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted token payload');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
