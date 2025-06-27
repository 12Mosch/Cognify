/**
 * TypeScript types for flashcard-related data structures
 */

import type { Id } from "../../convex/_generated/dataModel";

/**
 * Base card interface matching the Convex schema
 */
export interface Card {
	_id: Id<"cards">;
	_creationTime: number;
	back: string;
	backImageId?: Id<"_storage">;
	backImageUrl?: string | null;
	deckId: Id<"decks">;
	dueDate?: number;
	easeFactor?: number;
	front: string;
	frontImageId?: Id<"_storage">;
	frontImageUrl?: string | null;
	interval?: number;
	repetition?: number;
	userId: string;
}

/**
 * Card data for creating new cards
 */
export interface CreateCardData {
	back: string;
	backImageId?: Id<"_storage">;
	deckId: Id<"decks">;
	front: string;
	frontImageId?: Id<"_storage">;
}

/**
 * Card data for updating existing cards
 */
export interface UpdateCardData {
	back?: string;
	backImageId?: Id<"_storage">;
	cardId: Id<"cards">;
	front?: string;
	frontImageId?: Id<"_storage">;
}

/**
 * Card form data used in UI components
 */
export interface CardFormData extends Record<string, unknown> {
	back: string;
	backImageId?: Id<"_storage">;
	front: string;
	frontImageId?: Id<"_storage">;
}

/**
 * Image upload data
 */
export interface CardImageData {
	file: File;
	preview: string;
	storageId?: Id<"_storage">;
}

/**
 * Card image URLs returned from queries
 */
export interface CardImageUrls {
	backImageUrl: string | null;
	frontImageUrl: string | null;
}

/**
 * File upload validation result
 */
export interface FileValidationResult {
	isValid: boolean;
	error?: string;
	file?: File;
}

/**
 * Supported input image file types (before compression)
 */
export const SUPPORTED_INPUT_IMAGE_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
] as const;

/**
 * Supported output image file types (after compression)
 */
export const SUPPORTED_OUTPUT_IMAGE_TYPES = [
	"image/avif",
	"image/webp",
	"image/jpeg",
	"image/png",
] as const;

export type SupportedInputImageType =
	(typeof SUPPORTED_INPUT_IMAGE_TYPES)[number];
export type SupportedOutputImageType =
	(typeof SUPPORTED_OUTPUT_IMAGE_TYPES)[number];

// Maintain backward compatibility
export const SUPPORTED_IMAGE_TYPES = SUPPORTED_INPUT_IMAGE_TYPES;
export type SupportedImageType = SupportedInputImageType;

/**
 * Image upload constraints
 */
export const IMAGE_UPLOAD_CONSTRAINTS = {
	// Compression settings
	compression: {
		enabled: true,
		maxSizeMB: 2, // Target size after compression
		maxWidthOrHeight: 1920,
		quality: 80,
		targetFormat: "avif" as const,
	},
	maxSizeBytes: 10 * 1024 * 1024, // 10MB (before compression)
	maxSizeMB: 10,
	supportedTypes: SUPPORTED_INPUT_IMAGE_TYPES,
} as const;
