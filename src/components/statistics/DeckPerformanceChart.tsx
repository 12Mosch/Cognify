import { memo } from "react";
import { useTranslation } from "react-i18next";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import ChartWidget from "./ChartWidget";

// Types for Recharts components
interface DeckTooltipProps {
	active?: boolean;
	payload?: Array<{
		payload: DeckPerformance & {
			shortName: string;
		};
	}>;
}

interface BarClickData {
	deckId: string;
}

interface DeckPerformance {
	deckId: string;
	deckName: string;
	totalCards: number;
	masteredCards: number;
	masteryPercentage: number;
	averageEaseFactor?: number;
	lastStudied?: number;
}

interface DeckPerformanceChartProps {
	deckPerformance: DeckPerformance[];
	selectedDeckId: string | null;
	onDeckSelect: (deckId: string | null) => void;
}

// Custom Tooltip Component - avoid using hooks to prevent React Compiler issues
const CustomTooltip = ({
	active,
	payload,
	t,
}: DeckTooltipProps & { t: (key: string) => string }) => {
	"use no memo"; // Directive to prevent React Compiler optimization

	if (active && payload && payload.length) {
		const data = payload[0].payload;
		return (
			<div className="min-w-[200px] rounded-lg border border-slate-600 bg-slate-800 p-4 shadow-lg dark:bg-slate-900">
				<p className="mb-3 font-semibold text-slate-200">{data.deckName}</p>
				<div className="space-y-2 text-sm">
					<div className="flex justify-between">
						<span className="text-slate-300">
							{t("statistics.charts.deckPerformance.totalCards")}:
						</span>
						<span className="font-semibold text-white">{data.totalCards}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-slate-300">
							{t("statistics.charts.deckPerformance.masteredCards")}:
						</span>
						<span className="font-semibold text-white">
							{data.masteredCards}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-slate-300">
							{t("statistics.charts.deckPerformance.masteryPercentage")}:
						</span>
						<span className="font-semibold text-white">
							{data.masteryPercentage.toFixed(1)}%
						</span>
					</div>
					{data.averageEaseFactor && (
						<div className="flex justify-between">
							<span className="text-slate-300">
								{t("statistics.charts.deckPerformance.averageEase")}:
							</span>
							<span className="font-semibold text-white">
								{data.averageEaseFactor.toFixed(2)}
							</span>
						</div>
					)}
				</div>
				<div className="mt-3 border-slate-600 border-t pt-2">
					<p className="text-slate-400 text-xs">
						{t("statistics.charts.deckPerformance.clickToSelect")}
					</p>
				</div>
			</div>
		);
	}
	return null;
};

/**
 * Deck Performance Chart Component
 *
 * Displays deck performance comparison with:
 * - Interactive bar chart with hover effects
 * - Color-coded performance levels
 * - Click-to-select functionality
 * - Responsive design with dark theme support
 * - Detailed tooltips with multiple metrics
 */
const DeckPerformanceChart = memo(function DeckPerformanceChart({
	deckPerformance,
	selectedDeckId,
	onDeckSelect,
}: DeckPerformanceChartProps) {
	const { t } = useTranslation();

	// Prepare chart data
	const chartData = deckPerformance.map((deck) => ({
		...deck,
		shortName:
			deck.deckName.length > 15
				? `${deck.deckName.substring(0, 15)}...`
				: deck.deckName,
	}));

	// Color scheme based on performance
	const getBarColor = (masteryPercentage: number, isSelected: boolean) => {
		if (isSelected) {
			return "#60a5fa"; // Blue for selected
		}

		if (masteryPercentage >= 80) {
			return "#06b6d4"; // Cyan for excellent
		} else if (masteryPercentage >= 60) {
			return "#14b8a6"; // Teal for good
		} else if (masteryPercentage >= 40) {
			return "#f59e0b"; // Amber for fair
		} else {
			return "#ef4444"; // Red for needs work
		}
	};

	const handleBarClick = (data: BarClickData) => {
		const newSelectedId = selectedDeckId === data.deckId ? null : data.deckId;
		onDeckSelect(newSelectedId);
	};

	if (chartData.length === 0) {
		return (
			<div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
				<h3 className="mb-4 font-semibold text-slate-800 text-xl dark:text-slate-200">
					{t("statistics.charts.deckPerformance.title")}
				</h3>
				<div className="flex h-64 items-center justify-center text-slate-500 dark:text-slate-400">
					<div className="text-center">
						<div className="mb-4 text-4xl">📊</div>
						<p>{t("statistics.charts.deckPerformance.noData")}</p>
					</div>
				</div>
			</div>
		);
	}

	// Prepare header actions
	const headerActions = selectedDeckId ? (
		<button
			className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 text-xs transition-all duration-200 hover:scale-105 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
			onClick={() => onDeckSelect(null)}
			type="button"
		>
			Clear Selection
		</button>
	) : null;

	// Prepare footer content
	const footerContent = (
		<>
			{/* Performance Legend */}
			<div className="mb-6 flex flex-wrap items-center gap-4 text-xs">
				<div className="flex cursor-pointer items-center gap-2 transition-transform duration-200 hover:scale-105">
					<div className="h-3 w-3 rounded bg-red-500 transition-transform duration-200 hover:scale-110"></div>
					<span className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						Needs Work (&lt;40%)
					</span>
				</div>
				<div className="flex cursor-pointer items-center gap-2 transition-transform duration-200 hover:scale-105">
					<div className="h-3 w-3 rounded bg-orange-500 transition-transform duration-200 hover:scale-110"></div>
					<span className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						Fair (40-60%)
					</span>
				</div>
				<div className="flex cursor-pointer items-center gap-2 transition-transform duration-200 hover:scale-105">
					<div className="h-3 w-3 rounded bg-yellow-500 transition-transform duration-200 hover:scale-110"></div>
					<span className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						Good (60-80%)
					</span>
				</div>
				<div className="flex cursor-pointer items-center gap-2 transition-transform duration-200 hover:scale-105">
					<div className="h-3 w-3 rounded bg-green-500 transition-transform duration-200 hover:scale-110"></div>
					<span className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						Excellent (80%+)
					</span>
				</div>
			</div>

			{/* Selected Deck Details */}
			{selectedDeckId && (
				<div className="border-slate-200 border-t pt-6 dark:border-slate-700">
					{(() => {
						const selectedDeck = deckPerformance.find(
							(d) => d.deckId === selectedDeckId,
						);
						if (!selectedDeck) return null;

						return (
							<div className="rounded-lg bg-blue-50 p-4 transition-colors duration-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30">
								<h4 className="mb-3 font-semibold text-blue-800 transition-colors hover:text-blue-700 dark:text-blue-200 dark:hover:text-blue-100">
									{selectedDeck.deckName}
								</h4>
								<div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
									<div className="rounded p-2 transition-colors duration-200 hover:bg-blue-100 dark:hover:bg-blue-800/30">
										<div className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
											{t("statistics.charts.deckPerformance.totalCards")}
										</div>
										<div className="font-semibold text-slate-800 transition-colors hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-100">
											{selectedDeck.totalCards}
										</div>
									</div>
									<div className="rounded p-2 transition-colors duration-200 hover:bg-blue-100 dark:hover:bg-blue-800/30">
										<div className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
											{t("statistics.charts.deckPerformance.masteredCards")}
										</div>
										<div className="font-semibold text-slate-800 transition-colors hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-100">
											{selectedDeck.masteredCards}
										</div>
									</div>
									<div className="rounded p-2 transition-colors duration-200 hover:bg-blue-100 dark:hover:bg-blue-800/30">
										<div className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
											{t("statistics.charts.deckPerformance.masteryPercentage")}
										</div>
										<div className="font-semibold text-slate-800 transition-colors hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-100">
											{selectedDeck.masteryPercentage.toFixed(1)}%
										</div>
									</div>
									<div className="rounded p-2 transition-colors duration-200 hover:bg-blue-100 dark:hover:bg-blue-800/30">
										<div className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
											{t("statistics.charts.deckPerformance.averageEase")}
										</div>
										<div className="font-semibold text-slate-800 transition-colors hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-100">
											{selectedDeck.averageEaseFactor
												? selectedDeck.averageEaseFactor.toFixed(2)
												: "N/A"}
										</div>
									</div>
								</div>
							</div>
						);
					})()}
				</div>
			)}
		</>
	);

	return (
		<ChartWidget
			chartHeight="h-64"
			footer={footerContent}
			headerActions={headerActions}
			subtitle={t("statistics.charts.deckPerformance.subtitle")}
			title={t("statistics.charts.deckPerformance.title")}
		>
			{/* Chart Content */}
			<ResponsiveContainer height="100%" width="100%">
				<BarChart
					data={chartData}
					margin={{ bottom: 60, left: 20, right: 30, top: 20 }}
				>
					<CartesianGrid
						className="dark:stroke-slate-700"
						stroke="#e2e8f0"
						strokeDasharray="3 3"
					/>

					<XAxis
						angle={-45}
						axisLine={false}
						dataKey="shortName"
						fontSize={12}
						height={60}
						stroke="#64748b"
						textAnchor="end"
						tickLine={false}
					/>

					<YAxis
						axisLine={false}
						domain={[0, 100]}
						fontSize={12}
						stroke="#64748b"
						tickFormatter={(value) => `${value}%`}
						tickLine={false}
					/>

					<Tooltip content={<CustomTooltip t={t} />} />

					<Bar
						cursor="pointer"
						dataKey="masteryPercentage"
						onClick={handleBarClick}
						radius={[4, 4, 0, 0]}
					>
						{chartData.map((entry) => (
							<Cell
								fill={getBarColor(
									entry.masteryPercentage,
									selectedDeckId === entry.deckId,
								)}
								key={`cell-${entry.deckId}`}
							/>
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</ChartWidget>
	);
});

export default DeckPerformanceChart;
