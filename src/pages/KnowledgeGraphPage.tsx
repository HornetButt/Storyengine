import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Universe } from '../types';
import { GraphCanvas } from '../components/GraphCanvas';
import { Share2, Sliders, RefreshCw } from 'lucide-react';

interface KnowledgeGraphPageProps {
  universes: Universe[];
  selectedUniverseId: string;
}

export const KnowledgeGraphPage: React.FC<KnowledgeGraphPageProps> = ({
  universes,
  selectedUniverseId,
}) => {
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [depth, setDepth] = useState<number>(2);
  const [centerId, setCenterId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  useEffect(() => {
    loadGraph();
  }, [selectedUniverseId, depth, centerId]);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const data = await api.getGraph({
        universeId: selectedUniverseId || undefined,
        centerId: centerId || undefined,
        depth,
      });
      setGraphData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-amber-400" />
            Граф знаний и связей
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Визуализация связей между персонажами, историями, артефактами и локациями с обходом до 3 уровней
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3 text-xs text-stone-300">
          <div className="flex items-center space-x-1.5 bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-lg">
            <span>Глубина:</span>
            {[1, 2, 3].map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={`px-2 py-0.5 rounded font-mono ${
                  depth === d ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={loadGraph}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
            title="Обновить граф"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      {loading ? (
        <div className="h-[600px] flex items-center justify-center bg-stone-950 border border-stone-800 rounded-2xl text-xs text-stone-400">
          Построение связей графа...
        </div>
      ) : (
        <GraphCanvas
          nodes={graphData.nodes}
          links={graphData.links}
          onSelectNode={(node) => setSelectedNode(node)}
        />
      )}

      {/* Selected Node Details Box */}
      {selectedNode && (
        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-stone-500 uppercase font-mono">{selectedNode.type}</span>
            <h4 className="font-semibold text-stone-100 text-sm">{selectedNode.label}</h4>
            <p className="text-stone-400 text-xs">{selectedNode.subLabel}</p>
          </div>
          <button
            onClick={() => setCenterId(centerId === selectedNode.id ? '' : selectedNode.id)}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 font-medium"
          >
            {centerId === selectedNode.id ? 'Сбросить фокус' : 'Сфокусировать граф на объекте'}
          </button>
        </div>
      )}
    </div>
  );
};
