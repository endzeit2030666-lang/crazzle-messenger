'use client';

// Helper to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Import a stored private key from localStorage
async function getPrivateKey(): Promise<CryptoKey | null> {
  const jwk = localStorage.getItem('privateKey');
  if (!jwk) {
    console.error('Private key not found in storage.');
    return null;
  }
  try {
    return await window.crypto.subtle.importKey(
      'jwk',
      JSON.parse(jwk),
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );
  } catch (e) {
    console.error('Error importing private key:', e);
    return null;
  }
}

// Import a base64 encoded public key
async function importPublicKey(publicKeyB64: string): Promise<CryptoKey | null> {
  try {
    const publicKeySpki = base64ToArrayBuffer(publicKeyB64);
    return await window.crypto.subtle.importKey(
      'spki',
      publicKeySpki,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );
  } catch (e) {
    console.error('Error importing public key:', e);
    return null;
  }
}

// Derive a shared secret key for encryption
async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt a message
export async function encryptMessage(
  recipientPublicKeyB64: string,
  plaintext: string
): Promise<string | null> {
  const privateKey = await getPrivateKey();
  const publicKey = await importPublicKey(recipientPublicKeyB64);

  if (!privateKey || !publicKey) {
    console.error('Could not retrieve keys for encryption.');
    return null;
  }

  const sharedKey = await deriveSharedKey(privateKey, publicKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // AES-GCM IV
  const encodedText = new TextEncoder().encode(plaintext);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    sharedKey,
    encodedText
  );

  // Combine IV and ciphertext for storage, then base64 encode
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return arrayBufferToBase64(combined.buffer);
}


// Decrypt a message
export async function decryptMessage(
  senderPublicKeyB64: string,
  ciphertextB64: string
): Promise<string | null> {
  const privateKey = await getPrivateKey();
  const publicKey = await importPublicKey(senderPublicKeyB64);

  if (!privateKey || !publicKey) {
    console.error('Could not retrieve keys for decryption.');
    return null;
  }

  try {
    const sharedKey = await deriveSharedKey(privateKey, publicKey);
    
    const combined = base64ToArrayBuffer(ciphertextB64);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      sharedKey,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch(e) {
    console.error("Decryption failed", e);
    return "🔓 Entschlüsselung fehlgeschlagen";
  }
}
