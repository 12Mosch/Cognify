# Manual Testing Guide - Quick Add Card Feature

## Overview
This guide provides step-by-step instructions for manually testing the new Quick Add Card feature to ensure it works correctly.

## Prerequisites
- Development server running (`npm run dev`)
- User account created and logged in
- At least one deck created for testing

## Test Scenarios

### 1. Button Visibility Test
**Objective**: Verify the Quick Add Card button appears only when appropriate

**Steps**:
1. Navigate to the Dashboard
2. If no decks exist:
   - ✅ Quick Add Card button should NOT be visible
   - ✅ Only "Create New Deck" button should be visible
3. Create at least one deck
4. Return to Dashboard
   - ✅ Quick Add Card button should now be visible
   - ✅ Button should be positioned next to "Create New Deck" button

### 2. Form Display Test
**Objective**: Verify the form opens and displays correctly

**Steps**:
1. Click the "Quick Add Card" button
2. ✅ Form should appear with the following elements:
   - Title: "Quick Add Card"
   - Deck selection dropdown
   - Front (Question) textarea
   - Back (Answer) textarea
   - Character counters (0/1000 characters)
   - "Add Card" button (disabled initially)
   - "Cancel" button

### 3. Deck Selection Test
**Objective**: Verify deck selection works correctly

**Steps**:
1. Open the Quick Add Card form
2. Click the deck selection dropdown
3. ✅ All user's decks should be listed
4. ✅ Default option should be "Choose a deck..."
5. Select a deck
6. ✅ Selected deck should be displayed in dropdown

### 4. Form Validation Test
**Objective**: Verify all validation rules work correctly

**Test 4a - Empty Form Submission**:
1. Open the Quick Add Card form
2. Click "Add Card" without filling anything
3. ✅ Error message: "Please select a deck"

**Test 4b - Missing Deck Selection**:
1. Fill in front and back content
2. Leave deck unselected
3. Click "Add Card"
4. ✅ Error message: "Please select a deck"

**Test 4c - Missing Content**:
1. Select a deck
2. Leave front or back content empty
3. Click "Add Card"
4. ✅ Error message: "Both front and back content are required"

**Test 4d - Character Limit**:
1. Enter more than 1000 characters in front or back field
2. ✅ Character counter should show red when approaching/exceeding limit
3. ✅ Error message should appear if limit exceeded

### 5. Successful Card Creation Test
**Objective**: Verify cards are created successfully

**Steps**:
1. Open the Quick Add Card form
2. Select a deck from dropdown
3. Enter front content: "What is the capital of France?"
4. Enter back content: "Paris"
5. ✅ Character counters should update correctly
6. ✅ "Add Card" button should become enabled
7. Click "Add Card"
8. ✅ Form should close
9. ✅ No error messages should appear
10. Navigate to the selected deck's card management
11. ✅ New card should appear in the deck
12. ✅ Card content should match what was entered

### 6. Form Cancellation Test
**Objective**: Verify form can be cancelled properly

**Steps**:
1. Open the Quick Add Card form
2. Fill in some content
3. Click "Cancel"
4. ✅ Form should close
5. ✅ No card should be created
6. ✅ Dashboard should return to normal state

### 7. Character Counter Test
**Objective**: Verify character counters work correctly

**Steps**:
1. Open the Quick Add Card form
2. Type in the front field
3. ✅ Counter should update in real-time (e.g., "25/1000 characters")
4. Type in the back field
5. ✅ Counter should update independently
6. Delete some text
7. ✅ Counters should decrease accordingly

### 8. Responsive Design Test
**Objective**: Verify the feature works on different screen sizes

**Steps**:
1. Test on desktop (wide screen)
   - ✅ Buttons should be side-by-side
   - ✅ Form should be properly sized
2. Test on tablet (medium screen)
   - ✅ Layout should adapt appropriately
3. Test on mobile (narrow screen)
   - ✅ Buttons may stack vertically
   - ✅ Form should be mobile-friendly

### 9. Error Handling Test
**Objective**: Verify error scenarios are handled gracefully

**Test 9a - Network Error Simulation**:
1. Disconnect internet or block API calls
2. Try to create a card
3. ✅ Appropriate error message should appear
4. ✅ Form should remain open for retry

**Test 9b - Invalid Data**:
1. Try to submit with unusual characters or very long content
2. ✅ Should handle gracefully with appropriate validation

### 10. Analytics Test
**Objective**: Verify analytics events are tracked (if analytics are configured)

**Steps**:
1. Open browser developer tools
2. Go to Console tab
3. Create a card using Quick Add Card
4. ✅ In development mode, should see analytics event logged
5. ✅ Event should include card creation details

### 11. Accessibility Test
**Objective**: Verify the feature is accessible

**Steps**:
1. Use Tab key to navigate through the form
2. ✅ All elements should be reachable via keyboard
3. ✅ Tab order should be logical
4. Use screen reader (if available)
5. ✅ All labels and descriptions should be read correctly
6. ✅ Error messages should be announced

### 12. Integration Test
**Objective**: Verify the feature integrates well with existing functionality

**Steps**:
1. Create a card using Quick Add Card
2. Navigate to the deck's card management
3. ✅ Card should appear in the list
4. Start a study session with the deck
5. ✅ New card should appear in study session
6. Edit the card from deck management
7. ✅ Card should be editable normally

## Expected Results Summary

✅ **All tests should pass** for the feature to be considered working correctly.

## Reporting Issues

If any test fails, document:
1. Which test failed
2. What was expected vs. what happened
3. Steps to reproduce
4. Browser and device information
5. Any console errors

## Performance Notes

- Form should open quickly (< 500ms)
- Card creation should complete within 2-3 seconds
- No memory leaks or performance degradation
- Smooth animations and transitions

## Browser Compatibility

Test in:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Conclusion

This manual testing ensures the Quick Add Card feature works reliably across different scenarios and provides a good user experience.
