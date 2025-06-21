import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import ChartWidget from "./ChartWidget";

interface SpacedRepetitionInsights {
	totalDueCards: number;
	totalNewCards: number;
	cardsToReviewToday: number;
	upcomingReviews: Array<{
		date: string;
		count: number;
	}>;
	retentionRate?: number;
	averageInterval?: number;
}

interface CardDistribution {
	newCards: number;
	learningCards: number;
	reviewCards: number;
	dueCards: number;
	masteredCards: number;
	totalCards: number;
}

interface CardDistributionChartProps {
	spacedRepetitionInsights: SpacedRepetitionInsights;
	cardDistribution: CardDistribution;
}

/**
 * Card Distribution Chart Component
 *
 * Displays the distribution of cards across different learning stages with:
 * - Beautiful donut chart with glowing colors
 * - Interactive segments with hover effects
 * - Dark theme support
 * - Detailed tooltips and legends
 * - Responsive design
 */
const CardDistributionChart = memo(function CardDistributionChart({
	spacedRepetitionInsights,
	cardDistribution,
}: CardDistributionChartProps) {
	const { t } = useTranslation();

	// Use real data from Convex query
	const chartData = [
		{
			name: t("statistics.charts.cardDistribution.newCards"),
			value: cardDistribution.newCards,
			color: "#60a5fa", // Blue
			description: t("statistics.charts.cardDistribution.neverStudied"),
		},
		{
			name: t("statistics.charts.cardDistribution.learning"),
			value: cardDistribution.learningCards,
			color: "#f59e0b", // Amber
			description: t("statistics.charts.cardDistribution.beingLearned"),
		},
		{
			name: t("statistics.charts.cardDistribution.review"),
			value: cardDistribution.reviewCards,
			color: "#8b5cf6", // Purple
			description: t("statistics.charts.cardDistribution.inReviewCycle"),
		},
		{
			name: t("statistics.charts.cardDistribution.due"),
			value: cardDistribution.dueCards,
			color: "#ef4444", // Red
			description: t("statistics.charts.cardDistribution.dueForReview"),
		},
		{
			name: t("statistics.charts.cardDistribution.mastered"),
			value: cardDistribution.masteredCards,
			color: "#10b981", // Green
			description: t("statistics.charts.cardDistribution.wellLearned"),
		},
	].filter((item) => item.value > 0); // Only show categories with cards

	const CustomTooltip = ({ active, payload }: any) => {
		if (active && payload && payload.length) {
			const data = payload[0].payload;
			const percentage =
				cardDistribution.totalCards > 0
					? ((data.value / cardDistribution.totalCards) * 100).toFixed(1)
					: "0";

			return (
				<div className="bg-slate-800 dark:bg-slate-900 p-4 rounded-lg border border-slate-600 shadow-lg">
					<div className="flex items-center gap-2 mb-2">
						<div
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: data.color }}
						></div>
						<p className="text-slate-200 font-semibold">{data.name}</p>
					</div>
					<div className="text-sm space-y-1">
						<div className="flex justify-between gap-4">
							<span className="text-slate-300">Cards:</span>
							<span className="text-white font-semibold">{data.value}</span>
						</div>
						<div className="flex justify-between gap-4">
							<span className="text-slate-300">Percentage:</span>
							<span className="text-white font-semibold">{percentage}%</span>
						</div>
						<p className="text-xs text-slate-400 mt-2">{data.description}</p>
					</div>
				</div>
			);
		}
		return null;
	};

	const CustomLabel = ({
		cx,
		cy,
		midAngle,
		innerRadius,
		outerRadius,
		percent,
	}: any) => {
		if (percent < 0.05) return null; // Don't show labels for very small segments

		const RADIAN = Math.PI / 180;
		const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
		const x = cx + radius * Math.cos(-midAngle * RADIAN);
		const y = cy + radius * Math.sin(-midAngle * RADIAN);

		return (
			<text
				x={x}
				y={y}
				fill="white"
				textAnchor={x > cx ? "start" : "end"}
				dominantBaseline="central"
				fontSize={12}
				fontWeight="bold"
				className="drop-shadow-lg"
			>
				{`${(percent * 100).toFixed(0)}%`}
			</text>
		);
	};

	if (cardDistribution.totalCards === 0) {
		return (
			<ChartWidget
				title={t("statistics.charts.cardDistribution.title")}
				subtitle={t("statistics.charts.cardDistribution.subtitle")}
				chartHeight="h-64"
			>
				<div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
					<div className="text-center">
						<div className="text-4xl mb-4">🃏</div>
						<p>{t("statistics.charts.cardDistribution.noData")}</p>
					</div>
				</div>
			</ChartWidget>
		);
	}

	// Prepare footer content
	const footerContent = (
		<>
			{/* Legend */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{chartData.map((item, index) => (
					<div
						key={index}
						className="flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded transition-colors duration-200 cursor-pointer"
					>
						<div
							className="w-4 h-4 rounded-full flex-shrink-0 hover:scale-110 transition-transform duration-200"
							style={{ backgroundColor: item.color }}
						></div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
									{item.name}
								</span>
								<span className="text-sm font-semibold text-slate-800 dark:text-slate-200 ml-2 hover:text-slate-700 dark:hover:text-slate-100 transition-colors">
									{item.value}
								</span>
							</div>
							<p className="text-xs text-slate-500 dark:text-slate-400 truncate hover:text-slate-400 dark:hover:text-slate-300 transition-colors">
								{item.description}
							</p>
						</div>
					</div>
				))}
			</div>

			{/* Summary Stats */}
			<div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
					<div className="hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded transition-colors duration-200 cursor-pointer">
						<div className="text-lg font-bold text-slate-800 dark:text-slate-200 hover:text-slate-700 dark:hover:text-slate-100 transition-colors">
							{cardDistribution.totalCards}
						</div>
						<div className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
							Total Cards
						</div>
					</div>
					<div className="hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded transition-colors duration-200 cursor-pointer">
						<div className="text-lg font-bold text-blue-500 dark:text-blue-400 hover:scale-105 transition-transform duration-200">
							{spacedRepetitionInsights.totalNewCards}
						</div>
						<div className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
							New
						</div>
					</div>
					<div className="hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded transition-colors duration-200 cursor-pointer">
						<div className="text-lg font-bold text-red-500 dark:text-red-400 hover:scale-105 transition-transform duration-200">
							{spacedRepetitionInsights.totalDueCards}
						</div>
						<div className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
							Due
						</div>
					</div>
					<div className="hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded transition-colors duration-200 cursor-pointer">
						<div className="text-lg font-bold text-green-500 dark:text-green-400 hover:scale-105 transition-transform duration-200">
							{cardDistribution.masteredCards}
						</div>
						<div className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
							Mastered
						</div>
					</div>
				</div>
			</div>
		</>
	);

	return (
		<ChartWidget
			title={t("statistics.charts.cardDistribution.title")}
			subtitle={t("statistics.charts.cardDistribution.subtitle")}
			chartHeight="h-64"
			footer={footerContent}
		>
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie
						data={chartData}
						cx="50%"
						cy="50%"
						labelLine={false}
						label={CustomLabel}
						outerRadius={80}
						innerRadius={40}
						fill="#8884d8"
						dataKey="value"
						stroke="none"
					>
						{chartData.map((entry, index) => (
							<Cell
								key={`cell-${index}`}
								fill={entry.color}
								className="hover:opacity-80 transition-opacity cursor-pointer"
							/>
						))}
					</Pie>
					<Tooltip content={<CustomTooltip />} />
				</PieChart>
			</ResponsiveContainer>
		</ChartWidget>
	);
});

export default CardDistributionChart;
