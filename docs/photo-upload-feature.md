# Photo Upload Feature

This document describes the photo upload feature that allows users to add images to both the front and back sides of flashcards.

## Overview

The photo upload feature enables users to create more engaging and visual flashcards by adding images alongside text content. This is particularly useful for:

- Language learning (visual vocabulary)
- Medical studies (anatomy diagrams)
- Geography (maps and landmarks)
- Art history (paintings and sculptures)
- Science (diagrams and illustrations)

## Technical Implementation

### Backend (Convex)

#### Schema Changes

The `cards` table has been extended with two new optional fields:

```typescript
cards: defineTable({
  // ... existing fields
  frontImageId: v.optional(v.id("_storage")),
  backImageId: v.optional(v.id("_storage")),
  // ... existing fields
})
```

#### New Mutations

1. **`generateUploadUrl`** - Generates secure upload URLs for authenticated users
2. **Updated `addCardToDeck`** - Now accepts optional image IDs
3. **Updated `updateCard`** - Now supports updating card images

#### New Queries

1. **`getCardImageUrls`** - Retrieves image URLs for a specific card
2. **Updated `getCardsForDeck`** - Now includes image URLs in the response

### Frontend (React)

#### New Components

1. **`PhotoUpload`** (`src/components/PhotoUpload.tsx`)
   - Handles file selection, validation, and upload
   - Provides preview functionality
   - Supports drag-and-drop (future enhancement)
   - Includes proper error handling and loading states

2. **`CardImage`** (`src/components/CardImage.tsx`)
   - Displays card images with loading states
   - Handles image load errors with fallback UI
   - Provides smooth transitions and responsive design

#### Updated Components

1. **`DeckView`** - Updated forms to include photo upload options
2. **`SpacedRepetitionMode`** - Displays images during study sessions
3. **`BasicStudyMode`** - Displays images during study sessions

#### New Types

Added comprehensive TypeScript types in `src/types/cards.ts`:

- `CardImageData` - Image upload data structure
- `FileValidationResult` - File validation results
- `SUPPORTED_IMAGE_TYPES` - Supported file formats
- `IMAGE_UPLOAD_CONSTRAINTS` - Upload limitations

## File Upload Specifications

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

### File Size Limits
- Maximum file size: 10MB
- Recommended size: Under 2MB for optimal performance

### Security Features
- Authentication required for all file operations
- User can only access their own uploaded images
- File type validation on both client and server
- Secure upload URLs with expiration

## User Interface

### Upload Process
1. User clicks the upload area or "Add Image" button
2. File picker opens with format restrictions
3. File is validated for type and size
4. Preview is shown immediately
5. File is uploaded to Convex storage
6. Image is associated with the card

### Visual Indicators
- Cards with images show small badges (F for front, B for back)
- Loading states during upload and image loading
- Error states with helpful messages
- Remove buttons for uploaded images

### Responsive Design
- Images scale appropriately on different screen sizes
- Maintains aspect ratio while fitting container
- Optimized for both desktop and mobile viewing

## Error Handling

### Client-Side Validation
- File type checking before upload
- File size validation
- User-friendly error messages

### Server-Side Security
- Authentication verification
- File type re-validation
- Storage quota management (future enhancement)

### Graceful Degradation
- Cards without images work normally
- Failed image loads show fallback UI
- Network errors are handled gracefully

## Performance Considerations

### Image Optimization
- Images are served directly from Convex CDN
- Lazy loading for better performance
- Efficient caching strategies

### Bundle Size
- Components are tree-shakeable
- Minimal impact on main bundle
- Lazy loading of upload components (future enhancement)

## Testing

### Unit Tests
- `PhotoUpload.test.tsx` - Comprehensive upload component testing
- `CardImage.test.tsx` - Image display component testing
- File validation testing
- Error handling testing

### Integration Tests
- End-to-end upload workflow
- Image display in study modes
- Error recovery scenarios

## Future Enhancements

### Planned Features
1. **Drag-and-Drop Upload** - More intuitive file selection
2. **Image Editing** - Basic crop and resize functionality
3. **Multiple Images** - Support for multiple images per card side
4. **Image Compression** - Automatic optimization for storage efficiency
5. **Bulk Upload** - Upload multiple images at once
6. **Image Search** - Integration with stock photo services

### Performance Improvements
1. **Progressive Loading** - Load images as needed
2. **Image Resizing** - Server-side image optimization
3. **Caching Strategy** - Improved client-side caching
4. **CDN Integration** - Enhanced global delivery

## Migration Guide

### For Existing Users
- Existing cards continue to work without changes
- No data migration required
- Images are optional and don't affect existing functionality

### For Developers
- New optional fields in card schema
- Backward-compatible API changes
- Additional TypeScript types available

## Troubleshooting

### Common Issues

1. **Upload Fails**
   - Check file size (must be under 10MB)
   - Verify file format (JPEG, PNG, WebP only)
   - Ensure stable internet connection

2. **Images Don't Display**
   - Check browser console for errors
   - Verify user authentication
   - Try refreshing the page

3. **Slow Upload**
   - Large files take longer to upload
   - Consider compressing images before upload
   - Check internet connection speed

### Debug Information
- Upload errors are logged to console
- Network requests can be monitored in browser dev tools
- Server errors are handled gracefully with user feedback

## API Reference

### Mutations

```typescript
// Generate upload URL
generateUploadUrl(): Promise<string>

// Add card with images
addCardToDeck({
  front: string,
  back: string,
  frontImageId?: Id<"_storage">,
  backImageId?: Id<"_storage">,
  deckId: Id<"decks">
}): Promise<Id<"cards">>

// Update card images
updateCard({
  cardId: Id<"cards">,
  frontImageId?: Id<"_storage">,
  backImageId?: Id<"_storage">,
  // ... other fields
}): Promise<void>
```

### Queries

```typescript
// Get card image URLs
getCardImageUrls(cardId: Id<"cards">): Promise<{
  frontImageUrl: string | null,
  backImageUrl: string | null
}>

// Get cards with image URLs
getCardsForDeck(deckId: Id<"decks">): Promise<Card[]>
```

## Security Considerations

### Data Privacy
- Images are stored securely in Convex storage
- Access control ensures users only see their own images
- No image content analysis or processing

### Upload Security
- File type validation prevents malicious uploads
- Size limits prevent storage abuse
- Authentication required for all operations

### Content Guidelines
- Users are responsible for appropriate content
- No automatic content moderation (future enhancement)
- Standard terms of service apply
