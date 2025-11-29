import { createContext, useContext, ReactNode } from 'react';
import { useAds } from '@/hooks/useAds';

interface AdContextType {
  isInitialized: boolean;
  isNative: boolean;
}

const AdContext = createContext<AdContextType>({
  isInitialized: false,
  isNative: false,
});

export const useAdContext = () => useContext(AdContext);

export const AdProvider = ({ children }: { children: ReactNode }) => {
  const adState = useAds();

  return (
    <AdContext.Provider value={adState}>
      {children}
    </AdContext.Provider>
  );
};
