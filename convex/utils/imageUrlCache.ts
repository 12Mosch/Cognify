import type { QueryCtx } from "../_generated/server";

/**
 * Optimized image URL fetching with caching to avoid duplicate ctx.storage.getUrl calls.
 * This utility function batches image URL requests and caches results to prevent
 * sequential API calls that cause latency issues.
 *
 * @param ctx - Convex query context
 * @param cards - Array of cards that may have image IDs
 * @returns Promise resolving to cards with image URLs added
 */
export async function addImageUrlsToCards<
	T extends { frontImageId?: string; backImageId?: string },
>(
	ctx: QueryCtx,
	cards: T[],
): Promise<
	(T & { backImageUrl: string | null; frontImageUrl: string | null })[]
> {
	// Early return if no cards
	if (cards.length === 0) {
		return [];
	}

	// Collect all unique image IDs to avoid duplicate fetches
	const imageIds = new Set<string>();

	for (const card of cards) {
		if (card.frontImageId) {
			imageIds.add(card.frontImageId);
		}
		if (card.backImageId) {
			imageIds.add(card.backImageId);
		}
	}

	// Early return if no images to fetch
	if (imageIds.size === 0) {
		return cards.map((card) => ({
			...card,
			backImageUrl: null,
			frontImageUrl: null,
		}));
	}

	// Batch fetch all unique image URLs using Promise.all for concurrent requests
	const imageUrlCache = new Map<string, string | null>();

	await Promise.all(
		Array.from(imageIds).map(async (imageId) => {
			try {
				const url = await ctx.storage.getUrl(imageId);
				imageUrlCache.set(imageId, url);
			} catch {
				// If image fetch fails, cache null to avoid retrying
				imageUrlCache.set(imageId, null);
			}
		}),
	);

	// Map cards with cached URLs
	return cards.map((card) => ({
		...card,
		backImageUrl: card.backImageId
			? (imageUrlCache.get(card.backImageId) ?? null)
			: null,
		frontImageUrl: card.frontImageId
			? (imageUrlCache.get(card.frontImageId) ?? null)
			: null,
	}));
}
