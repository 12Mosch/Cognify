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
				<div className="rounded-lg border border-slate-600 bg-slate-800 p-4 shadow-lg dark:bg-slate-900">
					<div className="mb-2 flex items-center gap-2">
						<div
							className="h-3 w-3 rounded-full"
							style={{ backgroundColor: data.color }}
						></div>
						<p className="font-semibold text-slate-200">{data.name}</p>
					</div>
					<div className="space-y-1 text-sm">
						<div className="flex justify-between gap-4">
							<span className="text-slate-300">Cards:</span>
							<span className="font-semibold text-white">{data.value}</span>
						</div>
						<div className="flex justify-between gap-4">
							<span className="text-slate-300">Percentage:</span>
							<span className="font-semibold text-white">{percentage}%</span>
						</div>
						<p className="mt-2 text-slate-400 text-xs">{data.description}</p>
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
				<div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
					<div className="text-center">
						<div className="mb-4 text-4xl">🃏</div>
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
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{chartData.map((item, index) => (
					<div
						key={index}
						className="flex cursor-pointer items-center gap-3 rounded p-2 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700"
					>
						<div
							className="h-4 w-4 flex-shrink-0 rounded-full transition-transform duration-200 hover:scale-110"
							style={{ backgroundColor: item.color }}
						></div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center justify-between">
								<span className="truncate font-medium text-slate-700 text-sm transition-colors hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-200">
									{item.name}
								</span>
								<span className="ml-2 font-semibold text-slate-800 text-sm transition-colors hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-100">
									{item.value}
								</span>
							</div>
							<p className="truncate text-slate-500 text-xs transition-colors hover:text-slate-400 dark:text-slate-400 dark:hover:text-slate-300">
								{item.description}
							</p>
						</div>
					</div>
				))}
			</div>

			{/* Summary Stats */}
			<div className="mt-6 border-slate-200 border-t pt-6 dark:border-slate-700">
				<div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
					<div className="cursor-pointer rounded p-2 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700">
						<div className="font-bold text-lg text-slate-800 transition-colors hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-100">
							{cardDistribution.totalCards}
						</div>
						<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
							Total Cards
						</div>
					</div>
					<div className="cursor-pointer rounded p-2 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700">
						<div className="font-bold text-blue-500 text-lg transition-transform duration-200 hover:scale-105 dark:text-blue-400">
							{spacedRepetitionInsights.totalNewCards}
						</div>
						<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
							New
						</div>
					</div>
					<div className="cursor-pointer rounded p-2 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700">
						<div className="font-bold text-lg text-red-500 transition-transform duration-200 hover:scale-105 dark:text-red-400">
							{spacedRepetitionInsights.totalDueCards}
						</div>
						<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
							Due
						</div>
					</div>
					<div className="cursor-pointer rounded p-2 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700">
						<div className="font-bold text-green-500 text-lg transition-transform duration-200 hover:scale-105 dark:text-green-400">
							{cardDistribution.masteredCards}
						</div>
						<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
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
								className="cursor-pointer transition-opacity hover:opacity-80"
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
