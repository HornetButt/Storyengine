import {
  Universe,
  Character,
  Story,
  StoryEvent,
  StoryLocation,
  StoryObject,
  Relationship,
  ProposedKnowledgeChange,
  GenerateStoryRequest,
  ConsistencyReport,
  StoryPlan,
  PlannedScene,
  PlannerChatMessage,
  LLMConfig,
  LLMTestResult,
} from '../types';

const API_BASE = '/api/v1';

async function handleResponse<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = null;

  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      if (res.ok) {
        return text as unknown as T;
      }
      throw new Error(`Ошибка сервера (${res.status}): неверный формат ответа`);
    }
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `Ошибка запроса (${res.status})`;
    throw new Error(errorMsg);
  }

  return (data !== null ? data : {}) as T;
}

export const api = {
  // Stats
  async getStats() {
    const res = await fetch(`${API_BASE}/stats`);
    return handleResponse(res);
  },

  // Universes
  async getUniverses(): Promise<Universe[]> {
    const res = await fetch(`${API_BASE}/universes`);
    return handleResponse<Universe[]>(res);
  },
  async createUniverse(data: Partial<Universe>): Promise<Universe> {
    const res = await fetch(`${API_BASE}/universes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Universe>(res);
  },
  async updateUniverse(id: string, data: Partial<Universe>): Promise<Universe> {
    const res = await fetch(`${API_BASE}/universes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Universe>(res);
  },
  async deleteUniverse(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/universes/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(res);
  },

  // Stories
  async getStories(filters?: { universeId?: string; canonStatus?: string; status?: string }): Promise<Story[]> {
    const params = new URLSearchParams();
    if (filters?.universeId) params.set('universeId', filters.universeId);
    if (filters?.canonStatus) params.set('canonStatus', filters.canonStatus);
    if (filters?.status) params.set('status', filters.status);

    const res = await fetch(`${API_BASE}/stories?${params.toString()}`);
    return handleResponse<Story[]>(res);
  },
  async getStory(id: string): Promise<Story> {
    const res = await fetch(`${API_BASE}/stories/${id}`);
    return handleResponse<Story>(res);
  },
  async createStory(data: Partial<Story>): Promise<Story> {
    const res = await fetch(`${API_BASE}/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Story>(res);
  },
  async updateStory(id: string, data: Partial<Story>, changeSummary?: string): Promise<Story> {
    const res = await fetch(`${API_BASE}/stories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, changeSummary }),
    });
    return handleResponse<Story>(res);
  },
  async deleteStory(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/stories/${id}`, { method: 'DELETE' });
    return handleResponse<{ success: boolean }>(res);
  },
  async importStory(payload: {
    title: string;
    text: string;
    universeId: string;
    year: number;
  }): Promise<{ story: Story; extractedCount: number; consistency: ConsistencyReport }> {
    const res = await fetch(`${API_BASE}/stories/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ story: Story; extractedCount: number; consistency: ConsistencyReport }>(res);
  },
  async validateStory(id: string, text?: string): Promise<ConsistencyReport> {
    const res = await fetch(`${API_BASE}/stories/${id}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return handleResponse<ConsistencyReport>(res);
  },
  async extractKnowledge(id: string): Promise<ProposedKnowledgeChange[]> {
    const res = await fetch(`${API_BASE}/stories/${id}/extract`, { method: 'POST' });
    return handleResponse<ProposedKnowledgeChange[]>(res);
  },

  // Characters
  async getCharacters(universeId?: string): Promise<Character[]> {
    const url = universeId ? `${API_BASE}/characters?universeId=${universeId}` : `${API_BASE}/characters`;
    const res = await fetch(url);
    return handleResponse<Character[]>(res);
  },
  async getCharacter(id: string): Promise<Character> {
    const res = await fetch(`${API_BASE}/characters/${id}`);
    return handleResponse<Character>(res);
  },
  async createCharacter(data: Partial<Character>): Promise<Character> {
    const res = await fetch(`${API_BASE}/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Character>(res);
  },
  async updateCharacter(id: string, data: Partial<Character>): Promise<Character> {
    const res = await fetch(`${API_BASE}/characters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Character>(res);
  },
  async deleteCharacter(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/characters/${id}`, { method: 'DELETE' });
    return handleResponse<{ success: boolean }>(res);
  },

  // Locations
  async getLocations(universeId?: string): Promise<StoryLocation[]> {
    const url = universeId ? `${API_BASE}/locations?universeId=${universeId}` : `${API_BASE}/locations`;
    const res = await fetch(url);
    return handleResponse<StoryLocation[]>(res);
  },
  async createLocation(data: Partial<StoryLocation>): Promise<StoryLocation> {
    const res = await fetch(`${API_BASE}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<StoryLocation>(res);
  },

  // Events
  async getEvents(universeId?: string): Promise<StoryEvent[]> {
    const url = universeId ? `${API_BASE}/events?universeId=${universeId}` : `${API_BASE}/events`;
    const res = await fetch(url);
    return handleResponse<StoryEvent[]>(res);
  },
  async createEvent(data: Partial<StoryEvent>): Promise<StoryEvent> {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<StoryEvent>(res);
  },

  // Objects
  async getObjects(universeId?: string): Promise<StoryObject[]> {
    const url = universeId ? `${API_BASE}/objects?universeId=${universeId}` : `${API_BASE}/objects`;
    const res = await fetch(url);
    return handleResponse<StoryObject[]>(res);
  },
  async createObject(data: Partial<StoryObject>): Promise<StoryObject> {
    const res = await fetch(`${API_BASE}/objects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<StoryObject>(res);
  },

  // Relationships
  async getRelationships(): Promise<Relationship[]> {
    const res = await fetch(`${API_BASE}/relationships`);
    return handleResponse<Relationship[]>(res);
  },
  async createRelationship(data: Partial<Relationship>): Promise<Relationship> {
    const res = await fetch(`${API_BASE}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Relationship>(res);
  },
  async deleteRelationship(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/relationships/${id}`, { method: 'DELETE' });
    return handleResponse<{ success: boolean }>(res);
  },

  // Proposed Changes
  async getProposedChanges(status?: string): Promise<ProposedKnowledgeChange[]> {
    const url = status ? `${API_BASE}/proposed-changes?status=${status}` : `${API_BASE}/proposed-changes`;
    const res = await fetch(url);
    return handleResponse<ProposedKnowledgeChange[]>(res);
  },
  async acceptProposedChange(id: string): Promise<ProposedKnowledgeChange> {
    const res = await fetch(`${API_BASE}/proposed-changes/${id}/accept`, { method: 'POST' });
    return handleResponse<ProposedKnowledgeChange>(res);
  },
  async rejectProposedChange(id: string): Promise<ProposedKnowledgeChange> {
    const res = await fetch(`${API_BASE}/proposed-changes/${id}/reject`, { method: 'POST' });
    return handleResponse<ProposedKnowledgeChange>(res);
  },

  // Graph & Timeline
  async getGraph(params?: { universeId?: string; centerId?: string; depth?: number }) {
    const q = new URLSearchParams();
    if (params?.universeId) q.set('universeId', params.universeId);
    if (params?.centerId) q.set('centerId', params.centerId);
    if (params?.depth) q.set('depth', params.depth.toString());
    const res = await fetch(`${API_BASE}/graph?${q.toString()}`);
    return handleResponse(res);
  },
  async getTimeline(universeId?: string) {
    const url = universeId ? `${API_BASE}/timeline?universeId=${universeId}` : `${API_BASE}/timeline`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  // Search
  async search(query: string) {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    return handleResponse(res);
  },

  // Generator
  async getStoryBible(req: GenerateStoryRequest) {
    const res = await fetch(`${API_BASE}/generation/bible`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    return handleResponse(res);
  },
  async generateStory(req: GenerateStoryRequest) {
    const res = await fetch(`${API_BASE}/generation/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    return handleResponse(res);
  },
  async iterateStory(storyId: string, instruction: string) {
    const res = await fetch(`${API_BASE}/generation/iterate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId, instruction }),
    });
    return handleResponse(res);
  },

  // Story Plans & Discussion
  async getStoryPlans(universeId?: string): Promise<StoryPlan[]> {
    const url = universeId ? `${API_BASE}/story-plans?universeId=${universeId}` : `${API_BASE}/story-plans`;
    const res = await fetch(url);
    return handleResponse<StoryPlan[]>(res);
  },
  async getStoryPlan(id: string): Promise<StoryPlan> {
    const res = await fetch(`${API_BASE}/story-plans/${id}`);
    return handleResponse<StoryPlan>(res);
  },
  async createStoryPlan(data: Partial<StoryPlan>): Promise<StoryPlan> {
    const res = await fetch(`${API_BASE}/story-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<StoryPlan>(res);
  },
  async updateStoryPlan(id: string, data: Partial<StoryPlan>): Promise<StoryPlan> {
    const res = await fetch(`${API_BASE}/story-plans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<StoryPlan>(res);
  },
  async deleteStoryPlan(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/story-plans/${id}`, { method: 'DELETE' });
    return handleResponse<{ success: boolean }>(res);
  },
  async convertPlanToStory(id: string): Promise<Story> {
    const res = await fetch(`${API_BASE}/story-plans/${id}/convert-to-story`, {
      method: 'POST',
    });
    return handleResponse<Story>(res);
  },
  async discussStoryPlan(req: {
    universeId: string;
    storyYear: number;
    message: string;
    currentPlan?: Partial<StoryPlan>;
    conversationHistory?: { sender: 'user' | 'assistant'; text: string }[];
  }): Promise<{
    reply: string;
    suggestedPlanDelta?: PlannerChatMessage['suggestedPlanDelta'];
    canonAlerts: string[];
  }> {
    const res = await fetch(`${API_BASE}/planner/discuss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    return handleResponse(res);
  },
  async generatePlanOutline(plan: StoryPlan): Promise<PlannedScene[]> {
    const res = await fetch(`${API_BASE}/planner/outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    return handleResponse<PlannedScene[]>(res);
  },

  // LLM Provider Configuration
  async getLLMConfig(): Promise<LLMConfig> {
    const res = await fetch(`${API_BASE}/llm/config`);
    return handleResponse<LLMConfig>(res);
  },
  async updateLLMConfig(config: Partial<LLMConfig>): Promise<LLMConfig> {
    const res = await fetch(`${API_BASE}/llm/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return handleResponse<LLMConfig>(res);
  },
  async testLLM(config: Partial<LLMConfig>): Promise<LLMTestResult> {
    const res = await fetch(`${API_BASE}/llm/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return handleResponse<LLMTestResult>(res);
  },
  async getAvailableLLMModels(config: Partial<LLMConfig>): Promise<{ models: string[] }> {
    const res = await fetch(`${API_BASE}/llm/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return handleResponse<{ models: string[] }>(res);
  },
  async getLLMProviders(): Promise<Record<string, { baseUrl: string; defaultModel: string; isLocal: boolean }>> {
    const res = await fetch(`${API_BASE}/llm/providers`);
    return handleResponse(res);
  },

  // LLM Tools schema
  async getLLMToolsSchema() {
    const res = await fetch(`${API_BASE}/llm-tools/schema`);
    return handleResponse(res);
  },
};
