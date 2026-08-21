import React, { useEffect, useMemo, useState } from 'react';
import { Save, Tag } from 'lucide-react';
import { SetupFeedbackVerdict, Stock } from '../types';
import { stockDataService } from '../services/stockDataYahoo';

interface SetupPanelProps {
  stock: Stock;
  onSaved?: () => void;
}

const QUICK_TAG_OPTIONS = [
  'vcp-candidate',
  'cheat',
  'low-cheat',
  'cup-candidate',
  'power-play',
  'ipo',
  'primary-base',
  'tight',
  'breakout',
];

const VERDICT_LABELS: Record<SetupFeedbackVerdict, string> = {
  approved: 'Apta',
  maybe: 'Casi',
  reject: 'Descartar',
  watch: 'Observar',
  skip: 'Skip',
};

const SetupPanel: React.FC<SetupPanelProps> = ({ stock, onSaved }) => {
  const profile = stock.setupProfile;
  const feedback = profile?.feedback || null;

  const [verdict, setVerdict] = useState<SetupFeedbackVerdict>('watch');
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setVerdict((feedback?.verdict as SetupFeedbackVerdict) || 'watch');
    setNotes(feedback?.notes || '');
    setSelectedTags(feedback?.tags || []);
    setError(null);
    setSavedAt(null);
  }, [stock.symbol, feedback?.date, feedback?.verdict, feedback?.notes, feedback?.tags]);

  const allSetupTags = useMemo(() => profile?.tags || [], [profile?.tags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await stockDataService.saveSetupFeedback({
        symbol: stock.symbol,
        verdict,
        tags: selectedTags,
        notes,
      });

      setSavedAt(new Date().toISOString());
      onSaved?.();
    } catch (saveError) {
      console.error('Error guardando feedback setup:', saveError);
      setError('No se pudo guardar el feedback.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 border-t border-gray-700 pt-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Setup y Feedback Loop</h3>

      {profile ? (
        <div className="space-y-3">
          <div className="bg-dark-300 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs text-gray-400">Estado</span>
              <span className={`text-xs px-2 py-1 rounded border ${profile.style?.badgeClass || 'bg-gray-600/20 text-gray-200 border-gray-500/30'}`}>
                {profile.state}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs text-gray-400">Setup</span>
              <span className="text-xs text-white font-medium">{profile.type}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-gray-400">Score</span>
              <span className="text-xs text-accent-blue font-semibold">{profile.score ?? '-'}</span>
            </div>
          </div>

          {allSetupTags.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Tags automáticos</p>
              <div className="flex flex-wrap gap-1.5">
                {allSetupTags.map((tag) => (
                  <span key={tag} className="text-[11px] px-2 py-1 rounded bg-accent-blue/15 text-accent-blue border border-accent-blue/25">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-dark-300 rounded-lg p-3 border border-gray-700 space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Calificación</label>
              <select
                value={verdict}
                onChange={(e) => setVerdict(e.target.value as SetupFeedbackVerdict)}
                className="w-full bg-dark-200 text-white px-2 py-1.5 rounded border border-gray-600 text-sm"
              >
                {Object.entries(VERDICT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Tags manuales</label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-green-500/20 text-green-300 border-green-500/30'
                        : 'bg-dark-200 text-gray-300 border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Por qué sí/no, qué faltó, etc."
                className="w-full bg-dark-200 text-white px-2 py-1.5 rounded border border-gray-600 text-sm resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-accent-blue hover:bg-blue-600 disabled:bg-gray-600 text-white px-3 py-2 rounded flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <Save size={14} />
              {saving ? 'Guardando...' : 'Guardar Feedback'}
            </button>

            {error && <p className="text-xs text-red-300">{error}</p>}
            {savedAt && <p className="text-xs text-green-300">Guardado {new Date(savedAt).toLocaleTimeString()}</p>}
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-400 bg-dark-300 rounded-lg p-3 border border-gray-700 flex items-center gap-2">
          <Tag size={14} />
          Sin setup profile para este símbolo.
        </div>
      )}
    </div>
  );
};

export default SetupPanel;
