/**
 * Exchange Rate Service
 *
 * Fetches live USD-base exchange rates from ExchangeRate-API (v6).
 * Results are cached in-memory for 1 hour to minimise API usage.
 *
 * Env: EXCHANGE_RATE_API_KEY in .env.local
 *
 * Falls back to a hardcoded table of reasonable approximations so payroll
 * generation NEVER blocks even if the API is unavailable.
 */

const FALLBACK_RATES = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  AUD: 1.53,
  CAD: 1.36,
  SGD: 1.34,
  JPY: 149.0,
  AED: 3.67,
  MYR: 4.72
};

// In-memory cache: { rates: {}, baseCurrency: 'USD', fetchedAt: Date }
let rateCache = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch or return cached rates object (all vs USD base).
 * @returns {Promise<{rates: Object, source: string}>}
 */
async function fetchRatesFromAPI() {
  const appId = process.env.EXCHANGE_RATE_API_KEY;

  if (!appId) {
    console.warn('[ExchangeRateService] No EXCHANGE_RATE_API_KEY set. Using fallback rates.');
    return { rates: FALLBACK_RATES, source: 'FALLBACK' };
  }

  try {
    const url = `https://v6.exchangerate-api.com/v6/${appId}/latest/USD`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      throw new Error(`ExchangeRate-API responded ${res.status}`);
    }

    const data = await res.json();
    if (!data.conversion_rates || typeof data.conversion_rates !== 'object') {
      throw new Error('Unexpected API response structure');
    }

    return { rates: { USD: 1.0, ...data.conversion_rates }, source: 'LIVE' };
  } catch (err) {
    console.warn(`[ExchangeRateService] API fetch failed: ${err.message}. Using fallback rates.`);
    return { rates: FALLBACK_RATES, source: 'FALLBACK' };
  }
}

/**
 * Get the latest rates (cached or freshly fetched).
 * @returns {Promise<{rates: Object, source: string, cachedAt: string}>}
 */
async function getLatestRates() {
  const now = Date.now();

  if (rateCache && (now - rateCache.fetchedAt) < CACHE_TTL_MS) {
    return {
      rates: rateCache.rates,
      source: rateCache.source,
      cachedAt: new Date(rateCache.fetchedAt).toISOString()
    };
  }

  const { rates, source } = await fetchRatesFromAPI();
  rateCache = { rates, source, fetchedAt: now };

  return {
    rates,
    source,
    cachedAt: new Date(now).toISOString()
  };
}

/**
 * Get the conversion rate from one currency to another.
 *
 * Since OpenExchangeRates uses USD as base, conversion is:
 *   fromUSD = rates[from]    (how many `from` per 1 USD)
 *   toUSD   = rates[to]      (how many `to` per 1 USD)
 *   rate    = toUSD / fromUSD
 *
 * Example: USD → INR = 83.5 / 1 = 83.5
 *          EUR → INR = 83.5 / 0.92 ≈ 90.76
 *
 * @param {string} fromCurrency - ISO 4217 code, e.g. 'USD'
 * @param {string} toCurrency   - ISO 4217 code, e.g. 'INR'
 * @returns {Promise<{rate: number, from: string, to: string, source: string, cachedAt: string}>}
 */
export async function getExchangeRate(fromCurrency, toCurrency) {
  const from = (fromCurrency || 'USD').toUpperCase();
  const to   = (toCurrency   || 'USD').toUpperCase();

  if (from === to) {
    return { rate: 1.0, from, to, source: 'IDENTITY', cachedAt: new Date().toISOString() };
  }

  const { rates, source, cachedAt } = await getLatestRates();

  const fromRate = rates[from] ?? FALLBACK_RATES[from] ?? 1.0;
  const toRate   = rates[to]   ?? FALLBACK_RATES[to]   ?? 1.0;

  const rate = Math.round((toRate / fromRate) * 1000000) / 1000000; // 6 decimal precision

  return { rate, from, to, source, cachedAt };
}

/**
 * Invalidate the rate cache (useful after admin overrides or for testing).
 */
export function clearRateCache() {
  rateCache = null;
}
