import {
  FullStory,
  CanonFact,
  CanonProposal,
  CanonFactType,
} from '../domain/storyModel';
import { StateManager } from './stateManager';

export class CanonManager {
  /**
   * Submits a new proposed change to the Canon.
   * Crucial rule: LLM or pipeline CANNOT mutate Canon facts directly.
   * It only registers a proposal for user review.
   */
  static propose(
    story: FullStory,
    proposalData: Omit<CanonProposal, 'id' | 'createdAt' | 'status'>
  ): CanonProposal {
    const proposal: CanonProposal = {
      id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      ...proposalData,
    };

    story.canon.proposals.push(proposal);
    story.updatedAt = new Date().toISOString();
    return proposal;
  }

  /**
   * Accepts a proposal, turning it into an established, immutable CanonFact.
   * Optionally allows editing before accepting.
   */
  static acceptProposal(
    story: FullStory,
    proposalId: string,
    editedProposal?: Partial<CanonProposal>
  ): { story: FullStory; fact: CanonFact } {
    const propIndex = story.canon.proposals.findIndex((p) => p.id === proposalId);
    if (propIndex === -1) {
      throw new Error(`Canon proposal not found: ${proposalId}`);
    }

    const currentProp = story.canon.proposals[propIndex];
    const finalProp: CanonProposal = {
      ...currentProp,
      ...editedProposal,
      status: 'accepted',
    };
    story.canon.proposals[propIndex] = finalProp;

    // Convert into permanent CanonFact
    const fact: CanonFact = {
      id: `fact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: finalProp.type,
      subject: finalProp.character || finalProp.source || story.title,
      statement: finalProp.change,
      sourceSceneId: finalProp.sourceSceneId,
      sourceBeatId: finalProp.sourceBeatId,
      establishedInYear: story.storyYear,
      status: 'canon',
      createdAt: new Date().toISOString(),
    };

    story.canon.facts.push(fact);

    // Apply immediate consequence to StoryState
    this.applyFactToState(story, fact, finalProp);

    story.updatedAt = new Date().toISOString();
    return { story, fact };
  }

  /**
   * Rejects a proposal.
   */
  static rejectProposal(story: FullStory, proposalId: string): FullStory {
    const prop = story.canon.proposals.find((p) => p.id === proposalId);
    if (!prop) {
      throw new Error(`Canon proposal not found: ${proposalId}`);
    }
    prop.status = 'rejected';
    story.updatedAt = new Date().toISOString();
    return story;
  }

  /**
   * Allows author to edit a pending proposal before deciding.
   */
  static editProposal(
    story: FullStory,
    proposalId: string,
    updates: Partial<CanonProposal>
  ): CanonProposal {
    const prop = story.canon.proposals.find((p) => p.id === proposalId);
    if (!prop) {
      throw new Error(`Canon proposal not found: ${proposalId}`);
    }
    Object.assign(prop, updates);
    story.updatedAt = new Date().toISOString();
    return prop;
  }

  /**
   * Adds an author-mandated Canon fact directly.
   */
  static addDirectFact(
    story: FullStory,
    factData: {
      type: CanonFactType;
      subject: string;
      statement: string;
      sourceSceneId?: string;
    }
  ): CanonFact {
    const fact: CanonFact = {
      id: `fact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      establishedInYear: story.storyYear,
      status: 'canon',
      createdAt: new Date().toISOString(),
      ...factData,
    };
    story.canon.facts.push(fact);
    story.updatedAt = new Date().toISOString();
    return fact;
  }

  /**
   * Retcons a Canon fact if an author explicitly decides to void it.
   */
  static retconFact(story: FullStory, factId: string): FullStory {
    const fact = story.canon.facts.find((f) => f.id === factId);
    if (fact) {
      fact.status = 'retconned';
      story.updatedAt = new Date().toISOString();
    }
    return story;
  }

  /**
   * Validates any text against the currently established Canon facts and rules.
   */
  static validateAgainstCanon(
    story: FullStory,
    text: string
  ): { conflicts: string[]; warnings: string[] } {
    const conflicts: string[] = [];
    const warnings: string[] = [];
    const textLower = text.toLowerCase();

    // 1. Check deceased characters appearing active
    for (const char of story.storyBible.characters) {
      const state = story.storyState.characters[char.id];
      const isDead = char.statusAtStart === 'deceased' || state?.status === 'deceased';
      if (isDead) {
        const charNameLower = char.name.toLowerCase();
        if (textLower.includes(charNameLower)) {
          const actionWords = ['сказал', 'пошёл', 'пошел', 'взглянул', 'прибыл', 'достал', 'ответил'];
          const hasAction = actionWords.some((w) => textLower.includes(w));
          if (hasAction) {
            conflicts.push(
              `Персонаж «${char.name}» числится погибшим, но в тексте описывается как активно действующее лицо.`
            );
          } else {
            warnings.push(
              `Упоминание погибшего персонажа «${char.name}». Убедитесь, что речь идёт о воспоминании или архивных данных.`
            );
          }
        }
      }
    }

    // 2. Check world rules violations
    for (const rule of story.storyBible.rules) {
      if (rule.toLowerCase().includes('запрет') || rule.toLowerCase().includes('нельзя')) {
        // e.g. check keywords
        const keywords = rule.split(' ').filter((w) => w.length > 5);
        const match = keywords.some((kw) => textLower.includes(kw.toLowerCase()));
        if (match) {
          warnings.push(`Возможное нарушение правила мира: «${rule}».`);
        }
      }
    }

    return { conflicts, warnings };
  }

  private static applyFactToState(
    story: FullStory,
    fact: CanonFact,
    prop: CanonProposal
  ) {
    if (fact.type === 'CHARACTER_KNOWLEDGE' && prop.character) {
      StateManager.addCharacterKnowledge(story, prop.character, fact.statement);
    } else if (fact.type === 'EVENT_OCCURRED') {
      const eventKey = fact.statement.slice(0, 40).replace(/[^a-zA-Zа-яА-Я0-9_]/g, '_');
      StateManager.setEventFlag(story, eventKey, true);
    } else if (fact.type === 'RELATIONSHIP_CHANGE' && prop.character) {
      story.storyState.relationships[prop.character] = {
        state: fact.statement,
      };
    }
  }
}
