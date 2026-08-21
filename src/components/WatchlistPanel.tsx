import React, { useState } from 'react';
import { Watchlist } from '../types';
import { Plus, Trash2, Edit2, Check, X, RefreshCw } from 'lucide-react';

interface WatchlistPanelProps {
  watchlists: Watchlist[];
  activeWatchlist: string | null;
  onSelectWatchlist: (id: string | null) => void;
  onCreateWatchlist: (name: string) => void;
  onDeleteWatchlist: (id: string) => void;
  onRenameWatchlist: (id: string, newName: string) => void;
  onCreateWithFilters: () => void; // Nueva funcion para crear con filtros
  onRefreshPresets?: () => void;
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  watchlists,
  activeWatchlist,
  onSelectWatchlist,
  onCreateWatchlist,
  onDeleteWatchlist,
  onRenameWatchlist,
  onCreateWithFilters,
  onRefreshPresets,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showCreateOptions, setShowCreateOptions] = useState(false);

  const handleCreate = () => {
    if (newListName.trim()) {
      onCreateWatchlist(newListName.trim());
      setNewListName('');
      setIsCreating(false);
    }
  };

  const handleRename = (id: string) => {
    if (editingName.trim()) {
      onRenameWatchlist(id, editingName.trim());
      setEditingId(null);
      setEditingName('');
    }
  };

  const startEditing = (watchlist: Watchlist) => {
    setEditingId(watchlist.id);
    setEditingName(watchlist.name);
  };

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
      {/* Boton Nueva Lista */}
      <button
        onClick={() => setShowCreateOptions(true)}
        className="whitespace-nowrap border border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200 px-2.5 h-[27px] rounded-md flex items-center gap-1.5 transition-colors text-[10px] font-semibold hover:bg-emerald-400/[0.12]"
      >
        <Plus size={16} />
        Nueva Lista
      </button>

      {/* Watchlists */}
      {watchlists.map((watchlist) => (
        <div key={watchlist.id} className="relative group">
          {editingId === watchlist.id && !watchlist.isBuiltIn ? (
            <div className="flex items-center gap-2 bg-dark-100 px-3 py-1.5 rounded-lg">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRename(watchlist.id)}
                className="w-32 bg-dark-200 text-white px-2 py-1 rounded text-sm border border-gray-600 focus:border-accent-blue focus:outline-none"
                autoFocus
              />
              <button
                onClick={() => handleRename(watchlist.id)}
                className="p-1 bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                <Check size={12} className="text-white" />
              </button>
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditingName('');
                }}
                className="p-1 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSelectWatchlist(watchlist.id)}
              title={watchlist.presetDescription || watchlist.name}
              className={`whitespace-nowrap h-[27px] px-2.5 rounded-md border transition-colors text-[10px] font-semibold flex items-center gap-1.5 ${
                activeWatchlist === watchlist.id
                  ? 'border-emerald-400/20 bg-emerald-400/[0.09] text-emerald-200'
                  : 'border-transparent text-slate-400 hover:bg-white/[0.035] hover:text-slate-200'
              }`}
            >
              {watchlist.name}
              <span className="text-xs opacity-75">({watchlist.symbols.length})</span>
              
              {/* Indicador de lista dinamica */}
              {watchlist.isDynamic && (
                <span className="ml-1.5 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded" title="Esta lista se actualiza automaticamente">
                  LIVE
                </span>
              )}

              {watchlist.isBuiltIn && (
                <span className="ml-1 text-xs bg-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded" title="Lista Minervini integrada">
                  MM
                </span>
              )}

              {/* Boton de refresh para listas Minervini */}
              {watchlist.isBuiltIn && onRefreshPresets && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefreshPresets();
                  }}
                  className="hidden group-hover:flex p-1 hover:bg-dark-200 rounded transition-colors ml-1"
                  title="Forzar actualizacion de listas Minervini"
                >
                  <RefreshCw size={12} />
                </button>
              )}
              
              {/* Botones de edicion (aparecen en hover) */}
              {!watchlist.isBuiltIn && (
                <div className="hidden group-hover:flex items-center gap-1 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(watchlist);
                  }}
                  className="p-1 hover:bg-dark-200 rounded transition-colors"
                  title="Renombrar"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Eliminar la lista "${watchlist.name}"?`)) {
                      onDeleteWatchlist(watchlist.id);
                    }
                  }}
                  className="p-1 hover:bg-red-500 rounded transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={12} />
                </button>
                </div>
              )}
            </button>
          )}
        </div>
      ))}

      {/* Modal: Opciones para crear nueva lista */}
      {showCreateOptions && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-dark-200 rounded-lg shadow-2xl p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Crear Nueva Watchlist</h3>
            <p className="text-sm text-gray-400 mb-6">Como deseas crear tu lista?</p>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowCreateOptions(false);
                  setIsCreating(true);
                }}
                className="w-full p-4 bg-dark-100 hover:bg-dark-300 rounded-lg text-left transition-colors border border-gray-700"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">+</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Lista Vacia</div>
                    <div className="text-xs text-gray-400">
                      Crear una lista vacia y agregar acciones manualmente
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => {
                  setShowCreateOptions(false);
                  onCreateWithFilters();
                }}
                className="w-full p-4 bg-accent-blue/20 hover:bg-accent-blue/30 rounded-lg text-left transition-colors border border-accent-blue"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">FX</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Con Filtros Personalizados</div>
                    <div className="text-xs text-gray-400">
                      Escanear todas las acciones y crear lista con las que cumplan tus criterios
                    </div>
                  </div>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setShowCreateOptions(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal crear nueva lista vacia */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-dark-200 rounded-lg shadow-2xl p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Nueva Watchlist</h3>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Nombre de la lista..."
              className="w-full bg-dark-100 text-white px-4 py-2 rounded border border-gray-600 focus:border-accent-blue focus:outline-none mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewListName('');
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-accent-blue hover:bg-blue-600 text-white rounded transition-colors flex items-center gap-2"
              >
                <Check size={16} />
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
