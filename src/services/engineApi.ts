import {
  FullStory,
  Scene,
  Beat,
  DraftVersion,
  CriticReport,
  CanonProposal,
  CanonFact,
} from '../domain/storyModel';

const BASE_URL = '/api/v1/engine';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: 'Неизвестная ошибка сети' }));
    throw new Error(errorBody.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const engineApi = {
  // Stories CRUD
  listStories: (universeId?: string) =>
    request<FullStory[]>(`/stories${universeId ? `?universeId=${universeId}` : ''}`),

  getStory: (id: string) => request<FullStory>(`/stories/${id}`),

  createStory: (params: { title: string; universeId: string; storyYear?: number; idea?: string }) =>
    request<FullStory>('/stories', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  updateStory: (id: string, updates: Partial<FullStory>) =>
    request<FullStory>(`/stories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteStory: (id: string) =>
    request<{ success: boolean }>(`/stories/${id}`, {
      method: 'DELETE',
    }),

  // Step 1: Concept
  generateConcept: (storyId: string, idea?: string) =>
    request<FullStory>(`/stories/${storyId}/concept`, {
      method: 'POST',
      body: JSON.stringify({ idea }),
    }),

  // Step 2: Story Bible
  generateBible: (storyId: string) =>
    request<FullStory>(`/stories/${storyId}/bible`, {
      method: 'POST',
    }),

  // Step 3: Plot (Acts -> Scenes)
  generatePlot: (storyId: string) =>
    request<FullStory>(`/stories/${storyId}/plot`, {
      method: 'POST',
    }),

  // Step 4: Plan Scene
  planScene: (storyId: string, sceneId: string) =>
    request<{ story: FullStory; scene: Scene }>(`/stories/${storyId}/scenes/${sceneId}/plan`, {
      method: 'POST',
    }),

  // Step 5: Plan Beats
  planBeats: (storyId: string, sceneId: string) =>
    request<{ story: FullStory; beats: Beat[] }>(`/stories/${storyId}/scenes/${sceneId}/beats`, {
      method: 'POST',
    }),

  // Step 6: Write Beat
  writeBeat: (storyId: string, sceneId: string, beatId: string, styleDirectives?: string) =>
    request<{ story: FullStory; beat: Beat; text: string }>(
      `/stories/${storyId}/scenes/${sceneId}/beats/${beatId}/write`,
      {
        method: 'POST',
        body: JSON.stringify({ styleDirectives }),
      }
    ),

  // Step 7: Write All Beats
  writeSceneAll: (storyId: string, sceneId: string) =>
    request<FullStory>(`/stories/${storyId}/scenes/${sceneId}/write-all`, {
      method: 'POST',
    }),

  // Step 8: Critic Review
  reviewScene: (storyId: string, sceneId: string, draftText?: string) =>
    request<{ story: FullStory; report: CriticReport }>(`/stories/${storyId}/scenes/${sceneId}/review`, {
      method: 'POST',
      body: JSON.stringify({ draftText }),
    }),

  // Step 9: Extract Canon
  extractCanon: (storyId: string, sceneId: string) =>
    request<{ story: FullStory; proposals: CanonProposal[] }>(
      `/stories/${storyId}/scenes/${sceneId}/extract-canon`,
      {
        method: 'POST',
      }
    ),

  // Step 10: Revise Draft
  reviseScene: (storyId: string, sceneId: string, userInstructions?: string) =>
    request<{ story: FullStory; scene: Scene; newDraft: DraftVersion }>(
      `/stories/${storyId}/scenes/${sceneId}/revise`,
      {
        method: 'POST',
        body: JSON.stringify({ userInstructions }),
      }
    ),

  // Step 11: Commit Scene & update StoryState
  commitSceneState: (storyId: string, sceneId: string) =>
    request<FullStory>(`/stories/${storyId}/scenes/${sceneId}/commit-state`, {
      method: 'POST',
    }),

  // Canon proposals
  acceptCanonProposal: (storyId: string, propId: string, editedProposal?: Partial<CanonProposal>) =>
    request<{ story: FullStory; fact: CanonFact }>(
      `/stories/${storyId}/canon/proposals/${propId}/accept`,
      {
        method: 'POST',
        body: JSON.stringify({ editedProposal }),
      }
    ),

  rejectCanonProposal: (storyId: string, propId: string) =>
    request<FullStory>(`/stories/${storyId}/canon/proposals/${propId}/reject`, {
      method: 'POST',
    }),

  editCanonProposal: (storyId: string, propId: string, updates: Partial<CanonProposal>) =>
    request<CanonProposal>(`/stories/${storyId}/canon/proposals/${propId}/edit`, {
      method: 'POST',
      body: JSON.stringify(updates),
    }),

  addDirectFact: (storyId: string, fact: { type: string; subject: string; statement: string }) =>
    request<CanonFact>(`/stories/${storyId}/canon/facts`, {
      method: 'POST',
      body: JSON.stringify(fact),
    }),

  retconFact: (storyId: string, factId: string) =>
    request<FullStory>(`/stories/${storyId}/canon/facts/${factId}/retcon`, {
      method: 'POST',
    }),
};
