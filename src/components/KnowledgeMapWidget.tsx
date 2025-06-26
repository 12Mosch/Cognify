import { useQuery } from "convex/react";
import type { TFunction } from "i18next";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { RELATIONSHIP_TYPES } from "../types/relationships";

type TabId = "clusters" | "paths" | "graph";

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
	t: TFunction;
}

interface LearningPathsViewProps {
	paths: Array<{
		pathType: string;
		description: string;
		estimatedTime: number;
		confidence: number;
		path: Array<{
			cardId: Id<"cards">;
			front: string;
			reason: string;
			estimatedDifficulty: number;
		}>;
	}>;
	t: TFunction;
}

interface KnowledgeGraphViewProps {
	graphData: {
		nodes: Array<{ id: string; label: string; type: string }>;
		edges: Array<{ source: string; target: string; type: string }>;
	} | null;
	t: TFunction;
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
	className = "",
}: KnowledgeMapWidgetProps) {
	const { t } = useTranslation();
	const [activeTab, setActiveTab] = useState<TabId>("clusters");
	const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

	// Fetch contextual learning data
	const conceptClusters = useQuery(api.contextualLearning.getConceptClusters, {
		deckId,
	});

	const learningPaths = useQuery(
		api.contextualLearning.getLearningPathRecommendations,
		deckId ? { deckId } : "skip",
	);

	const knowledgeGraph = useQuery(
		api.contextualLearning.getKnowledgeGraphData,
		{
			deckId,
			includeDecks: false,
		},
	);

	// Loading state
	if (
		conceptClusters === undefined ||
		(deckId && learningPaths === undefined) ||
		knowledgeGraph === undefined
	) {
		return <KnowledgeMapSkeleton className={className} />;
	}

	// Error state - Convex returns null for query errors
	if (
		conceptClusters === null ||
		(deckId && learningPaths === null) ||
		knowledgeGraph === null
	) {
		return <KnowledgeMapErrorState className={className} />;
	}

	// No data state
	if (!conceptClusters || conceptClusters.length === 0) {
		return <NoKnowledgeDataState className={className} />;
	}

	const tabs: Array<{ id: TabId; label: string; icon: string }> = [
		{
			icon: "🧩",
			id: "clusters",
			label: t("knowledge.tabs.clusters", "Concept Clusters"),
		},
		{
			icon: "🛤️",
			id: "paths",
			label: t("knowledge.tabs.paths", "Learning Paths"),
		},
		{
			icon: "🕸️",
			id: "graph",
			label: t("knowledge.tabs.graph", "Knowledge Graph"),
		},
	];

	return (
		<div
			className={`group rounded-xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-slate-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:shadow-slate-900/20 ${className}`}
		>
			{/* Header */}
			<div className="mb-6 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-blue-500 transition-transform duration-200 group-hover:scale-105">
						<span className="text-lg text-white">🗺️</span>
					</div>
					<div>
						<h3 className="font-semibold text-lg text-slate-900 transition-colors group-hover:text-slate-700 dark:text-slate-100 dark:group-hover:text-slate-200">
							{t("knowledge.title", "Knowledge Map")}
						</h3>
						<p className="text-slate-600 text-sm transition-colors group-hover:text-slate-500 dark:text-slate-400 dark:group-hover:text-slate-300">
							{t("knowledge.subtitle", "Explore connections in your learning")}
						</p>
					</div>
				</div>
			</div>

			{/* Tab Navigation */}
			<div className="mb-6 flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
				{tabs.map((tab) => (
					<button
						className={`flex items-center gap-2 rounded-md px-3 py-2 font-medium text-sm transition-all duration-200 hover:scale-105 ${
							activeTab === tab.id
								? "bg-white text-slate-900 shadow-sm hover:shadow-md dark:bg-slate-600 dark:text-slate-100"
								: "text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-600 dark:hover:text-slate-100"
						}`}
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						type="button"
					>
						<span className="transition-transform duration-200 hover:scale-110">
							{tab.icon}
						</span>
						<span className="hidden sm:inline">{tab.label}</span>
					</button>
				))}
			</div>

			{/* Tab Content */}
			<div className="space-y-4">
				{activeTab === "clusters" && (
					<ConceptClustersView
						clusters={conceptClusters}
						onSelectCluster={setSelectedCluster}
						selectedCluster={selectedCluster}
						t={t}
					/>
				)}

				{activeTab === "paths" && (
					<LearningPathsView paths={deckId ? learningPaths || [] : []} t={t} />
				)}

				{activeTab === "graph" && (
					<KnowledgeGraphView graphData={knowledgeGraph} t={t} />
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
	t,
}: ConceptClustersViewProps) {
	return (
		<div className="space-y-4">
			<div className="mb-3 text-slate-600 text-sm dark:text-slate-400">
				{t(
					"knowledge.clusters.description",
					"Related concepts grouped together based on content similarity",
				)}
			</div>

			{clusters.map((cluster) => (
				<button
					className={`w-full cursor-pointer rounded-lg border-2 p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
						selectedCluster === cluster.id
							? "border-blue-500 bg-blue-50 hover:border-blue-600 dark:bg-blue-900/20"
							: "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-600"
					}`}
					key={cluster.id}
					onClick={() =>
						onSelectCluster(selectedCluster === cluster.id ? null : cluster.id)
					}
					type="button"
				>
					<div className="mb-3 flex items-start justify-between">
						<div>
							<h4 className="mb-1 font-semibold text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
								{cluster.name}
							</h4>
							<p className="text-slate-600 text-sm transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
								{cluster.description}
							</p>
						</div>
						<div className="text-right">
							<div className="font-medium text-slate-900 text-sm transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
								{cluster.cardCount} {t("knowledge.clusters.cards", "cards")}
							</div>
							<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
								{Math.round(cluster.masteryLevel * 100)}%{" "}
								{t("knowledge.clusters.mastered", "mastered")}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-4 text-sm">
						<div className="flex items-center gap-2">
							<span className="text-slate-600 transition-transform duration-200 hover:scale-110 dark:text-slate-400">
								📊
							</span>
							<span className="text-slate-700 transition-colors hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-200">
								{t("knowledge.clusters.difficulty", "Difficulty")}:{" "}
								{Math.round(cluster.averageDifficulty * 100)}%
							</span>
						</div>
						<div className="h-2 flex-1 rounded-full bg-slate-200 transition-all duration-200 hover:h-2.5 dark:bg-slate-600">
							<div
								className="h-full rounded-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
								style={{ width: `${cluster.masteryLevel * 100}%` }}
							/>
						</div>
					</div>

					{selectedCluster === cluster.id && (
						<div className="mt-4 border-slate-200 border-t pt-4 dark:border-slate-600">
							<div className="mb-3">
								<h5 className="mb-2 font-medium text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
									{t("knowledge.clusters.centerCard", "Representative Card")}
								</h5>
								<div className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
									<div className="mb-1 font-medium text-slate-900 text-sm transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
										{cluster.centerCard.front}
									</div>
									<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
										{cluster.centerCard.back.length > 100
											? `${cluster.centerCard.back.substring(0, 100)}...`
											: cluster.centerCard.back}
									</div>
								</div>
							</div>
						</div>
					)}
				</button>
			))}
		</div>
	);
});

const LearningPathsView = memo(function LearningPathsView({
	paths,
	t,
}: LearningPathsViewProps) {
	if (!paths || paths.length === 0) {
		return (
			<div className="py-8 text-center text-slate-500 dark:text-slate-400">
				<div className="mb-3 text-4xl">🛤️</div>
				<p>
					{t(
						"knowledge.paths.noData",
						"Learning paths will appear when you have more cards in this deck",
					)}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="mb-3 text-slate-600 text-sm dark:text-slate-400">
				{t(
					"knowledge.paths.description",
					"Recommended sequences for learning your cards effectively",
				)}
			</div>

			{paths.map((path, index: number) => (
				<div
					className="cursor-pointer rounded-lg bg-slate-50 p-4 transition-all duration-200 hover:scale-[1.02] hover:bg-slate-100 hover:shadow-md dark:bg-slate-700 dark:hover:bg-slate-600"
					key={`${path.pathType}-${index}`}
				>
					<div className="mb-3 flex items-start justify-between">
						<div>
							<h4 className="mb-1 font-semibold text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
								{t(
									`knowledge.paths.types.${path.pathType}`,
									path.pathType.replace(/_/g, " "),
								)}
							</h4>
							<p className="text-slate-600 text-sm transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
								{path.description}
							</p>
						</div>
						<div className="text-right">
							<div className="font-medium text-slate-900 text-sm transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
								~{path.estimatedTime} {t("knowledge.paths.minutes", "min")}
							</div>
							<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
								{Math.round(path.confidence * 100)}%{" "}
								{t("knowledge.paths.confidence", "confidence")}
							</div>
						</div>
					</div>

					<div className="space-y-2">
						<h5 className="font-medium text-slate-700 text-sm transition-colors hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-200">
							{t("knowledge.paths.sequence", "Learning Sequence")}:
						</h5>
						<div className="flex flex-wrap gap-2">
							{path.path.slice(0, 5).map((step, stepIndex: number) => (
								<div
									className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition-all duration-200 hover:scale-105 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
									key={`${step.cardId}-${stepIndex}`}
								>
									<span className="font-medium text-slate-500 text-xs transition-colors hover:text-slate-400 dark:text-slate-400 dark:hover:text-slate-300">
										{stepIndex + 1}
									</span>
									<span className="text-slate-900 text-sm transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
										{step.front.length > 20
											? `${step.front.substring(0, 20)}...`
											: step.front}
									</span>
								</div>
							))}
							{path.path.length > 5 && (
								<div className="flex items-center px-3 py-2 text-slate-500 text-sm transition-colors hover:text-slate-400 dark:text-slate-400 dark:hover:text-slate-300">
									+{path.path.length - 5} {t("knowledge.paths.more", "more")}
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
	t,
}: KnowledgeGraphViewProps) {
	if (!graphData || graphData.nodes.length === 0) {
		return (
			<div className="py-8 text-center text-slate-500 dark:text-slate-400">
				<div className="mb-3 text-4xl">🕸️</div>
				<p>
					{t(
						"knowledge.graph.noData",
						"Knowledge graph will appear when you have more interconnected content",
					)}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="mb-3 text-slate-600 text-sm dark:text-slate-400">
				{t(
					"knowledge.graph.description",
					"Visual representation of connections between your cards and concepts",
				)}
			</div>

			{/* Graph Statistics */}
			<div className="grid grid-cols-2 gap-4">
				<div className="cursor-pointer rounded-lg bg-slate-50 p-3 transition-all duration-200 hover:scale-105 hover:bg-slate-100 hover:shadow-md dark:bg-slate-700 dark:hover:bg-slate-600">
					<div className="font-bold text-lg text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
						{graphData.nodes.length}
					</div>
					<div className="text-slate-600 text-sm transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						{t("knowledge.graph.nodes", "Concepts")}
					</div>
				</div>
				<div className="cursor-pointer rounded-lg bg-slate-50 p-3 transition-all duration-200 hover:scale-105 hover:bg-slate-100 hover:shadow-md dark:bg-slate-700 dark:hover:bg-slate-600">
					<div className="font-bold text-lg text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
						{graphData.edges.length}
					</div>
					<div className="text-slate-600 text-sm transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						{t("knowledge.graph.connections", "Connections")}
					</div>
				</div>
			</div>

			{/* Connection Types */}
			<div>
				<h5 className="mb-2 font-medium text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
					{t("knowledge.graph.connectionTypes", "Connection Types")}
				</h5>
				<div className="space-y-2">
					{[
						RELATIONSHIP_TYPES.SIMILAR,
						RELATIONSHIP_TYPES.RELATED,
						RELATIONSHIP_TYPES.PREREQUISITE,
					].map((type) => {
						const count = graphData.edges.filter(
							(edge) => edge.type === type,
						).length;
						if (count === 0) return null;

						return (
							<div
								className="flex cursor-pointer items-center justify-between rounded p-2 text-sm transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700"
								key={type}
							>
								<span className="text-slate-700 capitalize transition-colors hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-200">
									{t(`knowledge.graph.types.${type}`, type)}
								</span>
								<span className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
									{count}
								</span>
							</div>
						);
					})}
				</div>
			</div>

			{/* Placeholder for actual graph visualization */}
			<div className="flex h-48 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
				<div className="text-center">
					<div className="mb-2 text-3xl">🔗</div>
					<p className="text-slate-600 text-sm dark:text-slate-400">
						{t(
							"knowledge.graph.placeholder",
							"Interactive graph visualization would appear here",
						)}
					</p>
				</div>
			</div>
		</div>
	);
});

const KnowledgeMapSkeleton = memo(function KnowledgeMapSkeleton({
	className,
}: {
	className: string;
}) {
	return (
		<div
			className={`rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 ${className}`}
		>
			<div className="animate-pulse space-y-4">
				<div className="h-6 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
				<div className="flex gap-2">
					{["clusters", "paths", "graph"].map((tabType) => (
						<div
							className="h-10 w-24 rounded bg-slate-200 dark:bg-slate-700"
							key={`skeleton-tab-${tabType}`}
						/>
					))}
				</div>
				<div className="space-y-3">
					{["item-1", "item-2", "item-3"].map((itemType) => (
						<div
							className="h-20 rounded bg-slate-200 dark:bg-slate-700"
							key={`skeleton-item-${itemType}`}
						/>
					))}
				</div>
			</div>
		</div>
	);
});

const NoKnowledgeDataState = memo(function NoKnowledgeDataState({
	className,
}: {
	className: string;
}) {
	const { t } = useTranslation();

	return (
		<div
			className={`rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 ${className}`}
		>
			<div className="py-8 text-center">
				<div className="mb-3 text-4xl">🗺️</div>
				<h3 className="mb-2 font-semibold text-lg text-slate-900 dark:text-slate-100">
					{t("knowledge.noData.title", "Building Your Knowledge Map")}
				</h3>
				<p className="text-slate-600 text-sm dark:text-slate-400">
					{t(
						"knowledge.noData.description",
						"Add more cards to see connections and learning patterns",
					)}
				</p>
			</div>
		</div>
	);
});

const KnowledgeMapErrorState = memo(function KnowledgeMapErrorState({
	className,
}: {
	className: string;
}) {
	const { t } = useTranslation();

	return (
		<div
			className={`rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 ${className}`}
		>
			<div className="py-8 text-center">
				<div className="mb-3 text-4xl">⚠️</div>
				<h3 className="mb-2 font-semibold text-lg text-slate-900 dark:text-slate-100">
					{t("knowledge.error.title", "Unable to Load Knowledge Map")}
				</h3>
				<p className="mb-4 text-slate-600 text-sm dark:text-slate-400">
					{t(
						"knowledge.error.description",
						"There was an error loading your knowledge map. Please try refreshing the page.",
					)}
				</p>
				<button
					className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600"
					onClick={() => window.location.reload()}
					type="button"
				>
					{t("knowledge.error.retry", "Retry")}
				</button>
			</div>
		</div>
	);
});

export default KnowledgeMapWidget;
