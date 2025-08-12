/**
 * Currency utility functions for USD formatting and NGN to USD conversion
 */

/**
 * Formats a number as USD currency
 * @param amount - The amount to format
 * @returns Formatted USD string (e.g., "$1,234.56")
 */
export const formatUSD = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Converts NGN amount to USD using exchange rate
 * @param ngnAmount - Amount in Nigerian Naira
 * @param exchangeRate - NGN to USD conversion rate
 * @returns Amount in USD
 */
export const convertNGNtoUSD = (ngnAmount: number, exchangeRate: number): number => {
  if (!ngnAmount || !exchangeRate) return 0;
  return ngnAmount * exchangeRate;
};

/**
 * Formats NGN amount as USD after conversion
 * @param ngnAmount - Amount in Nigerian Naira
 * @param exchangeRate - NGN to USD conversion rate
 * @returns Formatted USD string
 */
export const formatNGNAsUSD = (ngnAmount: number | null | undefined, exchangeRate: number): string => {
  if (!ngnAmount || !exchangeRate) return '$0.00';
  const usdAmount = convertNGNtoUSD(ngnAmount, exchangeRate);
  return formatUSD(usdAmount);
};