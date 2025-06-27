import { useMutation } from "convex/react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
	type CardImageData,
	type FileValidationResult,
	IMAGE_UPLOAD_CONSTRAINTS,
	SUPPORTED_IMAGE_TYPES,
	type SupportedImageType,
} from "../types/cards";

interface PhotoUploadProps {
	onImageSelect: (imageData: CardImageData | null) => void;
	currentImageUrl?: string | null;
	label: string;
	disabled?: boolean;
	className?: string;
}

/**
 * Validate uploaded file
 */
function validateFile(file: File): FileValidationResult {
	// Check file type
	if (!SUPPORTED_IMAGE_TYPES.includes(file.type as SupportedImageType)) {
		return {
			error: "Unsupported file type. Please upload JPEG, PNG, or WebP images.",
			isValid: false,
		};
	}

	// Check file size
	if (file.size > IMAGE_UPLOAD_CONSTRAINTS.maxSizeBytes) {
		return {
			error: `File size must be less than ${IMAGE_UPLOAD_CONSTRAINTS.maxSizeMB}MB.`,
			isValid: false,
		};
	}

	return {
		file,
		isValid: true,
	};
}

/**
 * PhotoUpload Component - Handles image upload with preview and validation
 */
export function PhotoUpload({
	onImageSelect,
	currentImageUrl,
	label,
	disabled = false,
	className = "",
}: PhotoUploadProps) {
	const { t } = useTranslation();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(
		currentImageUrl || null,
	);

	const generateUploadUrl = useMutation(api.cards.generateUploadUrl);

	const handleFileSelect = useCallback(
		async (file: File) => {
			setUploadError(null);
			setIsUploading(true);

			try {
				// Validate file
				const validation = validateFile(file);
				if (!validation.isValid) {
					setUploadError(validation.error || "Invalid file");
					return;
				}

				// Create preview URL
				const preview = URL.createObjectURL(file);
				setPreviewUrl(preview);

				// Generate upload URL
				const uploadUrl = await generateUploadUrl();

				// Upload file
				const response = await fetch(uploadUrl, {
					body: file,
					headers: { "Content-Type": file.type },
					method: "POST",
				});

				if (!response.ok) {
					throw new Error("Failed to upload image");
				}

				const { storageId } = await response.json();

				// Create image data object
				const imageData: CardImageData = {
					file,
					preview,
					storageId: storageId as Id<"_storage">,
				};

				onImageSelect(imageData);
			} catch (error) {
				console.error("Upload error:", error);
				setUploadError(
					error instanceof Error ? error.message : "Failed to upload image",
				);
				setPreviewUrl(currentImageUrl || null);
			} finally {
				setIsUploading(false);
			}
		},
		[generateUploadUrl, onImageSelect, currentImageUrl],
	);

	const handleFileInputChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (file) {
				void handleFileSelect(file);
			}
		},
		[handleFileSelect],
	);

	const handleRemoveImage = useCallback(() => {
		setPreviewUrl(null);
		setUploadError(null);
		onImageSelect(null);

		// Clear file input
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, [onImageSelect]);

	const handleClick = useCallback(() => {
		if (!disabled && fileInputRef.current) {
			fileInputRef.current.click();
		}
	}, [disabled]);

	return (
		<div className={`space-y-3 ${className}`}>
			<label
				className="block font-medium text-slate-700 text-sm dark:text-slate-300"
				htmlFor={`photo-upload-${label.replace(/\s+/g, "-").toLowerCase()}`}
			>
				{label}
			</label>

			{/* Upload Area */}
			<div className="relative">
				{previewUrl ? (
					// Image Preview
					<div className="relative">
						<img
							alt="Preview"
							className="h-32 w-full rounded-lg border-2 border-slate-200 object-cover dark:border-slate-700"
							src={previewUrl}
						/>
						{!disabled && (
							<button
								aria-label={t("common.delete")}
								className="-right-2 -top-2 absolute flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs hover:bg-red-600"
								onClick={handleRemoveImage}
								type="button"
							>
								×
							</button>
						)}
					</div>
				) : (
					// Upload Button
					<button
						className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-slate-300 border-dashed bg-slate-50 transition-colors hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500 dark:hover:bg-slate-700"
						disabled={disabled || isUploading}
						onClick={handleClick}
						type="button"
					>
						{isUploading ? (
							<div className="flex flex-col items-center space-y-2">
								<div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
								<span className="text-slate-600 text-sm dark:text-slate-400">
									{t("common.loading")}
								</span>
							</div>
						) : (
							<div className="flex flex-col items-center space-y-2">
								<svg
									aria-hidden="true"
									className="h-8 w-8 text-slate-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Add Image Icon</title>
									<path
										d="M12 6v6m0 0v6m0-6h6m-6 0H6"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
									/>
								</svg>
								<span className="text-slate-600 text-sm dark:text-slate-400">
									{t("forms.addImage", "Add Image")}
								</span>
							</div>
						)}
					</button>
				)}

				{/* Hidden File Input */}
				<input
					accept={SUPPORTED_IMAGE_TYPES.join(",")}
					className="hidden"
					disabled={disabled}
					id={`photo-upload-${label.replace(/\s+/g, "-").toLowerCase()}`}
					onChange={handleFileInputChange}
					ref={fileInputRef}
					type="file"
				/>
			</div>

			{/* Error Message */}
			{uploadError && (
				<p className="text-red-600 text-sm dark:text-red-400">{uploadError}</p>
			)}

			{/* Help Text */}
			<p className="text-slate-500 text-xs dark:text-slate-400">
				{t("forms.imageUploadHelp", "Supports JPEG, PNG, WebP. Max 10MB.")}
			</p>
		</div>
	);
}
