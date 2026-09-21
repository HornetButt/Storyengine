import React from 'react';
import { ProposedKnowledgeChange } from '../types';
import { Check, X, Sparkles, User, MapPin, Package, GitBranch, Share2 } from 'lucide-react';

interface ProposedChangesWidgetProps {
  changes: ProposedKnowledgeChange[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export const ProposedChangesWidget: React.FC<ProposedChangesWidgetProps> = ({
  changes,
  onAccept,
  onReject,
}) => {
  if (changes.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-stone-800 bg-stone-900/40 text-center text-xs text-stone-400">
        Нет новых предложений для включения в базу знаний канона.
      </div>
    );
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'character':
        return <User className="w-3.5 h-3.5 text-blue-400" />;
      case 'location':
        return <MapPin className="w-3.5 h-3.5 text-emerald-400" />;
      case 'object':
        return <Package className="w-3.5 h-3.5 text-amber-400" />;
      case 'event':
        return <GitBranch className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Share2 className="w-3.5 h-3.5 text-stone-400" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Предложенные изменения базы знаний ({changes.length})
        </h3>
        <span className="text-[11px] text-stone-400">Требуется утверждение автором</span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {changes.map((item) => (
          <div
            key={item.id}
            id={`proposed-change-${item.id}`}
            className="p-3 rounded-lg border border-stone-800 bg-stone-900/80 hover:border-stone-700 transition-colors flex items-start justify-between gap-3 text-xs"
          >
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-stone-800 border border-stone-700">
                  {getEntityIcon(item.entityType)}
                </span>
                <span className="font-semibold text-stone-100">
                  {item.payload.name || item.payload.canonicalName || item.payload.title || 'Новая связь'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-stone-800 text-[10px] text-stone-400 uppercase font-mono">
                  {item.entityType}
                </span>
                <span className="text-[10px] text-amber-400/90 font-medium">
                  {Math.round(item.confidence * 100)}% уверенность
                </span>
              </div>
              <p className="text-stone-400 text-[11px] line-clamp-2">
                {item.payload.description || item.reasoning}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 shrink-0 pt-0.5">
              <button
                id={`accept-change-${item.id}`}
                onClick={() => onAccept(item.id)}
                title="Принять в канон"
                className="p-1.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                id={`reject-change-${item.id}`}
                onClick={() => onReject(item.id)}
                title="Отклонить"
                className="p-1.5 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
