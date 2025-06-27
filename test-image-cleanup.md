# Image Upload Cleanup Fix

## Problem
When users clicked the "x" button to remove an image during card creation, the image file was not being deleted from Convex File Storage, leading to orphaned files.

## Solution
Enhanced the `useImageUploadCleanup` hook to immediately delete files when they are explicitly removed by the user.

## Changes Made

### 1. Added `deleteSpecificFile` function
- Immediately deletes a specific file when user removes it
- Removes the file from tracking regardless of deletion success
- Includes proper error handling

### 2. Updated image selection handlers
- `handleFrontImageSelect` and `handleBackImageSelect` are now async
- When `imageData` is `null` and there's a `previousImageData`, the file is immediately deleted
- Components now use `void` to handle the async calls

### 3. Updated components
- `DeckView` (AddCardForm and EditCardForm)
- `QuickAddCardForm`
- All PhotoUpload `onImageSelect` handlers now properly handle async cleanup

## Testing
- All existing tests pass
- Added async test cases for the new functionality
- Error handling is properly tested

## How it works now

1. **Image Upload**: File is uploaded and tracked for potential cleanup
2. **Image Removal**: When user clicks "x", file is immediately deleted from storage
3. **Form Cancellation**: Any remaining tracked files are cleaned up
4. **Successful Creation**: Files are marked as "used" and won't be cleaned up

## Files Modified
- `src/hooks/useImageUploadCleanup.ts` - Added immediate deletion logic
- `src/components/DeckView.tsx` - Updated to handle async image handlers
- `src/components/QuickAddCardForm.tsx` - Updated to handle async image handlers
- `src/hooks/__tests__/useImageUploadCleanup.test.tsx` - Updated tests for async behavior
- `convex/cards.ts` - Added `deleteFile` mutation (already existed)

## Result
✅ Clicking "x" to remove an image now immediately deletes it from Convex File Storage
✅ No more orphaned files when users remove images during card creation
✅ All existing cleanup functionality still works as expected
