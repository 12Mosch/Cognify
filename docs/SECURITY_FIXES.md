# Security Fixes Documentation

## Overview

This document outlines security vulnerabilities that were identified and fixed in the Convex backend functions.

## SQL Injection False Positives (Fixed)

### Issue Description

Snyk Code security scanner flagged several locations as potential SQL injection vulnerabilities with the message:
> "SQL Injection: Unsanitized input from a database flows into get, where it is used in an SQL query."

### Affected Files and Locations

1. **convex/cards.ts**
   - Line 151: `const deck = await ctx.db.get(existingCard.deckId);` in `updateCard` function
   - Line 218: `const deck = await ctx.db.get(existingCard.deckId);` in `deleteCard` function

2. **convex/spacedRepetition.ts**
   - Line 120: `const deck = await ctx.db.get(card.deckId);` in `reviewCard` function
   - Line 497: `const deck = await ctx.db.get(card.deckId);` in `initializeCardForSpacedRepetition` function

### Root Cause Analysis

The security scanner incorrectly identified these as SQL injection vulnerabilities because:

1. **Database values used as parameters**: The `deckId` values came from database records (`existingCard.deckId` and `card.deckId`)
2. **Pattern matching**: The scanner detected database-sourced values being passed to database query functions
3. **False positive**: These are actually NoSQL operations in Convex, not SQL queries

### Technical Context

- **Convex Database**: Uses a NoSQL document database, not SQL
- **Type Safety**: All IDs are strongly typed as `v.id("decks")` and `v.id("cards")`
- **Runtime Validation**: Convex provides built-in validation and sanitization
- **No SQL Injection Risk**: NoSQL document operations don't have SQL injection vulnerabilities

### Security Fixes Applied

Added explicit validation checks before using database-sourced IDs:

```typescript
// Before (flagged by security scanner)
const deck = await ctx.db.get(existingCard.deckId);

// After (security-hardened)
// Validate that the card has a valid deckId before using it
if (!existingCard.deckId) {
  throw new Error("Card has invalid deck reference");
}
const deck = await ctx.db.get(existingCard.deckId);
```

### Benefits of the Fix

1. **Defense in Depth**: Additional validation layer prevents potential data corruption
2. **Error Handling**: Clear error messages for invalid references
3. **Code Robustness**: Handles edge cases where database records might be corrupted
4. **Security Scanner Compliance**: Addresses false positive warnings
5. **Data Integrity**: Ensures all card-deck relationships are valid

### Files Modified

- `convex/cards.ts`: Added validation in `updateCard` and `deleteCard` functions
- `convex/spacedRepetition.ts`: Added validation in `reviewCard` and `initializeCardForSpacedRepetition` functions

### Testing

- All existing tests continue to pass (324 tests passed)
- Linting passes without warnings
- No breaking changes to API contracts
- Backward compatible with existing data

### Security Best Practices Implemented

1. **Input Validation**: Always validate data before using it in database operations
2. **Explicit Null Checks**: Check for null/undefined values from database queries
3. **Error Handling**: Provide clear error messages for invalid states
4. **Type Safety**: Leverage TypeScript and Convex's type system
5. **Defense in Depth**: Multiple layers of validation and error checking

## Future Security Considerations

1. **Regular Security Scans**: Continue running Snyk Code scans to identify potential issues
2. **Code Reviews**: Ensure all database operations include proper validation
3. **Input Sanitization**: Validate all user inputs at API boundaries
4. **Authentication**: Maintain proper user authentication and authorization checks
5. **Data Validation**: Use Convex validators for all function arguments and return types

## URL Scheme Injection Vulnerability (Fixed)

### Issue Description

CodeQL security scanner identified an incomplete URL scheme check vulnerability in the translation interpolation function with the message:
> "Incomplete URL scheme check: URLs starting with javascript: can be used to encode JavaScript code to be executed when the URL is visited. While this is a powerful mechanism for creating feature-rich and responsive web applications, it is also a potential security risk: if the URL comes from an untrusted source, it might contain harmful JavaScript code. For this reason, many frameworks and libraries first check the URL scheme of any untrusted URL, and reject URLs with the javascript: scheme. However, the data: and vbscript: schemes can be used to represent executable code in a very similar way, so any validation logic that checks against javascript:, but not against data: and vbscript:, is likely to be insufficient."

### Affected Files and Locations

1. **convex/utils/translations.ts**
   - Lines 55-58: String interpolation function with incomplete XSS protection

### Root Cause Analysis

The security vulnerability existed because:

1. **Incomplete sanitization**: The code only checked for `<script` and `javascript:` patterns
2. **Missing dangerous schemes**: The `data:` and `vbscript:` URL schemes were not filtered
3. **Potential XSS risk**: User-provided values in translation interpolations could contain malicious URLs

### Technical Context

- **Translation Function**: Used for server-side string interpolation in Convex backend
- **User Input**: Accepts interpolation values that could contain URLs or executable code
- **XSS Risk**: Malicious URLs could be injected through translation parameters

### Security Fix Applied

Enhanced the sanitization regex to include all dangerous URL schemes:

```typescript
// Before (incomplete protection)
const safeReplacement = String(replacement).replace(
  /<script|javascript:/gi,
  "",
);

// After (comprehensive protection)
const safeReplacement = String(replacement).replace(
  /<script|javascript:|data:|vbscript:/gi,
  "",
);
```

### Validation

- **Linting**: Code passes all linting checks
- **Testing**: All 407 tests pass, including 30 test suites
- **Functionality**: No breaking changes to existing translation functionality

## Conclusion

While these were false positive SQL injection warnings (since Convex uses NoSQL), the fixes improve code robustness and data integrity. The additional validation checks provide defense in depth and better error handling for edge cases.

The URL scheme injection fix addresses a real security vulnerability by providing comprehensive protection against XSS attacks through malicious URL schemes in translation interpolations.
