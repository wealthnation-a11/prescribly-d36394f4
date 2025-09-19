/**
 * Service for handling multi-currency pricing and conversions
 */

import { supabase } from '@/integrations/supabase/client';

export interface CurrencyInfo {
  code: string;
  symbol: string;
  rate: number; // Rate to convert FROM this currency TO USD
}

export interface PricingData {
  baseUSD: number;
  localAmount: number;
  localCurrency: string;
  localSymbol: string;
}

export class CurrencyService {
  private static readonly BASE_FEE_USD = 10; // $10 base fee
  private static exchangeRates: Map<string, number> = new Map();
  private static lastUpdate: number = 0;
  private static readonly UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour

  /**
   * Get pricing for subscription plans in user's currency
   */
  static async getSubscriptionPricing(currency: string, plan: 'monthly' | 'yearly'): Promise<PricingData> {
    const monthlyPriceUSD = this.BASE_FEE_USD;
    const yearlyPriceUSD = this.BASE_FEE_USD * 10; // 10 months for yearly (2 months free)
    
    const baseUSD = plan === 'monthly' ? monthlyPriceUSD : yearlyPriceUSD;
    
    return this.convertPrice(baseUSD, currency);
  }

  /**
   * Get consultation fee in user's currency
   */
  static async getConsultationPricing(currency: string): Promise<PricingData> {
    return this.convertPrice(this.BASE_FEE_USD, currency);
  }

  /**
   * Convert USD price to local currency
   */
  static async convertPrice(usdAmount: number, targetCurrency: string): Promise<PricingData> {
    await this.updateExchangeRates();
    
    const rate = this.exchangeRates.get(targetCurrency) || 1;
    const localAmount = Math.round(usdAmount / rate); // Convert from USD to local currency
    
    const currencyInfo = this.getCurrencyInfo(targetCurrency);
    
    return {
      baseUSD: usdAmount,
      localAmount,
      localCurrency: targetCurrency,
      localSymbol: currencyInfo.symbol
    };
  }

  /**
   * Update exchange rates from Supabase
   */
  private static async updateExchangeRates(): Promise<void> {
    const now = Date.now();
    
    if (now - this.lastUpdate < this.UPDATE_INTERVAL && this.exchangeRates.size > 0) {
      return; // Use cached rates
    }

    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('currency, rate')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      this.exchangeRates.clear();
      
      if (data) {
        data.forEach(item => {
          // The rate in database should be: 1 USD = X local currency
          // But our existing NGN_TO_USD rate is: 1 NGN = X USD
          // So we need to handle this conversion
          if (item.currency === 'NGN_TO_USD') {
            this.exchangeRates.set('NGN', item.rate); // Store as NGN rate
          } else {
            this.exchangeRates.set(item.currency, item.rate);
          }
        });
      }

      // Add default rates for major currencies if not in database
      this.addDefaultRates();
      
      this.lastUpdate = now;
    } catch (error) {
      console.error('Failed to update exchange rates:', error);
      this.addDefaultRates(); // Use fallback rates
    }
  }

  /**
   * Add default exchange rates as fallback
   */
  private static addDefaultRates(): void {
    const defaults = new Map([
      ['USD', 1],
      ['NGN', 0.0012], // 1 NGN = 0.0012 USD (1 USD = ~833 NGN)
      ['GBP', 1.27], // 1 GBP = 1.27 USD
      ['EUR', 1.08], // 1 EUR = 1.08 USD
      ['CAD', 0.74], // 1 CAD = 0.74 USD
      ['AUD', 0.66], // 1 AUD = 0.66 USD
      ['INR', 0.012], // 1 INR = 0.012 USD
      ['ZAR', 0.055], // 1 ZAR = 0.055 USD
      ['KES', 0.0077], // 1 KES = 0.0077 USD
      ['GHS', 0.063], // 1 GHS = 0.063 USD
      ['EGP', 0.020], // 1 EGP = 0.020 USD
    ]);

    defaults.forEach((rate, currency) => {
      if (!this.exchangeRates.has(currency)) {
        this.exchangeRates.set(currency, rate);
      }
    });
  }

  /**
   * Get currency information
   */
  private static getCurrencyInfo(currency: string): { symbol: string } {
    const symbols: Record<string, string> = {
      'USD': '$',
      'NGN': '₦',
      'GBP': '£',
      'EUR': '€',
      'CAD': 'CA$',
      'AUD': 'AU$',
      'INR': '₹',
      'ZAR': 'R',
      'KES': 'KSh',
      'GHS': '₵',
      'EGP': 'E£'
    };

    return {
      symbol: symbols[currency] || currency
    };
  }

  /**
   * Format amount with currency symbol
   */
  static formatAmount(amount: number, currency: string): string {
    const { symbol } = this.getCurrencyInfo(currency);
    return `${symbol}${amount.toLocaleString()}`;
  }
}