import { useEffect, useId, useRef, useState } from "react";
import {
	type ConsentStatus,
	type PrivacySettings as PrivacySettingsType,
	usePrivacyCompliantAnalytics,
} from "../lib/analytics";

interface PrivacySettingsProps {
	isOpen: boolean;
	onClose: () => void;
	embedded?: boolean;
}

interface ConsentToggleProps {
	type: keyof PrivacySettingsType;
	title: string;
	description: string;
	localSettings: PrivacySettingsType;
	onConsentChange: (
		type: keyof PrivacySettingsType,
		status: ConsentStatus,
	) => void;
}

const ConsentToggle = ({
	type,
	title,
	description,
	localSettings,
	onConsentChange,
}: ConsentToggleProps) => (
	<div className="mb-6 border-slate-200 border-b pb-6 last:mb-0 last:border-b-0 last:pb-0 dark:border-slate-700">
		<div className="mb-3 flex items-start justify-between">
			<div className="flex-1">
				<h3 className="mb-2 font-semibold text-lg text-slate-900 dark:text-slate-100">
					{title}
				</h3>
				<p className="text-slate-600 text-sm leading-relaxed dark:text-slate-400">
					{description}
				</p>
			</div>
			<div className="ml-4 flex-shrink-0">
				<div className="flex gap-2">
					<button
						className={`rounded-md px-3 py-1 text-sm transition-colors ${
							localSettings[type] === "granted"
								? "bg-green-500 text-white"
								: "bg-slate-200 text-slate-600 hover:bg-green-100 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-green-900"
						}`}
						onClick={() => onConsentChange(type, "granted")}
						type="button"
					>
						Allow
					</button>
					<button
						className={`rounded-md px-3 py-1 text-sm transition-colors ${
							localSettings[type] === "denied"
								? "bg-red-500 text-white"
								: "bg-slate-200 text-slate-600 hover:bg-red-100 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-red-900"
						}`}
						onClick={() => onConsentChange(type, "denied")}
						type="button"
					>
						Deny
					</button>
				</div>
				<div className="mt-1 text-center text-slate-500 text-xs dark:text-slate-400">
					Current: {localSettings[type]}
				</div>
			</div>
		</div>
	</div>
);

/**
 * Privacy Settings Modal Component
 *
 * Allows users to manage their privacy preferences and consent settings
 * for analytics, functional, and marketing data collection.
 *
 * Features:
 * - Granular consent controls for different data types
 * - Clear explanations of what each consent type covers
 * - Immediate effect when settings are changed
 * - Accessible modal with proper focus management
 * - Dark theme support
 */
export default function PrivacySettings({
	isOpen,
	onClose,
	embedded = false,
}: PrivacySettingsProps) {
	const { privacySettings, grantConsent, revokeConsent } =
		usePrivacyCompliantAnalytics();
	const [localSettings, setLocalSettings] =
		useState<PrivacySettingsType>(privacySettings);
	const modalRef = useRef<HTMLDivElement>(null);
	const previousActiveElementRef = useRef<HTMLElement | null>(null);
	const titleId = useId();

	// Sync local state when external privacy settings change
	useEffect(() => {
		setLocalSettings(privacySettings);
	}, [privacySettings]);

	// Handle ESC key and focus management for standalone modal
	useEffect(() => {
		if (embedded || !isOpen) return;

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
	}, [isOpen, onClose, embedded]);

	// Prevent background scroll while modal is open (only for standalone modal)
	useEffect(() => {
		if (!embedded && isOpen) {
			document.body.style.overflow = "hidden";
			return () => {
				document.body.style.overflow = "";
			};
		}
	}, [isOpen, embedded]);

	if (!isOpen && !embedded) return null;

	const handleConsentChange = (
		type: keyof PrivacySettingsType,
		status: ConsentStatus,
	) => {
		const newSettings = { ...localSettings, [type]: status };
		setLocalSettings(newSettings);

		if (status === "granted") {
			grantConsent(type);
		} else if (status === "denied") {
			revokeConsent(type);
		}
	};

	const content = (
		<div className={embedded ? "" : "p-6"}>
			<p className="mb-6 text-slate-600 leading-relaxed dark:text-slate-400">
				We respect your privacy and want to be transparent about how we collect
				and use your data. You can control what information we collect by
				adjusting the settings below.
			</p>

			<div className="space-y-6">
				<ConsentToggle
					description="Helps us understand how you use the app, which features are most popular, and how we can improve your learning experience. This includes tracking study sessions, card interactions, and performance metrics."
					localSettings={localSettings}
					onConsentChange={handleConsentChange}
					title="Analytics & Performance"
					type="analyticsConsent"
				/>

				<ConsentToggle
					description="Allows us to remember your preferences, settings, and provide personalized features like study recommendations and progress tracking. This data stays on your device and in your account."
					localSettings={localSettings}
					onConsentChange={handleConsentChange}
					title="Functional & Preferences"
					type="functionalConsent"
				/>

				<ConsentToggle
					description="Enables us to send you updates about new features, study tips, and educational content that might interest you. You can unsubscribe at any time."
					localSettings={localSettings}
					onConsentChange={handleConsentChange}
					title="Marketing & Communications"
					type="marketingConsent"
				/>
			</div>

			{!embedded && (
				<div className="mt-8 border-slate-200 border-t pt-6 dark:border-slate-700">
					<div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
						<div className="text-slate-500 text-sm dark:text-slate-400">
							<p>Changes take effect immediately.</p>
							<p>You can update these settings anytime.</p>
						</div>
						<button
							className="rounded-md bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600"
							onClick={onClose}
							type="button"
						>
							Done
						</button>
					</div>
				</div>
			)}
		</div>
	);

	if (embedded) {
		return content;
	}

	return (
		<div
			aria-labelledby={titleId}
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
			role="dialog"
		>
			<div
				className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-slate-800"
				ref={modalRef}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-slate-200 border-b p-6 dark:border-slate-700">
					<h2
						className="font-bold text-2xl text-slate-900 dark:text-slate-100"
						id={titleId}
					>
						Privacy Settings
					</h2>
					<button
						aria-label="Close privacy settings"
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
				{content}
			</div>
		</div>
	);
}
