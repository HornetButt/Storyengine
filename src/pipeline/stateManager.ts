import { FullStory, CharacterCurrentState, StoryState } from '../domain/storyModel';

export class StateManager {
  static getCharacterState(
    story: FullStory,
    nameOrId: string
  ): CharacterCurrentState | undefined {
    if (story.storyState.characters[nameOrId]) {
      return story.storyState.characters[nameOrId];
    }
    return Object.values(story.storyState.characters).find(
      (c) => c.name.toLowerCase() === nameOrId.toLowerCase()
    );
  }

  static ensureCharacterState(
    story: FullStory,
    nameOrId: string
  ): CharacterCurrentState {
    const existing = this.getCharacterState(story, nameOrId);
    if (existing) return existing;

    const bibleChar = story.storyBible.characters.find(
      (c) => c.id === nameOrId || c.name.toLowerCase() === nameOrId.toLowerCase()
    );

    const newState: CharacterCurrentState = {
      characterId: bibleChar ? bibleChar.id : nameOrId,
      name: bibleChar ? bibleChar.name : nameOrId,
      status: bibleChar ? bibleChar.statusAtStart : 'alive',
      emotionalState: 'Исходное состояние',
      knowledge: bibleChar?.knowledgeAtStart || [],
      inventory: [],
    };

    story.storyState.characters[newState.characterId] = newState;
    return newState;
  }

  static updateCharacterLocation(story: FullStory, nameOrId: string, locationName: string) {
    const char = this.ensureCharacterState(story, nameOrId);
    char.locationName = locationName;
    story.updatedAt = new Date().toISOString();
  }

  static updateCharacterEmotion(story: FullStory, nameOrId: string, emotion: string) {
    const char = this.ensureCharacterState(story, nameOrId);
    char.emotionalState = emotion;
    story.updatedAt = new Date().toISOString();
  }

  static addCharacterKnowledge(story: FullStory, nameOrId: string, fact: string) {
    const char = this.ensureCharacterState(story, nameOrId);
    if (!char.knowledge.includes(fact)) {
      char.knowledge.push(fact);
    }
    story.updatedAt = new Date().toISOString();
  }

  static setEventFlag(story: FullStory, flag: string, value: boolean = true) {
    story.storyState.events[flag] = value;
    story.updatedAt = new Date().toISOString();
  }

  static updateMysteryClue(
    story: FullStory,
    mysteryId: string,
    clue: string,
    resolved: boolean = false
  ) {
    const existing = story.storyState.mysteries[mysteryId] || {
      status: 'unresolved',
      cluesRevealed: [],
    };

    if (!existing.cluesRevealed.includes(clue)) {
      existing.cluesRevealed.push(clue);
    }
    if (resolved) {
      existing.status = 'resolved';
    } else if (existing.cluesRevealed.length > 0) {
      existing.status = 'partially_resolved';
    }

    story.storyState.mysteries[mysteryId] = existing;
    story.updatedAt = new Date().toISOString();
  }

  static recordSceneCompletion(story: FullStory, sceneId: string, summary: string) {
    if (!story.storyState.completedSceneIds.includes(sceneId)) {
      story.storyState.completedSceneIds.push(sceneId);
    }
    story.storyState.lastSceneSummary = summary;
    story.storyState.events[`scene_${sceneId}_completed`] = true;
    story.updatedAt = new Date().toISOString();
  }
}
