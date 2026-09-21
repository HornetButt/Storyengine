import React, { useState, useRef, useEffect } from 'react';
import { GraphNode, GraphLink } from '../server/graph.js';
import { ZoomIn, ZoomOut, RotateCcw, Filter, Eye } from 'lucide-react';

interface GraphCanvasProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onSelectNode?: (node: GraphNode) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ nodes, links, onSelectNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<{ [id: string]: { x: number; y: number } }>({});

  // Compute circular or force-like layout
  useEffect(() => {
    if (nodes.length === 0) return;
    const width = 800;
    const height = 550;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.38;

    const positions: { [id: string]: { x: number; y: number } } = {};
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      // Add slight jitter for visual natural spacing
      const r = radius + ((index % 3) - 1) * 35;
      positions[node.id] = {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
      };
    });
    setNodePositions(positions);
  }, [nodes]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'circle' || (e.target as HTMLElement).tagName.toLowerCase() === 'text') {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const getNodeColor = (type: string, status?: string) => {
    if (status === 'deceased' || status === 'ruined') return '#e11d48'; // red
    switch (type) {
      case 'character':
        return '#3b82f6'; // blue
      case 'story':
        return '#f59e0b'; // amber
      case 'location':
        return '#10b981'; // green
      case 'event':
        return '#a855f7'; // purple
      case 'object':
        return '#06b6d4'; // cyan
      default:
        return '#78716c';
    }
  };

  return (
    <div className="relative w-full h-[600px] bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden shadow-inner select-none flex flex-col">
      {/* Canvas Top Bar Overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-stone-900/90 border border-stone-800 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs text-stone-300">
        <span className="font-semibold text-stone-100 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          Граф связей
        </span>
        <span className="text-stone-500">|</span>
        <span>{nodes.length} сущностей</span>
        <span>•</span>
        <span>{links.length} связей</span>
      </div>

      {/* Zoom / Pan Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-1.5 bg-stone-900/90 border border-stone-800 backdrop-blur-md p-1.5 rounded-xl">
        <button
          onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
          className="p-1.5 rounded-lg text-stone-300 hover:text-stone-100 hover:bg-stone-800"
          title="Приблизить"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
          className="p-1.5 rounded-lg text-stone-300 hover:text-stone-100 hover:bg-stone-800"
          title="Отдалить"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 rounded-lg text-stone-300 hover:text-stone-100 hover:bg-stone-800"
          title="Сброс"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <svg className="w-full h-full" viewBox="0 0 800 550">
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Links */}
            {links.map((link) => {
              const srcPos = nodePositions[link.source];
              const tgtPos = nodePositions[link.target];
              if (!srcPos || !tgtPos) return null;

              const isHighlighted =
                selectedNodeId && (link.source === selectedNodeId || link.target === selectedNodeId);

              return (
                <g key={link.id}>
                  <line
                    x1={srcPos.x}
                    y1={srcPos.y}
                    x2={tgtPos.x}
                    y2={tgtPos.y}
                    stroke={isHighlighted ? '#f59e0b' : '#44403c'}
                    strokeWidth={isHighlighted ? 2.5 : 1.2}
                    strokeDasharray={link.canonStatus === 'draft' ? '4 3' : undefined}
                    opacity={isHighlighted ? 0.95 : 0.6}
                  />
                  {/* Link Label */}
                  <text
                    x={(srcPos.x + tgtPos.x) / 2}
                    y={(srcPos.y + tgtPos.y) / 2 - 4}
                    fill="#a8a29e"
                    fontSize="9"
                    textAnchor="middle"
                    className="font-mono pointer-events-none"
                  >
                    {link.relationType}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const pos = nodePositions[node.id];
              if (!pos) return null;
              const isSelected = selectedNodeId === node.id;
              const nodeColor = getNodeColor(node.type, node.status);

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    onSelectNode?.(node);
                  }}
                  className="cursor-pointer"
                >
                  <circle
                    r={isSelected ? 22 : 18}
                    fill="#1c1917"
                    stroke={nodeColor}
                    strokeWidth={isSelected ? 3.5 : 2}
                    className="transition-all hover:scale-110"
                  />
                  {/* Entity Icon abbreviation */}
                  <text
                    y={4}
                    fill={nodeColor}
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none select-none uppercase font-mono"
                  >
                    {node.type[0]}
                  </text>
                  {/* Node Name Label */}
                  <text
                    y={28}
                    fill="#f5f5f4"
                    fontSize="11"
                    fontWeight="500"
                    textAnchor="middle"
                    className="pointer-events-none select-none drop-shadow-md"
                  >
                    {node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
                  </text>
                  {node.subLabel && (
                    <text
                      y={40}
                      fill="#a8a29e"
                      fontSize="9"
                      textAnchor="middle"
                      className="pointer-events-none select-none font-mono"
                    >
                      {node.subLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend Footer */}
      <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between px-3 py-2 rounded-xl bg-stone-900/90 border border-stone-800 text-[11px] text-stone-400">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Персонаж
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> История
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Локация
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Событие
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Предмет
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Погиб / Разрушен
          </span>
        </div>
        <span className="text-stone-500 font-mono">Глубина обхода: 2-3 уровня</span>
      </div>
    </div>
  );
};
