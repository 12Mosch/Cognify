/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as adaptiveLearning from "../adaptiveLearning.js";
import type * as cards from "../cards.js";
import type * as contextualLearning from "../contextualLearning.js";
import type * as decks from "../decks.js";
import type * as gamification from "../gamification.js";
import type * as metacognition from "../metacognition.js";
import type * as migrations_addCardCountToDecks from "../migrations/addCardCountToDecks.js";
import type * as migrations_migrateStudySessionsDateField from "../migrations/migrateStudySessionsDateField.js";
import type * as smartScheduling from "../smartScheduling.js";
import type * as spacedRepetition from "../spacedRepetition.js";
import type * as statistics from "../statistics.js";
import type * as streaks from "../streaks.js";
import type * as studySessions from "../studySessions.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  adaptiveLearning: typeof adaptiveLearning;
  cards: typeof cards;
  contextualLearning: typeof contextualLearning;
  decks: typeof decks;
  gamification: typeof gamification;
  metacognition: typeof metacognition;
  "migrations/addCardCountToDecks": typeof migrations_addCardCountToDecks;
  "migrations/migrateStudySessionsDateField": typeof migrations_migrateStudySessionsDateField;
  smartScheduling: typeof smartScheduling;
  spacedRepetition: typeof spacedRepetition;
  statistics: typeof statistics;
  streaks: typeof streaks;
  studySessions: typeof studySessions;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
