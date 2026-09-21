import { storage } from './storage';
import { EntityType } from '../types';

export interface GraphNode {
  id: string;
  type: EntityType;
  label: string;
  subLabel?: string;
  status?: string;
  universeId?: string;
}

export interface GraphLink {
  id: string;
  source: string;
  target: string;
  relationType: string;
  confidence: number;
  canonStatus: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function getKnowledgeGraph(
  universeId?: string,
  centerEntityId?: string,
  maxDepth: number = 2
): GraphData {
  const characters = storage.getCharacters(universeId);
  const stories = storage.getStories({ universeId });
  const locations = storage.getLocations(universeId);
  const events = storage.getEvents(universeId);
  const objects = storage.getObjects(universeId);
  const relationships = storage.getRelationships();

  const allNodes: GraphNode[] = [
    ...characters.map((c) => ({
      id: c.id,
      type: 'character' as EntityType,
      label: c.canonicalName,
      subLabel: c.occupation || c.status,
      status: c.status,
      universeId: c.universeId,
    })),
    ...stories.map((s) => ({
      id: s.id,
      type: 'story' as EntityType,
      label: s.title,
      subLabel: `Год: ${s.storyYear} [${s.canonStatus}]`,
      status: s.consistencyStatus,
      universeId: s.universeId,
    })),
    ...locations.map((l) => ({
      id: l.id,
      type: 'location' as EntityType,
      label: l.name,
      subLabel: l.status === 'ruined' ? 'Разрушено' : 'Действует',
      status: l.status,
      universeId: l.universeId,
    })),
    ...events.map((e) => ({
      id: e.id,
      type: 'event' as EntityType,
      label: e.title,
      subLabel: `${e.year} г.`,
      status: e.canonStatus,
      universeId: e.universeId,
    })),
    ...objects.map((o) => ({
      id: o.id,
      type: 'object' as EntityType,
      label: o.name,
      subLabel: 'Артефакт',
      universeId: o.universeId,
    })),
  ];

  const nodeMap = new Map<string, GraphNode>();
  allNodes.forEach((n) => nodeMap.set(n.id, n));

  const allLinks: GraphLink[] = relationships.map((r) => ({
    id: r.id,
    source: r.sourceId,
    target: r.targetId,
    relationType: r.relationType,
    confidence: r.confidence,
    canonStatus: r.canonStatus,
  }));

  // If a centerEntityId is specified, do breadth-first traversal up to maxDepth
  if (centerEntityId && nodeMap.has(centerEntityId)) {
    const visitedNodes = new Set<string>([centerEntityId]);
    let currentLevel = new Set<string>([centerEntityId]);

    for (let d = 0; d < maxDepth; d++) {
      const nextLevel = new Set<string>();
      for (const nodeId of currentLevel) {
        // find adjacent links
        for (const link of allLinks) {
          if (link.source === nodeId && !visitedNodes.has(link.target)) {
            visitedNodes.add(link.target);
            nextLevel.add(link.target);
          } else if (link.target === nodeId && !visitedNodes.has(link.source)) {
            visitedNodes.add(link.source);
            nextLevel.add(link.source);
          }
        }
      }
      currentLevel = nextLevel;
      if (currentLevel.size === 0) break;
    }

    const filteredNodes = allNodes.filter((n) => visitedNodes.has(n.id));
    const filteredLinks = allLinks.filter(
      (l) => visitedNodes.has(l.source) && visitedNodes.has(l.target)
    );

    return { nodes: filteredNodes, links: filteredLinks };
  }

  return { nodes: allNodes, links: allLinks };
}
