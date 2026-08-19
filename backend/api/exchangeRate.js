/**
 * --------------------------------------------------------------------------------
 * LIVE EXCHANGE RATE PROXY HANDLER (/api/exchange-rate)
 * --------------------------------------------------------------------------------
 * Core Logic & Workflow:
 *  - Serves as a secure server-side proxy for live foreign exchange rates.
 *  - Keeps third-party ExchangeRate-API keys hidden from client browsers.
 *  - Integrates with `exchangeRateService` which caches live conversion rates in-memory for 1 hour.
 *  - Supports 10 core international currencies: USD, EUR, GBP, INR, AUD, CAD, SGD, JPY, AED, MYR.
 *  - Used by Assignments & Client Invoices UIs for real-time FX previews before locking contract rates.
 *
 * Supported Operations:
 *  - GET /api/exchange-rate?from=USD&to=INR
 *      Returns exact conversion rate, source indicator (LIVE/CACHE/FALLBACK), and formatted display text.
 * --------------------------------------------------------------------------------
 */
import { getExchangeRate } from '../services/exchangeRateService.js';

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
