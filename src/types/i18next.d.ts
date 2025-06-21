import "react-i18next";

// Import the default translation file to infer types
import enTranslation from "../../public/locales/en/translation.json";

declare module "react-i18next" {
	interface CustomTypeOptions {
		defaultNS: "translation";
		resources: {
			translation: typeof enTranslation;
		};
	}
}

declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: "translation";
		resources: {
			translation: typeof enTranslation;
		};
	}
}
