import { encode as encodeAvif } from "@jsquash/avif";
import { encode as encodeWebp } from "@jsquash/webp";
import imageCompression from "browser-image-compression";

const DEBUG = process.env.NODE_ENV === "development";

/**
 * Supported compression formats
 */
export type CompressionFormat = "avif" | "webp" | "jpeg" | "png";

/**
 * Compression options
 */
export interface CompressionOptions {
	format: CompressionFormat;
	quality: number; // 0-100
	maxSizeMB: number;
	maxWidthOrHeight?: number;
	onProgress?: (progress: number) => void;
}

/**
 * Compression result
 */
export interface CompressionResult {
	file: File;
	originalSize: number;
	compressedSize: number;
	compressionRatio: number;
	format: CompressionFormat;
}

/**
 * Default compression options
 */
export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
	format: "avif",
	maxSizeMB: 2,
	maxWidthOrHeight: 1920,
	quality: 80,
};

/**
 * Check if AVIF encoding is supported by the browser
 */
export function isAvifSupported(): boolean {
	// Return false in test environment where canvas.toDataURL is not implemented
	if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
		return false;
	}

	// For modern browsers, we can assume AVIF support based on user agent
	// Chrome 85+, Firefox 93+, Safari 16.1+ support AVIF
	const userAgent = navigator.userAgent;

	// Chrome/Chromium 85+
	const chromeMatch = userAgent.match(/(?:Chrome|Chromium|Edge)\/(\d+)/);
	if (chromeMatch && parseInt(chromeMatch[1]) >= 85) {
		return true;
	}

	// Firefox 93+
	if (userAgent.includes("Firefox/")) {
		const firefoxVersion = userAgent.match(/Firefox\/(\d+)/);
		if (firefoxVersion && parseInt(firefoxVersion[1]) >= 93) {
			return true;
		}
	}

	// Safari 16.1+ (WebKit 605.1.15+)
	if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) {
		const safariVersion = userAgent.match(/Version\/(\d+)\.(\d+)/);
		if (safariVersion) {
			const major = parseInt(safariVersion[1]);
			const minor = parseInt(safariVersion[2]);
			if (major > 16 || (major === 16 && minor >= 1)) {
				return true;
			}
		}
	}

	// Fallback to canvas test for other browsers
	try {
		const canvas = document.createElement("canvas");
		canvas.width = 1;
		canvas.height = 1;
		return canvas.toDataURL("image/avif").startsWith("data:image/avif");
	} catch {
		return false;
	}
}

/**
 * Check if WebP encoding is supported by the browser
 */
export function isWebpSupported(): boolean {
	// Return false in test environment where canvas.toDataURL is not implemented
	if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
		return false;
	}

	try {
		const canvas = document.createElement("canvas");
		canvas.width = 1;
		canvas.height = 1;
		return canvas.toDataURL("image/webp").startsWith("data:image/webp");
	} catch {
		return false;
	}
}

/**
 * Get the best supported compression format based on browser capabilities
 */
export function getBestSupportedFormat(): CompressionFormat {
	if (isAvifSupported()) return "avif";
	if (isWebpSupported()) return "webp";
	return "jpeg";
}

/**
 * Convert File to ImageData for AVIF compression
 */
async function fileToImageData(file: File): Promise<ImageData> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const objectUrl = URL.createObjectURL(file);

		img.onload = () => {
			// Clean up the object URL to prevent memory leak
			URL.revokeObjectURL(objectUrl);

			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				reject(new Error("Failed to get canvas context"));
				return;
			}

			canvas.width = img.width;
			canvas.height = img.height;
			ctx.drawImage(img, 0, 0);

			const imageData = ctx.getImageData(0, 0, img.width, img.height);
			resolve(imageData);
		};

		img.onerror = () => {
			// Clean up the object URL to prevent memory leak
			URL.revokeObjectURL(objectUrl);
			reject(new Error("Failed to load image"));
		};

		img.src = objectUrl;
	});
}

/**
 * Compress image to AVIF format using jSquash
 */
async function compressToAvif(
	file: File,
	options: CompressionOptions,
): Promise<File> {
	try {
		// First, resize the image if needed using browser-image-compression
		let processedFile = file;

		if (options.maxWidthOrHeight || options.maxSizeMB < 10) {
			const resizeOptions = {
				fileType: file.type,
				initialQuality: 0.9,
				maxSizeMB: Math.min(options.maxSizeMB * 2, 10), // Allow larger intermediate size
				maxWidthOrHeight: options.maxWidthOrHeight,
				useWebWorker: true,
			};

			processedFile = await imageCompression(file, resizeOptions);
			options.onProgress?.(30);
		}

		// Convert to ImageData
		const imageData = await fileToImageData(processedFile);
		options.onProgress?.(50);

		// Configure AVIF encoding options for jSquash
		const avifOptions = {
			quality: Math.round(options.quality),
			speed: 6, // Balance between speed and compression
		};

		options.onProgress?.(70);

		// Encode using jSquash AVIF encoder
		const avifBuffer = await encodeAvif(imageData, avifOptions);

		options.onProgress?.(90);

		// Create new File with AVIF data
		const avifBlob = new Blob([avifBuffer], { type: "image/avif" });
		const avifFile = new File(
			[avifBlob],
			file.name.replace(/\.[^/.]+$/, ".avif"),
			{
				lastModified: Date.now(),
				type: "image/avif",
			},
		);

		options.onProgress?.(100);
		return avifFile;
	} catch (error) {
		// Check if this is a WebAssembly loading error
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		if (
			errorMessage.includes("WebAssembly") ||
			errorMessage.includes("magic word") ||
			errorMessage.includes("Aborted") ||
			errorMessage.includes("CompileError") ||
			errorMessage.includes("wasm") ||
			errorMessage.includes("instantiate")
		) {
			throw new Error(
				"AVIF compression failed: WebAssembly module could not be loaded. This may be due to network issues or server configuration. Falling back to alternative compression.",
			);
		}
		throw new Error(`AVIF compression failed: ${errorMessage}`);
	}
}

/**
 * Compress image to WebP format using jSquash
 */
async function compressToWebp(
	file: File,
	options: CompressionOptions,
): Promise<File> {
	try {
		// First, resize the image if needed using browser-image-compression
		let processedFile = file;

		if (options.maxWidthOrHeight || options.maxSizeMB < 10) {
			const resizeOptions = {
				fileType: file.type,
				initialQuality: 0.9,
				maxSizeMB: Math.min(options.maxSizeMB * 2, 10), // Allow larger intermediate size
				maxWidthOrHeight: options.maxWidthOrHeight,
				useWebWorker: true,
			};

			processedFile = await imageCompression(file, resizeOptions);
			options.onProgress?.(30);
		}

		// Convert to ImageData
		const imageData = await fileToImageData(processedFile);
		options.onProgress?.(50);

		// Configure WebP encoding options for jSquash
		const webpOptions = {
			quality: Math.round(options.quality),
		};

		options.onProgress?.(70);

		// Encode using jSquash WebP encoder
		const webpBuffer = await encodeWebp(imageData, webpOptions);

		options.onProgress?.(90);

		// Create new File with WebP data
		const webpBlob = new Blob([webpBuffer], { type: "image/webp" });
		const webpFile = new File(
			[webpBlob],
			file.name.replace(/\.[^/.]+$/, ".webp"),
			{
				lastModified: Date.now(),
				type: "image/webp",
			},
		);

		options.onProgress?.(100);
		return webpFile;
	} catch (error) {
		// Check if this is a WebAssembly loading error
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		if (
			errorMessage.includes("WebAssembly") ||
			errorMessage.includes("magic word") ||
			errorMessage.includes("Aborted") ||
			errorMessage.includes("CompileError") ||
			errorMessage.includes("wasm") ||
			errorMessage.includes("instantiate")
		) {
			throw new Error(
				"WebP compression failed: WebAssembly module could not be loaded. This may be due to network issues or server configuration. Falling back to JPEG compression.",
			);
		}
		throw new Error(`WebP compression failed: ${errorMessage}`);
	}
}

/**
 * Compress image using browser-image-compression for JPEG, PNG
 */
async function compressWithBrowserCompression(
	file: File,
	options: CompressionOptions,
): Promise<File> {
	const compressionOptions = {
		fileType: `image/${options.format}`,
		initialQuality: options.quality / 100,
		maxSizeMB: options.maxSizeMB,
		maxWidthOrHeight: options.maxWidthOrHeight,
		onProgress: options.onProgress,
		useWebWorker: true,
	};

	return await imageCompression(file, compressionOptions);
}

/**
 * Main compression function with fallback strategy
 */
export async function compressImage(
	file: File,
	options: Partial<CompressionOptions> = {},
): Promise<CompressionResult> {
	const finalOptions: CompressionOptions = {
		...DEFAULT_COMPRESSION_OPTIONS,
		...options,
	};

	const originalSize = file.size;
	let compressedFile: File;
	let actualFormat = finalOptions.format;

	// Debug logging for format detection
	if (DEBUG) {
		console.log("Image compression debug:", {
			avifSupported: isAvifSupported(),
			requestedFormat: finalOptions.format,
			userAgent: navigator.userAgent,
			webpSupported: isWebpSupported(),
		});
	}

	try {
		// Try to compress with the requested format
		if (finalOptions.format === "avif") {
			// Check if AVIF is supported, fallback to WebP or JPEG if not
			if (!isAvifSupported()) {
				if (DEBUG) {
					console.warn("AVIF not supported by browser, falling back to WebP");
				}
				actualFormat = isWebpSupported() ? "webp" : "jpeg";
			} else {
				if (DEBUG) {
					console.log("AVIF is supported, proceeding with AVIF compression");
				}
			}

			if (actualFormat === "avif") {
				try {
					compressedFile = await compressToAvif(file, finalOptions);
				} catch (avifError) {
					// AVIF failed, try WebP as immediate fallback
					if (DEBUG) {
						console.warn(
							"AVIF compression failed, trying WebP fallback:",
							avifError,
						);
					}
					actualFormat = isWebpSupported() ? "webp" : "jpeg";
					if (actualFormat === "webp") {
						compressedFile = await compressToWebp(file, {
							...finalOptions,
							format: actualFormat,
						});
					} else {
						compressedFile = await compressWithBrowserCompression(file, {
							...finalOptions,
							format: actualFormat,
						});
					}
				}
			} else if (actualFormat === "webp") {
				compressedFile = await compressToWebp(file, {
					...finalOptions,
					format: actualFormat,
				});
			} else {
				compressedFile = await compressWithBrowserCompression(file, {
					...finalOptions,
					format: actualFormat,
				});
			}
		} else if (finalOptions.format === "webp") {
			compressedFile = await compressToWebp(file, finalOptions);
		} else {
			compressedFile = await compressWithBrowserCompression(file, finalOptions);
		}
	} catch (error) {
		if (DEBUG) {
			console.warn(
				`Compression with ${finalOptions.format} failed, falling back to JPEG:`,
				error,
			);
		}

		// Fallback to JPEG compression
		actualFormat = "jpeg";
		compressedFile = await compressWithBrowserCompression(file, {
			...finalOptions,
			format: "jpeg",
		});
	}

	const compressedSize = compressedFile.size;
	const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

	// Debug logging for final result
	if (DEBUG) {
		console.log("Image compression result:", {
			compressedSize: `${(compressedSize / 1024).toFixed(1)}KB`,
			compressionRatio: `${(compressionRatio * 100).toFixed(1)}%`,
			finalFormat: actualFormat,
			originalSize: `${(originalSize / 1024).toFixed(1)}KB`,
		});
	}

	return {
		compressedSize,
		compressionRatio,
		file: compressedFile,
		format: actualFormat,
		originalSize,
	};
}

/**
 * Get compression statistics as human-readable string
 */
export function getCompressionStats(result: CompressionResult): string {
	const originalMB = (result.originalSize / (1024 * 1024)).toFixed(2);
	const compressedMB = (result.compressedSize / (1024 * 1024)).toFixed(2);
	const savings = ((1 - result.compressionRatio) * 100).toFixed(1);

	return `Compressed from ${originalMB}MB to ${compressedMB}MB (${savings}% reduction) using ${result.format.toUpperCase()}`;
}
