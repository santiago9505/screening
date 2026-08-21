import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Crosshair,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Stock } from '../types';
import {
  deriveMarketRegime,
  MarketPulseInput,
  runMinerviniCopilot,
} from '../services/minerviniIntelligence';

interface MinerviniCommandCenterProps {
  universe: Stock[];
  marketPulse: MarketPulseInput;
  selectedStock: Stock | null;
  onSelectStock: (stock: Stock) => void;
  onApplyResults: (stocks: Stock[], label: string) => void;
  compact?: boolean;
}

const PRESETS = [
  { id: 'elite', label: 'Elite SEPA', query: 'score 80 rs 90 eps 20 ventas 20 no extendida' },
  { id: 'vcp', label: 'VCP Radar', query: 'vcp rs 80 no extendida' },
  { id: 'power', label: 'Power Play', query: 'power play rs 85 no extendida' },
  { id: 'primary', label: 'Primary Base', query: 'base primaria rs 85 cerca de máximos' },
  { id: 'risk', label: 'Risk First', query: 'score 75 riesgo cerca de máximos' },
] as const;

export default function MinerviniCommandCenter({
  universe,
  marketPulse,
  selectedStock,
  onSelectStock,
  onApplyResults,
  compact = false,
}: MinerviniCommandCenterProps) {
  const [draft, setDraft] = useState('');
  const [executedQuery, setExecutedQuery] = useState<string>(PRESETS[0].query);
  const [activePreset, setActivePreset] = useState<string>(PRESETS[0].id);
  const regime = useMemo(() => deriveMarketRegime(marketPulse), [marketPulse]);
  const result = useMemo(() => runMinerviniCopilot(universe, executedQuery), [executedQuery, universe]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const query = draft.trim();
    if (!query) return;
    setActivePreset('custom');
    setExecutedQuery(query);
  };

  const activatePreset = (preset: typeof PRESETS[number]) => {
    setActivePreset(preset.id);
    setExecutedQuery(preset.query);
    setDraft('');
  };

  if (compact) {
    return (
      <section className="sepa-focus-strip" aria-label="Centro de comando Minervini compacto">
        <div className={`focus-regime ${regime.tone}`} title={regime.rationale}>
          <span className="regime-beacon" />
          <div><small>Régimen</small><strong>{regime.state}</strong></div>
          <b>{regime.score}</b>
        </div>

        <div className="focus-market-metrics">
          <span><small>Amplitud</small><b>{marketPulse.breadth}%</b></span>
          <span><small>SMA 50</small><b>{marketPulse.trendQuality}%</b></span>
          <span><small>Líderes</small><b>{marketPulse.leaders.toLocaleString('es-CO')}</b></span>
        </div>

        <form className="focus-copilot-query" onSubmit={submit}>
          <BrainCircuit size={14} />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Filtra con IA: RS 90, EPS y ventas >25%, no extendidas…"
            aria-label="Consulta compacta del copiloto SEPA"
          />
          <button type="submit">Analizar <ArrowRight size={12} /></button>
        </form>

        <div className="focus-shortlist">
          <span><Crosshair size={11} /> {result.candidates.length} líderes</span>
          {result.candidates.slice(0, 4).map(({ stock, score }) => (
            <button
              key={stock.symbol}
              className={selectedStock?.symbol === stock.symbol ? 'active' : ''}
              onClick={() => onSelectStock(stock)}
              title={`${stock.setupProfile?.type || 'Candidato'} · Score ${score}`}
            >
              {stock.symbol}<b>{score}</b>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="sepa-command-center" aria-label="Centro de comando Minervini">
      <div className="sepa-regime-card">
        <div className="sepa-kicker"><Radar size={13} /> Régimen de mercado</div>
        <div className={`regime-state ${regime.tone}`}>
          <span className="regime-beacon" />
          <strong>{regime.state}</strong>
          <b>{regime.score}</b>
        </div>
        <p>{regime.rationale}</p>
        <small><ShieldCheck size={11} /> Exposición guía: {regime.exposure}</small>
      </div>

      <div className="sepa-copilot">
        <div className="copilot-heading">
          <div>
            <span className="sepa-kicker"><BrainCircuit size={13} /> SEPA Copilot</span>
            <strong>Pregunta al universo en lenguaje natural</strong>
          </div>
          <span className="explainable-badge"><Sparkles size={11} /> IA local · explicable</span>
        </div>

        <form className="copilot-query" onSubmit={submit}>
          <Search size={14} />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ej: RS 90, EPS y ventas > 25%, cerca de máximos y no extendidas"
            aria-label="Consulta del copiloto SEPA"
          />
          <button type="submit">Analizar <ArrowRight size={13} /></button>
        </form>

        <div className="copilot-presets">
          {PRESETS.map((preset) => (
            <button key={preset.id} className={activePreset === preset.id ? 'active' : ''} onClick={() => activatePreset(preset)}>
              {preset.label}
            </button>
          ))}
          <span className="copilot-understood">
            <CheckCircle2 size={11} /> {result.understood.join(' · ')}
          </span>
        </div>
      </div>

      <div className="sepa-shortlist">
        <div className="shortlist-heading">
          <div>
            <span className="sepa-kicker"><Crosshair size={13} /> Shortlist</span>
            <strong>{result.candidates.length} de {universe.length.toLocaleString('es-CO')}</strong>
          </div>
          <button
            onClick={() => onApplyResults(result.candidates.map((candidate) => candidate.stock), result.label)}
            disabled={result.candidates.length === 0}
          >
            Aplicar radar
          </button>
        </div>
        <div className="shortlist-track">
          {result.candidates.length > 0 ? result.candidates.slice(0, 7).map(({ stock, score }) => (
            <button
              key={stock.symbol}
              className={selectedStock?.symbol === stock.symbol ? 'active' : ''}
              onClick={() => onSelectStock(stock)}
              title={stock.setupProfile?.positives?.join(' · ') || stock.setupProfile?.type}
            >
              <span>{stock.symbol}</span>
              <b>{score}</b>
              <small>RS {Math.round(stock.relativeStrength)}</small>
            </button>
          )) : <p>{result.summary}</p>}
        </div>
      </div>
    </section>
  );
}
