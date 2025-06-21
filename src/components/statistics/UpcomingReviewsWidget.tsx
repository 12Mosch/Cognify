import { memo } from "react";
import { useTranslation } from "react-i18next";

interface UpcomingReview {
	date: string;
	count: number;
}

interface UpcomingReviewsWidgetProps {
	upcomingReviews: UpcomingReview[];
}

/**
 * Upcoming Reviews Widget Component
 *
 * Displays upcoming review schedule with:
 * - Clean list layout with date formatting
 * - Color-coded urgency indicators
 * - Dark theme support
 * - Empty state handling
 * - Responsive design
 */
const UpcomingReviewsWidget = memo(function UpcomingReviewsWidget({
	upcomingReviews,
}: UpcomingReviewsWidgetProps) {
	const { t, i18n } = useTranslation();

	const formatDate = (dateString: string) => {
		const date = new Date(`${dateString}T00:00:00Z`); // ISO-8601 UTC midnight
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const isToday = date.toDateString() === today.toDateString();
		const isTomorrow = date.toDateString() === tomorrow.toDateString();

		if (isToday) return t("statistics.widgets.upcomingReviews.today");
		if (isTomorrow) return t("statistics.widgets.upcomingReviews.tomorrow");

		const daysDiff = Math.ceil(
			(date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
		);

		// Get the current language from i18n
		const currentLanguage = i18n.resolvedLanguage?.split("-")[0] || "en";

		if (daysDiff <= 7) {
			return date.toLocaleDateString(currentLanguage, { weekday: "long" });
		}

		return date.toLocaleDateString(currentLanguage, {
			month: "short",
			day: "numeric",
		});
	};

	const getUrgencyColor = (dateString: string) => {
		const date = new Date(`${dateString}T00:00:00Z`); // ISO-8601 UTC midnight
		const today = new Date();
		const daysDiff = Math.ceil(
			(date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (daysDiff === 0) return "bg-red-500"; // Today - urgent
		if (daysDiff === 1) return "bg-orange-500"; // Tomorrow - important
		if (daysDiff <= 3) return "bg-yellow-500"; // Soon - moderate
		return "bg-blue-500"; // Later - normal
	};

	const getUrgencyIcon = (dateString: string) => {
		const date = new Date(`${dateString}T00:00:00Z`); // ISO-8601 UTC midnight
		const today = new Date();
		const daysDiff = Math.ceil(
			(date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (daysDiff === 0) return "🔥"; // Today
		if (daysDiff === 1) return "⚡"; // Tomorrow
		if (daysDiff <= 3) return "⏰"; // Soon
		return "📅"; // Later
	};

	return (
		<div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg dark:hover:shadow-slate-900/20 transition-all duration-300 group">
			{/* Widget Header */}
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-700 dark:group-hover:text-slate-100 transition-colors">
					{t("statistics.widgets.upcomingReviews.title")}
				</h3>
				<span
					className="text-2xl hover:scale-110 transition-transform duration-200"
					role="img"
					aria-label="Calendar"
				>
					📅
				</span>
			</div>

			{/* Reviews List */}
			{upcomingReviews.length === 0 ? (
				<div className="text-center py-8">
					<div className="text-4xl mb-4">🎉</div>
					<p className="text-slate-600 dark:text-slate-400 mb-2">
						{t("statistics.widgets.upcomingReviews.allCaughtUp")}
					</p>
					<p className="text-sm text-slate-500 dark:text-slate-500">
						{t("statistics.widgets.upcomingReviews.noReviewsScheduled")}
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{upcomingReviews.slice(0, 7).map((review, index) => (
						<div
							key={index}
							className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
						>
							<div className="flex items-center gap-3">
								{/* Urgency Indicator */}
								<div className="flex items-center gap-2">
									<div
										className={`w-3 h-3 rounded-full ${getUrgencyColor(review.date)} hover:scale-110 transition-transform duration-200`}
									></div>
									<span
										className="text-lg hover:scale-110 transition-transform duration-200"
										role="img"
										aria-label="Priority"
									>
										{getUrgencyIcon(review.date)}
									</span>
								</div>

								{/* Date Info */}
								<div>
									<div className="font-medium text-slate-800 dark:text-slate-200 hover:text-slate-700 dark:hover:text-slate-100 transition-colors">
										{formatDate(review.date)}
									</div>
									<div className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-400 dark:hover:text-slate-300 transition-colors">
										{new Date(`${review.date}T00:00:00Z`).toLocaleDateString(
											i18n.resolvedLanguage?.split("-")[0] || "en",
											{
												month: "short",
												day: "numeric",
												year: "numeric",
											},
										)}
									</div>
								</div>
							</div>

							{/* Card Count */}
							<div className="text-right">
								<div className="text-lg font-bold text-slate-800 dark:text-slate-200 hover:text-slate-700 dark:hover:text-slate-100 hover:scale-105 transition-all duration-200">
									{review.count}
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-400 dark:hover:text-slate-300 transition-colors">
									{review.count === 1
										? t("statistics.widgets.upcomingReviews.card")
										: t("statistics.widgets.upcomingReviews.cards")}
								</div>
							</div>
						</div>
					))}

					{/* Show more indicator */}
					{upcomingReviews.length > 7 && (
						<div className="text-center pt-3">
							<p className="text-sm text-slate-500 dark:text-slate-400">
								{t("statistics.widgets.upcomingReviews.moreReviewsScheduled", {
									count: upcomingReviews.length - 7,
								})}
							</p>
						</div>
					)}
				</div>
			)}

			{/* Summary */}
			{upcomingReviews.length > 0 && (
				<div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
					<div className="grid grid-cols-2 gap-4 text-center">
						<div className="hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded transition-colors duration-200 cursor-pointer">
							<div className="text-lg font-bold text-blue-500 dark:text-blue-400 hover:scale-105 transition-transform duration-200">
								{upcomingReviews.reduce((sum, review) => sum + review.count, 0)}
							</div>
							<div className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
								{t("statistics.widgets.upcomingReviews.totalCards")}
							</div>
						</div>
						<div className="hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded transition-colors duration-200 cursor-pointer">
							<div className="text-lg font-bold text-purple-500 dark:text-purple-400 hover:scale-105 transition-transform duration-200">
								{upcomingReviews.length}
							</div>
							<div className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
								{t("statistics.widgets.upcomingReviews.reviewDays")}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
});

export default UpcomingReviewsWidget;
