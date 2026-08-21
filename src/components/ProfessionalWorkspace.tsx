import {
  Activity,
  BarChart3,
  Database,
  Filter,
  FlaskConical,
  Layers3,
  Loader,
  Mail,
  PanelRightOpen,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';
import { FilterCriteria, StockFilters } from './StockFilters';
import { FundamentalsView } from './FundamentalsView';
import FundamentalsStrip from './FundamentalsStrip';
import SetupLabModal from './SetupLabModal';
import StockDetailPanel from './StockDetailPanel';
import StockSidebar from './StockSidebar';
import TradingViewChart from './TradingViewChart';
import { WatchlistPanel } from './WatchlistPanel';
import EmailPanel from './EmailPanel';
import MinerviniCommandCenter from './MinerviniCommandCenter';
import { Stock, StockFundamentals, Watchlist } from '../types';

interface MarketPulse {
  total: number;
  advancers: number;
  breadth: number;
  trendQuality: number;
  leaders: number;
  averageChange: number;
}

interface ProfessionalWorkspaceProps {
  activeSection: 'screener' | 'email';
  setActiveSection: Dispatch<SetStateAction<'screener' | 'email'>>;
  dataProvider: 'local-engine' | 'direct-market' | 'cache';
  loadError: string | null;
  lastUpdate: Date | null;
  loading: boolean;
  presetSyncing: boolean;
  firstMinerviniWatchlistId: string | null;
  onOpenMinerviniLists: () => void;
  onOpenSetupLab: () => void;
  onOpenFilters: () => void;
  onRefresh: () => void;
  activeFilters: FilterCriteria;
  viewMode: 'default' | 'all' | 'indices';
  activeWatchlist: string | null;
  screenedStocks: Stock[];
  watchlists: Watchlist[];
  onSelectAll: () => void;
  onSelectIndices: () => void;
  onSelectWatchlist: (id: string | null) => void;
  onCreateWatchlist: (name: string) => void;
  onDeleteWatchlist: (id: string) => void;
  onRenameWatchlist: (id: string, name: string) => void;
  onCreateWithFilters: () => void;
  stocks: Stock[];
  intelligenceUniverse: Stock[];
  selectedStock: Stock | null;
  onSelectStock: (stock: Stock) => void;
  fundamentals: StockFundamentals | null;
  fundamentalsLoading: boolean;
  fundamentalsError: string | null;
  showInfoSidebar: boolean;
  setShowInfoSidebar: Dispatch<SetStateAction<boolean>>;
  marketPulse: MarketPulse;
  showFundamentals: boolean;
  setShowFundamentals: Dispatch<SetStateAction<boolean>>;
  showFilters: boolean;
  closeFilters: () => void;
  applyFilters: (criteria: FilterCriteria, results?: Stock[], watchlistName?: string) => void;
  isCreatingWatchlistWithFilters: boolean;
  showSetupLab: boolean;
  closeSetupLab: () => void;
  onSetupSaved: () => void;
  onApplyIntelligence: (stocks: Stock[], label: string) => void;
}

const PulseMetric = ({ label, value, detail, tone = 'neutral' }: {
  label: string;
  value: string;
  detail: string;
  tone?: 'positive' | 'negative' | 'neutral';
}) => (
  <div className="pulse-metric">
    <span>{label}</span>
    <strong className={tone === 'positive' ? 'text-emerald-300' : tone === 'negative' ? 'text-rose-300' : 'text-white'}>{value}</strong>
    <small>{detail}</small>
  </div>
);

export default function ProfessionalWorkspace(props: ProfessionalWorkspaceProps) {
  const activeFilterCount = Object.keys(props.activeFilters).length;
  const selectedWatchlist = props.watchlists.find((watchlist) => watchlist.id === props.activeWatchlist);
  const contextLabel = props.screenedStocks.length > 0
    ? 'Resultado del filtro'
    : selectedWatchlist?.name || (props.viewMode === 'indices' ? 'Índices globales' : 'Mercado EE. UU.');
  const providerCopy = props.dataProvider === 'local-engine'
    ? 'Motor privado'
    : props.dataProvider === 'cache'
      ? 'Última sesión'
      : 'TradingView directo';

  return (
    <div className="app-shell">
      <header className="workspace-header">
        <div className="brand-lockup">
          <div className="brand-mark"><TrendingUp size={19} strokeWidth={2.4} /></div>
          <div>
            <div className="flex items-center gap-2">
              <h1>Northstar</h1>
              <span className="brand-edition">PRO</span>
            </div>
            <p>Market intelligence workspace</p>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Navegación principal">
          <button className={props.activeSection === 'screener' ? 'active' : ''} onClick={() => props.setActiveSection('screener')}>
            <BarChart3 size={14} /> Screener
          </button>
          <button className={props.activeSection === 'email' ? 'active' : ''} onClick={() => props.setActiveSection('email')}>
            <Mail size={14} /> Research inbox
          </button>
        </nav>

        <div className="header-status">
          <div className="source-status" title={`Fuente actual: ${providerCopy}`}>
            <span className="status-dot" />
            <div>
              <strong>{providerCopy}</strong>
              <small>{props.lastUpdate ? props.lastUpdate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : 'Sincronizando'}</small>
            </div>
          </div>
          {props.activeSection === 'screener' && (
            <button className="primary-action compact" onClick={props.onRefresh} disabled={props.loading} title="Actualizar universo">
              {props.loading ? <Loader className="animate-spin" size={15} /> : <RefreshCw size={15} />}
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          )}
        </div>
      </header>

      {props.activeSection === 'email' ? <EmailPanel /> : (
        <>
          <div className="command-bar">
            <div className="context-title">
              <span className="eyebrow">Workspace activo</span>
              <strong>{contextLabel}</strong>
              <span className="context-count">{props.stocks.length.toLocaleString('es-CO')} símbolos</span>
            </div>

            <div className="action-cluster">
              <button
                className="toolbar-action"
                onClick={props.onOpenMinerviniLists}
                disabled={props.loading || props.presetSyncing || !props.firstMinerviniWatchlistId}
                title="Sincronizar listas de momentum"
              >
                {props.presetSyncing ? <Loader className="animate-spin" size={14} /> : <Sparkles size={14} />}
                Momentum lists
              </button>
              <button className="toolbar-action" onClick={props.onOpenSetupLab}>
                <FlaskConical size={14} /> Setup lab
              </button>
              <button className={`toolbar-action ${activeFilterCount > 0 ? 'active' : ''}`} onClick={props.onOpenFilters}>
                <Filter size={14} /> Filtros
                {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
              </button>
            </div>
          </div>

          <MinerviniCommandCenter
            universe={props.intelligenceUniverse}
            marketPulse={props.marketPulse}
            selectedStock={props.selectedStock}
            onSelectStock={props.onSelectStock}
            onApplyResults={props.onApplyIntelligence}
          />

          <div className="watchlist-rail">
            <div className="rail-label"><Layers3 size={13} /> Universos</div>
            <button onClick={props.onSelectAll} className={`rail-chip ${props.viewMode === 'all' && !props.activeWatchlist && props.screenedStocks.length === 0 ? 'active' : ''}`}>
              Todas
            </button>
            <button onClick={props.onSelectIndices} className={`rail-chip ${props.viewMode === 'indices' && !props.activeWatchlist ? 'active' : ''}`}>
              Índices
            </button>
            {props.screenedStocks.length > 0 && <span className="rail-chip result"><Filter size={11} /> Resultado</span>}
            <div className="rail-divider" />
            <WatchlistPanel
              watchlists={props.watchlists}
              activeWatchlist={props.activeWatchlist}
              onSelectWatchlist={props.onSelectWatchlist}
              onCreateWatchlist={props.onCreateWatchlist}
              onDeleteWatchlist={props.onDeleteWatchlist}
              onRenameWatchlist={props.onRenameWatchlist}
              onCreateWithFilters={props.onCreateWithFilters}
              onRefreshPresets={props.onOpenMinerviniLists}
            />
          </div>

          <section className="market-pulse" aria-label="Pulso del universo">
            <div className="pulse-heading">
              <Activity size={15} />
              <div><span>Market pulse</span><small>Lectura del universo activo</small></div>
            </div>
            <PulseMetric label="Amplitud" value={`${props.marketPulse.breadth}%`} detail={`${props.marketPulse.advancers} avanzan`} tone={props.marketPulse.breadth >= 55 ? 'positive' : props.marketPulse.breadth < 45 ? 'negative' : 'neutral'} />
            <PulseMetric label="Cambio medio" value={`${props.marketPulse.averageChange >= 0 ? '+' : ''}${props.marketPulse.averageChange.toFixed(2)}%`} detail="Sesión actual" tone={props.marketPulse.averageChange >= 0 ? 'positive' : 'negative'} />
            <PulseMetric label="Sobre SMA 50" value={`${props.marketPulse.trendQuality}%`} detail="Calidad de tendencia" tone={props.marketPulse.trendQuality >= 60 ? 'positive' : 'neutral'} />
            <PulseMetric label="Líderes RS" value={props.marketPulse.leaders.toLocaleString('es-CO')} detail="Rating 80 o superior" />
            <div className="pulse-trust"><ShieldCheck size={14} /><span>Datos validados<br /><small>Sin simulaciones</small></span></div>
          </section>

          {props.loadError && <div className="system-alert">{props.loadError}</div>}

          <main className="workspace-body">
            {props.loading && props.stocks.length === 0 ? (
              <div className="sidebar-loading">
                <div className="loading-orbit"><Loader className="animate-spin" size={22} /></div>
                <strong>Construyendo universo</strong>
                <span>Precios, momentum y estructura técnica</span>
              </div>
            ) : (
              <StockSidebar stocks={props.stocks} selectedStock={props.selectedStock} onSelectStock={props.onSelectStock} />
            )}

            <div className="analysis-canvas">
              {props.selectedStock ? (
                <>
                  <div className="chart-stack">
                    <div className="chart-context">
                      <div>
                        <span className="eyebrow">Análisis técnico</span>
                        <strong>{props.selectedStock.symbol} · {props.selectedStock.name}</strong>
                      </div>
                      <div className="chart-quick-stats">
                        <span>RS <b>{Math.round(props.selectedStock.relativeStrength)}</b></span>
                        <span>Vol <b>{(props.selectedStock.volume / 1_000_000).toFixed(1)}M</b></span>
                        <span>RVol <b>{(props.selectedStock.relativeVolume10d || 0).toFixed(2)}×</b></span>
                      </div>
                    </div>
                    <div className="chart-surface">
                      <TradingViewChart symbol={props.selectedStock.symbol} theme="dark" />
                    </div>
                    {props.fundamentals?.quarterlyData?.length ? <FundamentalsStrip fundamentals={props.fundamentals} /> : null}
                  </div>

                  {props.showInfoSidebar ? (
                    <StockDetailPanel
                      stock={props.selectedStock}
                      fundamentals={props.fundamentals}
                      fundamentalsLoading={props.fundamentalsLoading}
                      fundamentalsError={props.fundamentalsError}
                      onClose={() => props.setShowInfoSidebar(false)}
                      onOpenFundamentals={() => props.setShowFundamentals(true)}
                      onSetupSaved={props.onSetupSaved}
                    />
                  ) : (
                    <button className="reopen-panel" onClick={() => props.setShowInfoSidebar(true)} title="Mostrar intelligence panel">
                      <PanelRightOpen size={17} />
                    </button>
                  )}
                </>
              ) : (
                <div className="empty-analysis">
                  <div className="empty-visual"><BarChart3 size={34} /></div>
                  <span className="eyebrow">Tu radar está listo</span>
                  <h2>Selecciona un líder para comenzar</h2>
                  <p>Compara estructura, fuerza relativa, volumen y fundamentales en un solo espacio.</p>
                  <div className="empty-shortcuts">
                    <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
                    <span><kbd>Enter</kbd> abrir</span>
                  </div>
                </div>
              )}
            </div>
          </main>

          <footer className="status-footer">
            <div><Database size={11} /> {providerCopy}</div>
            <span>•</span>
            <div>{props.marketPulse.total.toLocaleString('es-CO')} activos analizados</div>
            <span className="ml-auto">Información de mercado; no constituye asesoría financiera.</span>
          </footer>
        </>
      )}

      {props.showFundamentals && props.selectedStock && props.fundamentals && (
        <FundamentalsView
          symbol={props.selectedStock.symbol}
          quarterlyData={props.fundamentals.quarterlyData}
          source={props.fundamentals.source}
          updatedAt={props.fundamentals.updatedAt}
          onClose={() => props.setShowFundamentals(false)}
        />
      )}

      {props.showFilters && (
        <StockFilters
          onApplyFilters={props.applyFilters}
          onClose={props.closeFilters}
          isCreatingWatchlist={props.isCreatingWatchlistWithFilters}
        />
      )}

      <SetupLabModal isOpen={props.showSetupLab} onClose={props.closeSetupLab} />
    </div>
  );
}
