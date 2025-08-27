/**
 * End-to-End Encryption Service
 * Provides client-side encryption/decryption for chat messages
 * Uses Web Crypto API for RSA-OAEP encryption
 */

interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

interface StoredKeyPair {
  publicKey: string;
  privateKey: string;
}

export class EncryptionService {
  private keyPair: KeyPair | null = null;
  private readonly STORAGE_KEY = 'chat_encryption_keys';
  private readonly KEY_VERSION = 1;

  /**
   * Initialize encryption service - generate or load existing keys
   */
  async initialize(): Promise<void> {
    try {
      await this.loadOrGenerateKeys();
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
      throw new Error('Encryption service initialization failed');
    }
  }

  /**
   * Generate a new RSA key pair
   */
  private async generateKeyPair(): Promise<KeyPair> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true, // extractable
      ["encrypt", "decrypt"]
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }

  /**
   * Export key to base64 string format
   */
  private async exportKey(key: CryptoKey, format: 'spki' | 'pkcs8'): Promise<string> {
    const exported = await crypto.subtle.exportKey(format, key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  /**
   * Import key from base64 string format
   */
  private async importKey(keyData: string, format: 'spki' | 'pkcs8', usage: KeyUsage[]): Promise<CryptoKey> {
    const binaryString = atob(keyData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return await crypto.subtle.importKey(
      format,
      bytes.buffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      usage
    );
  }

  /**
   * Store key pair in localStorage
   */
  private async storeKeyPair(keyPair: KeyPair): Promise<void> {
    const publicKeyString = await this.exportKey(keyPair.publicKey, 'spki');
    const privateKeyString = await this.exportKey(keyPair.privateKey, 'pkcs8');

    const storedKeyPair: StoredKeyPair = {
      publicKey: publicKeyString,
      privateKey: privateKeyString
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedKeyPair));
  }

  /**
   * Load or generate encryption keys
   */
  private async loadOrGenerateKeys(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      
      if (stored) {
        const { publicKey, privateKey }: StoredKeyPair = JSON.parse(stored);
        
        this.keyPair = {
          publicKey: await this.importKey(publicKey, 'spki', ['encrypt']),
          privateKey: await this.importKey(privateKey, 'pkcs8', ['decrypt'])
        };
      } else {
        // Generate new key pair
        this.keyPair = await this.generateKeyPair();
        await this.storeKeyPair(this.keyPair);
      }
    } catch (error) {
      console.error('Error loading keys, generating new ones:', error);
      this.keyPair = await this.generateKeyPair();
      await this.storeKeyPair(this.keyPair);
    }
  }

  /**
   * Get public key as string for sharing
   */
  async getPublicKeyString(): Promise<string> {
    if (!this.keyPair) {
      throw new Error('Encryption service not initialized');
    }
    
    return await this.exportKey(this.keyPair.publicKey, 'spki');
  }

  /**
   * Encrypt message using recipient's public key
   */
  async encryptMessage(message: string, recipientPublicKeyString: string): Promise<string> {
    try {
      const recipientPublicKey = await this.importKey(
        recipientPublicKeyString, 
        'spki', 
        ['encrypt']
      );

      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      
      const encrypted = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        recipientPublicKey,
        data
      );

      return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt message using own private key
   */
  async decryptMessage(encryptedMessage: string): Promise<string> {
    try {
      if (!this.keyPair) {
        throw new Error('Encryption service not initialized');
      }

      const binaryString = atob(encryptedMessage);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const decrypted = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        this.keyPair.privateKey,
        bytes.buffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[Encrypted message - decryption failed]';
    }
  }

  /**
   * Check if message content is encrypted
   */
  isEncrypted(content: string | null | undefined): boolean {
    if (!content) return false;
    // Check if it looks like base64 encrypted content
    return content.length > 32 && /^[A-Za-z0-9+/=]+$/.test(content);
  }

  /**
   * Clear stored keys (for logout/reset)
   */
  clearKeys(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.keyPair = null;
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();