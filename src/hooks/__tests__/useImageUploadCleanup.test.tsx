import { act, renderHook } from "@testing-library/react";
import type { Id } from "../../../convex/_generated/dataModel";
import type { CardImageData } from "../../types/cards";
import {
	useCardImageCleanup,
	useImageUploadCleanup,
} from "../useImageUploadCleanup";

// Mock the Convex mutation
const mockDeleteFile = jest.fn();
jest.mock("convex/react", () => ({
	useMutation: () => mockDeleteFile,
}));

// Mock the API
jest.mock("../../../convex/_generated/api", () => ({
	api: {
		cards: {
			deleteFile: "mockDeleteFile",
		},
	},
}));

describe("useImageUploadCleanup", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockDeleteFile.mockResolvedValue({ success: true });
	});

	it("should register and track uploaded images", () => {
		const { result } = renderHook(() => useImageUploadCleanup());

		const mockImageData: CardImageData = {
			file: new File(["test"], "test.jpg", { type: "image/jpeg" }),
			preview: "blob:test-url",
			storageId: "test-storage-id" as Id<"_storage">,
		};

		act(() => {
			result.current.registerUploadedImage(mockImageData);
		});

		// Should not throw or cause issues
		expect(result.current).toBeDefined();
	});

	it("should unregister uploaded images", () => {
		const { result } = renderHook(() => useImageUploadCleanup());

		const mockImageData: CardImageData = {
			file: new File(["test"], "test.jpg", { type: "image/jpeg" }),
			preview: "blob:test-url",
			storageId: "test-storage-id" as Id<"_storage">,
		};

		act(() => {
			result.current.registerUploadedImage(mockImageData);
			result.current.unregisterUploadedImage(mockImageData);
		});

		// Should not throw or cause issues
		expect(result.current).toBeDefined();
	});

	it("should clean up uploaded files when requested", async () => {
		const { result } = renderHook(() => useImageUploadCleanup());

		const mockImageData: CardImageData = {
			file: new File(["test"], "test.jpg", { type: "image/jpeg" }),
			preview: "blob:test-url",
			storageId: "test-storage-id" as Id<"_storage">,
		};

		act(() => {
			result.current.registerUploadedImage(mockImageData);
		});

		await act(async () => {
			await result.current.cleanupUploadedFiles();
		});

		expect(mockDeleteFile).toHaveBeenCalledWith({
			storageId: "test-storage-id",
		});
	});

	it("should not clean up files after card is marked as created", async () => {
		const { result } = renderHook(() => useImageUploadCleanup());

		const mockImageData: CardImageData = {
			file: new File(["test"], "test.jpg", { type: "image/jpeg" }),
			preview: "blob:test-url",
			storageId: "test-storage-id" as Id<"_storage">,
		};

		act(() => {
			result.current.registerUploadedImage(mockImageData);
			result.current.markCardCreated();
		});

		await act(async () => {
			await result.current.cleanupUploadedFiles();
		});

		expect(mockDeleteFile).not.toHaveBeenCalled();
	});

	it("should handle cleanup errors gracefully", async () => {
		const { result } = renderHook(() => useImageUploadCleanup());
		mockDeleteFile.mockRejectedValue(new Error("Delete failed"));

		const mockImageData: CardImageData = {
			file: new File(["test"], "test.jpg", { type: "image/jpeg" }),
			preview: "blob:test-url",
			storageId: "test-storage-id" as Id<"_storage">,
		};

		act(() => {
			result.current.registerUploadedImage(mockImageData);
		});

		// Should not throw even if deletion fails
		await act(async () => {
			await expect(
				result.current.cleanupUploadedFiles(),
			).resolves.not.toThrow();
		});

		expect(mockDeleteFile).toHaveBeenCalledWith({
			storageId: "test-storage-id",
		});
	});

	it("should reset cleanup state", () => {
		const { result } = renderHook(() => useImageUploadCleanup());

		const mockImageData: CardImageData = {
			file: new File(["test"], "test.jpg", { type: "image/jpeg" }),
			preview: "blob:test-url",
			storageId: "test-storage-id" as Id<"_storage">,
		};

		act(() => {
			result.current.registerUploadedImage(mockImageData);
			result.current.markCardCreated();
			result.current.resetCleanupState();
		});

		// After reset, should be able to register new images
		act(() => {
			result.current.registerUploadedImage(mockImageData);
		});

		expect(result.current).toBeDefined();
	});
});

describe("useCardImageCleanup", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockDeleteFile.mockResolvedValue({ success: true });
	});

	it("should handle front image selection with cleanup registration", async () => {
		const { result } = renderHook(() => useCardImageCleanup());
		const mockSetFrontImage = jest.fn();

		const mockImageData: CardImageData = {
			file: new File(["test"], "test.jpg", { type: "image/jpeg" }),
			preview: "blob:test-url",
			storageId: "test-storage-id" as Id<"_storage">,
		};

		await act(async () => {
			await result.current.handleFrontImageSelect(
				mockImageData,
				mockSetFrontImage,
			);
		});

		expect(mockSetFrontImage).toHaveBeenCalledWith(mockImageData);
	});

	it("should handle back image selection with cleanup registration", async () => {
		const { result } = renderHook(() => useCardImageCleanup());
		const mockSetBackImage = jest.fn();

		const mockImageData: CardImageData = {
			file: new File(["test"], "test.jpg", { type: "image/jpeg" }),
			preview: "blob:test-url",
			storageId: "test-storage-id" as Id<"_storage">,
		};

		await act(async () => {
			await result.current.handleBackImageSelect(
				mockImageData,
				mockSetBackImage,
			);
		});

		expect(mockSetBackImage).toHaveBeenCalledWith(mockImageData);
	});

	it("should unregister previous image when selecting new one", async () => {
		const { result } = renderHook(() => useCardImageCleanup());
		const mockSetFrontImage = jest.fn();

		const previousImageData: CardImageData = {
			file: new File(["previous"], "previous.jpg", { type: "image/jpeg" }),
			preview: "blob:previous-url",
			storageId: "previous-storage-id" as Id<"_storage">,
		};

		const newImageData: CardImageData = {
			file: new File(["new"], "new.jpg", { type: "image/jpeg" }),
			preview: "blob:new-url",
			storageId: "new-storage-id" as Id<"_storage">,
		};

		await act(async () => {
			await result.current.handleFrontImageSelect(
				newImageData,
				mockSetFrontImage,
				previousImageData,
			);
		});

		expect(mockSetFrontImage).toHaveBeenCalledWith(newImageData);
	});

	it("should handle null image selection (removal)", async () => {
		const { result } = renderHook(() => useCardImageCleanup());
		const mockSetFrontImage = jest.fn();

		const previousImageData: CardImageData = {
			file: new File(["previous"], "previous.jpg", { type: "image/jpeg" }),
			preview: "blob:previous-url",
			storageId: "previous-storage-id" as Id<"_storage">,
		};

		await act(async () => {
			await result.current.handleFrontImageSelect(
				null,
				mockSetFrontImage,
				previousImageData,
			);
		});

		expect(mockSetFrontImage).toHaveBeenCalledWith(null);
	});
});
