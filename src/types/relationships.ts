/**
 * Shared relationship types and constants for contextual learning
 * This file can be safely imported by both client and server code
 */

// Constants for relationship types and reasons
export const RELATIONSHIP_TYPES = {
	CONTAINS: "contains",
	PREREQUISITE: "prerequisite",
	RELATED: "related",
	SIMILAR: "similar",
	UNRELATED: "unrelated",
	WEAKLY_RELATED: "weakly_related",
} as const;

export const RELATIONSHIP_REASONS = {
	FEW_COMMON_TERMS: "relationships.reasons.fewCommonTerms",
	INSUFFICIENT_CONTENT: "relationships.reasons.insufficientContent",
	NO_COMMON_TERMS: "relationships.reasons.noCommonTerms",
	NO_MEANINGFUL_CONTENT: "relationships.reasons.noMeaningfulContent",
	RELATED_CONCEPTS: "relationships.reasons.relatedConcepts",
	VERY_SIMILAR_CONTENT: "relationships.reasons.verySimilarContent",
} as const;

export type RelationshipType =
	(typeof RELATIONSHIP_TYPES)[keyof typeof RELATIONSHIP_TYPES];
export type RelationshipReason =
	(typeof RELATIONSHIP_REASONS)[keyof typeof RELATIONSHIP_REASONS];
