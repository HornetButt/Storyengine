import {
  Universe,
  Character,
  Story,
  StoryEvent,
  StoryLocation,
  StoryObject,
  Relationship,
  ProposedKnowledgeChange,
  StoryPlan,
  LLMConfig,
  LorebookEntry,
} from '../../types';

export interface StorageData {
  universes: Universe[];
  characters: Character[];
  stories: Story[];
  events: StoryEvent[];
  locations: StoryLocation[];
  objects: StoryObject[];
  relationships: Relationship[];
  proposedChanges: ProposedKnowledgeChange[];
  storyPlans: StoryPlan[];
  llmConfig: LLMConfig;
  lorebookEntries?: LorebookEntry[];
}

export const initialData: StorageData = {
  llmConfig: {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    baseUrl: '',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 4096,
    isLocal: false,
  },
  universes: [
    {
      id: 'uni-main',
      name: 'Основная вселенная (Main Canon)',
      description: 'Центральный канонический таймлайн города N и окрестных деревень.',
      genre: 'Мистический детектив / Реализм',
      era: '2020–2030 гг.',
      tags: ['канон', 'сосновка', 'мистика', 'архив'],
      rules: [
        'Синяя дверь не поддается механическому взлому снаружи',
        'Временные линии строго однонаправлены: погибшие герои не воскресают',
        'Радиопомехи усиливаются за 15 минут до аномалий',
      ],
      status: 'active',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'uni-alt',
      name: 'Тёмная вселенная (Dark Universe)',
      description: 'Альтернативная ветка событий, где аномалия синей двери распространилась.',
      genre: 'Хоррор / Тёмное фэнтези',
      era: '2025–2040 гг.',
      tags: ['альтернатива', 'хоррор', 'аномалия', 'эхо'],
      rules: [
        'Синяя дверь открыта настежь',
        'Пространство искажается в радиусе 3 километров от оврага',
      ],
      status: 'active',
      createdAt: '2024-02-01T12:00:00Z',
      updatedAt: '2024-02-01T12:00:00Z',
    },
  ],
  characters: [
    {
      id: 'char-mikhail',
      universeId: 'uni-main',
      canonicalName: 'Михаил Северов',
      aliases: ['Михаил', 'Северов', 'Странник'],
      description: 'Бывший исследователь аномальных явлений, искавший правду о заброшенных домах.',
      biography:
        'Родился в Петербурге в 1988 году. В 2024 году прибыл в деревню Сосновка для исследования феномена синей двери. Осенью 2025 года погиб в пожаре.',
      personality: 'Осторожный, наблюдательный, замкнутый, преданный поиску истины.',
      appearance: 'Высокий мужчина 36 лет, темное пальто, старый кожаный блокнот с зарисовками.',
      age: '36',
      occupation: 'Исследователь-архивист',
      role: 'protagonist',
      gender: 'Мужской',
      tags: ['протагонист', 'исследователь', 'архивист', 'погибший'],
      status: 'deceased',
      states: [
        {
          id: 'state-m-2024',
          characterId: 'char-mikhail',
          year: 2024,
          status: 'alive',
          locationId: 'loc-old-house',
          description: 'Жив. Прибыл в Сосновку, поселился на окраине, изучал старый дом.',
        },
        {
          id: 'state-m-2025',
          characterId: 'char-mikhail',
          year: 2025,
          status: 'deceased',
          locationId: 'loc-old-house',
          description: 'Погиб во время загадочного пожара в Старом доме 12 октября 2025 года.',
          eventId: 'evt-fire-2025',
        },
      ],
      createdAt: '2024-01-16T11:00:00Z',
      updatedAt: '2025-10-12T14:30:00Z',
    },
    {
      id: 'char-elena',
      universeId: 'uni-main',
      canonicalName: 'Елена Воронова',
      aliases: ['Елена', 'Лена', 'Доктор Воронова'],
      description: 'Местный врач и летописец Сосновки, близкая подруга Михаила.',
      biography:
        'Живет в Сосновке с 2018 года. Помогала Михаилу разбирать архивы. После его гибели сохранила его записи.',
      personality: 'Рациональная, скептичная, но эмпатичная.',
      appearance:
        'Женщина 34 лет со светлыми волосами, часто в шерстяном кардигане с серебряным кулоном.',
      age: '34',
      occupation: 'Врач медпункта',
      role: 'supporting',
      gender: 'Женский',
      tags: ['летописец', 'медик', 'союзник', 'скептик'],
      status: 'alive',
      states: [
        {
          id: 'state-e-2024',
          characterId: 'char-elena',
          year: 2024,
          status: 'alive',
          locationId: 'loc-village',
          description: 'Работает в медпункте, познакомилась с Михаилом.',
        },
        {
          id: 'state-e-2026',
          characterId: 'char-elena',
          year: 2026,
          status: 'alive',
          locationId: 'loc-village',
          description: 'Продолжает расследование после гибели Михаила, хранит его блокнот.',
        },
      ],
      createdAt: '2024-01-16T11:30:00Z',
      updatedAt: '2026-01-05T09:00:00Z',
    },
    {
      id: 'char-alexey',
      universeId: 'uni-main',
      canonicalName: 'Алексей Корнеев',
      aliases: ['Алексей', 'Ночной сторож'],
      description: 'Ночной охранник архива и заброшенной метеостанции на холме.',
      biography:
        'Бывший военный связист, работает сторожем с 2025 года. Замечает странные отблески света над пепелищем Старого дома.',
      personality: 'Молчаливый, внимательный к звукам, не любит лишних вопросов.',
      appearance: 'Крепкий мужчина около 41 года, камуфляжная куртка, тяжелый фонарь.',
      age: '41',
      occupation: 'Ночной сторож',
      role: 'supporting',
      gender: 'Мужской',
      tags: ['сторож', 'связист', 'свидетель', 'ночная-смена'],
      status: 'alive',
      states: [
        {
          id: 'state-a-2026',
          characterId: 'char-alexey',
          year: 2026,
          status: 'alive',
          locationId: 'loc-archive',
          description: 'Охраняет северный сектор архива в ночную смену.',
        },
      ],
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-01-10T10:00:00Z',
    },
  ],
  locations: [
    {
      id: 'loc-old-house',
      universeId: 'uni-main',
      name: 'Старый дом на окраине',
      description:
        'Деревянный двухэтажный особняк с мезонином и глухими ставнями. В подвале находилась заколоченная синяя дверь. В октябре 2025 года сгорел до фундамента.',
      type: 'Особняк',
      status: 'ruined',
      createdAt: '2024-01-16T09:00:00Z',
      updatedAt: '2025-10-15T12:00:00Z',
    },
    {
      id: 'loc-village',
      universeId: 'uni-main',
      name: 'Деревня Сосновка',
      description: 'Небольшое прибрежное поселение, окруженное густым хвойным лесом и туманами.',
      type: 'Поселение',
      status: 'intact',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'loc-archive',
      universeId: 'uni-main',
      name: 'Старый архив и метеостанция',
      description:
        'Кирпичное полуподземное здание на холме за рекой. Хранилище карт и метеоотчетов с 1970-х годов.',
      type: 'Архив / Станция',
      status: 'intact',
      createdAt: '2025-02-10T14:00:00Z',
      updatedAt: '2026-01-01T10:00:00Z',
    },
  ],
  events: [
    {
      id: 'evt-arrival-2024',
      universeId: 'uni-main',
      title: 'Михаил приехал в Сосновку',
      description:
        'Михаил Северов прибыл на утреннем автобусе и снял комнату у реки, начав поиски Старого дома.',
      year: 2024,
      dateStart: '2024-05-14',
      locationId: 'loc-village',
      canonStatus: 'canon',
      createdAt: '2024-05-15T10:00:00Z',
      updatedAt: '2024-05-15T10:00:00Z',
    },
    {
      id: 'evt-door-found-2024',
      universeId: 'uni-main',
      title: 'Михаил обнаружил синюю дверь',
      description: 'В подвале Старого дома найдена запертая дверь синего цвета без замочной скважины.',
      year: 2024,
      dateStart: '2024-07-20',
      locationId: 'loc-old-house',
      canonStatus: 'canon',
      createdAt: '2024-07-21T08:00:00Z',
      updatedAt: '2024-07-21T08:00:00Z',
    },
    {
      id: 'evt-fire-2025',
      universeId: 'uni-main',
      title: 'Пожар в Старом доме и гибель Михаила',
      description:
        'В ночь на 12 октября 2025 года в Старом доме вспыхнул пожар. Дом разрушен, Михаил Северов погиб.',
      year: 2025,
      dateStart: '2025-10-12',
      locationId: 'loc-old-house',
      canonStatus: 'canon',
      createdAt: '2025-10-13T09:00:00Z',
      updatedAt: '2025-10-13T09:00:00Z',
    },
    {
      id: 'evt-night-shift-2026',
      universeId: 'uni-main',
      title: 'Первое дежурство Алексея в архиве',
      description:
        'Алексей Корнеев заступил на ночное дежурство на станции и зафиксировал световые сигналы со стороны пепелища.',
      year: 2026,
      dateStart: '2026-02-04',
      locationId: 'loc-archive',
      canonStatus: 'canon',
      createdAt: '2026-02-05T10:00:00Z',
      updatedAt: '2026-02-05T10:00:00Z',
    },
  ],
  objects: [
    {
      id: 'obj-blue-door',
      universeId: 'uni-main',
      name: 'Синяя дверь',
      description:
        'Массивная дубовая дверь, выкрашенная в выцветший синий цвет. Не имеет замочной скважины, от неё исходит едва слышный гул.',
      properties: { color: 'blue', anomalous: true, sound: 'humming' } as any,
      currentLocationId: 'loc-old-house',
      createdAt: '2024-07-21T10:00:00Z',
      updatedAt: '2025-10-12T10:00:00Z',
    },
    {
      id: 'obj-notebook',
      universeId: 'uni-main',
      name: 'Кожаный блокнот Михаила',
      description:
        'Потрепанный дневник в коричневом переплете с чертежами подвала и записями о Сосновке. Сейчас хранится у Елены Вороновой.',
      properties: { material: 'leather', handwritten: true } as any,
      currentLocationId: 'loc-village',
      createdAt: '2024-05-14T10:00:00Z',
      updatedAt: '2026-01-05T10:00:00Z',
    },
  ],
  relationships: [
    {
      id: 'rel-1',
      sourceType: 'character',
      sourceId: 'char-mikhail',
      targetType: 'story',
      targetId: 'story-001',
      relationType: 'appears_in',
      confidence: 1.0,
      provenance: 'user_confirmed_fact',
      canonStatus: 'canon',
      createdAt: '2024-06-01T10:00:00Z',
    },
    {
      id: 'rel-2',
      sourceType: 'character',
      sourceId: 'char-mikhail',
      targetType: 'location',
      targetId: 'loc-old-house',
      relationType: 'lives_in',
      confidence: 1.0,
      provenance: 'user_confirmed_fact',
      canonStatus: 'canon',
      createdAt: '2024-06-01T10:00:00Z',
    },
    {
      id: 'rel-3',
      sourceType: 'character',
      sourceId: 'char-mikhail',
      targetType: 'object',
      targetId: 'obj-blue-door',
      relationType: 'found',
      confidence: 1.0,
      provenance: 'user_confirmed_fact',
      canonStatus: 'canon',
      createdAt: '2024-07-21T10:00:00Z',
    },
    {
      id: 'rel-4',
      sourceType: 'character',
      sourceId: 'char-mikhail',
      targetType: 'character',
      targetId: 'char-elena',
      relationType: 'friend_of',
      confidence: 0.95,
      provenance: 'user_confirmed_fact',
      canonStatus: 'canon',
      createdAt: '2024-06-15T10:00:00Z',
    },
    {
      id: 'rel-5',
      sourceType: 'character',
      sourceId: 'char-mikhail',
      targetType: 'event',
      targetId: 'evt-fire-2025',
      relationType: 'participated_in',
      confidence: 1.0,
      provenance: 'user_confirmed_fact',
      canonStatus: 'canon',
      notes: 'Погиб во время этого события',
      createdAt: '2025-10-15T10:00:00Z',
    },
    {
      id: 'rel-6',
      sourceType: 'character',
      sourceId: 'char-elena',
      targetType: 'object',
      targetId: 'obj-notebook',
      relationType: 'owns',
      confidence: 1.0,
      provenance: 'user_confirmed_fact',
      canonStatus: 'canon',
      notes: 'Хранит блокнот Михаила после 2025 года',
      createdAt: '2025-10-20T10:00:00Z',
    },
    {
      id: 'rel-7',
      sourceType: 'character',
      sourceId: 'char-alexey',
      targetType: 'location',
      targetId: 'loc-archive',
      relationType: 'lives_in',
      confidence: 0.9,
      provenance: 'user_confirmed_fact',
      canonStatus: 'canon',
      createdAt: '2026-01-10T10:00:00Z',
    },
  ],
  stories: [
    {
      id: 'story-001',
      universeId: 'uni-main',
      title: 'СТ-001: Тень у порога',
      synopsis:
        'Михаил приезжает в Сосновку весной 2024 года, знакомится с местным врачом Еленой и впервые осматривает заброшенный Старый дом на холме.',
      fullText: `Утренний рейсовый автобус высадил Михаила на развилке у старой сосны. Влажный майский воздух пах смолой и остывшей землёй. 

Михаил поправил ремень дорожной сумки и зашагал к деревне Сосновка. Его целью был Старый дом на северной окраине — деревянный особняк с глухими ставнями, о котором в городских архивах сохранились лишь обрывочные записи тридцатых годов.

В местном фельдшерском пункте он познакомился с Еленой Вороновой. Елена отнеслась к его расспросам со сдержанным любопытством:
— Туда давно никто не ходит, Михаил. Даже мальчишки обходят этот овраг стороной. Говорят, по ночам в подвале гудит, будто трансформатор.

К вечеру Михаил подошёл к особняку. Сквозь полусгнившие половицы террасы пробивалась полынь. Он спустился по каменным ступеням в полумрак подвала и замер.

Прямо перед ним в сырой каменной кладке стояла плотно пригнанная синяя дверь. Ни ручки, ни замочной скважины. Только холодная, выцветшая синева и тихий, едва уловимый монотонный гул.`,
      status: 'published',
      canonStatus: 'canon',
      storyDate: '2024-05-14',
      storyYear: 2024,
      consistencyStatus: 'passed',
      consistencyReport: {
        passed: true,
        score: 100,
        issues: [],
        summary: 'История полностью соответствует канону 2024 года.',
      },
      versions: [
        {
          id: 'ver-s1-1',
          storyId: 'story-001',
          versionNumber: 1,
          title: 'СТ-001: Тень у порога',
          synopsis: 'Первый драфт о прибытии Михаила в Сосновку.',
          fullText: `Утренний рейсовый автобус высадил Михаила на развилке...`,
          changeSummary: 'Начальная каноническая редакция',
          createdAt: '2024-05-15T12:00:00Z',
        },
      ],
      createdAt: '2024-05-15T12:00:00Z',
      updatedAt: '2024-05-15T12:00:00Z',
    },
    {
      id: 'story-017',
      universeId: 'uni-main',
      title: 'СТ-017: Пепел над оврагом',
      synopsis:
        'Осень 2025 года. Загадочный пожар уничтожает Старый дом. Михаил Северов пропадает в огне, спасая записи.',
      fullText: `Октябрь 2025 года выдался в Сосновке сухим и тревожным.

В ночь на 12 октября зарево осветило верхушки сосен. Огонь охватил Старый дом за считанные минуты. Жители деревни видели, как Михаил вбежал в горящий мезонин, пытаясь спасти дневники и зарисовки синей двери.

Елена Воронова прибежала к оврагу вместе с пожарной дружиной, но спасти особняк уже не удалось. К утру на месте дома дымились обугленные балки и каменный остов подвала. Сама синяя дверь словно растворилась — на её месте зияла глухая кирпичная стена.

Тело Михаила так и не нашли, но совет общины и следствие официально зафиксировали гибель исследователя. У Елены остался лишь один уцелевший блокнот в коричневом переплете, переданный Михаилом за неделю до катастрофы.`,
      status: 'published',
      canonStatus: 'canon',
      storyDate: '2025-10-12',
      storyYear: 2025,
      consistencyStatus: 'passed',
      consistencyReport: {
        passed: true,
        score: 100,
        issues: [],
        summary: 'Каноническое событие 2025 года (гибель Михаила, разрушение дома).',
      },
      versions: [
        {
          id: 'ver-s17-1',
          storyId: 'story-017',
          versionNumber: 1,
          title: 'СТ-017: Пепел над оврагом',
          synopsis: 'Финальная каноническая глава об исчезновении и гибели Михаила.',
          fullText: `Октябрь 2025 года выдался в Сосновке сухим и тревожным...`,
          changeSummary: 'Утверждено автором как канон',
          createdAt: '2025-10-14T10:00:00Z',
        },
      ],
      createdAt: '2025-10-14T10:00:00Z',
      updatedAt: '2025-10-14T10:00:00Z',
    },
  ],
  proposedChanges: [
    {
      id: 'prop-1',
      storyId: 'story-001',
      entityType: 'object',
      action: 'create',
      payload: {
        name: 'Медная керосиновая лампа',
        description: 'Лампа с треснутым стеклом, которую Михаил держал при спуске в подвал.',
        properties: { condition: 'cracked' },
      },
      confidence: 0.88,
      status: 'pending',
      reasoning: 'Извлечено из описания подвала в СТ-001.',
      createdAt: '2024-05-16T10:00:00Z',
    },
  ],
  storyPlans: [
    {
      id: 'plan-001',
      universeId: 'uni-main',
      storyYear: 2024,
      title: 'СТ-002: Эхо в колодце Сосновки',
      premise:
        'Михаил и Елена расследуют странные звуки и колебания воды в старом пересохшем колодце у дома лесника, находя первые знаки присутствия артефакта.',
      genre: 'Мистика / Детектив',
      tone: 'Напряжённый, камерный, загадочный',
      selectedCharacterIds: ['char-mikhail', 'char-elena'],
      selectedLocationIds: ['loc-old-house'],
      selectedObjectIds: ['obj-notebook'],
      scenes: [
        {
          id: 'sc-1',
          title: 'Сцена 1: Встреча у сельской амбулатории',
          description:
            'Михаил приходит к Елене с зарисовками из блокнота; Елена предостерегает его от походов к колодцу после заката.',
          locationId: 'loc-old-house',
          locationName: 'Амбулатория / Окраина Сосновки',
          characterIds: ['char-mikhail', 'char-elena'],
          characterNames: ['Михаил Северов', 'Елена Воронова'],
          year: 2024,
          emotionalBeat: 'Настороженное сближение двух скептиков',
          keyClueOrObject: 'Кожаный блокнот с картой 1912 года',
        },
        {
          id: 'sc-2',
          title: 'Сцена 2: Осмотр колодезного сруба',
          description:
            'С наступлением сумерек Михаил спускает на верёвке фонарь в колодец и слышит механическое гудение.',
          locationId: 'loc-old-house',
          locationName: 'Старый дом и колодец',
          characterIds: ['char-mikhail'],
          characterNames: ['Михаил Северов'],
          year: 2024,
          plotTwist:
            'На дне колодца нет воды — там выложен круг из тёмного гладкого камня со следами синей краски.',
          emotionalBeat: 'Осознание искусственной природы аномалии',
        },
        {
          id: 'sc-3',
          title: 'Сцена 3: Тревожный сигнал',
          description:
            'Михаил возвращается в дом, но обнаруживает на крыльце чужие свежие следы босых ног.',
          locationId: 'loc-old-house',
          locationName: 'Крыльцо старого дома',
          characterIds: ['char-mikhail', 'char-elena'],
          characterNames: ['Михаил Северов', 'Елена Воронова'],
          year: 2024,
          plotTwist:
            'Следы ведут не от леса к дому, а из самого запертого дома в сторону оврага.',
          emotionalBeat: 'Ощущение слежки и холодного ужаса',
        },
      ],
      plotTwists: [
        'Колодец является скрытым вентиляционным шахтным стволом фундамента дома',
        'Кто-то наблюдал за Михаилом изнутри запертого дома',
      ],
      canonNotes: [
        'В 2024 году Михаил ещё жив и полон сил (погибнет только осенью 2025 года)',
        'Елена работает врачом в Сосновке и пока не знает полного масштаба аномалии',
      ],
      status: 'ready_to_write',
      createdAt: '2024-06-01T10:00:00Z',
      updatedAt: '2024-06-01T10:00:00Z',
    },
  ],
};
