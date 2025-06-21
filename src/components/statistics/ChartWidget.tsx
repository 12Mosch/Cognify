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
			className={`bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg dark:hover:shadow-slate-900/20 transition-all duration-300 group ${className}`}
		>
			{/* Chart Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-1 group-hover:text-slate-700 dark:group-hover:text-slate-100 transition-colors">
						{title}
					</h3>
					{subtitle && (
						<p className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors">
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
