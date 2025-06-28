import { useEffect, useRef, useState } from "react";

interface CardImageProps {
	src: string;
	alt: string;
	className?: string;
	fallbackClassName?: string;
}

/**
 * CardImage Component - Displays card images with loading states and error fallbacks
 */
export function CardImage({
	src,
	alt,
	className = "",
	fallbackClassName = "",
}: CardImageProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const prevSrcRef = useRef<string>(src);

	// Reset state when src changes
	useEffect(() => {
		if (prevSrcRef.current !== src) {
			prevSrcRef.current = src;
			if (isLoading === false || hasError === true) {
				setIsLoading(true);
				setHasError(false);
			}
		}
	}, [src, isLoading, hasError]);

	const handleLoad = () => {
		setIsLoading(false);
		setHasError(false);
	};

	const handleError = () => {
		setIsLoading(false);
		setHasError(true);
	};

	if (hasError) {
		return (
			<div
				className={`flex items-center justify-center rounded-md border-2 border-slate-300 border-dashed bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800 ${fallbackClassName}`}
			>
				<div className="text-center">
					<svg
						aria-hidden="true"
						className="mx-auto h-8 w-8 text-slate-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<title>Image failed to load</title>
						<path
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
						/>
					</svg>
					<p className="mt-2 text-slate-500 text-xs dark:text-slate-400">
						Image unavailable
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="relative">
			{isLoading && (
				<div
					className={`absolute inset-0 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700 ${className}`}
				>
					<div className="flex flex-col items-center space-y-2">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
						<span className="text-slate-600 text-xs dark:text-slate-400">
							Loading...
						</span>
					</div>
				</div>
			)}
			<img
				alt={alt}
				className={`${className} ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-200`}
				onError={handleError}
				onLoad={handleLoad}
				src={src}
			/>
		</div>
	);
}
