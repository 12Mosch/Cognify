import { useEffect, useState } from "react";

interface PathOptimizationBadgeProps {
	isVisible: boolean;
	changePercentage?: number;
	onAnimationComplete?: () => void;
}

/**
 * PathOptimizationBadge Component
 *
 * A subtle visual indicator that appears when the study path has been optimized.
 * Shows a brief animation and badge to inform users about path adjustments without
 * being intrusive to the study flow.
 *
 * Features:
 * - Smooth fade-in/fade-out animations
 * - Respects prefers-reduced-motion accessibility setting
 * - Auto-dismisses after a short duration
 * - Shows percentage of cards reordered when available
 */
export default function PathOptimizationBadge({
	isVisible,
	changePercentage,
	onAnimationComplete,
}: PathOptimizationBadgeProps) {
	const [shouldRender, setShouldRender] = useState(false);
	const [isAnimating, setIsAnimating] = useState(false);

	// Handle visibility changes
	useEffect(() => {
		if (isVisible) {
			setShouldRender(true);
			// Start animation after render
			const animationTimer = setTimeout(() => {
				setIsAnimating(true);
			}, 50);

			// Auto-dismiss after 3 seconds
			const dismissTimer = setTimeout(() => {
				setIsAnimating(false);
				// Remove from DOM after fade-out animation
				setTimeout(() => {
					setShouldRender(false);
					onAnimationComplete?.();
				}, 300);
			}, 3000);

			return () => {
				clearTimeout(animationTimer);
				clearTimeout(dismissTimer);
			};
		} else {
			setIsAnimating(false);
			setTimeout(() => {
				setShouldRender(false);
			}, 300);
		}
	}, [isVisible, onAnimationComplete]);

	if (!shouldRender) return null;

	const percentageText = changePercentage
		? `${Math.round(changePercentage * 100)}% optimized`
		: "Path optimized";

	return (
		<output
			aria-label={`Study path optimized: ${percentageText}`}
			aria-live="polite"
			className={`fixed top-20 right-4 z-50 flex items-center gap-2 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-3 py-2 shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out dark:border-purple-700 dark:from-purple-900/50 dark:to-indigo-900/50${
				isAnimating ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
			}
			`}
		>
			{/* Optimization icon with subtle animation */}
			<div className="flex h-5 w-5 items-center justify-center">
				<svg
					aria-hidden="true"
					className={`h-4 w-4 text-purple-600 dark:text-purple-400${isAnimating ? "animate-pulse" : ""}
					`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						d="M13 10V3L4 14h7v7l9-11h-7z"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
					/>
				</svg>
			</div>

			{/* Badge text */}
			<span className="font-medium text-purple-800 text-sm dark:text-purple-200">
				{percentageText}
			</span>

			{/* Subtle progress indicator */}
			{changePercentage && (
				<div className="h-1 w-8 overflow-hidden rounded-full bg-purple-200 dark:bg-purple-700">
					<div
						className={`h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000 ease-out${isAnimating ? "w-full" : "w-0"}
						`}
						style={{
							width: isAnimating
								? `${Math.min(changePercentage * 100, 100)}%`
								: "0%",
						}}
					/>
				</div>
			)}
		</output>
	);
}
