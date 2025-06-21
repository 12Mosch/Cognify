import { memo, useState } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

type TabId = 'clusters' | 'paths' | 'graph';

interface KnowledgeMapWidgetProps {
  deckId?: Id<"decks">;
  className?: string;
}

// Helper component prop interfaces
interface ConceptClustersViewProps {
  clusters: Array<{
    id: string;
    name: string;
    description: string;
    cardCount: number;
    masteryLevel: number;
    averageDifficulty: number;
    centerCard: { _id: Id<"cards">; front: string; back: string };
  }>;
  selectedCluster: string | null;
  onSelectCluster: (clusterId: string | null) => void;
  t: any; // Using any for now to match react-i18next TFunction type
}

interface LearningPathsViewProps {
  paths: Array<{
    pathType: string;
    description: string;
    estimatedTime: number;
    confidence: number;
    path: Array<{
      cardId: any;
      front: any;
      reason: string;
      estimatedDifficulty: number;
    }>;
  }>;
  t: any; // Using any for now to match react-i18next TFunction type
}

interface KnowledgeGraphViewProps {
  graphData: {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ source: string; target: string; type: string }>;
  } | null;
  t: any; // Using any for now to match react-i18next TFunction type
}

/**
 * Knowledge Map Widget Component
 * 
 * Provides contextual learning features including:
 * - Related card suggestions
 * - Concept clustering visualization
 * - Learning path recommendations
 * - Knowledge graph exploration
 * - Cross-deck connections
 */
const KnowledgeMapWidget = memo(function KnowledgeMapWidget({ 
  deckId,
  className = "" 
}: KnowledgeMapWidgetProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('clusters');
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  // Fetch contextual learning data
  const conceptClusters = useQuery(api.contextualLearning.getConceptClusters, {
    deckId,
  });

  const learningPaths = useQuery(
    api.contextualLearning.getLearningPathRecommendations,
    deckId ? { deckId } : "skip"
  );

  const knowledgeGraph = useQuery(api.contextualLearning.getKnowledgeGraphData, {
    deckId,
    includeDecks: false,
  });



  // Loading state
  if (
    conceptClusters === undefined ||
    (deckId && learningPaths === undefined) ||
    knowledgeGraph === undefined
  ) {
    return <KnowledgeMapSkeleton className={className} />;
  }

  // Error state - Convex returns null for query errors
  if (conceptClusters === null || (deckId && learningPaths === null) || knowledgeGraph === null) {
    return <KnowledgeMapErrorState className={className} />;
  }

  // No data state
  if (!conceptClusters || conceptClusters.length === 0) {
    return <NoKnowledgeDataState className={className} />;
  }

  const tabs: Array<{ id: TabId; label: string; icon: string }> = [
    { id: 'clusters', label: t('knowledge.tabs.clusters', 'Concept Clusters'), icon: '🧩' },
    { id: 'paths', label: t('knowledge.tabs.paths', 'Learning Paths'), icon: '🛤️' },
    { id: 'graph', label: t('knowledge.tabs.graph', 'Knowledge Graph'), icon: '🕸️' },
  ];

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg dark:hover:shadow-slate-900/20 transition-all duration-300 group ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
            <span className="text-white text-lg">🗺️</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
              {t('knowledge.title', 'Knowledge Map')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors">
              {t('knowledge.subtitle', 'Explore connections in your learning')}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm hover:shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <span className="hover:scale-110 transition-transform duration-200">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'clusters' && (
          <ConceptClustersView
            clusters={conceptClusters}
            selectedCluster={selectedCluster}
            onSelectCluster={setSelectedCluster}
            t={t}
          />
        )}

        {activeTab === 'paths' && (
          <LearningPathsView
            paths={deckId ? (learningPaths || []) : []}
            t={t}
          />
        )}

        {activeTab === 'graph' && (
          <KnowledgeGraphView
            graphData={knowledgeGraph}
            t={t}
          />
        )}
      </div>
    </div>
  );
});

// Helper Components
const ConceptClustersView = memo(function ConceptClustersView({
  clusters,
  selectedCluster,
  onSelectCluster,
  t
}: ConceptClustersViewProps) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
        {t('knowledge.clusters.description', 'Related concepts grouped together based on content similarity')}
      </div>
      
      {clusters.map((cluster) => (
        <div
          key={cluster.id}
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
            selectedCluster === cluster.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-600'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600'
          }`}
          onClick={() => onSelectCluster(selectedCluster === cluster.id ? null : cluster.id)}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                {cluster.name}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
                {cluster.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                {cluster.cardCount} {t('knowledge.clusters.cards', 'cards')}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
                {Math.round(cluster.masteryLevel * 100)}% {t('knowledge.clusters.mastered', 'mastered')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400 hover:scale-110 transition-transform duration-200">📊</span>
              <span className="text-slate-700 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                {t('knowledge.clusters.difficulty', 'Difficulty')}: {Math.round(cluster.averageDifficulty * 100)}%
              </span>
            </div>
            <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-2 hover:h-2.5 transition-all duration-200">
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${cluster.masteryLevel * 100}%` }}
              />
            </div>
          </div>

          {selectedCluster === cluster.id && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
              <div className="mb-3">
                <h5 className="font-medium text-slate-900 dark:text-slate-100 mb-2 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  {t('knowledge.clusters.centerCard', 'Representative Card')}
                </h5>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all duration-200 cursor-pointer">
                  <div className="text-sm text-slate-900 dark:text-slate-100 font-medium mb-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    {cluster.centerCard.front}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
                    {cluster.centerCard.back.substring(0, 100)}
                    {cluster.centerCard.back.length > 100 ? '...' : ''}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

const LearningPathsView = memo(function LearningPathsView({
  paths,
  t
}: LearningPathsViewProps) {
  if (!paths || paths.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <div className="text-4xl mb-3">🛤️</div>
        <p>{t('knowledge.paths.noData', 'Learning paths will appear when you have more cards in this deck')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
        {t('knowledge.paths.description', 'Recommended sequences for learning your cards effectively')}
      </div>

      {paths.map((path, index: number) => (
        <div key={index} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 hover:scale-[1.02] transition-all duration-200 cursor-pointer hover:shadow-md">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                {t(`knowledge.paths.types.${path.pathType}`, path.pathType.replace(/_/g, ' '))}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
                {path.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                ~{path.estimatedTime} min
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
                {Math.round(path.confidence * 100)}% {t('knowledge.paths.confidence', 'confidence')}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              {t('knowledge.paths.sequence', 'Learning Sequence')}:
            </h5>
            <div className="flex flex-wrap gap-2">
              {path.path.slice(0, 5).map((step, stepIndex: number) => (
                <div
                  key={stepIndex}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:scale-105 transition-all duration-200 cursor-pointer hover:shadow-sm"
                >
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-400 dark:hover:text-slate-300 transition-colors">
                    {stepIndex + 1}
                  </span>
                  <span className="text-sm text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    {step.front.substring(0, 20)}
                    {step.front.length > 20 ? '...' : ''}
                  </span>
                </div>
              ))}
              {path.path.length > 5 && (
                <div className="flex items-center px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-400 dark:hover:text-slate-300 transition-colors">
                  +{path.path.length - 5} more
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

const KnowledgeGraphView = memo(function KnowledgeGraphView({
  graphData,
  t
}: KnowledgeGraphViewProps) {
  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <div className="text-4xl mb-3">🕸️</div>
        <p>{t('knowledge.graph.noData', 'Knowledge graph will appear when you have more interconnected content')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
        {t('knowledge.graph.description', 'Visual representation of connections between your cards and concepts')}
      </div>

      {/* Graph Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 hover:scale-105 transition-all duration-200 cursor-pointer hover:shadow-md">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            {graphData.nodes.length}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
            {t('knowledge.graph.nodes', 'Concepts')}
          </div>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 hover:scale-105 transition-all duration-200 cursor-pointer hover:shadow-md">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            {graphData.edges.length}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
            {t('knowledge.graph.connections', 'Connections')}
          </div>
        </div>
      </div>

      {/* Connection Types */}
      <div>
        <h5 className="font-medium text-slate-900 dark:text-slate-100 mb-2 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          {t('knowledge.graph.connectionTypes', 'Connection Types')}
        </h5>
        <div className="space-y-2">
          {['similar', 'related', 'prerequisite'].map((type) => {
            const count = graphData.edges.filter((edge) => edge.type === type).length;
            if (count === 0) return null;

            return (
              <div key={type} className="flex items-center justify-between text-sm hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded transition-colors duration-200 cursor-pointer">
                <span className="text-slate-700 dark:text-slate-300 capitalize hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  {t(`knowledge.graph.types.${type}`, type)}
                </span>
                <span className="text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Placeholder for actual graph visualization */}
      <div className="h-48 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2">🔗</div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('knowledge.graph.placeholder', 'Interactive graph visualization would appear here')}
          </p>
        </div>
      </div>
    </div>
  );
});

const KnowledgeMapSkeleton = memo(function KnowledgeMapSkeleton({ className }: { className: string }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-24" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
});

const NoKnowledgeDataState = memo(function NoKnowledgeDataState({ className }: { className: string }) {
  const { t } = useTranslation();

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🗺️</div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {t('knowledge.noData.title', 'Building Your Knowledge Map')}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('knowledge.noData.description', 'Add more cards to see connections and learning patterns')}
        </p>
      </div>
    </div>
  );
});

const KnowledgeMapErrorState = memo(function KnowledgeMapErrorState({ className }: { className: string }) {
  const { t } = useTranslation();

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="text-center py-8">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {t('knowledge.error.title', 'Unable to Load Knowledge Map')}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {t('knowledge.error.description', 'There was an error loading your knowledge map. Please try refreshing the page.')}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
        >
          {t('knowledge.error.retry', 'Retry')}
        </button>
      </div>
    </div>
  );
});

export default KnowledgeMapWidget;
