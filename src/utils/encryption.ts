// End-to-end encryption utilities for media files
export class MediaEncryption {
  private static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  private static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  private static async importKey(keyString: string): Promise<CryptoKey> {
    const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async generateEncryptionKey(): Promise<{
    key: string;
    keyId: string;
  }> {
    const cryptoKey = await this.generateKey();
    const keyString = await this.exportKey(cryptoKey);
    const keyId = crypto.randomUUID();
    
    return {
      key: keyString,
      keyId
    };
  }

  static async encryptFile(
    file: File,
    encryptionKey: string
  ): Promise<{
    encryptedData: ArrayBuffer;
    iv: string;
    checksum: string;
  }> {
    const key = await this.importKey(encryptionKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const fileBuffer = await file.arrayBuffer();

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      fileBuffer
    );

    // Generate checksum for integrity verification
    const checksumBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const checksum = btoa(String.fromCharCode(...new Uint8Array(checksumBuffer)));

    return {
      encryptedData,
      iv: btoa(String.fromCharCode(...iv)),
      checksum
    };
  }

  static async decryptFile(
    encryptedData: ArrayBuffer,
    encryptionKey: string,
    iv: string,
    expectedChecksum: string
  ): Promise<ArrayBuffer> {
    const key = await this.importKey(encryptionKey);
    const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivArray },
      key,
      encryptedData
    );

    // Verify checksum
    const checksumBuffer = await crypto.subtle.digest('SHA-256', decryptedData);
    const checksum = btoa(String.fromCharCode(...new Uint8Array(checksumBuffer)));
    
    if (checksum !== expectedChecksum) {
      throw new Error('File integrity check failed');
    }

    return decryptedData;
  }
}

// Utility to generate secure API tokens
export class TokenGenerator {
  static async generateApiToken(): Promise<{
    token: string;
    hash: string;
  }> {
    // Generate 32 random bytes
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = btoa(String.fromCharCode(...tokenBytes))
      .replace(/[+/]/g, c => c === '+' ? '-' : '_')
      .replace(/=/g, '');

    // Hash the token for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

    return { token, hash };
  }

  static async verifyToken(token: string, expectedHash: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    
    return hash === expectedHash;
  }
}