/**
 * Shared relationship types and constants for contextual learning
 * This file can be safely imported by both client and server code
 */

// Constants for relationship types and reasons
export const RELATIONSHIP_TYPES = {
	BUILDS_UPON: "builds_upon",
	COMPLEMENTARY: "complementary",
	CONCEPTUALLY_RELATED: "conceptually_related",
	CONTAINS: "contains",
	CONTRASTING: "contrasting",
	DOMAIN_RELATED: "domain_related",
	PREREQUISITE: "prerequisite",
	RELATED: "related",
	SIMILAR: "similar",
	UNRELATED: "unrelated",
	WEAKLY_RELATED: "weakly_related",
} as const;

export const RELATIONSHIP_REASONS = {
	// Enhanced content-based reasons
	BUILDS_ON_CONCEPT: "relationships.reasons.buildsOnConcept",
	COMPLEMENTARY_CONCEPTS: "relationships.reasons.complementaryConcepts",
	CONCEPTUAL_OVERLAP: "relationships.reasons.conceptualOverlap",
	CONTEXTUAL_RELATIONSHIP: "relationships.reasons.contextualRelationship",
	CONTRASTING_VIEWPOINTS: "relationships.reasons.contrastingViewpoints",

	// Legacy reasons (maintained for backward compatibility)
	FEW_COMMON_TERMS: "relationships.reasons.fewCommonTerms",
	INSUFFICIENT_CONTENT: "relationships.reasons.insufficientContent",
	KEYWORD_ALIGNMENT: "relationships.reasons.keywordAlignment",
	NO_COMMON_TERMS: "relationships.reasons.noCommonTerms",
	NO_MEANINGFUL_CONTENT: "relationships.reasons.noMeaningfulContent",
	PREREQUISITE_DEPENDENCY: "relationships.reasons.prerequisiteDependency",
	RELATED_CONCEPTS: "relationships.reasons.relatedConcepts",
	SEMANTIC_SIMILARITY: "relationships.reasons.semanticSimilarity",
	SHARED_DOMAIN_TERMINOLOGY: "relationships.reasons.sharedDomainTerminology",
	VERY_SIMILAR_CONTENT: "relationships.reasons.verySimilarContent",
} as const;

export type RelationshipType =
	(typeof RELATIONSHIP_TYPES)[keyof typeof RELATIONSHIP_TYPES];
export type RelationshipReason =
	(typeof RELATIONSHIP_REASONS)[keyof typeof RELATIONSHIP_REASONS];
