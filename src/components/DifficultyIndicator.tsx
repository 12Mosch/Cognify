import { getDifficultyInfo } from '../lib/difficultyUtils';

interface DifficultyIndicatorProps {
  repetition?: number;
  easeFactor?: number;
  interval?: number;
  variant?: 'badge' | 'progress' | 'compact' | 'detailed';
  showLabel?: boolean;
  showProgress?: boolean;
  className?: string;
}

/**
 * DifficultyIndicator Component - Visual representation of card difficulty
 * 
 * Displays the current difficulty level of a flashcard based on SM-2 algorithm data.
 * Supports multiple visual variants and respects accessibility preferences.
 */
export function DifficultyIndicator({
  repetition,
  easeFactor,
  interval,
  variant = 'badge',
  showLabel = true,
  className = '',
}: DifficultyIndicatorProps) {
  const difficultyInfo = getDifficultyInfo(repetition, easeFactor, interval);

  // Badge variant - simple colored badge with label
  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${difficultyInfo.color.bg} ${difficultyInfo.color.text} ${difficultyInfo.color.border} ${className}`}
        role="status"
        aria-label={`Difficulty: ${difficultyInfo.label} - ${difficultyInfo.description}`}
      >
        {showLabel && difficultyInfo.label}
      </div>
    );
  }

  // Progress variant - horizontal progress bar with optional label
  if (variant === 'progress') {
    return (
      <div className={`flex flex-col gap-1 ${className}`} role="status" aria-label={`Learning progress: ${difficultyInfo.progress}% - ${difficultyInfo.description}`}>
        {showLabel && (
          <div className="flex justify-between items-center text-xs">
            <span className={`font-medium ${difficultyInfo.color.text}`}>
              {difficultyInfo.label}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {Math.round(difficultyInfo.progress)}%
            </span>
          </div>
        )}
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-out ${difficultyInfo.color.bg.replace('-100', '-500').replace('-900', '-500')}`}
            style={{ width: `${difficultyInfo.progress}%` }}
            role="progressbar"
            aria-valuenow={difficultyInfo.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    );
  }

  // Compact variant - small dot indicator with tooltip-like behavior
  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-1 ${className}`}
        role="status"
        aria-label={`Difficulty: ${difficultyInfo.label}`}
        title={`${difficultyInfo.label} - ${difficultyInfo.description}`}
      >
        <div
          className={`w-2 h-2 rounded-full ${difficultyInfo.color.bg.replace('-100', '-500').replace('-900', '-500')}`}
          aria-hidden="true"
        />
        {showLabel && (
          <span className={`text-xs ${difficultyInfo.color.text}`}>
            {difficultyInfo.label}
          </span>
        )}
      </div>
    );
  }

  // Detailed variant - comprehensive display with all information
  if (variant === 'detailed') {
    return (
      <div
        className={`flex flex-col gap-2 p-3 rounded-lg border ${difficultyInfo.color.bg} ${difficultyInfo.color.border} ${className}`}
        role="status"
        aria-label={`Difficulty details: ${difficultyInfo.label} - ${difficultyInfo.description}`}
      >
        <div className="flex items-center justify-between">
          <span className={`font-semibold text-sm ${difficultyInfo.color.text}`}>
            {difficultyInfo.label}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {Math.round(difficultyInfo.progress)}%
          </span>
        </div>
        
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-out ${difficultyInfo.color.bg.replace('-100', '-500').replace('-900', '-500')}`}
            style={{ width: `${difficultyInfo.progress}%` }}
            role="progressbar"
            aria-valuenow={difficultyInfo.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        
        <p className={`text-xs ${difficultyInfo.color.text} opacity-80`}>
          {difficultyInfo.description}
        </p>
        
        {/* Technical details for debugging/advanced users */}
        {(repetition !== undefined || easeFactor !== undefined || interval !== undefined) && (
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 border-t border-slate-200 dark:border-slate-600 pt-2">
            {repetition !== undefined && (
              <div>Repetitions: {repetition}</div>
            )}
            {easeFactor !== undefined && (
              <div>Ease Factor: {easeFactor.toFixed(2)}</div>
            )}
            {interval !== undefined && (
              <div>Interval: {interval} day{interval !== 1 ? 's' : ''}</div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Fallback to badge variant
  return (
    <div
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${difficultyInfo.color.bg} ${difficultyInfo.color.text} ${difficultyInfo.color.border} ${className}`}
      role="status"
      aria-label={`Difficulty: ${difficultyInfo.label} - ${difficultyInfo.description}`}
    >
      {showLabel && difficultyInfo.label}
    </div>
  );
}

/**
 * DifficultyStars Component - Star-based difficulty representation
 * 
 * Shows difficulty as filled/empty stars, useful for quick visual assessment.
 */
interface DifficultyStarsProps {
  repetition?: number;
  easeFactor?: number;
  interval?: number;
  maxStars?: number;
  className?: string;
}

export function DifficultyStars({
  repetition,
  easeFactor,
  interval,
  maxStars = 5,
  className = '',
}: DifficultyStarsProps) {
  const difficultyInfo = getDifficultyInfo(repetition, easeFactor, interval);
  const filledStars = Math.round((difficultyInfo.progress / 100) * maxStars);

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      role="status"
      aria-label={`Difficulty rating: ${filledStars} out of ${maxStars} stars - ${difficultyInfo.description}`}
    >
      {Array.from({ length: maxStars }, (_, index) => (
        <svg
          key={index}
          className={`w-3 h-3 ${
            index < filledStars
              ? difficultyInfo.color.text.replace('-700', '-500').replace('-300', '-400')
              : 'text-slate-300 dark:text-slate-600'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/**
 * DifficultyDot Component - Minimal dot indicator for space-constrained layouts
 */
interface DifficultyDotProps {
  repetition?: number;
  easeFactor?: number;
  interval?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DifficultyDot({
  repetition,
  easeFactor,
  interval,
  size = 'md',
  className = '',
}: DifficultyDotProps) {
  const difficultyInfo = getDifficultyInfo(repetition, easeFactor, interval);
  
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  return (
    <div
      className={`rounded-full ${sizeClasses[size]} ${difficultyInfo.color.bg.replace('-100', '-500').replace('-900', '-500')} ${className}`}
      role="status"
      aria-label={`Difficulty: ${difficultyInfo.label}`}
      title={`${difficultyInfo.label} - ${difficultyInfo.description}`}
    />
  );
}

export default DifficultyIndicator;
