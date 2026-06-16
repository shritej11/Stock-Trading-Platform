// api.js
import axios from 'axios';

const BASE = 'http://localhost:8000';

// Automatically attach token to every request
const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Simple cache
const cache = {};
const CACHE_TTL = {
  stocks:     10000,
  predict:    30000,
  sentiment:  60000,
  history:    60000,
  candles:    60000,
  indicators: 60000,
  news:       120000,
};

const cached = (key, ttl, fn) => {
  const now = Date.now();
  if (cache[key] && now - cache[key].ts < ttl) {
    return Promise.resolve({ data: cache[key].data });
  }
  return fn().then(r => {
    cache[key] = { data: r.data, ts: now };
    return r;
  });
};

export const clearCache = () => Object.keys(cache).forEach(k => delete cache[k]);

// Cached endpoints
export const fetchStocks      = ()       => cached('stocks', CACHE_TTL.stocks,      () => api.get('/stocks'));
export const fetchPredict     = (symbol) => cached(`predict_${symbol}`,    CACHE_TTL.predict,     () => api.get(`/predict/${symbol}`));
export const fetchSentiment   = (symbol) => cached(`sentiment_${symbol}`,  CACHE_TTL.sentiment,   () => api.get(`/sentiment/${symbol}`));
export const fetchHistory     = (symbol) => cached(`history_${symbol}`,    CACHE_TTL.history,     () => api.get(`/history/${symbol}?days=60`));
export const fetchCandles     = (symbol) => cached(`candles_${symbol}`,    CACHE_TTL.candles,     () => api.get(`/candles/${symbol}?days=60`));
export const fetchIndicators  = (symbol) => cached(`indicators_${symbol}`, CACHE_TTL.indicators,  () => api.get(`/indicators/${symbol}`));
export const fetchNews        = (symbol) => cached(`news_${symbol}`,       CACHE_TTL.news,        () => api.get(`/news/${symbol}`));

// Live / user-specific — never cached
export const fetchLivePrices  = ()       => api.get('/live-prices');
export const fetchLivePrice   = (symbol) => api.get(`/live-price/${symbol}`);
export const fetchLivePnl     = ()       => api.get('/portfolio/live-pnl');
export const fetchPortfolio   = ()       => api.get('/portfolio');
export const fetchAlerts      = ()       => api.get('/alerts');
export const fetchWatchlist   = ()       => api.get('/watchlist');
export const fetchAnalytics   = ()       => api.get('/portfolio/analytics');
export const fetchSummary     = ()       => api.get('/summary');
export const fetchLeaderboard = ()       => api.get('/leaderboard');
export const fetchActivity    = ()       => api.get('/leaderboard/activity');
export const fetchBotConfig   = ()       => api.get('/bot/config');
export const fetchBotTrades   = ()       => api.get('/bot/trades');
export const fetchBotLogs     = ()       => api.get('/bot/logs');

// Actions
export const placeOrder       = (data)   => api.post('/order',           data);
export const createAlert      = (data)   => api.post('/alerts',          data);
export const deleteAlert      = (id)     => api.delete(`/alerts/${id}`);
export const addWatchlist     = (symbol) => api.post('/watchlist',       { symbol });
export const removeWatchlist  = (symbol) => api.delete(`/watchlist/${symbol}`);
export const updateBotConfig  = (data)   => api.post('/bot/config',      data);
export const toggleBot        = ()       => api.post('/bot/toggle');
export const runBotNow        = ()       => api.post('/bot/run-now');

export const fetchProfile        = ()     => api.get('/settings/profile');
export const updateProfile       = (data) => api.post('/settings/profile', data);
export const changePassword      = (data) => api.post('/settings/change-password', data);
export const toggle2FA           = ()     => api.post('/settings/toggle-2fa');
export const resetPortfolio      = ()     => api.post('/settings/reset-portfolio');
export const clearWatchlist      = ()     => api.post('/settings/clear-watchlist');
export const clearAlerts         = ()     => api.post('/settings/clear-alerts');