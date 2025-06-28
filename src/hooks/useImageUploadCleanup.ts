import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef } from "react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { CardImageData } from "../types/cards";

/**
 * Custom hook for managing image upload lifecycle and cleanup.
 *
 * This hook tracks uploaded image file IDs and provides cleanup functionality
 * to prevent orphaned files when card creation is cancelled.
 *
 * Features:
 * - Tracks uploaded image file IDs during the card creation process
 * - Automatically cleans up orphaned files when component unmounts
 * - Provides manual cleanup function for explicit cancellation
 * - Handles both successful creation (no cleanup) and cancellation (cleanup)
 * - Includes proper error handling for failed deletions
 */
export function useImageUploadCleanup() {
	// Track uploaded file IDs that need cleanup
	const uploadedFileIds = useRef<Set<Id<"_storage">>>(new Set());

	// Track whether the card was successfully created (prevents cleanup)
	const cardCreatedSuccessfully = useRef(false);

	// Convex mutation for deleting files
	const deleteFile = useMutation(api.cards.deleteFile);

	/**
	 * Register an uploaded image for potential cleanup.
	 * Call this when an image is successfully uploaded but before card creation.
	 */
	const registerUploadedImage = useCallback(
		(imageData: CardImageData | null) => {
			if (imageData?.storageId) {
				uploadedFileIds.current.add(imageData.storageId);
			}
		},
		[],
	);

	/**
	 * Unregister an uploaded image from cleanup.
	 * Call this when removing an image before card creation.
	 */
	const unregisterUploadedImage = useCallback(
		(imageData: CardImageData | null) => {
			if (imageData?.storageId) {
				uploadedFileIds.current.delete(imageData.storageId);
			}
		},
		[],
	);

	/**
	 * Mark card creation as successful to prevent cleanup.
	 * Call this when the card is successfully created.
	 */
	const markCardCreated = useCallback(() => {
		cardCreatedSuccessfully.current = true;
		// Clear the tracked files since they're now associated with a card
		uploadedFileIds.current.clear();
	}, []);

	/**
	 * Manually clean up all tracked uploaded files.
	 * Call this when explicitly cancelling card creation.
	 */
	const cleanupUploadedFiles = useCallback(async () => {
		if (cardCreatedSuccessfully.current) {
			// Don't cleanup if card was created successfully
			return;
		}

		const filesToDelete = Array.from(uploadedFileIds.current);
		uploadedFileIds.current.clear();

		// Delete files in parallel but handle errors gracefully
		const deletePromises = filesToDelete.map(async (storageId) => {
			try {
				const result = await deleteFile({ storageId });
				if (!result.success) {
					console.warn(`Failed to delete file ${storageId}: ${result.error}`);
				}
				return result;
			} catch (error) {
				console.warn(`Error deleting file ${storageId}:`, error);
				return { error: "Delete failed", success: false };
			}
		});

		await Promise.allSettled(deletePromises);
	}, [deleteFile]);

	/**
	 * Delete a specific file immediately.
	 * Call this when a user explicitly removes an image.
	 */
	const deleteSpecificFile = useCallback(
		async (storageId: Id<"_storage">) => {
			try {
				const result = await deleteFile({ storageId });
				if (!result.success) {
					console.warn(`Failed to delete file ${storageId}: ${result.error}`);
				}
				// Remove from tracking regardless of deletion success
				uploadedFileIds.current.delete(storageId);
				return result;
			} catch (error) {
				console.warn(`Error deleting file ${storageId}:`, error);
				// Remove from tracking even if deletion failed
				uploadedFileIds.current.delete(storageId);
				return { error: "Delete failed", success: false };
			}
		},
		[deleteFile],
	);

	/**
	 * Reset the cleanup state.
	 * Call this when starting a new card creation process.
	 */
	const resetCleanupState = useCallback(() => {
		uploadedFileIds.current.clear();
		cardCreatedSuccessfully.current = false;
	}, []);

	// Cleanup on unmount (handles page navigation, refresh, etc.)
	useEffect(() => {
		return () => {
			// Only cleanup if card wasn't created successfully
			if (
				!cardCreatedSuccessfully.current &&
				uploadedFileIds.current.size > 0
			) {
				// Use a fire-and-forget approach for unmount cleanup
				// We can't await in the cleanup function
				const filesToDelete = Array.from(uploadedFileIds.current);

				// Attempt cleanup without blocking unmount
				Promise.allSettled(
					filesToDelete.map(async (storageId) => {
						try {
							await deleteFile({ storageId });
						} catch (error) {
							console.warn(
								`Cleanup on unmount failed for file ${storageId}:`,
								error,
							);
						}
					}),
				).catch((error) => {
					console.warn("Batch cleanup on unmount failed:", error);
				});
			}
		};
	}, [deleteFile]);

	return {
		cleanupUploadedFiles,
		deleteSpecificFile,
		markCardCreated,
		registerUploadedImage,
		resetCleanupState,
		unregisterUploadedImage,
	};
}

/**
 * Enhanced version of useImageUploadCleanup that integrates with PhotoUpload components.
 *
 * This hook provides additional utilities for managing front and back images
 * in card creation forms.
 */
export function useCardImageCleanup() {
	const baseCleanup = useImageUploadCleanup();

	/**
	 * Handle front image selection with automatic registration/unregistration.
	 */
	const handleFrontImageSelect = useCallback(
		async (
			imageData: CardImageData | null,
			setFrontImage: (imageData: CardImageData | null) => void,
			previousImageData?: CardImageData | null,
		) => {
			// If removing an image (imageData is null) and there was a previous image,
			// immediately delete it from storage
			if (!imageData && previousImageData?.storageId) {
				await baseCleanup.deleteSpecificFile(previousImageData.storageId);
			}

			// Unregister previous image if it exists
			if (previousImageData) {
				baseCleanup.unregisterUploadedImage(previousImageData);
			}

			// Register new image if it exists
			if (imageData) {
				baseCleanup.registerUploadedImage(imageData);
			}

			// Update the state
			setFrontImage(imageData);
		},
		[baseCleanup],
	);

	/**
	 * Handle back image selection with automatic registration/unregistration.
	 */
	const handleBackImageSelect = useCallback(
		async (
			imageData: CardImageData | null,
			setBackImage: (imageData: CardImageData | null) => void,
			previousImageData?: CardImageData | null,
		) => {
			// If removing an image (imageData is null) and there was a previous image,
			// immediately delete it from storage
			if (!imageData && previousImageData?.storageId) {
				await baseCleanup.deleteSpecificFile(previousImageData.storageId);
			}

			// Unregister previous image if it exists
			if (previousImageData) {
				baseCleanup.unregisterUploadedImage(previousImageData);
			}

			// Register new image if it exists
			if (imageData) {
				baseCleanup.registerUploadedImage(imageData);
			}

			// Update the state
			setBackImage(imageData);
		},
		[baseCleanup],
	);

	return {
		...baseCleanup,
		handleBackImageSelect,
		handleFrontImageSelect,
	};
}
