import { memo, useState } from "react";
import { useTranslation } from "react-i18next";

interface PathCustomizationOptions {
	difficultyProgressionSpeed: "slow" | "normal" | "fast";
	reviewFrequency: "conservative" | "balanced" | "aggressive";
	sessionLength: "short" | "medium" | "long";
	personalizationLevel: "minimal" | "moderate" | "maximum";
	focusMode: "breadth" | "balanced" | "depth";
}

interface PathCustomizationPanelProps {
	pathType: string;
	onOptionsChange: (options: PathCustomizationOptions) => void;
	initialOptions?: Partial<PathCustomizationOptions>;
}

/**
 * PathCustomizationPanel Component
 *
 * Provides customization options for learning paths, allowing users to adjust
 * parameters like difficulty progression speed, review frequency, and personalization
 * settings before starting their study session.
 */
const PathCustomizationPanel = memo(function PathCustomizationPanel({
	pathType,
	onOptionsChange,
	initialOptions = {},
}: PathCustomizationPanelProps) {
	const { t } = useTranslation();

	const [options, setOptions] = useState<PathCustomizationOptions>({
		difficultyProgressionSpeed: "normal",
		focusMode: "balanced",
		personalizationLevel: "moderate",
		reviewFrequency: "balanced",
		sessionLength: "medium",
		...initialOptions,
	});

	const handleOptionChange = <K extends keyof PathCustomizationOptions>(
		key: K,
		value: PathCustomizationOptions[K],
	) => {
		const newOptions = { ...options, [key]: value };
		setOptions(newOptions);
		onOptionsChange(newOptions);
	};

	const getPathSpecificOptions = () => {
		// Show different options based on path type
		switch (pathType) {
			case "difficulty_progression":
				return ["difficultyProgressionSpeed", "sessionLength", "focusMode"];
			case "review_focused":
				return ["reviewFrequency", "sessionLength", "personalizationLevel"];
			case "prerequisite_order":
				return ["difficultyProgressionSpeed", "sessionLength", "focusMode"];
			case "domain_focused":
				return ["sessionLength", "focusMode", "personalizationLevel"];
			case "spaced_repetition_optimized":
				return ["reviewFrequency", "sessionLength", "personalizationLevel"];
			default:
				return ["sessionLength", "personalizationLevel"];
		}
	};

	const visibleOptions = getPathSpecificOptions();

	const renderOption = (optionKey: keyof PathCustomizationOptions) => {
		const optionConfig = {
			difficultyProgressionSpeed: {
				options: [
					{
						description: t(
							"pathCustomization.difficultySpeed.slowDesc",
							"Slower progression with more practice",
						),
						label: t("pathCustomization.difficultySpeed.slow", "Gradual"),
						value: "slow",
					},
					{
						description: t(
							"pathCustomization.difficultySpeed.normalDesc",
							"Balanced difficulty progression",
						),
						label: t("pathCustomization.difficultySpeed.normal", "Standard"),
						value: "normal",
					},
					{
						description: t(
							"pathCustomization.difficultySpeed.fastDesc",
							"Faster progression for experienced learners",
						),
						label: t("pathCustomization.difficultySpeed.fast", "Accelerated"),
						value: "fast",
					},
				],
				title: t(
					"pathCustomization.difficultySpeed.title",
					"Difficulty Progression",
				),
			},
			focusMode: {
				options: [
					{
						description: t(
							"pathCustomization.focusMode.breadthDesc",
							"Cover more topics with lighter depth",
						),
						label: t("pathCustomization.focusMode.breadth", "Breadth"),
						value: "breadth",
					},
					{
						description: t(
							"pathCustomization.focusMode.balancedDesc",
							"Even coverage and depth",
						),
						label: t("pathCustomization.focusMode.balanced", "Balanced"),
						value: "balanced",
					},
					{
						description: t(
							"pathCustomization.focusMode.depthDesc",
							"Deep mastery of fewer topics",
						),
						label: t("pathCustomization.focusMode.depth", "Depth"),
						value: "depth",
					},
				],
				title: t("pathCustomization.focusMode.title", "Learning Focus"),
			},
			personalizationLevel: {
				options: [
					{
						description: t(
							"pathCustomization.personalization.minimalDesc",
							"Standard algorithm with basic adaptation",
						),
						label: t("pathCustomization.personalization.minimal", "Minimal"),
						value: "minimal",
					},
					{
						description: t(
							"pathCustomization.personalization.moderateDesc",
							"Adaptive learning with pattern recognition",
						),
						label: t("pathCustomization.personalization.moderate", "Moderate"),
						value: "moderate",
					},
					{
						description: t(
							"pathCustomization.personalization.maximumDesc",
							"Full personalization with advanced analytics",
						),
						label: t("pathCustomization.personalization.maximum", "Maximum"),
						value: "maximum",
					},
				],
				title: t("pathCustomization.personalization.title", "Personalization"),
			},
			reviewFrequency: {
				options: [
					{
						description: t(
							"pathCustomization.reviewFrequency.conservativeDesc",
							"More frequent reviews for better retention",
						),
						label: t(
							"pathCustomization.reviewFrequency.conservative",
							"Conservative",
						),
						value: "conservative",
					},
					{
						description: t(
							"pathCustomization.reviewFrequency.balancedDesc",
							"Standard review intervals",
						),
						label: t("pathCustomization.reviewFrequency.balanced", "Balanced"),
						value: "balanced",
					},
					{
						description: t(
							"pathCustomization.reviewFrequency.aggressiveDesc",
							"Longer intervals for faster progress",
						),
						label: t(
							"pathCustomization.reviewFrequency.aggressive",
							"Aggressive",
						),
						value: "aggressive",
					},
				],
				title: t("pathCustomization.reviewFrequency.title", "Review Frequency"),
			},
			sessionLength: {
				options: [
					{
						description: t(
							"pathCustomization.sessionLength.shortDesc",
							"10-15 minutes per session",
						),
						label: t("pathCustomization.sessionLength.short", "Short"),
						value: "short",
					},
					{
						description: t(
							"pathCustomization.sessionLength.mediumDesc",
							"20-30 minutes per session",
						),
						label: t("pathCustomization.sessionLength.medium", "Medium"),
						value: "medium",
					},
					{
						description: t(
							"pathCustomization.sessionLength.longDesc",
							"45+ minutes per session",
						),
						label: t("pathCustomization.sessionLength.long", "Long"),
						value: "long",
					},
				],
				title: t("pathCustomization.sessionLength.title", "Session Length"),
			},
		};

		const config = optionConfig[optionKey];
		if (!config) return null;

		return (
			<div className="space-y-3" key={optionKey}>
				<h4 className="font-medium text-slate-900 text-sm dark:text-slate-100">
					{config.title}
				</h4>
				<div className="space-y-2">
					{config.options.map((option) => (
						<label
							className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
							key={option.value}
						>
							<input
								checked={options[optionKey] === option.value}
								className="mt-0.5 text-blue-600 focus:ring-blue-500"
								name={optionKey}
								onChange={() =>
									handleOptionChange(
										optionKey,
										option.value as PathCustomizationOptions[typeof optionKey],
									)
								}
								type="radio"
							/>
							<div className="flex-1">
								<div className="font-medium text-slate-900 text-sm dark:text-slate-100">
									{option.label}
								</div>
								<div className="text-slate-600 text-xs dark:text-slate-400">
									{option.description}
								</div>
							</div>
						</label>
					))}
				</div>
			</div>
		);
	};

	return (
		<div className="space-y-6">
			<div className="border-slate-200 border-b pb-4 dark:border-slate-700">
				<h3 className="font-semibold text-slate-900 dark:text-slate-100">
					{t("pathCustomization.title", "Customize Your Learning Path")}
				</h3>
				<p className="mt-1 text-slate-600 text-sm dark:text-slate-400">
					{t(
						"pathCustomization.description",
						"Adjust these settings to personalize your learning experience.",
					)}
				</p>
			</div>

			<div className="space-y-6">
				{visibleOptions.map((optionKey) =>
					renderOption(optionKey as keyof PathCustomizationOptions),
				)}
			</div>

			{/* Quick Presets */}
			<div className="border-slate-200 border-t pt-4 dark:border-slate-700">
				<h4 className="mb-3 font-medium text-slate-900 text-sm dark:text-slate-100">
					{t("pathCustomization.presets.title", "Quick Presets")}
				</h4>
				<div className="flex flex-wrap gap-2">
					<button
						className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 text-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
						onClick={() => {
							const beginnerOptions: PathCustomizationOptions = {
								difficultyProgressionSpeed: "slow",
								focusMode: "breadth",
								personalizationLevel: "moderate",
								reviewFrequency: "conservative",
								sessionLength: "short",
							};
							setOptions(beginnerOptions);
							onOptionsChange(beginnerOptions);
						}}
						type="button"
					>
						{t("pathCustomization.presets.beginner", "Beginner")}
					</button>
					<button
						className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 text-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
						onClick={() => {
							const standardOptions: PathCustomizationOptions = {
								difficultyProgressionSpeed: "normal",
								focusMode: "balanced",
								personalizationLevel: "moderate",
								reviewFrequency: "balanced",
								sessionLength: "medium",
							};
							setOptions(standardOptions);
							onOptionsChange(standardOptions);
						}}
						type="button"
					>
						{t("pathCustomization.presets.standard", "Standard")}
					</button>
					<button
						className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 text-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
						onClick={() => {
							const intensiveOptions: PathCustomizationOptions = {
								difficultyProgressionSpeed: "fast",
								focusMode: "depth",
								personalizationLevel: "maximum",
								reviewFrequency: "aggressive",
								sessionLength: "long",
							};
							setOptions(intensiveOptions);
							onOptionsChange(intensiveOptions);
						}}
						type="button"
					>
						{t("pathCustomization.presets.intensive", "Intensive")}
					</button>
				</div>
			</div>
		</div>
	);
});

export default PathCustomizationPanel;
export type { PathCustomizationOptions };
