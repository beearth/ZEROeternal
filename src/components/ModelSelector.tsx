import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Cpu, Check, Star } from "lucide-react";
import { AVAILABLE_MODELS, getSelectedModel, setSelectedModel } from "../services/gemini";

interface ModelSelectorProps {
  onModelChange?: (modelId: string) => void;
  compact?: boolean;
}

// 즐겨찾기 가져오기/저장하기
const getFavorites = (): string[] => {
  const saved = localStorage.getItem('favoriteModels');
  return saved ? JSON.parse(saved) : [];
};

const setFavorites = (favorites: string[]): void => {
  localStorage.setItem('favoriteModels', JSON.stringify(favorites));
};

export function ModelSelector({ onModelChange, compact = false }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(getSelectedModel());
  const [favorites, setFavoritesState] = useState<string[]>(getFavorites());
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId) || AVAILABLE_MODELS[0];

  // 즐겨찾기 + 나머지 모델 정렬
  const sortedModels = [
    ...AVAILABLE_MODELS.filter(m => favorites.includes(m.id)),
    ...AVAILABLE_MODELS.filter(m => !favorites.includes(m.id)),
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    setSelectedModel(modelId);
    setIsOpen(false);
    onModelChange?.(modelId);
  };

  const toggleFavorite = (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(modelId)
      ? favorites.filter(id => id !== modelId)
      : [...favorites, modelId];
    setFavoritesState(newFavorites);
    setFavorites(newFavorites);
  };

  const isFavorite = (modelId: string) => favorites.includes(modelId);

  if (compact) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          title={`현재 모델: ${selectedModel.name}`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="max-w-[80px] truncate">{selectedModel.name.split(' ')[0]}</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {isOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-72 bg-[#1e1f20] rounded-xl shadow-lg border border-[#2a2b2c] py-2 z-50 max-h-[350px] overflow-y-auto">
            <div className="px-3 py-2 border-b border-[#2a2b2c] mb-1">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">AI 모델 선택</h3>
            </div>
            
            {/* 즐겨찾기 섹션 */}
            {favorites.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  즐겨찾기
                </div>
                {sortedModels.filter(m => favorites.includes(m.id)).map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[#2a2b2c] transition-colors text-left ${
                      model.id === selectedModelId ? 'bg-[#2a2b2c]' : ''
                    }`}
                  >
                    <button
                      onClick={(e) => toggleFavorite(e, model.id)}
                      className="p-0.5 hover:bg-zinc-700 rounded transition-colors"
                    >
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white truncate">{model.name}</span>
                        {model.free && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">무료</span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500">{model.provider}</span>
                    </div>
                    {model.id === selectedModelId && (
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
                <div className="border-t border-[#2a2b2c] my-1" />
              </>
            )}

            {/* 전체 모델 */}
            <div className="px-3 py-1.5 text-[10px] text-zinc-500 uppercase tracking-wider">전체 모델</div>
            {sortedModels.filter(m => !favorites.includes(m.id)).map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelect(model.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[#2a2b2c] transition-colors text-left ${
                  model.id === selectedModelId ? 'bg-[#2a2b2c]' : ''
                }`}
              >
                <button
                  onClick={(e) => toggleFavorite(e, model.id)}
                  className="p-0.5 hover:bg-zinc-700 rounded transition-colors"
                >
                  <Star className={`w-4 h-4 ${isFavorite(model.id) ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-600'}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white truncate">{model.name}</span>
                    {model.free && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">무료</span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">{model.provider}</span>
                </div>
                {model.id === selectedModelId && (
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full size version (for settings)
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-[#27272a] hover:bg-[#3f3f46] rounded-xl transition-colors"
      >
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-zinc-400" />
          <div className="text-left">
            <p className="text-sm text-white">{selectedModel.name}</p>
            <p className="text-xs text-zinc-500">{selectedModel.provider}</p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1e1f20] rounded-xl shadow-lg border border-[#2a2b2c] py-2 z-50 max-h-[350px] overflow-y-auto">
          {sortedModels.map((model) => (
            <button
              key={model.id}
              onClick={() => handleSelect(model.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#2a2b2c] transition-colors text-left ${
                model.id === selectedModelId ? 'bg-[#2a2b2c]' : ''
              }`}
            >
              <button
                onClick={(e) => toggleFavorite(e, model.id)}
                className="p-1 hover:bg-zinc-700 rounded transition-colors"
              >
                <Star className={`w-4 h-4 ${isFavorite(model.id) ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-600'}`} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">{model.name}</span>
                  {model.free && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">무료</span>
                  )}
                </div>
                <span className="text-xs text-zinc-500">{model.provider}</span>
              </div>
              {model.id === selectedModelId && (
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
