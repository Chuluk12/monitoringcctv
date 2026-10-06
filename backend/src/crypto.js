// Encrypts/decrypts NVR passwords before they ever touch the database.
// CRED_ENC_KEY must be a 32-byte key given as a 64-char hex string.
// Generate one with: openssl rand -hex 32
const crypto = require('crypto');

const rawKey = process.env.CRED_ENC_KEY;
if (!rawKey || rawKey.length !== 64) {
  throw new Error(
    'CRED_ENC_KEY is missing or invalid. It must be a 64-char hex string (32 bytes). ' +
    'Generate one with: openssl rand -hex 32'
  );
}
const KEY = Buffer.from(rawKey, 'hex');

function encrypt(plainText) {
  if (plainText === undefined || plainText === null || plainText === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

function decrypt(payloadB64) {
  if (!payloadB64) return null;
  const buf = Buffer.from(payloadB64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
