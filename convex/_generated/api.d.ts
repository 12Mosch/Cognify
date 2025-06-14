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
import type * as cards from "../cards.js";
import type * as decks from "../decks.js";
import type * as migrations_addCardCountToDecks from "../migrations/addCardCountToDecks.js";
import type * as migrations_migrateStudySessionsDateField from "../migrations/migrateStudySessionsDateField.js";
import type * as spacedRepetition from "../spacedRepetition.js";
import type * as statistics from "../statistics.js";
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
  cards: typeof cards;
  decks: typeof decks;
  "migrations/addCardCountToDecks": typeof migrations_addCardCountToDecks;
  "migrations/migrateStudySessionsDateField": typeof migrations_migrateStudySessionsDateField;
  spacedRepetition: typeof spacedRepetition;
  statistics: typeof statistics;
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
