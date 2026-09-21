import { StoryBible, GenerateStoryRequest, CharacterState } from '../types';
import { storage } from './storage';

export function buildStoryBible(req: GenerateStoryRequest): StoryBible {
  const universe = storage.getUniverse(req.universeId) || storage.getUniverses()[0];
  const allCharacters = storage.getCharacters(req.universeId);
  const allLocations = storage.getLocations(req.universeId);
  const allEvents = storage.getEvents(req.universeId);
  const allObjects = storage.getObjects(req.universeId);
  const allStories = storage.getStories({ universeId: req.universeId });

  // Filter or prioritize characters
  const relevantCharacters = allCharacters
    .filter((c) => {
      if (req.characterIds && req.characterIds.length > 0) {
        return req.characterIds.includes(c.id);
      }
      return true;
    })
    .slice(0, 4)
    .map((c) => {
      // Find state at storyYear
      const pastOrCurrentStates = c.states
        .filter((s: CharacterState) => s.year <= req.storyYear)
        .sort((a: CharacterState, b: CharacterState) => b.year - a.year);
      const currentState = pastOrCurrentStates[0];
      const isDeceased = currentState ? currentState.status === 'deceased' : c.status === 'deceased';

      return {
        name: c.canonicalName,
        aliases: c.aliases,
        currentStatusAtYear: currentState ? `${currentState.status} (${currentState.description})` : c.status,
        biographySummary: c.description,
        isDeceased,
      };
    });

  const relevantLocations = allLocations
    .filter((l) => {
      if (req.locationIds && req.locationIds.length > 0) {
        return req.locationIds.includes(l.id);
      }
      return true;
    })
    .slice(0, 3)
    .map((l) => ({
      name: l.name,
      status: l.status,
      description: l.description,
    }));

  const relevantEvents = allEvents
    .filter((e) => e.year <= req.storyYear)
    .sort((a, b) => b.year - a.year)
    .slice(0, 5)
    .map((e) => ({
      title: e.title,
      year: e.year,
      description: e.description,
    }));

  const relevantObjects = allObjects.slice(0, 4).map((o) => ({
    name: o.name,
    description: o.description,
  }));

  // Canonical constraints and forbidden elements
  const canonConstraints: string[] = [
    `Вселенная: ${universe.name}. Статус канона: ${req.canonStatus.toUpperCase()}.`,
    `Действие происходит в ${req.storyYear} году. События прошлого должны строго учитываться.`,
  ];

  const forbiddenElements: string[] = [...(req.forbiddenElements || [])];

  relevantCharacters.forEach((c) => {
    if (c.isDeceased) {
      forbiddenElements.push(
        `Персонаж «${c.name}» погиб до ${req.storyYear} года. ЗАПРЕЩЕНО изображать его живым действующим лицом. Разрешены только воспоминания, архивные записи или диалоги о нём.`
      );
    }
  });

  relevantLocations.forEach((l) => {
    if (l.status === 'ruined') {
      canonConstraints.push(
        `Локация «${l.name}» разрушена или сожжена к ${req.storyYear} году. Должна описываться как руины/пепелище.`
      );
    }
  });

  // References candidates based on referenceLevel
  const potentialReferences: StoryBible['potentialReferences'] = [];
  if (req.referenceLevel !== 'none') {
    allStories.forEach((s) => {
      if (req.referenceLevel === 'subtle') {
        potentialReferences.push({
          sourceStoryTitle: s.title,
          itemOrPhrase: 'синяя дверь или запах жжёной древесины',
          suggestion: 'Ненавязчиво упомянуть старый оттенок синей краски или запах гари на холме без прямых объяснений.',
        });
        potentialReferences.push({
          sourceStoryTitle: s.title,
          itemOrPhrase: 'кожаный блокнот',
          suggestion: 'Герой может мельком заметить потрепанный дневник у Елены или упоминание в записях архива.',
        });
      } else if (req.referenceLevel === 'obvious') {
        potentialReferences.push({
          sourceStoryTitle: s.title,
          itemOrPhrase: `События из «${s.title}»`,
          suggestion: `Прямо сослаться на экспедицию Михаила и катастрофу в Старом доме.`,
        });
      }
    });
  }

  return {
    universeId: universe.id,
    universeName: universe.name,
    storyYear: req.storyYear,
    requestedPrompt: req.prompt,
    relevantCharacters,
    relevantLocations,
    relevantEvents,
    relevantObjects,
    canonConstraints,
    forbiddenElements,
    potentialReferences: potentialReferences.slice(0, 3),
  };
}
