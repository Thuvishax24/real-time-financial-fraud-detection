import React, { useState, useEffect } from 'react';
import { X, Send, PlusCircle, CheckCircle, ShieldAlert, Globe, DollarSign } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function ManualTransactionModal({ isOpen, onClose, onEvaluated }) {
  if (!isOpen) return null;

  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState('150.00');
  const [merchantName, setMerchantName] = useState('Global Tech Mart');
  const [category, setCategory] = useState('RETAIL');
  const [channel, setChannel] = useState('ONLINE');
  const [city, setCity] = useState('New York');
  const [country, setCountry] = useState('US');
  const [isTrusted, setIsTrusted] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/api/customers')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data.length > 0) {
          setCustomers(res.data);
          setSelectedCustomerId(res.data[0].id);
        }
      })
      .catch(err => console.error('Failed to load customers:', err));
  }, []);

  const handleCityPreset = (presetCity, presetCountry, lat, lng) => {
    setCity(presetCity);
    setCountry(presetCountry);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
      const res = await apiFetch('/api/transactions/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          account_id: selectedCustomer?.account_id,
          amount: parseFloat(amount),
          merchant_name: merchantName,
          merchant_category: category,
          channel,
          location_city: city,
          location_country: country,
          is_trusted_device: isTrusted ? 1 : 0
        })
      }).then(r => r.json());

      if (res.success) {
        onClose();
        if (onEvaluated) {
          onEvaluated(res.data.transaction);
        }
      }
    } catch (err) {
      console.error('Evaluation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative text-slate-200">
        
        {/* Header */}
        <div className="bg-[#0F172A] px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Evaluate Custom Transaction</h3>
              <p className="text-xs text-slate-400">Feed test parameters directly into the live fraud scoring engine</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Customer Selection */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">Select Customer & Account</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 text-xs"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id}) — Home: {c.primary_city} • Avg: ${c.avg_transaction_amount} • Balance: ${c.balance?.toFixed(0)}
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Merchant */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">Amount ($ USD)</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">Merchant Name</label>
              <input
                type="text"
                required
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>
          </div>

          {/* Category & Channel */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">Merchant Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="RETAIL">RETAIL (Standard)</option>
                <option value="GROCERY">GROCERY</option>
                <option value="TRAVEL">TRAVEL</option>
                <option value="ELECTRONICS">ELECTRONICS</option>
                <option value="CRYPTO">CRYPTO (High-Risk)</option>
                <option value="GAMBLING">GAMBLING (High-Risk)</option>
                <option value="OFFSHORE_WIRE">OFFSHORE WIRE (High-Risk)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">Payment Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="ONLINE">ONLINE (Web)</option>
                <option value="POS">POS (In-Person Swipe)</option>
                <option value="MOBILE">MOBILE APP</option>
                <option value="WIRE">BANK WIRE</option>
                <option value="ATM">ATM WITHDRAWAL</option>
              </select>
            </div>
          </div>

          {/* Location & Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-semibold">Location (City, Country)</label>
              <div className="flex items-center gap-1 text-[10px] text-cyan-400">
                <span>Presets:</span>
                <button type="button" onClick={() => handleCityPreset('Tokyo', 'JP')} className="underline hover:text-cyan-300">Tokyo</button>
                <span>•</span>
                <button type="button" onClick={() => handleCityPreset('London', 'GB')} className="underline hover:text-cyan-300">London</button>
                <span>•</span>
                <button type="button" onClick={() => handleCityPreset('Lagos', 'NG')} className="underline hover:text-cyan-300">Lagos</button>
                <span>•</span>
                <button type="button" onClick={() => handleCityPreset('Singapore', 'SG')} className="underline hover:text-cyan-300">Singapore</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="City (e.g. Tokyo)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Country (e.g. JP)"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>
          </div>

          {/* Untrusted Device Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="font-semibold text-white block">Device Security Trust</span>
              <span className="text-[11px] text-slate-400">Simulate unknown device ID and proxy IP address</span>
            </div>
            <button
              type="button"
              onClick={() => setIsTrusted(!isTrusted)}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                isTrusted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {isTrusted ? 'Trusted Device' : 'Untrusted / Proxy'}
            </button>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Evaluating...' : 'Evaluate Transaction with FraudGuard'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
