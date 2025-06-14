"use client";

import { useEffect } from "react";
import {
  Authenticated,
  Unauthenticated,
} from "convex/react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";
import { Dashboard } from "./components/Dashboard";
import { useAnalytics, hasUserBeenTrackedForRegistration, markUserAsTrackedForRegistration } from "./lib/analytics";

export default function App() {
  const { user, isLoaded } = useUser();
  const { trackUserSignUp } = useAnalytics();

  // Track user registration when user first signs up
  useEffect(() => {
    if (isLoaded && user) {
      // Check if this is a new user registration
      const userCreatedAt = new Date(user.createdAt!);
      const now = new Date();
      const timeDifference = now.getTime() - userCreatedAt.getTime();
      const isNewUser = timeDifference < 60000; // Within last minute (adjust as needed)

      // Only track if user is new and hasn't been tracked before
      if (isNewUser && !hasUserBeenTrackedForRegistration()) {
        trackUserSignUp();
        markUserAsTrackedForRegistration();
      }
    }
  }, [isLoaded, user, trackUserSignUp]);

  return (
    <>
      <header className="sticky top-0 z-10 bg-light dark:bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <h1 className="text-xl font-bold">Flashcard App</h1>
        <UserButton />
      </header>
      <main className="p-8">
        <Authenticated>
          <Dashboard />
        </Authenticated>
        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
      </main>
    </>
  );
}

function SignInForm() {
  return (
    <div className="flex flex-col gap-8 w-96 mx-auto text-center">
      <div>
        <h2 className="text-2xl font-bold mb-4">Welcome to Flashcard App</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Sign in to create and manage your flashcard decks
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <SignInButton mode="modal">
          <button className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium">
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-6 py-3 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity font-medium">
            Sign Up
          </button>
        </SignUpButton>
      </div>
    </div>
  );
}




