import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
	IMAGE_UPLOAD_CONSTRAINTS,
	SUPPORTED_IMAGE_TYPES,
} from "../../types/cards";
import { PhotoUpload } from "../PhotoUpload";

// Mock the Convex mutation
const mockGenerateUploadUrl = jest.fn();
jest.mock("convex/react", () => ({
	useMutation: () => mockGenerateUploadUrl,
}));

// Mock the translation hook
jest.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, defaultValue?: string) => defaultValue || key,
	}),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("PhotoUpload", () => {
	const mockOnImageSelect = jest.fn();
	const defaultProps = {
		label: "Test Image Upload",
		onImageSelect: mockOnImageSelect,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(global.fetch as jest.Mock).mockClear();
	});

	afterEach(() => {
		// Clean up any object URLs created during tests
		URL.revokeObjectURL = jest.fn();
	});

	it("renders upload button when no image is selected", () => {
		render(<PhotoUpload {...defaultProps} />);

		expect(screen.getByText("Test Image Upload")).toBeInTheDocument();
		expect(screen.getByText("Add Image")).toBeInTheDocument();
		expect(
			screen.getByText("Supports JPEG, PNG, WebP. Max 10MB."),
		).toBeInTheDocument();
	});

	it("shows current image when currentImageUrl is provided", () => {
		render(
			<PhotoUpload
				{...defaultProps}
				currentImageUrl="https://example.com/image.jpg"
			/>,
		);

		const image = screen.getByAltText("Preview");
		expect(image).toBeInTheDocument();
		expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
	});

	it("handles file selection and upload successfully", async () => {
		const mockUploadUrl = "https://upload.example.com";
		const mockStorageId = "storage_123";

		mockGenerateUploadUrl.mockResolvedValue(mockUploadUrl);
		(global.fetch as jest.Mock).mockResolvedValue({
			json: () => Promise.resolve({ storageId: mockStorageId }),
			ok: true,
		});

		// Mock URL.createObjectURL
		const mockObjectUrl = "blob:mock-url";
		URL.createObjectURL = jest.fn(() => mockObjectUrl);

		render(<PhotoUpload {...defaultProps} />);

		const fileInput = screen.getByLabelText("Test Image Upload");
		const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

		fireEvent.change(fileInput, { target: { files: [file] } });

		await waitFor(() => {
			expect(mockGenerateUploadUrl).toHaveBeenCalled();
		});

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(mockUploadUrl, {
				body: file,
				headers: { "Content-Type": "image/jpeg" },
				method: "POST",
			});
		});

		await waitFor(() => {
			expect(mockOnImageSelect).toHaveBeenCalledWith({
				file,
				preview: mockObjectUrl,
				storageId: mockStorageId,
			});
		});
	});

	it("validates file type and shows error for unsupported types", async () => {
		render(<PhotoUpload {...defaultProps} />);

		const fileInput = screen.getByLabelText("Test Image Upload");
		const file = new File(["test"], "test.txt", { type: "text/plain" });

		fireEvent.change(fileInput, { target: { files: [file] } });

		await waitFor(() => {
			expect(screen.getByText(/Unsupported file type/)).toBeInTheDocument();
		});

		expect(mockGenerateUploadUrl).not.toHaveBeenCalled();
		expect(mockOnImageSelect).not.toHaveBeenCalled();
	});

	it("validates file size and shows error for large files", async () => {
		render(<PhotoUpload {...defaultProps} />);

		const fileInput = screen.getByLabelText("Test Image Upload");
		// Create a file larger than the limit
		const largeFile = new File(
			[new ArrayBuffer(IMAGE_UPLOAD_CONSTRAINTS.maxSizeBytes + 1)],
			"large.jpg",
			{ type: "image/jpeg" },
		);

		fireEvent.change(fileInput, { target: { files: [largeFile] } });

		await waitFor(() => {
			expect(
				screen.getByText(/File size must be less than/),
			).toBeInTheDocument();
		});

		expect(mockGenerateUploadUrl).not.toHaveBeenCalled();
		expect(mockOnImageSelect).not.toHaveBeenCalled();
	});

	it("handles upload errors gracefully", async () => {
		const mockUploadUrl = "https://upload.example.com";

		mockGenerateUploadUrl.mockResolvedValue(mockUploadUrl);
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: false,
			status: 500,
		});

		// Mock URL.createObjectURL
		URL.createObjectURL = jest.fn(() => "blob:mock-url");

		render(<PhotoUpload {...defaultProps} />);

		const fileInput = screen.getByLabelText("Test Image Upload");
		const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

		fireEvent.change(fileInput, { target: { files: [file] } });

		await waitFor(() => {
			expect(screen.getByText(/Failed to upload image/)).toBeInTheDocument();
		});

		expect(mockOnImageSelect).not.toHaveBeenCalled();
	});

	it("removes image when remove button is clicked", () => {
		render(
			<PhotoUpload
				{...defaultProps}
				currentImageUrl="https://example.com/image.jpg"
			/>,
		);

		const removeButton = screen.getByLabelText("common.delete");
		fireEvent.click(removeButton);

		expect(mockOnImageSelect).toHaveBeenCalledWith(null);
	});

	it("disables upload when disabled prop is true", () => {
		render(<PhotoUpload {...defaultProps} disabled={true} />);

		const uploadButton = screen.getByRole("button");
		expect(uploadButton).toBeDisabled();
	});

	it("shows loading state during upload", async () => {
		// Mock URL.createObjectURL to return null initially to prevent preview from showing
		URL.createObjectURL = jest.fn(() => "");

		// Make generateUploadUrl hang to test loading state
		mockGenerateUploadUrl.mockImplementation(() => new Promise(() => {}));

		render(<PhotoUpload {...defaultProps} />);

		const fileInput = screen.getByLabelText("Test Image Upload");
		const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

		fireEvent.change(fileInput, { target: { files: [file] } });

		// Should show loading state while generating upload URL
		await waitFor(() => {
			expect(screen.getByText("common.loading")).toBeInTheDocument();
		});
	});

	it("accepts all supported image types", () => {
		render(<PhotoUpload {...defaultProps} />);

		const fileInput = screen.getByLabelText("Test Image Upload");
		const acceptedTypes = fileInput.getAttribute("accept");

		expect(acceptedTypes).toBe(SUPPORTED_IMAGE_TYPES.join(","));
	});
});
