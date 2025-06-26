import { useQuery } from "convex/react";
import { memo, useId } from "react";
import { useTranslation } from "react-i18next";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { api } from "../../../convex/_generated/api";
import ChartWidget from "./ChartWidget";

// Types for Recharts components
interface ActivityTooltipProps {
	active?: boolean;
	payload?: Array<{
		dataKey: string;
		name: string;
		value: number;
		color: string;
	}>;
	label?: string;
}

interface PayloadEntry {
	dataKey: string;
	name: string;
	value: number;
	color: string;
}

interface StudyActivityChartProps {
	dateRange: "7d" | "30d" | "90d" | "all";
}

// Custom Tooltip Component (moved outside to avoid nested component definition)
const CustomTooltip = ({ active, payload, label }: ActivityTooltipProps) => {
	"use no memo"; // Directive to prevent React Compiler optimization

	if (active && payload && payload.length) {
		return (
			<div className="rounded-lg border border-slate-600 bg-slate-800 p-4 shadow-lg dark:bg-slate-900">
				<p className="mb-2 font-semibold text-slate-200">{label}</p>
				{payload.map((entry: PayloadEntry, index: number) => (
					<div
						className="flex items-center gap-2 text-sm"
						key={`${entry.dataKey}-${index}`}
					>
						<div
							className="h-3 w-3 rounded-full"
							style={{ backgroundColor: entry.color }}
						></div>
						<span className="text-slate-300">
							{entry.name}:{" "}
							<span className="font-semibold text-white">{entry.value}</span>
							{entry.dataKey === "timeSpent" && " min"}
						</span>
					</div>
				))}
			</div>
		);
	}
	return null;
};

/**
 * Study Activity Chart Component
 *
 * Displays study activity over time with:
 * - Beautiful gradient area chart
 * - Glowing blue accent colors
 * - Responsive design
 * - Dark theme support
 * - Interactive tooltips
 * - Multiple metrics (cards studied, sessions, time spent)
 */
const StudyActivityChart = memo(function StudyActivityChart({
	dateRange,
}: StudyActivityChartProps) {
	const { t } = useTranslation();
	const cardsGradientId = useId();
	const sessionsGradientId = useId();
	const timeGradientId = useId();

	// Fetch real study activity data from Convex
	const data = useQuery(api.statistics.getStudyActivityData, { dateRange });

	// Show loading state while data is being fetched
	if (data === undefined) {
		return (
			<div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
				<div className="mb-6 flex items-center justify-between">
					<h3 className="font-semibold text-slate-800 text-xl dark:text-slate-200">
						{t("statistics.charts.studyActivity.title")}
					</h3>
					<div className="h-4 w-20 animate-pulse rounded bg-slate-300 dark:bg-slate-600"></div>
				</div>
				<div className="flex h-64 items-center justify-center">
					<div className="animate-pulse text-slate-500 dark:text-slate-400">
						{t("statistics.loading.chartTitle", {
							title: t("statistics.charts.studyActivity.title"),
						})}
					</div>
				</div>
			</div>
		);
	}

	// Prepare footer content
	const totalCards = data.reduce((sum, day) => sum + day.cardsStudied, 0);
	const totalSessions = data.reduce((sum, day) => sum + day.sessions, 0);
	const totalTimeMinutes = Math.round(
		data.reduce((sum, day) => sum + day.timeSpent, 0),
	);
	const totalTimeHours = Math.floor(totalTimeMinutes / 60);
	const remainingMinutes = totalTimeMinutes % 60;

	const footerContent = (
		<>
			{/* Chart Summary */}
			<div className="grid grid-cols-1 gap-4 border-slate-200 border-t pt-6 sm:grid-cols-3 dark:border-slate-700">
				<div className="text-center">
					<div className="font-bold text-2xl text-blue-500 dark:text-blue-400">
						{totalCards}
					</div>
					<div className="text-slate-600 text-sm dark:text-slate-400">
						{t("statistics.charts.studyActivity.totalCards", {
							count: totalCards,
						})}
					</div>
				</div>
				<div className="text-center">
					<div className="font-bold text-2xl text-cyan-500 dark:text-cyan-400">
						{totalSessions}
					</div>
					<div className="text-slate-600 text-sm dark:text-slate-400">
						{t("statistics.charts.studyActivity.totalSessions", {
							count: totalSessions,
						})}
					</div>
				</div>
				<div className="text-center">
					<div className="font-bold text-2xl text-green-500 dark:text-green-400">
						{totalTimeHours}h {remainingMinutes}m
					</div>
					<div className="text-slate-600 text-sm dark:text-slate-400">
						{t("statistics.charts.studyActivity.totalTime", {
							hours: totalTimeHours,
							minutes: remainingMinutes,
						})}
					</div>
				</div>
			</div>
		</>
	);

	return (
		<ChartWidget
			chartHeight="h-80"
			footer={footerContent}
			subtitle={t("statistics.charts.studyActivity.subtitle")}
			title={t("statistics.charts.studyActivity.title")}
		>
			{/* Chart Legend */}
			<div className="mb-6 flex items-center gap-4 text-sm">
				<div className="flex cursor-pointer items-center gap-2 transition-transform duration-200 hover:scale-105">
					<div className="h-3 w-3 rounded-full bg-blue-400 transition-transform duration-200 hover:scale-110"></div>
					<span className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						{t("statistics.charts.studyActivity.cardsStudied")}
					</span>
				</div>
				<div className="flex cursor-pointer items-center gap-2 transition-transform duration-200 hover:scale-105">
					<div className="h-3 w-3 rounded-full bg-cyan-400 transition-transform duration-200 hover:scale-110"></div>
					<span className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						{t("statistics.charts.studyActivity.sessions")}
					</span>
				</div>
				<div className="flex cursor-pointer items-center gap-2 transition-transform duration-200 hover:scale-105">
					<div className="h-3 w-3 rounded-full bg-green-400 transition-transform duration-200 hover:scale-110"></div>
					<span className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						{t("statistics.charts.studyActivity.timeMinutes")}
					</span>
				</div>
			</div>

			{/* Chart Content */}
			<ResponsiveContainer height="100%" width="100%">
				<AreaChart
					data={data}
					margin={{ bottom: 0, left: 0, right: 30, top: 10 }}
				>
					<defs>
						<linearGradient id={cardsGradientId} x1="0" x2="0" y1="0" y2="1">
							<stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
							<stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
						</linearGradient>
						<linearGradient id={sessionsGradientId} x1="0" x2="0" y1="0" y2="1">
							<stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
							<stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
						</linearGradient>
						<linearGradient id={timeGradientId} x1="0" x2="0" y1="0" y2="1">
							<stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
							<stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
						</linearGradient>
					</defs>

					<CartesianGrid
						className="dark:stroke-slate-700"
						stroke="#e2e8f0"
						strokeDasharray="3 3"
					/>

					<XAxis
						axisLine={false}
						dataKey="displayDate"
						fontSize={12}
						stroke="#64748b"
						tickLine={false}
					/>

					<YAxis
						axisLine={false}
						fontSize={12}
						stroke="#64748b"
						tickLine={false}
					/>

					<Tooltip content={<CustomTooltip />} />

					{/* Areas */}
					<Area
						dataKey="cardsStudied"
						fill={`url(#${cardsGradientId})`}
						name={t("statistics.charts.studyActivity.cardsStudied")}
						stroke="#60a5fa"
						strokeWidth={2}
						type="monotone"
					/>

					{/* Lines for additional metrics */}
					<Line
						activeDot={{
							fill: "#ffffff",
							r: 6,
							stroke: "#22d3ee",
							strokeWidth: 2,
						}}
						dataKey="sessions"
						dot={{ fill: "#22d3ee", r: 4, strokeWidth: 2 }}
						name={t("statistics.charts.studyActivity.sessions")}
						stroke="#22d3ee"
						strokeWidth={2}
						type="monotone"
					/>

					<Line
						activeDot={{
							fill: "#ffffff",
							r: 6,
							stroke: "#4ade80",
							strokeWidth: 2,
						}}
						dataKey="timeSpent"
						dot={{ fill: "#4ade80", r: 4, strokeWidth: 2 }}
						name={t("statistics.charts.studyActivity.timeMinutes")}
						stroke="#4ade80"
						strokeWidth={2}
						type="monotone"
					/>
				</AreaChart>
			</ResponsiveContainer>
		</ChartWidget>
	);
});

export default StudyActivityChart;
