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
			day: "numeric",
			month: "short",
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
		<div className="group rounded-lg border-2 border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:border-slate-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:shadow-slate-900/20">
			{/* Widget Header */}
			<div className="mb-6 flex items-center justify-between">
				<h3 className="font-semibold text-slate-800 text-xl transition-colors group-hover:text-slate-700 dark:text-slate-200 dark:group-hover:text-slate-100">
					{t("statistics.widgets.upcomingReviews.title")}
				</h3>
				<span
					aria-label="Calendar"
					className="text-2xl transition-transform duration-200 hover:scale-110"
					role="img"
				>
					📅
				</span>
			</div>

			{/* Reviews List */}
			{upcomingReviews.length === 0 ? (
				<div className="py-8 text-center">
					<div className="mb-4 text-4xl">🎉</div>
					<p className="mb-2 text-slate-600 dark:text-slate-400">
						{t("statistics.widgets.upcomingReviews.allCaughtUp")}
					</p>
					<p className="text-slate-500 text-sm dark:text-slate-500">
						{t("statistics.widgets.upcomingReviews.noReviewsScheduled")}
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{upcomingReviews.slice(0, 7).map((review) => (
						<div
							className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white p-3 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:shadow-md dark:border-slate-600 dark:bg-slate-700 dark:hover:border-slate-500"
							key={`${review.cardId}-${review.nextReviewDate}`}
						>
							<div className="flex items-center gap-3">
								{/* Urgency Indicator */}
								<div className="flex items-center gap-2">
									<div
										className={`h-3 w-3 rounded-full ${getUrgencyColor(review.date)} transition-transform duration-200 hover:scale-110`}
									></div>
									<span
										aria-label="Priority"
										className="text-lg transition-transform duration-200 hover:scale-110"
										role="img"
									>
										{getUrgencyIcon(review.date)}
									</span>
								</div>

								{/* Date Info */}
								<div>
									<div className="font-medium text-slate-800 transition-colors hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-100">
										{formatDate(review.date)}
									</div>
									<div className="text-slate-500 text-xs transition-colors hover:text-slate-400 dark:text-slate-400 dark:hover:text-slate-300">
										{new Date(`${review.date}T00:00:00Z`).toLocaleDateString(
											i18n.resolvedLanguage?.split("-")[0] || "en",
											{
												day: "numeric",
												month: "short",
												year: "numeric",
											},
										)}
									</div>
								</div>
							</div>

							{/* Card Count */}
							<div className="text-right">
								<div className="font-bold text-lg text-slate-800 transition-all duration-200 hover:scale-105 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-100">
									{review.count}
								</div>
								<div className="text-slate-500 text-xs transition-colors hover:text-slate-400 dark:text-slate-400 dark:hover:text-slate-300">
									{review.count === 1
										? t("statistics.widgets.upcomingReviews.card")
										: t("statistics.widgets.upcomingReviews.cards")}
								</div>
							</div>
						</div>
					))}

					{/* Show more indicator */}
					{upcomingReviews.length > 7 && (
						<div className="pt-3 text-center">
							<p className="text-slate-500 text-sm dark:text-slate-400">
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
				<div className="mt-6 border-slate-200 border-t pt-6 dark:border-slate-700">
					<div className="grid grid-cols-2 gap-4 text-center">
						<div className="cursor-pointer rounded p-2 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700">
							<div className="font-bold text-blue-500 text-lg transition-transform duration-200 hover:scale-105 dark:text-blue-400">
								{upcomingReviews.reduce((sum, review) => sum + review.count, 0)}
							</div>
							<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
								{t("statistics.widgets.upcomingReviews.totalCards")}
							</div>
						</div>
						<div className="cursor-pointer rounded p-2 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700">
							<div className="font-bold text-lg text-purple-500 transition-transform duration-200 hover:scale-105 dark:text-purple-400">
								{upcomingReviews.length}
							</div>
							<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
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
