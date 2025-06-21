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
				? deck.deckName.substring(0, 15) + "..."
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

	const CustomTooltip = ({ active, payload }: any) => {
		if (active && payload && payload.length) {
			const data = payload[0].payload;
			return (
				<div className="bg-slate-800 dark:bg-slate-900 p-4 rounded-lg border border-slate-600 shadow-lg min-w-[200px]">
					<p className="text-slate-200 font-semibold mb-3">{data.deckName}</p>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-slate-300">
								{t("statistics.charts.deckPerformance.totalCards")}:
							</span>
							<span className="text-white font-semibold">
								{data.totalCards}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-slate-300">
								{t("statistics.charts.deckPerformance.masteredCards")}:
							</span>
							<span className="text-white font-semibold">
								{data.masteredCards}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-slate-300">
								{t("statistics.charts.deckPerformance.masteryPercentage")}:
							</span>
							<span className="text-white font-semibold">
								{data.masteryPercentage.toFixed(1)}%
							</span>
						</div>
						{data.averageEaseFactor && (
							<div className="flex justify-between">
								<span className="text-slate-300">
									{t("statistics.charts.deckPerformance.averageEase")}:
								</span>
								<span className="text-white font-semibold">
									{data.averageEaseFactor.toFixed(2)}
								</span>
							</div>
						)}
					</div>
					<div className="mt-3 pt-2 border-t border-slate-600">
						<p className="text-xs text-slate-400">
							{t("statistics.charts.deckPerformance.clickToSelect")}
						</p>
					</div>
				</div>
			);
		}
		return null;
	};

	const handleBarClick = (data: any) => {
		const newSelectedId = selectedDeckId === data.deckId ? null : data.deckId;
		onDeckSelect(newSelectedId);
	};

	if (chartData.length === 0) {
		return (
			<div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
				<h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
					{t("statistics.charts.deckPerformance.title")}
				</h3>
				<div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
					<div className="text-center">
						<div className="text-4xl mb-4">📊</div>
						<p>{t("statistics.charts.deckPerformance.noData")}</p>
					</div>
				</div>
			</div>
		);
	}

	// Prepare header actions
	const headerActions = selectedDeckId ? (
		<button
			onClick={() => onDeckSelect(null)}
			className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 hover:scale-105 transition-all duration-200"
		>
			Clear Selection
		</button>
	) : null;

	// Prepare footer content
	const footerContent = (
		<>
			{/* Performance Legend */}
			<div className="flex flex-wrap items-center gap-4 text-xs mb-6">
				<div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200 cursor-pointer">
					<div className="w-3 h-3 rounded bg-red-500 hover:scale-110 transition-transform duration-200"></div>
					<span className="text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
						Needs Work (&lt;40%)
					</span>
				</div>
				<div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200 cursor-pointer">
					<div className="w-3 h-3 rounded bg-orange-500 hover:scale-110 transition-transform duration-200"></div>
					<span className="text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
						Fair (40-60%)
					</span>
				</div>
				<div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200 cursor-pointer">
					<div className="w-3 h-3 rounded bg-yellow-500 hover:scale-110 transition-transform duration-200"></div>
					<span className="text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
						Good (60-80%)
					</span>
				</div>
				<div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200 cursor-pointer">
					<div className="w-3 h-3 rounded bg-green-500 hover:scale-110 transition-transform duration-200"></div>
					<span className="text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
						Excellent (80%+)
					</span>
				</div>
			</div>

			{/* Selected Deck Details */}
			{selectedDeckId && (
				<div className="pt-6 border-t border-slate-200 dark:border-slate-700">
					{(() => {
						const selectedDeck = deckPerformance.find(
							(d) => d.deckId === selectedDeckId,
						);
						if (!selectedDeck) return null;

						return (
							<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200">
								<h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 hover:text-blue-700 dark:hover:text-blue-100 transition-colors">
									{selectedDeck.deckName}
								</h4>
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
									<div className="hover:bg-blue-100 dark:hover:bg-blue-800/30 p-2 rounded transition-colors duration-200">
										<div className="text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
											{t("statistics.charts.deckPerformance.totalCards")}
										</div>
										<div className="font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-700 dark:hover:text-slate-100 transition-colors">
											{selectedDeck.totalCards}
										</div>
									</div>
									<div className="hover:bg-blue-100 dark:hover:bg-blue-800/30 p-2 rounded transition-colors duration-200">
										<div className="text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
											{t("statistics.charts.deckPerformance.masteredCards")}
										</div>
										<div className="font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-700 dark:hover:text-slate-100 transition-colors">
											{selectedDeck.masteredCards}
										</div>
									</div>
									<div className="hover:bg-blue-100 dark:hover:bg-blue-800/30 p-2 rounded transition-colors duration-200">
										<div className="text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
											{t("statistics.charts.deckPerformance.masteryPercentage")}
										</div>
										<div className="font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-700 dark:hover:text-slate-100 transition-colors">
											{selectedDeck.masteryPercentage.toFixed(1)}%
										</div>
									</div>
									<div className="hover:bg-blue-100 dark:hover:bg-blue-800/30 p-2 rounded transition-colors duration-200">
										<div className="text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
											{t("statistics.charts.deckPerformance.averageEase")}
										</div>
										<div className="font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-700 dark:hover:text-slate-100 transition-colors">
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
			title={t("statistics.charts.deckPerformance.title")}
			subtitle={t("statistics.charts.deckPerformance.subtitle")}
			chartHeight="h-64"
			headerActions={headerActions}
			footer={footerContent}
		>
			{/* Chart Content */}
			<ResponsiveContainer width="100%" height="100%">
				<BarChart
					data={chartData}
					margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
				>
					<CartesianGrid
						strokeDasharray="3 3"
						stroke="#e2e8f0"
						className="dark:stroke-slate-700"
					/>

					<XAxis
						dataKey="shortName"
						stroke="#64748b"
						fontSize={12}
						tickLine={false}
						axisLine={false}
						angle={-45}
						textAnchor="end"
						height={60}
					/>

					<YAxis
						stroke="#64748b"
						fontSize={12}
						tickLine={false}
						axisLine={false}
						domain={[0, 100]}
						tickFormatter={(value) => `${value}%`}
					/>

					<Tooltip content={<CustomTooltip />} />

					<Bar
						dataKey="masteryPercentage"
						radius={[4, 4, 0, 0]}
						cursor="pointer"
						onClick={handleBarClick}
					>
						{chartData.map((entry, index) => (
							<Cell
								key={`cell-${index}`}
								fill={getBarColor(
									entry.masteryPercentage,
									selectedDeckId === entry.deckId,
								)}
							/>
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</ChartWidget>
	);
});

export default DeckPerformanceChart;
