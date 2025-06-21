import { ReactNode } from "react";

interface ChartWidgetProps {
	/** Chart title displayed in the header */
	title: string;
	/** Optional subtitle/description displayed below the title */
	subtitle?: string;
	/** Chart content (typically ResponsiveContainer with chart) */
	children: ReactNode;
	/** Optional header actions (buttons, controls, etc.) */
	headerActions?: ReactNode;
	/** Optional footer content (legends, stats, etc.) */
	footer?: ReactNode;
	/** Chart container height class (default: h-80) */
	chartHeight?: string;
	/** Additional CSS classes for the main container */
	className?: string;
}

/**
 * ChartWidget Component
 *
 * A reusable wrapper component for dashboard charts that provides:
 * - Consistent dark theme styling with slate colors
 * - Standardized container with padding and borders
 * - Flexible header with title, subtitle, and optional actions
 * - Configurable chart container height
 * - Optional footer section for legends, stats, or additional content
 * - Responsive design support
 *
 * This component eliminates code duplication across chart components
 * and ensures consistent styling throughout the statistics dashboard.
 *
 * @example
 * ```tsx
 * <ChartWidget
 *   title="Study Activity"
 *   subtitle="Track your learning progress over time"
 *   chartHeight="h-80"
 *   headerActions={<button>Export</button>}
 *   footer={<div>Summary stats...</div>}
 * >
 *   <ResponsiveContainer width="100%" height="100%">
 *     <AreaChart data={data}>
 *       // Chart content...
 *     </AreaChart>
 *   </ResponsiveContainer>
 * </ChartWidget>
 * ```
 */
export default function ChartWidget({
	title,
	subtitle,
	children,
	headerActions,
	footer,
	chartHeight = "h-80",
	className = "",
}: ChartWidgetProps) {
	return (
		<div
			className={`group rounded-lg border-2 border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:border-slate-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:shadow-slate-900/20 ${className}`}
		>
			{/* Chart Header */}
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h3 className="mb-1 font-semibold text-slate-800 text-xl transition-colors group-hover:text-slate-700 dark:text-slate-200 dark:group-hover:text-slate-100">
						{title}
					</h3>
					{subtitle && (
						<p className="text-slate-600 text-sm transition-colors group-hover:text-slate-500 dark:text-slate-400 dark:group-hover:text-slate-300">
							{subtitle}
						</p>
					)}
				</div>

				{headerActions && (
					<div className="flex items-center gap-2">{headerActions}</div>
				)}
			</div>

			{/* Chart Container */}
			<div className={chartHeight}>{children}</div>

			{/* Optional Footer */}
			{footer && <div className="mt-6">{footer}</div>}
		</div>
	);
}
