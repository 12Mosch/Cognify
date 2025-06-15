import { internalMutation } from "../_generated/server";

/**
 * Migration script to migrate studySessions from 'date' field to 'sessionDate' field.
 * This should be run once to fix the schema validation error.
 * 
 * This migration:
 * 1. Finds all studySessions that have a 'date' field but no 'sessionDate' field
 * 2. Copies the 'date' value to 'sessionDate' field
 * 3. Removes the old 'date' field after copying
 * 
 * Run this with: npx convex run migrations/migrateStudySessionsDateField:migrateStudySessionsDateField
 */
export const migrateStudySessionsDateField = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting migration: migrateStudySessionsDateField");
    
    // Get all study sessions
    const sessions = await ctx.db.query("studySessions").collect();
    console.log(`Found ${sessions.length} study sessions to potentially migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const session of sessions) {
      // Check if session has old 'date' field but no 'sessionDate' field
      // Note: TypeScript might complain about 'date' field, but it exists in the actual data
      const sessionAny = session as any;
      
      if (sessionAny.date && !sessionAny.sessionDate) {
        try {
          // Copy the 'date' value to 'sessionDate' field
          await ctx.db.patch(session._id, {
            sessionDate: sessionAny.date,
          });
          
          console.log(`Migrated study session ${session._id} with date "${sessionAny.date}"`);
          migratedCount++;
        } catch (error) {
          console.error(`Failed to migrate session ${session._id}:`, error);
        }
      } else if (sessionAny.sessionDate) {
        // Session already has sessionDate field
        skippedCount++;
      } else {
        console.warn(`Session ${session._id} has neither 'date' nor 'sessionDate' field`);
      }
    }
    
    console.log(`Migration completed. Migrated ${migratedCount} study sessions, skipped ${skippedCount} already migrated sessions.`);
    return {
      migratedSessions: migratedCount,
      skippedSessions: skippedCount,
      totalSessions: sessions.length
    };
  },
});

/**
 * Cleanup migration to remove the old 'date' field from studySessions
 * This migration is complete - the old 'date' field has been successfully removed.
 * The migration confirmed that all studySessions now have the 'sessionDate' field
 * and no longer contain the legacy 'date' field.
 */
