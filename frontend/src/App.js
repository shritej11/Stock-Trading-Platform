// App.js
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import StockList from './components/StockList';
import StockDetail from './pages/StockDetail';
import Portfolio from './components/Portfolio';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AlertsPanel from './components/AlertsPanel';
import WatchlistPanel from './components/WatchlistPanel';
import CartPage from './pages/CartPage';
import { HelpPage, SupportPage, ContactPage, TicketsPage } from './pages/SupportPages';
import Login from './pages/Login';
import { colors, shadow } from './styles/theme';
import {
  fetchStocks, fetchPredict, fetchPortfolio,
  fetchAlerts, fetchWatchlist, fetchAnalytics,
  addWatchlist, removeWatchlist,
} from './services/api';

import LivePriceBar from './components/LivePriceBar';
import LivePortfolio from './components/LivePortfolio';
import BotPage from './pages/BotPage';
import SettingsPage from './pages/SettingsPage';

const Card = ({ title, children, style }) => (
  <div style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${colors.border}`,
    boxShadow: shadow.sm, padding: '18px 20px',
    ...style,
  }}>
    {title && (
      <p style={{
        fontSize: 12, fontWeight: 700, color: colors.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16,
      }}>
        {title}
      </p>
    )}
    {children}
  </div>
);

export default function App() {

  // ── Auth ──
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('access_token');
    const name = localStorage.getItem('user_name');
    const email = localStorage.getItem('user_email');
    return token ? { name, email, loggedIn: true } : null;
  });

  // ── Navigation ──
  const [page, setPage] = useState('dashboard');
  const [selectedStock, setSelectedStock] = useState(null);

  // ── Data ──
  const [stocks, setStocks] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [predict, setPredict] = useState(null);

  // ── Cart ──
  const [cart, setCart] = useState([]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    // Clear API cache so new user gets fresh data
    import('./services/api').then(m => m.clearCache());
    setUser(null);
    setStocks([]);
    setPortfolio(null);
    setAlerts([]);
    setWatchlist([]);
    setAnalytics(null);
  };

  const loadPortfolio = useCallback(() => {
    fetchPortfolio().then(r => setPortfolio(r.data)).catch(console.error);
  }, []);

  const loadAlerts = useCallback(() => {
    fetchAlerts().then(r => setAlerts(r.data.alerts)).catch(console.error);
  }, []);

  const loadWatchlist = useCallback(() => {
    fetchWatchlist().then(r => setWatchlist(r.data.watchlist)).catch(console.error);
  }, []);

  const loadAnalytics = useCallback(() => {
    fetchAnalytics().then(r => setAnalytics(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchStocks().then(r => setStocks(r.data.stocks)).catch(console.error);
    loadPortfolio();
    loadAlerts();
    loadWatchlist();
    loadAnalytics();
  }, [user]);

  // Auto-refresh alerts every 5 seconds (only when tab is active)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAlerts();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, loadAlerts]);

  // Load prediction for selected stock
  useEffect(() => {
    if (!selectedStock) return;
    fetchPredict(selectedStock).then(r => setPredict(r.data)).catch(console.error);
  }, [selectedStock]);

  // Cart handlers
  const handleAddCart = (symbol) => {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;
    setCart(prev =>
      prev.some(c => c.symbol === symbol)
        ? prev.filter(c => c.symbol !== symbol)
        : [...prev, stock]
    );
  };

  const handleRemoveCart = (symbol) => {
    setCart(prev => prev.filter(c => c.symbol !== symbol));
  };

  // Watchlist handlers
  const handleToggleWatchlist = async (symbol) => {
    const isWatched = watchlist?.some(w => w.symbol === symbol);
    try {
      if (isWatched) await removeWatchlist(symbol);
      else await addWatchlist(symbol);
      loadWatchlist();
    } catch (e) { console.error(e); }
  };

  // Navigate handler
  const handleNavigate = (pg) => {
    setPage(pg);
    setSelectedStock(null);
  };

  if (!user) return <Login onLogin={(u) => setUser(u)} />;

  const triggeredAlerts = alerts.filter(a => a.is_triggered).length;

  // If a stock is selected → show stock detail page
  if (selectedStock) {
    return (
      <div style={{ display: 'flex', background: colors.bg, minHeight: '100vh' }}>
        <Sidebar active={page} onChange={handleNavigate}
          alertCount={triggeredAlerts} cartCount={cart.length} />
        <div style={{ marginLeft: 220, flex: 1, marginTop: 60 }}>
          <Header user={user} onLogout={handleLogout}
            onNavigate={handleNavigate} cartCount={cart.length} />
          <StockDetail
            symbol={selectedStock}
            onBack={() => setSelectedStock(null)}
            cart={cart}
            onAddCart={handleAddCart}
            portfolio={portfolio}
            onOrderPlaced={() => { loadPortfolio(); loadAnalytics(); }}
            alerts={alerts}
            onRefreshAlerts={loadAlerts}
          />
        </div>
      </div>
    );
  }

  // Main dashboard layout
  return (
    <div style={{ display: 'flex', background: colors.bg, minHeight: '100vh' }}>

      {/* Sidebar */}
      <Sidebar active={page} onChange={handleNavigate}
        alertCount={triggeredAlerts} cartCount={cart.length} />

      {/* Header */}
      <Header user={user} onLogout={handleLogout}
        onNavigate={handleNavigate} cartCount={cart.length} />

      {/* Live price ticker — shows below header */}
      <div style={{
        marginLeft: 220, marginTop: 60, position: 'fixed',
        right: 0, zIndex: 98, top: 0
      }}>
        <LivePriceBar />
      </div>

      {/* Main content */}
      <div style={{
        marginLeft: 220,
        marginRight: page === 'dashboard' ? 280 : 0,
        marginTop: 98,   // changed from 60 to 98 (60 header + 38 ticker)
        flex: 1,
        padding: 24,
      }}>

        {/* DASHBOARD */}
        {page === 'dashboard' && (
          <div>
            <h2 style={{
              fontSize: 20, fontWeight: 700, color: colors.text,
              marginBottom: 4
            }}>
              Dashboard
            </h2>
            <p style={{ color: colors.textMuted, marginBottom: 20, fontSize: 13 }}>
              AI-powered stock intelligence · Click any stock to view details
            </p>

            {/* Summary cards */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
              gap: 14, marginBottom: 20,
            }}>
              {[
                {
                  label: 'Virtual Balance',
                  value: `₹${(portfolio?.balance ?? 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
                  color: colors.success,
                  icon: '💰',
                  sub: 'Available cash',
                },
                {
                  label: 'Portfolio Value',
                  value: `₹${(portfolio?.portfolio_value ?? portfolio?.balance ?? 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
                  color: colors.primary,
                  icon: '📊',
                  sub: 'Cash + holdings',
                },
                {
                  label: 'Total P&L',
                  value: `${(portfolio?.total_pnl ?? 0) >= 0 ? '+' : ''}₹${(portfolio?.total_pnl ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
                  color: (portfolio?.total_pnl ?? 0) >= 0 ? colors.success : colors.danger,
                  icon: (portfolio?.total_pnl ?? 0) >= 0 ? '📈' : '📉',
                  sub: `${(portfolio?.total_pnl_pct ?? 0) >= 0 ? '+' : ''}${(portfolio?.total_pnl_pct ?? 0).toFixed(2)}% return`,
                },
                {
                  label: 'Active Alerts',
                  value: `${alerts.filter(a => !a.is_triggered).length} active`,
                  color: triggeredAlerts > 0 ? colors.danger : colors.textMuted,
                  icon: '🔔',
                  sub: triggeredAlerts > 0
                    ? `${triggeredAlerts} triggered!`
                    : 'No triggers yet',
                },
              ].map((item, i) => (
                <div key={i} style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '16px 18px',
                  border: `1px solid ${colors.border}`,
                  boxShadow: shadow.sm,
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                        {item.label}
                      </p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: item.color }}>
                        {item.value}
                      </p>
                      <p style={{ fontSize: 11, color: colors.textLight, marginTop: 4 }}>
                        {item.sub}
                      </p>
                    </div>
                    <span style={{ fontSize: 28 }}>{item.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Watchlist preview */}
            {watchlist && watchlist.length > 0 && (
              <Card title="Watchlist" style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex', gap: 10, flexWrap: 'wrap',
                }}>
                  {watchlist.map((w, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedStock(w.symbol)}
                      style={{
                        padding: '10px 14px', borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                        cursor: 'pointer', background: '#fafafa',
                        minWidth: 120,
                      }}
                    >
                      <p style={{
                        fontSize: 13, fontWeight: 700,
                        color: colors.text
                      }}>
                        {w.symbol.replace('.NS', '')}
                      </p>
                      <p style={{
                        fontSize: 12, color: colors.textMuted,
                        marginTop: 2
                      }}>
                        ₹{w.price}
                      </p>
                      <p style={{
                        fontSize: 11, marginTop: 2,
                        color: w.change_pct >= 0 ? colors.success : colors.danger,
                      }}>
                        {w.change_pct >= 0 ? '▲' : '▼'} {Math.abs(w.change_pct)}%
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recent trades */}
            {portfolio?.trades?.length > 0 && (
              <Card title="Recent Trades">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {portfolio.trades.slice(0, 5).map((t, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: '#fafafa',
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        gap: 10
                      }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          padding: '2px 8px', borderRadius: 6,
                          background: t.action === 'BUY' ? '#f0fdf4' : '#fef2f2',
                          color: t.action === 'BUY'
                            ? colors.success : colors.danger,
                        }}>
                          {t.action}
                        </span>
                        <p style={{
                          fontSize: 13, fontWeight: 600,
                          color: colors.text
                        }}>
                          {t.symbol.replace('.NS', '')}
                        </p>
                        <p style={{ fontSize: 12, color: colors.textMuted }}>
                          × {t.quantity} shares
                        </p>
                      </div>
                      <p style={{
                        fontSize: 13, fontWeight: 700,
                        color: colors.text
                      }}>
                        ₹{t.total?.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* PORTFOLIO */}

        {page === 'portfolio' && (
          <div>
            <h2 style={{
              fontSize: 20, fontWeight: 700, color: colors.text,
              marginBottom: 20
            }}>
              My Portfolio
            </h2>
            <LivePortfolio />
          </div>
        )}

        {/* ANALYTICS */}
        {page === 'analytics' && (
          <div>
            <h2 style={{
              fontSize: 20, fontWeight: 700, color: colors.text,
              marginBottom: 20
            }}>
              Analytics
            </h2>
            <AnalyticsDashboard data={analytics} />
          </div>
        )}

        {/* ALERTS */}
        {page === 'alerts' && (
          <div>
            <h2 style={{
              fontSize: 20, fontWeight: 700, color: colors.text,
              marginBottom: 20
            }}>
              Price Alerts
            </h2>
            <Card>
              <AlertsPanel
                alerts={alerts}
                symbol={stocks[0]?.symbol || 'RELIANCE.NS'}
                currentPrice={predict?.current_price}
                onRefresh={loadAlerts}
              />
            </Card>
          </div>
        )}

        {/* WATCHLIST */}
        {page === 'watchlist' && (
          <div>
            <h2 style={{
              fontSize: 20, fontWeight: 700, color: colors.text,
              marginBottom: 20
            }}>
              My Watchlist
            </h2>
            <Card>
              <WatchlistPanel
                watchlist={watchlist}
                stocks={stocks}
                onRefresh={loadWatchlist}
              />
            </Card>
          </div>
        )}

        {/* CART */}
        {page === 'cart' && (
          <CartPage
            cart={cart}
            onRemove={handleRemoveCart}
            onCheckout={() => {
              if (cart.length > 0) setSelectedStock(cart[0].symbol);
            }}
            portfolio={portfolio}
          />
        )}

        {/* SUPPORT PAGES */}
        {page === 'help' && <HelpPage />}
        {page === 'support' && <SupportPage />}
        {page === 'contact' && <ContactPage />}
        {page === 'tickets' && <TicketsPage />}
        {page === 'bot' && <BotPage />}

        {/* SETTINGS placeholder */}
        {page === 'settings' && (
          <SettingsPage onLogout={handleLogout} />
        )}
      </div>

      {/* Right stock list — only on dashboard */}
      {page === 'dashboard' && (
        <StockList
          stocks={stocks}
          selected={selectedStock}
          onSelect={(symbol) => setSelectedStock(symbol)}
          watchlist={watchlist}
          onAddWatchlist={handleToggleWatchlist}
        />
      )}
    </div>
  );
}