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
	FEW_COMMON_TERMS: "Few common terms",
	INSUFFICIENT_CONTENT: "Insufficient content",
	NO_COMMON_TERMS: "No common terms",
	NO_MEANINGFUL_CONTENT: "No meaningful content",
	RELATED_CONCEPTS: "Related concepts",
	VERY_SIMILAR_CONTENT: "Very similar content",
} as const;

export type RelationshipType =
	(typeof RELATIONSHIP_TYPES)[keyof typeof RELATIONSHIP_TYPES];
export type RelationshipReason =
	(typeof RELATIONSHIP_REASONS)[keyof typeof RELATIONSHIP_REASONS];
