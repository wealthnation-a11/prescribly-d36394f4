/**
 * Service for detecting user's geographic location and currency
 */

export interface LocationData {
  country: string;
  countryCode: string;
  currency: string;
  currencySymbol: string;
}

export interface CurrencyRate {
  code: string;
  rate: number;
  symbol: string;
}

// Currency mapping for different countries
const CURRENCY_MAP: Record<string, { currency: string; symbol: string }> = {
  'NG': { currency: 'NGN', symbol: '₦' },
  'US': { currency: 'USD', symbol: '$' },
  'GB': { currency: 'GBP', symbol: '£' },
  'CA': { currency: 'CAD', symbol: 'CA$' },
  'AU': { currency: 'AUD', symbol: 'AU$' },
  'FR': { currency: 'EUR', symbol: '€' },
  'DE': { currency: 'EUR', symbol: '€' },
  'IT': { currency: 'EUR', symbol: '€' },
  'ES': { currency: 'EUR', symbol: '€' },
  'NL': { currency: 'EUR', symbol: '€' },
  'BE': { currency: 'EUR', symbol: '€' },
  'AT': { currency: 'EUR', symbol: '€' },
  'IE': { currency: 'EUR', symbol: '€' },
  'PT': { currency: 'EUR', symbol: '€' },
  'GR': { currency: 'EUR', symbol: '€' },
  'FI': { currency: 'EUR', symbol: '€' },
  'IN': { currency: 'INR', symbol: '₹' },
  'ZA': { currency: 'ZAR', symbol: 'R' },
  'KE': { currency: 'KES', symbol: 'KSh' },
  'GH': { currency: 'GHS', symbol: '₵' },
  'EG': { currency: 'EGP', symbol: 'E£' },
};

// Default to USD for unknown countries
const DEFAULT_CURRENCY = { currency: 'USD', symbol: '$' };

export class GeoLocationService {
  private static locationCache: LocationData | null = null;
  private static cacheExpiry: number = 0;
  private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  /**
   * Get user's location and currency based on IP
   */
  static async getUserLocation(): Promise<LocationData> {
    // Check cache first
    if (this.locationCache && Date.now() < this.cacheExpiry) {
      return this.locationCache;
    }

    try {
      // Try multiple geolocation services for reliability
      let locationData = await this.tryIpapi();
      if (!locationData) {
        locationData = await this.tryFallbackDetection();
      }

      if (locationData) {
        this.locationCache = locationData;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
        return locationData;
      }
    } catch (error) {
      console.warn('Geolocation detection failed:', error);
    }

    // Fallback to default (US/USD)
    return this.getDefaultLocation();
  }

  /**
   * Try primary IP geolocation service
   */
  private static async tryIpapi(): Promise<LocationData | null> {
    try {
      const response = await fetch('https://ipapi.co/json/', {
        timeout: 5000
      } as any);
      
      if (!response.ok) throw new Error('IP API failed');
      
      const data = await response.json();
      
      if (data.error) throw new Error(data.reason || 'IP API error');

      const currencyInfo = CURRENCY_MAP[data.country_code] || DEFAULT_CURRENCY;
      
      return {
        country: data.country_name,
        countryCode: data.country_code,
        currency: currencyInfo.currency,
        currencySymbol: currencyInfo.symbol
      };
    } catch (error) {
      console.warn('Ipapi service failed:', error);
      return null;
    }
  }

  /**
   * Fallback detection using browser language and timezone
   */
  private static async tryFallbackDetection(): Promise<LocationData | null> {
    try {
      // Use browser language as fallback
      const language = navigator.language;
      const countryCode = language.split('-')[1]?.toUpperCase();
      
      if (countryCode && CURRENCY_MAP[countryCode]) {
        const currencyInfo = CURRENCY_MAP[countryCode];
        
        return {
          country: countryCode,
          countryCode: countryCode,
          currency: currencyInfo.currency,
          currencySymbol: currencyInfo.symbol
        };
      }
    } catch (error) {
      console.warn('Fallback detection failed:', error);
    }
    
    return null;
  }

  /**
   * Get default location (US/USD)
   */
  private static getDefaultLocation(): LocationData {
    return {
      country: 'United States',
      countryCode: 'US',
      currency: 'USD',
      currencySymbol: '$'
    };
  }

  /**
   * Check if user is in Nigeria (for Paystack)
   */
  static async isNigerianUser(): Promise<boolean> {
    const location = await this.getUserLocation();
    return location.countryCode === 'NG';
  }

  /**
   * Get supported payment provider for user's location
   */
  static async getPaymentProvider(): Promise<'paystack' | 'stripe'> {
    const isNigerian = await this.isNigerianUser();
    return isNigerian ? 'paystack' : 'stripe';
  }
}