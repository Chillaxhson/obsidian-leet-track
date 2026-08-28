import type { Mastery } from "../types";
import { DEFAULT_REVIEW_INTERVALS } from "../constants";

/**
 * Returns today's date as YYYY-MM-DD in local timezone.
 */
export function todayString(): string {
	return formatDate(new Date());
}

/**
 * Formats a Date object as YYYY-MM-DD.
 */
export function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into a Date (at midnight local time).
 * Returns null if the string is invalid.
 */
export function parseDate(dateStr: string): Date | null {
	if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		return null;
	}
	const parts = dateStr.split("-").map(Number);
	const year = parts[0]!;
	const month = parts[1]!;
	const day = parts[2]!;
	const date = new Date(year, month - 1, day);
	// Validate the parsed date matches the input (catches invalid dates like Feb 30)
	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return null;
	}
	return date;
}

/**
 * Calculates the next review date based on mastery level.
 */
export function calculateNextReviewDate(
	mastery: Mastery,
	customIntervals?: Record<Mastery, number>
): string {
	const intervals = customIntervals ?? DEFAULT_REVIEW_INTERVALS;
	const days = intervals[mastery] ?? DEFAULT_REVIEW_INTERVALS[mastery];
	const date = new Date();
	date.setDate(date.getDate() + days);
	return formatDate(date);
}

/**
 * Checks if a review date is due (i.e., today or in the past).
 */
export function isReviewDue(reviewDateStr: string): boolean {
	const reviewDate = parseDate(reviewDateStr);
	if (!reviewDate) return false;

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	reviewDate.setHours(0, 0, 0, 0);

	return reviewDate <= today;
}

/**
 * Calculates the number of days a review is overdue.
 * Returns 0 if not overdue, negative if in the future.
 */
export function daysOverdue(reviewDateStr: string): number {
	const reviewDate = parseDate(reviewDateStr);
	if (!reviewDate) return 0;

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	reviewDate.setHours(0, 0, 0, 0);

	const diffMs = today.getTime() - reviewDate.getTime();
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculates the current study streak based on an array of date strings.
 * A streak is consecutive days (ending today or yesterday) with at least one entry.
 */
export function calculateStreak(dateStrings: string[]): number {
	if (dateStrings.length === 0) return 0;

	// Get unique dates, sorted descending
	const uniqueDates = [...new Set(dateStrings)]
		.map(d => parseDate(d))
		.filter((d): d is Date => d !== null)
		.sort((a, b) => b.getTime() - a.getTime());

	if (uniqueDates.length === 0) return 0;

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const mostRecent = new Date(uniqueDates[0]!);
	mostRecent.setHours(0, 0, 0, 0);

	// Streak must start from today or yesterday
	const daysSinceLast = Math.floor(
		(today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24)
	);
	if (daysSinceLast > 1) return 0;

	let streak = 1;
	for (let i = 1; i < uniqueDates.length; i++) {
		const current = new Date(uniqueDates[i]!);
		const previous = new Date(uniqueDates[i - 1]!);
		current.setHours(0, 0, 0, 0);
		previous.setHours(0, 0, 0, 0);

		const diff = Math.floor(
			(previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)
		);
		if (diff === 1) {
			streak++;
		} else {
			break;
		}
	}

	return streak;
}
