import { useState } from "react";
import { useTranslation } from "react-i18next";

interface LanguageSwitcherProps {
	className?: string;
}

const languages = [
	{ code: "en", flag: "🇺🇸", name: "English" },
	{ code: "de", flag: "🇩🇪", name: "Deutsch" },
];

export default function LanguageSwitcher({
	className = "",
}: LanguageSwitcherProps) {
	const { i18n, t } = useTranslation();
	const [isOpen, setIsOpen] = useState(false);

	// Normalize language code to handle region codes like "en-US" -> "en"
	const langCode = i18n.resolvedLanguage?.split("-")[0] ?? "en";
	const currentLanguage =
		languages.find((l) => l.code === langCode) || languages[0];

	const handleLanguageChange = async (languageCode: string) => {
		try {
			await i18n.changeLanguage(languageCode);
			setIsOpen(false);
		} catch (error) {
			console.error("Failed to change language:", error);
		}
	};

	return (
		<div className={`relative ${className}`}>
			<button
				aria-expanded={isOpen}
				aria-haspopup="true"
				aria-label={t("navigation.selectLanguage")}
				className="flex items-center gap-2 rounded-md px-3 py-2 font-medium text-slate-700 text-sm transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
				onClick={() => setIsOpen(!isOpen)}
				type="button"
			>
				<span className="text-lg">{currentLanguage.flag}</span>
				<span className="hidden sm:inline">{currentLanguage.name}</span>
				<svg
					aria-label="Dropdown arrow"
					className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
					fill="none"
					role="img"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<title>Dropdown arrow</title>
					<path
						d="M19 9l-7 7-7-7"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
					/>
				</svg>
			</button>

			{isOpen && (
				<>
					{/* Backdrop */}
					<div
						aria-hidden="true"
						className="fixed inset-0 z-10"
						onClick={() => setIsOpen(false)}
					/>

					{/* Dropdown */}
					<div className="absolute top-full right-0 z-20 mt-1 w-48 rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
						<div aria-orientation="vertical" className="py-1" role="menu">
							{languages.map((language) => (
								<button
									className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${
										language.code === langCode
											? "bg-slate-50 text-slate-900 dark:bg-slate-700 dark:text-slate-100"
											: "text-slate-700 dark:text-slate-300"
									}`}
									key={language.code}
									onClick={() => void handleLanguageChange(language.code)}
									role="menuitem"
									type="button"
								>
									<span className="text-lg">{language.flag}</span>
									<span>{language.name}</span>
									{language.code === langCode && (
										<svg
											aria-label="Selected language"
											className="ml-auto h-4 w-4 text-blue-600 dark:text-blue-400"
											fill="currentColor"
											role="img"
											viewBox="0 0 20 20"
										>
											<title>Selected language</title>
											<path
												clipRule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												fillRule="evenodd"
											/>
										</svg>
									)}
								</button>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
