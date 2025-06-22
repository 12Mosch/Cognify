/**
 * KeyboardShortcutsModal Component - Modal displaying available keyboard shortcuts
 */

import { useEffect, useId } from "react";
import type { KeyboardShortcutGroup } from "../types/keyboard";

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
	const titleId = useId();
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
				aria-hidden="true"
				className="absolute inset-0 bg-black bg-opacity-50"
				data-testid="modal-backdrop"
				onClick={onClose}
			/>

			{/* Modal */}
			<div
				aria-labelledby={titleId}
				aria-modal="true"
				className="relative mx-4 max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-slate-800"
				role="dialog"
			>
				{/* Header */}
				<div className="flex items-center justify-between border-slate-200 border-b p-6 dark:border-slate-700">
					<h2
						className="font-semibold text-slate-900 text-xl dark:text-slate-100"
						id={titleId}
					>
						Keyboard Shortcuts
					</h2>
					<button
						aria-label="Close shortcuts help"
						className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
						onClick={onClose}
						type="button"
					>
						<svg
							aria-label="Close icon"
							fill="none"
							height="24"
							role="img"
							stroke="currentColor"
							strokeWidth="2"
							viewBox="0 0 24 24"
							width="24"
						>
							<title>Close icon</title>
							<line x1="18" x2="6" y1="6" y2="18" />
							<line x1="6" x2="18" y1="6" y2="18" />
						</svg>
					</button>
				</div>

				{/* Content */}
				<div className="p-6">
					<p className="mb-6 text-slate-600 text-sm dark:text-slate-400">
						Available shortcuts for <strong>{studyModeTitle}</strong> mode:
					</p>

					{shortcuts.map((group, groupIndex) => (
						<div
							className="mb-6 last:mb-0"
							key={`group-${group.title}-${groupIndex}`}
						>
							<h3 className="mb-3 font-medium text-lg text-slate-800 dark:text-slate-200">
								{group.title}
							</h3>
							<div className="space-y-2">
								{group.shortcuts.map((shortcut, shortcutIndex) => (
									<div
										className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-700"
										key={`shortcut-${shortcut.key}-${shortcut.description}-${shortcutIndex}`}
									>
										<span className="text-slate-700 dark:text-slate-300">
											{shortcut.description}
										</span>
										<kbd className="rounded border border-slate-300 bg-slate-200 px-2 py-1 font-semibold text-slate-800 text-xs dark:border-slate-500 dark:bg-slate-600 dark:text-slate-200">
											{shortcut.key}
										</kbd>
									</div>
								))}
							</div>
						</div>
					))}

					{/* Footer note */}
					<div className="mt-6 border-slate-200 border-t pt-4 dark:border-slate-700">
						<p className="text-center text-slate-500 text-xs dark:text-slate-400">
							Press{" "}
							<kbd className="rounded bg-slate-200 px-1 py-0.5 text-xs dark:bg-slate-600">
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
