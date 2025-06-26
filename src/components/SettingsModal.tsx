import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { resetGestureTutorial } from "../lib/gestureTutorialUtils";
import { showSuccessToast } from "../lib/toast";
import FeatureFlagDemo from "./FeatureFlagDemo";
import PrivacySettings from "./PrivacySettings";

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
	const [activeTab, setActiveTab] = useState<"account" | "security">("account");
	const modalRef = useRef<HTMLDivElement>(null);
	const previousActiveElementRef = useRef<HTMLElement | null>(null);
	const titleId = useId();

	const { t } = useTranslation();

	// Tutorial reset handlers
	const handleResetTutorial = (studyMode?: "basic" | "spaced-repetition") => {
		const confirmMessage = t("settings.tutorials.confirmReset");
		if (window.confirm(confirmMessage)) {
			if (studyMode) {
				resetGestureTutorial(studyMode);
			} else {
				resetGestureTutorial();
			}

			if (studyMode === "basic") {
				showSuccessToast(t("settings.tutorials.resetBasicSuccess"));
			} else if (studyMode === "spaced-repetition") {
				showSuccessToast(t("settings.tutorials.resetSpacedSuccess"));
			} else {
				showSuccessToast(t("settings.tutorials.resetAllSuccess"));
			}
		}
	};

	// Handle ESC key and focus management
	useEffect(() => {
		if (!isOpen) return;

		// Store the previously focused element
		previousActiveElementRef.current = document.activeElement as HTMLElement;

		// Handle ESC key to close modal
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		// Focus trap implementation
		const handleFocusTrap = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;

			const modal = modalRef.current;
			if (!modal) return;

			const focusableElements = modal.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			);
			const firstElement = focusableElements[0] as HTMLElement;
			const lastElement = focusableElements[
				focusableElements.length - 1
			] as HTMLElement;

			if (e.shiftKey) {
				// Shift + Tab
				if (document.activeElement === firstElement) {
					e.preventDefault();
					lastElement.focus();
				}
			} else {
				// Tab
				if (document.activeElement === lastElement) {
					e.preventDefault();
					firstElement.focus();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("keydown", handleFocusTrap);

		// Focus the first focusable element in the modal
		setTimeout(() => {
			const modal = modalRef.current;
			if (modal) {
				const firstFocusable = modal.querySelector(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
				) as HTMLElement;
				if (firstFocusable) {
					firstFocusable.focus();
				}
			}
		}, 0);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("keydown", handleFocusTrap);

			// Restore focus to the previously focused element
			if (previousActiveElementRef.current) {
				previousActiveElementRef.current.focus();
			}
		};
	}, [isOpen, onClose]);

	// Prevent background scroll while modal is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
			return () => {
				document.body.style.overflow = "";
			};
		}
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div
			aria-labelledby={titleId}
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
			role="dialog"
		>
			<div
				className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-800"
				ref={modalRef}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-slate-200 border-b p-6 dark:border-slate-700">
					<h2
						className="font-bold text-2xl text-slate-900 dark:text-slate-100"
						id={titleId}
					>
						{t("settings.title")}
					</h2>
					<button
						aria-label={t("settings.close")}
						className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
						onClick={onClose}
						type="button"
					>
						<svg
							className="h-6 w-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>Close</title>
							<path
								d="M6 18L18 6M6 6l12 12"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
							/>
						</svg>
					</button>
				</div>

				<div className="flex h-full">
					{/* Sidebar Navigation */}
					<div className="w-64 border-slate-200 border-r bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
						<nav className="space-y-2 p-4">
							<button
								className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
									activeTab === "account"
										? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
										: "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
								}`}
								onClick={() => setActiveTab("account")}
								type="button"
							>
								<svg
									className="h-5 w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Account</title>
									<path
										d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
									/>
								</svg>
								{t("settings.tabs.account")}
							</button>
							<button
								className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
									activeTab === "security"
										? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
										: "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
								}`}
								onClick={() => setActiveTab("security")}
								type="button"
							>
								<svg
									className="h-5 w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Security</title>
									<path
										d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
									/>
								</svg>
								{t("settings.tabs.security")}
							</button>
						</nav>
					</div>

					{/* Content Area */}
					<div className="flex-1 overflow-y-auto">
						{activeTab === "account" && (
							<div className="space-y-8 p-6">
								{/* Privacy Settings Section */}
								<div>
									<h3 className="mb-2 font-semibold text-lg text-slate-900 dark:text-slate-100">
										{t("settings.privacy.title")}
									</h3>
									<p className="mb-4 text-slate-600 dark:text-slate-400">
										{t("settings.privacy.description")}
									</p>
									<PrivacySettings
										embedded={true}
										isOpen={true}
										onClose={() => {
											// Embedded component - no close action needed
										}}
									/>
								</div>

								{/* Tutorial Settings Section */}
								<div className="border-slate-200 border-t pt-8 dark:border-slate-700">
									<h3 className="mb-2 font-semibold text-lg text-slate-900 dark:text-slate-100">
										{t("settings.tutorials.title")}
									</h3>
									<p className="mb-6 text-slate-600 dark:text-slate-400">
										{t("settings.tutorials.description")}
									</p>

									<div className="space-y-4">
										{/* Reset All Tutorials */}
										<div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
											<div>
												<h4 className="font-medium text-slate-900 dark:text-slate-100">
													{t("settings.tutorials.resetAll")}
												</h4>
												<p className="text-slate-600 text-sm dark:text-slate-400">
													Reset both basic and spaced repetition tutorials
												</p>
											</div>
											<button
												className="rounded-md bg-slate-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:bg-slate-500 dark:hover:bg-slate-600"
												onClick={() => handleResetTutorial()}
												type="button"
											>
												Reset All
											</button>
										</div>

										{/* Reset Basic Mode Tutorial */}
										<div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
											<div>
												<h4 className="font-medium text-slate-900 dark:text-slate-100">
													{t("settings.tutorials.resetBasic")}
												</h4>
												<p className="text-slate-600 text-sm dark:text-slate-400">
													Reset tutorial for basic study mode
												</p>
											</div>
											<button
												className="rounded-md bg-blue-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
												onClick={() => handleResetTutorial("basic")}
												type="button"
											>
												Reset
											</button>
										</div>

										{/* Reset Spaced Repetition Tutorial */}
										<div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
											<div>
												<h4 className="font-medium text-slate-900 dark:text-slate-100">
													{t("settings.tutorials.resetSpaced")}
												</h4>
												<p className="text-slate-600 text-sm dark:text-slate-400">
													Reset tutorial for spaced repetition mode
												</p>
											</div>
											<button
												className="rounded-md bg-green-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-500 dark:hover:bg-green-600"
												onClick={() => handleResetTutorial("spaced-repetition")}
												type="button"
											>
												Reset
											</button>
										</div>
									</div>
								</div>
							</div>
						)}

						{activeTab === "security" && (
							<div className="p-6">
								<div className="mb-6">
									<h3 className="mb-2 font-semibold text-lg text-slate-900 dark:text-slate-100">
										{t("settings.featureFlags.title")}
									</h3>
									<p className="mb-4 text-slate-600 dark:text-slate-400">
										{t("settings.featureFlags.description")}
									</p>
								</div>
								<FeatureFlagDemo />
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
