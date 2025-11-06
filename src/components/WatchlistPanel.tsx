import React, { useState } from 'react';
import { Watchlist } from '../types';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface WatchlistPanelProps {
  watchlists: Watchlist[];
  activeWatchlist: string | null;
  onSelectWatchlist: (id: string | null) => void;
  onCreateWatchlist: (name: string) => void;
  onDeleteWatchlist: (id: string) => void;
  onRenameWatchlist: (id: string, newName: string) => void;
  onCreateWithFilters: () => void; // Nueva función para crear con filtros
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  watchlists,
  activeWatchlist,
  onSelectWatchlist,
  onCreateWatchlist,
  onDeleteWatchlist,
  onRenameWatchlist,
  onCreateWithFilters,
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
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {/* Botón Nueva Lista */}
      <button
        onClick={() => setShowCreateOptions(true)}
        className="whitespace-nowrap bg-accent-blue hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-sm"
      >
        <Plus size={16} />
        Nueva Lista
      </button>

      {/* Todas las Acciones */}
      <button
        onClick={() => onSelectWatchlist(null)}
        className={`whitespace-nowrap px-4 py-1.5 rounded-lg transition-colors text-sm font-medium ${
          activeWatchlist === null
            ? 'bg-accent-blue text-white'
            : 'bg-dark-100 text-gray-300 hover:bg-dark-300'
        }`}
      >
        Todas las Acciones
      </button>

      {/* Watchlists */}
      {watchlists.map((watchlist) => (
        <div key={watchlist.id} className="relative group">
          {editingId === watchlist.id ? (
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
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
                activeWatchlist === watchlist.id
                  ? 'bg-accent-blue text-white'
                  : 'bg-dark-100 text-gray-300 hover:bg-dark-300'
              }`}
            >
              {watchlist.name}
              <span className="text-xs opacity-75">({watchlist.symbols.length})</span>
              
              {/* Botones de edición (aparecen en hover) */}
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
                    if (confirm(`¿Eliminar la lista "${watchlist.name}"?`)) {
                      onDeleteWatchlist(watchlist.id);
                    }
                  }}
                  className="p-1 hover:bg-red-500 rounded transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </button>
          )}
        </div>
      ))}

      {/* Modal: Opciones para crear nueva lista */}
      {showCreateOptions && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-dark-200 rounded-lg shadow-2xl p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Crear Nueva Watchlist</h3>
            <p className="text-sm text-gray-400 mb-6">¿Cómo deseas crear tu lista?</p>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowCreateOptions(false);
                  setIsCreating(true);
                }}
                className="w-full p-4 bg-dark-100 hover:bg-dark-300 rounded-lg text-left transition-colors border border-gray-700"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📝</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Lista Vacía</div>
                    <div className="text-xs text-gray-400">
                      Crear una lista vacía y agregar acciones manualmente
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
                  <div className="text-2xl">🔍</div>
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

      {/* Modal crear nueva lista vacía */}
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
