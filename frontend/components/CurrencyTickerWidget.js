"use client";
import React, { useState, useEffect } from "react";
import { DollarSign, RefreshCw, TrendingUp, Globe, ArrowRightLeft } from "lucide-react";
import { Badge } from "./UI.js";

const SUPPORTED_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" }
];

export default function CurrencyTickerWidget({ baseCurrency = "USD" }) {
  const [rates, setRates] = useState({});
  const [source, setSource] = useState("LOADING");
  const [loading, setLoading] = useState(true);
  const [calcAmount, setCalcAmount] = useState("1000");
  const [fromCurr, setFromCurr] = useState(baseCurrency);
  const [toCurr, setToCurr] = useState("EUR");
  const [convertedValue, setConvertedValue] = useState(null);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exchange-rate?from=${fromCurr}&to=${toCurr}`);
      if (res.ok) {
        const data = await res.json();
        if (data.rate) {
          setRates(prev => ({ ...prev, [`${fromCurr}_${toCurr}`]: data.rate }));
          setSource(data.source || "LIVE");
          const amt = parseFloat(calcAmount) || 0;
          setConvertedValue((amt * data.rate).toFixed(2));
        }
      }
    } catch (e) {
      console.error("Failed to fetch rate:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [fromCurr, toCurr]);

  const handleCalcChange = (val) => {
    setCalcAmount(val);
    const rate = rates[`${fromCurr}_${toCurr}`] || 1;
    const amt = parseFloat(val) || 0;
    setConvertedValue((amt * rate).toFixed(2));
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-700/80 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-700/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5 text-blue-400" />
            <h3 className="font-extrabold text-lg tracking-tight">Multi-Currency Global Treasury</h3>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
              source === "LIVE" ? "bg-emerald-900/80 text-emerald-300 border border-emerald-500/30" : "bg-amber-900/80 text-amber-300 border border-amber-500/30"
            }`}>
              {source === "LIVE" ? "● Live API Active" : "● Cached Rate"}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time exchange rates powered by ExchangeRate-API for multi-currency Client billing & Contractor payouts.
          </p>
        </div>

        <button
          onClick={fetchRates}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-slate-200 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} /> Refresh Rates
        </button>
      </div>

      {/* Quick Conversion Calculator Bar */}
      <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 mb-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase">Convert</span>
          <input
            type="number"
            value={calcAmount}
            onChange={e => handleCalcChange(e.target.value)}
            className="w-28 px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={fromCurr}
            onChange={e => setFromCurr(e.target.value)}
            className="px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-blue-500"
          >
            {SUPPORTED_CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
            ))}
          </select>
          <ArrowRightLeft className="w-4 h-4 text-slate-400" />
          <select
            value={toCurr}
            onChange={e => setToCurr(e.target.value)}
            className="px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-blue-500"
          >
            {SUPPORTED_CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
            ))}
          </select>
        </div>

        <div className="sm:ml-auto text-right w-full sm:w-auto bg-blue-950/60 border border-blue-800/60 px-4 py-1.5 rounded-lg">
          <span className="text-[10px] uppercase font-bold text-blue-300 block">Converted Total</span>
          <span className="text-lg font-black text-emerald-400">
            {convertedValue !== null ? `${convertedValue} ${toCurr}` : "Calculating..."}
          </span>
        </div>
      </div>

      {/* Currency Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
        {SUPPORTED_CURRENCIES.map(c => (
          <div key={c.code} className="bg-slate-800/40 border border-slate-700/50 p-2.5 rounded-xl text-center hover:border-slate-600 transition-colors">
            <span className="text-xs font-black text-slate-200 block">{c.code}</span>
            <span className="text-[11px] text-slate-400 block truncate">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
