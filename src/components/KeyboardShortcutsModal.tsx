/**
 * KeyboardShortcutsModal Component - Modal displaying available keyboard shortcuts
 */

import { useEffect } from "react";
import { KeyboardShortcutGroup } from "../types/keyboard";

interface KeyboardShortcutsModalProps {
	isOpen: boolean;
	onClose: () => void;
	shortcuts: KeyboardShortcutGroup[];
	studyMode: "basic" | "spaced-repetition";
}

function KeyboardShortcutsModal({
	isOpen,
	onClose,
	shortcuts,
	studyMode,
}: KeyboardShortcutsModalProps) {
	// Handle Escape key to close modal
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
			// Prevent body scroll when modal is open
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = "unset";
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const studyModeTitle =
		studyMode === "basic" ? "Basic Study" : "Spaced Repetition";

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black bg-opacity-50"
				onClick={onClose}
				aria-hidden="true"
				data-testid="modal-backdrop"
			/>

			{/* Modal */}
			<div
				className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
				role="dialog"
				aria-modal="true"
				aria-labelledby="shortcuts-title"
			>
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
					<h2
						id="shortcuts-title"
						className="text-xl font-semibold text-slate-900 dark:text-slate-100"
					>
						Keyboard Shortcuts
					</h2>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
						aria-label="Close shortcuts help"
					>
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>

				{/* Content */}
				<div className="p-6">
					<p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
						Available shortcuts for <strong>{studyModeTitle}</strong> mode:
					</p>

					{shortcuts.map((group, groupIndex) => (
						<div key={groupIndex} className="mb-6 last:mb-0">
							<h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-3">
								{group.title}
							</h3>
							<div className="space-y-2">
								{group.shortcuts.map((shortcut, shortcutIndex) => (
									<div
										key={shortcutIndex}
										className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-md"
									>
										<span className="text-slate-700 dark:text-slate-300">
											{shortcut.description}
										</span>
										<kbd className="px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded">
											{shortcut.key}
										</kbd>
									</div>
								))}
							</div>
						</div>
					))}

					{/* Footer note */}
					<div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
						<p className="text-xs text-slate-500 dark:text-slate-400 text-center">
							Press{" "}
							<kbd className="px-1 py-0.5 text-xs bg-slate-200 dark:bg-slate-600 rounded">
								Esc
							</kbd>{" "}
							to close this help
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export default KeyboardShortcutsModal;
