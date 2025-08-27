import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { encryptionService } from '@/services/EncryptionService';
import { toast } from '@/hooks/use-toast';

interface PublicKey {
  user_id: string;
  public_key: string;
  key_version: number;
}

export const useEncryption = () => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [publicKeys, setPublicKeys] = useState<Map<string, string>>(new Map());

  // Initialize encryption service when user logs in
  useEffect(() => {
    const initializeEncryption = async () => {
      if (!user) {
        setIsInitialized(false);
        return;
      }

      try {
        await encryptionService.initialize();
        await syncPublicKey();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize encryption:', error);
        toast({
          title: "Encryption Error",
          description: "Failed to initialize secure messaging. Messages will be sent unencrypted.",
          variant: "destructive"
        });
      }
    };

    initializeEncryption();
  }, [user]);

  // Sync public key to database
  const syncPublicKey = useCallback(async () => {
    if (!user) return;

    try {
      const publicKeyString = await encryptionService.getPublicKeyString();
      
      const { error } = await supabase
        .from('user_encryption_keys')
        .upsert({
          user_id: user.id,
          public_key: publicKeyString,
          key_version: 1,
          is_active: true
        }, {
          onConflict: 'user_id,key_version'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to sync public key:', error);
    }
  }, [user]);

  // Fetch public key for a specific user
  const fetchPublicKey = useCallback(async (userId: string): Promise<string | null> => {
    // Check cache first
    if (publicKeys.has(userId)) {
      return publicKeys.get(userId)!;
    }

    try {
      const { data, error } = await supabase
        .from('user_encryption_keys')
        .select('public_key')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      if (data) {
        // Cache the public key
        setPublicKeys(prev => new Map(prev).set(userId, data.public_key));
        return data.public_key;
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch public key for user:', userId, error);
      return null;
    }
  }, [publicKeys]);

  // Encrypt message for recipient
  const encryptMessage = useCallback(async (message: string, recipientId: string): Promise<string | null> => {
    if (!isInitialized) {
      console.warn('Encryption service not initialized');
      return null;
    }

    try {
      const recipientPublicKey = await fetchPublicKey(recipientId);
      if (!recipientPublicKey) {
        console.warn('No public key found for recipient:', recipientId);
        return null;
      }

      return await encryptionService.encryptMessage(message, recipientPublicKey);
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      return null;
    }
  }, [isInitialized, fetchPublicKey]);

  // Decrypt message
  const decryptMessage = useCallback(async (encryptedMessage: string): Promise<string> => {
    if (!isInitialized) {
      return '[Encryption not initialized]';
    }

    return await encryptionService.decryptMessage(encryptedMessage);
  }, [isInitialized]);

  // Check if content is encrypted
  const isEncrypted = useCallback((content: string | null | undefined): boolean => {
    return encryptionService.isEncrypted(content);
  }, []);

  // Clear encryption data on logout
  const clearEncryptionData = useCallback(() => {
    encryptionService.clearKeys();
    setPublicKeys(new Map());
    setIsInitialized(false);
  }, []);

  // Batch fetch public keys for multiple users
  const fetchMultiplePublicKeys = useCallback(async (userIds: string[]) => {
    const uncachedUserIds = userIds.filter(id => !publicKeys.has(id));
    
    if (uncachedUserIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('user_encryption_keys')
        .select('user_id, public_key')
        .in('user_id', uncachedUserIds)
        .eq('is_active', true);

      if (error) throw error;

      if (data) {
        setPublicKeys(prev => {
          const newMap = new Map(prev);
          data.forEach(({ user_id, public_key }) => {
            newMap.set(user_id, public_key);
          });
          return newMap;
        });
      }
    } catch (error) {
      console.error('Failed to fetch multiple public keys:', error);
    }
  }, [publicKeys]);

  return {
    isInitialized,
    encryptMessage,
    decryptMessage,
    isEncrypted,
    fetchPublicKey,
    fetchMultiplePublicKeys,
    clearEncryptionData,
    syncPublicKey
  };
};