import { getExchangeRate } from '../services/exchangeRateService.js';

/**
 * GET /api/exchange-rate?from=USD&to=INR
 *
 * Thin proxy that keeps the OpenExchangeRates API key server-side.
 * Returns the live (or fallback) conversion rate between two currencies.
 * Used by the Assignments UI to show a live rate preview before locking.
 */
export async function handleExchangeRate(req, pathSegments, queryParams) {
  if (req.method !== 'GET') {
    return { status: 405, body: { error: 'Method Not Allowed' } };
  }

  const from = (queryParams.get('from') || 'USD').toUpperCase();
  const to   = (queryParams.get('to')   || 'USD').toUpperCase();

  const SUPPORTED = ['USD','EUR','GBP','INR','AUD','CAD','SGD','JPY','AED','MYR'];

  if (!SUPPORTED.includes(from)) {
    return { status: 400, body: { error: `Unsupported currency: ${from}. Supported: ${SUPPORTED.join(', ')}` } };
  }
  if (!SUPPORTED.includes(to)) {
    return { status: 400, body: { error: `Unsupported currency: ${to}. Supported: ${SUPPORTED.join(', ')}` } };
  }

  try {
    const result = await getExchangeRate(from, to);
    return {
      status: 200,
      body: {
        from: result.from,
        to: result.to,
        rate: result.rate,
        source: result.source,
        cached_at: result.cachedAt,
        display: `1 ${result.from} = ${result.rate.toFixed(4)} ${result.to}`
      }
    };
  } catch (err) {
    console.error('[ExchangeRateAPI]', err);
    return { status: 500, body: { error: 'Failed to fetch exchange rate', detail: err.message } };
  }
}
