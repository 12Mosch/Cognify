import { useTranslation } from "react-i18next";

interface StudyProgressBarProps {
	/** Current card position (1-based) */
	currentPosition: number;
	/** Total number of cards in the study session */
	totalCards: number;
	/** Whether the session is completed */
	isCompleted?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/**
 * StudyProgressBar Component - Visual progress indicator for study sessions
 *
 * This component provides a comprehensive progress indicator that shows:
 * - Current position within the study session (e.g., "Card 5 of 20")
 * - Visual progress bar with appropriate colors
 * - Percentage completion
 * - Accessibility features with proper ARIA attributes
 *
 * Features:
 * - Blue color for in-progress sessions
 * - Green color when completed
 * - Smooth animations that respect prefers-reduced-motion
 * - Proper accessibility with screen reader support
 * - Responsive design that works on all screen sizes
 * - Integration with existing design system
 */
export function StudyProgressBar({
	currentPosition,
	totalCards,
	isCompleted = false,
	className = "",
}: StudyProgressBarProps) {
	const { t } = useTranslation();

	// Calculate progress percentage
	const raw = totalCards > 0 ? (currentPosition / totalCards) * 100 : 0;
	const progressPercentage = Math.min(100, Math.max(0, Math.round(raw)));

	// Determine colors based on completion status
	const colors = isCompleted
		? {
				barColor: "bg-green-500 dark:bg-green-400",
				textColor: "text-green-700 dark:text-green-300",
				bgColor: "bg-green-100 dark:bg-green-900/20",
				borderColor: "border-green-200 dark:border-green-800",
			}
		: {
				barColor: "bg-blue-500 dark:bg-blue-400",
				textColor: "text-blue-700 dark:text-blue-300",
				bgColor: "bg-blue-50 dark:bg-blue-900/20",
				borderColor: "border-blue-200 dark:border-blue-800",
			};

	return (
		<div className={`study-progress-container ${className}`}>
			{/* Progress Header with Card Position and Percentage */}
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<span className="font-medium text-slate-700 text-sm dark:text-slate-300">
						{t("study.progress.cardPosition", {
							current: currentPosition,
							total: totalCards,
						})}
					</span>
					<span
						className={`rounded-md px-2 py-1 font-semibold text-xs ${colors.bgColor} ${colors.textColor} ${colors.borderColor} border`}
					>
						{progressPercentage}%
					</span>
				</div>

				{/* Status indicator */}
				{isCompleted && (
					<div className="flex items-center gap-1">
						<svg
							className="h-4 w-4 text-green-600 dark:text-green-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
						<span className="font-medium text-green-700 text-xs dark:text-green-300">
							{t("study.progress.completed")}
						</span>
					</div>
				)}
			</div>

			{/* Visual Progress Bar */}
			<div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
				<div
					className={`study-progress-bar h-full ${colors.barColor} rounded-full transition-all duration-500 ease-out`}
					style={{ width: `${progressPercentage}%` }}
					role="progressbar"
					aria-valuenow={progressPercentage}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label={t("study.progress.aria", {
						current: currentPosition,
						total: totalCards,
						percentage: progressPercentage,
					})}
				/>
			</div>

			{/* Additional Progress Text for Screen Readers */}
			<div className="sr-only">
				{isCompleted
					? t("study.progress.completedAria", { total: totalCards })
					: t("study.progress.inProgressAria", {
							current: currentPosition,
							total: totalCards,
						})}
			</div>
		</div>
	);
}

export default StudyProgressBar;
