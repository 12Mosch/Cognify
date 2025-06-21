import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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

	const { t } = useTranslation();

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
			className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="settings-modal-title"
		>
			<div
				ref={modalRef}
				className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
			>
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
					<h2
						id="settings-modal-title"
						className="text-2xl font-bold text-slate-900 dark:text-slate-100"
					>
						{t("settings.title")}
					</h2>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
						aria-label={t("settings.close")}
					>
						<svg
							className="w-6 h-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div className="flex h-full">
					{/* Sidebar Navigation */}
					<div className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
						<nav className="p-4 space-y-2">
							<button
								onClick={() => setActiveTab("account")}
								className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
									activeTab === "account"
										? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
										: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
								}`}
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
									/>
								</svg>
								{t("settings.tabs.account")}
							</button>
							<button
								onClick={() => setActiveTab("security")}
								className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
									activeTab === "security"
										? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
										: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
								}`}
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
									/>
								</svg>
								{t("settings.tabs.security")}
							</button>
						</nav>
					</div>

					{/* Content Area */}
					<div className="flex-1 overflow-y-auto">
						{activeTab === "account" && (
							<div className="p-6">
								<div className="mb-6">
									<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
										{t("settings.privacy.title")}
									</h3>
									<p className="text-slate-600 dark:text-slate-400 mb-4">
										{t("settings.privacy.description")}
									</p>
								</div>
								<PrivacySettings
									isOpen={true}
									onClose={() => {}}
									embedded={true}
								/>
							</div>
						)}

						{activeTab === "security" && (
							<div className="p-6">
								<div className="mb-6">
									<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
										{t("settings.featureFlags.title")}
									</h3>
									<p className="text-slate-600 dark:text-slate-400 mb-4">
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
