// Case/whitespace-insensitive identity for a person name, so "Test" and "test"
// (or "Test " with trailing space) are treated as the same person everywhere:
// by-person grouping, the person profile page, statement totals, and search.
export const personKey = (name: string): string => name.trim().toLowerCase()
