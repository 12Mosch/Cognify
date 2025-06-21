/**
 * HelpIcon Component - A clickable help icon that shows keyboard shortcuts
 */

interface HelpIconProps {
	onClick: () => void;
	className?: string;
}

function HelpIcon({ onClick, className = "" }: HelpIconProps) {
	return (
		<button
			onClick={onClick}
			className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition-colors duration-200 hover:bg-slate-300 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-slate-700 dark:text-slate-400 dark:focus:ring-slate-500 dark:hover:bg-slate-600 dark:hover:text-slate-200 ${className} `}
			aria-label="Show keyboard shortcuts help"
			title="Keyboard shortcuts (?)"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<circle cx="12" cy="12" r="10" />
				<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
				<circle cx="12" cy="17" r="1" />
			</svg>
		</button>
	);
}

export default HelpIcon;
