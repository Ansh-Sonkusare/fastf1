# Project: TypeScript Fast-F1 Package

This is the parent issue for the TypeScript Fast-F1 port project.

## Overview

Build a TypeScript package for accessing F1 data with:
- Functional API for Ergast data (schedules, results, standings)
- In-memory LRU caching
- Zod schemas for runtime validation
- React hooks with SSR hydration (optional package)
- Path to live timing (deferred)

## User Stories

1. As a Node.js backend developer, I want to fetch F1 race results with type safety
2. As a Next.js developer, I want SSR hydration for F1 data
3. As a frontend developer, I want Zod schemas for runtime validation
4. As a user, I want built-in caching to avoid rate limits
5. As a React developer, I want hooks like `useF1Schedule`
6. As a user, I want plain JSON-serializable types for SSR compatibility

## Slices

- #1: Project scaffold
- #2: HTTP client + cache
- #3-6: Zod schemas (Race/Schedule, Participants, Timing, Results)
- #7-10: API functions (Schedule, Results, Standings, Laps)
- #11-12: React hooks
- #13: Demo page
- #14: CI pipeline

## Status

needs-triage