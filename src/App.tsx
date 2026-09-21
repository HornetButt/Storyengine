import React, { useState, useEffect } from 'react';
import { Sidebar, NavItem } from './components/Sidebar';
import { Header } from './components/Header';
import { ImportStoryModal } from './components/ImportStoryModal';
import { Teleprompter } from './components/Teleprompter';
import { StoryBeatsStudio } from './components/StoryBeats/StoryBeatsStudio';
import { StoryPlannerPage } from './pages/StoryPlannerPage';
import { StoryCanvasPage } from './pages/StoryCanvasPage';
import { DashboardPage } from './pages/DashboardPage';
import { StoriesPage } from './pages/StoriesPage';
import { StoryEditorPage } from './pages/StoryEditorPage';
import { CharactersPage } from './pages/CharactersPage';
import { GenerationPage } from './pages/GenerationPage';
import { TimelinePage } from './pages/TimelinePage';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { EntitiesPage } from './pages/EntitiesPage';
import { UniversesPage } from './pages/UniversesPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import {
  Universe,
  Character,
  Story,
  StoryLocation,
  StoryEvent,
  StoryObject,
  ProposedKnowledgeChange,
} from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavItem>('dashboard');
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [canvasStoryId, setCanvasStoryId] = useState<string | null>(null);
  const [teleprompterStoryId, setTeleprompterStoryId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Core data states
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>('');
  const [stories, setStories] = useState<Story[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<StoryLocation[]>([]);
  const [events, setEvents] = useState<StoryEvent[]>([]);
  const [objects, setObjects] = useState<StoryObject[]>([]);
  const [proposedChanges, setProposedChanges] = useState<ProposedKnowledgeChange[]>([]);
  const [stats, setStats] = useState({
    storiesCount: 0,
    charactersCount: 0,
    eventsCount: 0,
    universesCount: 0,
    locationsCount: 0,
    objectsCount: 0,
    relationshipsCount: 0,
    pendingChangesCount: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCurrentTab('search');
        setActiveStoryId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadAllData = async () => {
    try {
      const [u, s, c, l, e, o, p, st] = await Promise.all([
        api.getUniverses(),
        api.getStories(),
        api.getCharacters(),
        api.getLocations(),
        api.getEvents(),
        api.getObjects(),
        api.getProposedChanges('pending'),
        api.getStats(),
      ]);
      setUniverses(u);
      if (u.length > 0 && !selectedUniverseId) {
        setSelectedUniverseId(u[0].id);
      }
      setStories(s);
      setCharacters(c);
      setLocations(l);
      setEvents(e);
      setObjects(o);
      setProposedChanges(p);
      setStats(st);
    } catch (err) {
      console.error('Failed to load initial engine data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStory = (id: string) => {
    setActiveStoryId(id);
  };

  const handleCreateNewStory = async () => {
    const uniId = selectedUniverseId || universes[0]?.id || 'uni-sosnovka';
    const newStory = await api.createStory({
      universeId: uniId,
      title: 'Новый канонический рассказ',
      synopsis: 'Краткое описание событий...',
      fullText: 'Начните писать здесь...',
      status: 'draft',
      canonStatus: 'draft',
      storyDate: '2026-06-01',
      storyYear: 2026,
    });
    setStories([newStory, ...stories]);
    setActiveStoryId(newStory.id);
  };

  const handleAcceptChange = async (id: string) => {
    await api.acceptProposedChange(id);
    loadAllData();
  };

  const handleRejectChange = async (id: string) => {
    await api.rejectProposedChange(id);
    loadAllData();
  };

  const handleImportSuccess = (result: any) => {
    loadAllData();
    if (result.story?.id) {
      setActiveStoryId(result.story.id);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-stone-950 text-stone-100 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={activeStoryId ? 'stories' : currentTab}
        onSelectTab={(tab) => {
          setActiveStoryId(null);
          setCurrentTab(tab);
        }}
        pendingCount={proposedChanges.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <Header
          universes={universes}
          selectedUniverseId={selectedUniverseId}
          onSelectUniverse={setSelectedUniverseId}
          onOpenGenerate={() => {
            setActiveStoryId(null);
            setCurrentTab('generation');
          }}
          onQuickSearch={() => {
            setActiveStoryId(null);
            setCurrentTab('search');
          }}
          onNewStory={handleCreateNewStory}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto">
          {activeStoryId ? (
            <StoryEditorPage
              storyId={activeStoryId}
              universes={universes}
              onBack={() => {
                setActiveStoryId(null);
                setCurrentTab('stories');
              }}
              onOpenCanvas={(id) => {
                setCanvasStoryId(id);
                setActiveStoryId(null);
                setCurrentTab('canvas');
              }}
              onOpenBeatsStudio={(id) => {
                setCanvasStoryId(id);
                setActiveStoryId(null);
                setCurrentTab('beats');
              }}
              onStoryUpdated={loadAllData}
            />
          ) : currentTab === 'beats' ? (
            <StoryBeatsStudio
              universes={universes}
              characters={characters}
              locations={locations}
              stories={stories}
              initialStoryId={canvasStoryId || activeStoryId || stories[0]?.id || null}
              onSelectStory={(id) => {
                setCanvasStoryId(id);
              }}
              onRefreshAll={loadAllData}
              onOpenCanvas={(id) => {
                setCanvasStoryId(id);
                setActiveStoryId(null);
                setCurrentTab('canvas');
              }}
            />
          ) : currentTab === 'canvas' ? (
            <StoryCanvasPage
              stories={stories}
              universes={universes}
              characters={characters}
              locations={locations}
              events={events}
              objects={objects}
              initialStoryId={canvasStoryId || stories[0]?.id || null}
              onSelectStory={(id) => {
                setCanvasStoryId(id);
              }}
              onRefreshAll={loadAllData}
              onBackToStories={() => {
                setCurrentTab('stories');
                setActiveStoryId(null);
              }}
              onOpenBeatsStudio={(id) => {
                setCanvasStoryId(id);
                setActiveStoryId(null);
                setCurrentTab('beats');
              }}
            />
          ) : currentTab === 'dashboard' ? (
            <DashboardPage
              stats={stats}
              recentStories={stories.slice(0, 5)}
              proposedChanges={proposedChanges}
              onOpenGenerate={() => setCurrentTab('generation')}
              onOpenImport={() => setIsImportOpen(true)}
              onSelectStory={handleSelectStory}
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onAcceptChange={handleAcceptChange}
              onRejectChange={handleRejectChange}
            />
          ) : currentTab === 'planner' ? (
            <StoryPlannerPage
              universes={universes}
              characters={characters}
              locations={locations}
              events={events}
              objects={objects}
              selectedUniverseId={selectedUniverseId}
              onSelectStory={handleSelectStory}
              onRefreshAll={loadAllData}
              onOpenBeatsStudio={(id) => {
                setCanvasStoryId(id);
                setActiveStoryId(null);
                setCurrentTab('beats');
              }}
            />
          ) : currentTab === 'stories' ? (
            <StoriesPage
              stories={stories}
              universes={universes}
              selectedUniverseId={selectedUniverseId}
              onSelectStory={handleSelectStory}
              onNewStory={handleCreateNewStory}
              onOpenImport={() => setIsImportOpen(true)}
              onOpenCanvas={(id) => {
                setCanvasStoryId(id || null);
                setActiveStoryId(null);
                setCurrentTab('canvas');
              }}
              onOpenBeatsStudio={(id) => {
                setCanvasStoryId(id || null);
                setActiveStoryId(null);
                setCurrentTab('beats');
              }}
              onOpenTeleprompter={(id) => {
                setTeleprompterStoryId(id || null);
                setCurrentTab('teleprompter');
              }}
            />
          ) : currentTab === 'teleprompter' ? (
            <Teleprompter
              stories={stories}
              initialStoryId={teleprompterStoryId}
              onClose={() => {
                setCurrentTab('stories');
                setTeleprompterStoryId(null);
              }}
            />
          ) : currentTab === 'characters' ? (
            <CharactersPage
              characters={characters}
              universes={universes}
              selectedUniverseId={selectedUniverseId}
              onRefresh={loadAllData}
            />
          ) : currentTab === 'generation' ? (
            <GenerationPage
              universes={universes}
              characters={characters}
              locations={locations}
              selectedUniverseId={selectedUniverseId}
              onSelectStory={handleSelectStory}
              onRefreshAll={loadAllData}
              onOpenBeatsStudio={(id) => {
                if (id) setCanvasStoryId(id);
                setActiveStoryId(null);
                setCurrentTab('beats');
              }}
            />
          ) : currentTab === 'timeline' ? (
            <TimelinePage
              universes={universes}
              selectedUniverseId={selectedUniverseId}
              onSelectStory={handleSelectStory}
            />
          ) : currentTab === 'graph' ? (
            <KnowledgeGraphPage
              universes={universes}
              selectedUniverseId={selectedUniverseId}
            />
          ) : currentTab === 'universes' ? (
            <UniversesPage
              universes={universes}
              selectedUniverseId={selectedUniverseId}
              onSelectUniverse={setSelectedUniverseId}
              characters={characters}
              stories={stories}
              locations={locations}
              events={events}
              onRefresh={loadAllData}
            />
          ) : currentTab === 'locations' || currentTab === 'events' || currentTab === 'objects' ? (
            <EntitiesPage
              entityType={currentTab}
              universes={universes}
              locations={locations}
              events={events}
              objects={objects}
              onRefresh={loadAllData}
            />
          ) : currentTab === 'search' ? (
            <SearchPage onSelectStory={handleSelectStory} />
          ) : currentTab === 'settings' ? (
            <SettingsPage />
          ) : null}
        </main>
      </div>

      {/* Import Story Modal */}
      <ImportStoryModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        universes={universes}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
