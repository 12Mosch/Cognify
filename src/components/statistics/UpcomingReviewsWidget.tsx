import { memo } from "react";

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
  upcomingReviews
}: UpcomingReviewsWidgetProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";
    
    const daysDiff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getUrgencyColor = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const daysDiff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return "bg-red-500"; // Today - urgent
    if (daysDiff === 1) return "bg-orange-500"; // Tomorrow - important
    if (daysDiff <= 3) return "bg-yellow-500"; // Soon - moderate
    return "bg-blue-500"; // Later - normal
  };

  const getUrgencyIcon = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const daysDiff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return "🔥"; // Today
    if (daysDiff === 1) return "⚡"; // Tomorrow
    if (daysDiff <= 3) return "⏰"; // Soon
    return "📅"; // Later
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
          Upcoming Reviews
        </h3>
        <span className="text-2xl" role="img" aria-label="Calendar">
          📅
        </span>
      </div>

      {/* Reviews List */}
      {upcomingReviews.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎉</div>
          <p className="text-slate-600 dark:text-slate-400 mb-2">All caught up!</p>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            No reviews scheduled for the next week
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingReviews.slice(0, 7).map((review, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                {/* Urgency Indicator */}
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getUrgencyColor(review.date)}`}></div>
                  <span className="text-lg" role="img" aria-label="Priority">
                    {getUrgencyIcon(review.date)}
                  </span>
                </div>
                
                {/* Date Info */}
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {formatDate(review.date)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(review.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              
              {/* Card Count */}
              <div className="text-right">
                <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {review.count}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {review.count === 1 ? 'card' : 'cards'}
                </div>
              </div>
            </div>
          ))}
          
          {/* Show more indicator */}
          {upcomingReviews.length > 7 && (
            <div className="text-center pt-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                +{upcomingReviews.length - 7} more reviews scheduled
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {upcomingReviews.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-500 dark:text-blue-400">
                {upcomingReviews.reduce((sum, review) => sum + review.count, 0)}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Total Cards</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-500 dark:text-purple-400">
                {upcomingReviews.length}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Review Days</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default UpcomingReviewsWidget;
