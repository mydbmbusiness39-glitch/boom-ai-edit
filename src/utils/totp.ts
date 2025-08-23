// TOTP (Time-based One-Time Password) utilities for 2FA
export class TOTP {
  private static base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  static generateSecret(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    let result = '';
    
    for (let i = 0; i < bytes.length; i += 5) {
      const chunk = [
        bytes[i] || 0,
        bytes[i + 1] || 0,
        bytes[i + 2] || 0,
        bytes[i + 3] || 0,
        bytes[i + 4] || 0,
      ];
      
      const value = (chunk[0] << 32) +
                    (chunk[1] << 24) +
                    (chunk[2] << 16) +
                    (chunk[3] << 8) +
                    chunk[4];
      
      for (let j = 0; j < 8; j++) {
        result += this.base32Chars[(value >> (35 - j * 5)) & 31];
      }
    }
    
    return result.substring(0, 32);
  }

  static generateBackupCodes(count: 8): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const bytes = crypto.getRandomValues(new Uint8Array(4));
      const code = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  static generateQRCodeUrl(
    secret: string,
    label: string,
    issuer: string = 'BOOM AI Video'
  ): string {
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: 'SHA1',
      digits: '6',
      period: '30',
    });
    
    return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
  }

  private static base32Decode(encoded: string): Uint8Array {
    const cleanInput = encoded.replace(/=+$/, '');
    const bytes = new Uint8Array(Math.floor(cleanInput.length * 5 / 8));
    let bitBuffer = 0;
    let bitBufferLength = 0;
    let byteIndex = 0;

    for (const char of cleanInput) {
      const value = this.base32Chars.indexOf(char.toUpperCase());
      if (value === -1) throw new Error('Invalid base32 character');
      
      bitBuffer = (bitBuffer << 5) | value;
      bitBufferLength += 5;
      
      if (bitBufferLength >= 8) {
        bytes[byteIndex++] = (bitBuffer >> (bitBufferLength - 8)) & 0xff;
        bitBufferLength -= 8;
      }
    }
    
    return bytes.slice(0, byteIndex);
  }

  static async generateTOTP(secret: string, window: number = 0): Promise<string> {
    const key = this.base32Decode(secret);
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(epoch / 30) + window;
    
    // Convert time step to 8-byte big-endian
    const timeBytes = new ArrayBuffer(8);
    const timeView = new DataView(timeBytes);
    timeView.setUint32(4, timeStep, false);
    
    // Import HMAC key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    // Generate HMAC
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, timeBytes);
    const hmac = new Uint8Array(signature);
    
    // Dynamic truncation
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);
    
    return (code % 1000000).toString().padStart(6, '0');
  }

  static async verifyTOTP(token: string, secret: string): Promise<boolean> {
    // Check current window and ±1 window for clock drift tolerance
    for (let window = -1; window <= 1; window++) {
      const expectedToken = await this.generateTOTP(secret, window);
      if (token === expectedToken) {
        return true;
      }
    }
    return false;
  }
}