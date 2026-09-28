import crypto from 'crypto';

// Default private key corresponding to embedded client public key: 45c783323732ccea635bea4bd23dfa1f57a0ad6592945c450e1383df9807dbb0
const DEFAULT_PRIVATE_KEY_HEX = "312a68ad1507727852dfccac88deac9197d7c365aeba84167145bcaeec79959d";

export function getPrivateKey(): crypto.KeyObject {
  const hex = (process.env.LICENSE_PRIVATE_KEY || DEFAULT_PRIVATE_KEY_HEX).trim();
  // Standard Ed25519 PKCS#8 DER header
  const pkcs8Header = Buffer.from("302e020100300506032b657004220420", "hex");
  const privKeyDer = Buffer.concat([pkcs8Header, Buffer.from(hex, "hex")]);

  return crypto.createPrivateKey({
    key: privKeyDer,
    format: "der",
    type: "pkcs8",
  });
}

/**
 * Signs an arbitrary canonical JSON payload using the backend's Ed25519 private key.
 * Produces a Base64-encoded 64-byte signature that the desktop client verifies.
 */
export function signLicensePayload(payloadObject: Record<string, any>): string {
  const canonicalJson = JSON.stringify(payloadObject);
  const privateKey = getPrivateKey();
  const signatureBuffer = crypto.sign(null, Buffer.from(canonicalJson), privateKey);
  return signatureBuffer.toString("base64");
}
