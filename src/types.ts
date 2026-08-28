// ─── Primitive Type Aliases ──────────────────────────────────────────────────

export type ProblemId = number;
export type TopicName = string;   // e.g. "01 - Array & String"
export type TagSlug = string;     // e.g. "dynamic-programming"
export type Mastery = "red" | "yellow" | "green";

// ─── Mapping Types (distinct abstractions, never mixed) ─────────────────────

/** Maps a specific LeetCode problem ID to its canonical topic folder. */
export type ProblemTopicMap = Record<ProblemId, TopicName>;

/** Maps a LeetCode tag slug to a topic folder (fallback when ID not in TOP_150). */
export type TagTopicMap = Record<TagSlug, TopicName>;

// ─── LeetCode GraphQL API Types ─────────────────────────────────────────────

export interface LeetCodeQuestion {
	questionFrontendId: string;
	title: string;
	titleSlug: string;
	difficulty: "Easy" | "Medium" | "Hard";
	content?: string; // HTML description, only present when explicitly requested
	topicTags: { name: string; slug: string }[];
}

export interface LeetCodeSearchQuestion {
	frontendQuestionId: string;
	title: string;
	titleSlug: string;
	difficulty: "Easy" | "Medium" | "Hard";
	topicTags: { name: string; slug: string }[];
}

export interface LeetCodeGraphQLError {
	message: string;
	locations?: { line: number; column: number }[];
	path?: string[];
}

/**
 * GraphQL responses can contain errors even on HTTP 200.
 * Always check both `data` and `errors`.
 */
export interface LeetCodeGraphQLResponse<T> {
	data?: T;
	errors?: LeetCodeGraphQLError[];
}

export interface QuestionDataResponse {
	question: LeetCodeQuestion | null;
}

export interface QuestionListResponse {
	problemsetQuestionList: {
		totalNum: number;
		data: LeetCodeSearchQuestion[];
	} | null;
}

// ─── Plugin Domain Types ────────────────────────────────────────────────────

export interface ProblemData {
	id: string;
	title: string;
	slug: string;
	difficulty: "Easy" | "Medium" | "Hard";
	tags: string[];
	isInterview150: boolean;
	topicFolder: TopicName;
	description?: string; // Markdown-converted description
}

export interface ProblemFrontmatter {
	difficulty: string;
	mastery: Mastery;
	tags: string[];
	"created-date": string;
	"solved-date"?: string;
	"review-date"?: string;
	"review-count": number;
}

/** Parsed problem entry used by the dashboard service. */
export interface DashboardProblem {
	num: number;
	name: string;
	path: string;
	folderName: string;
	difficulty: string;
	mastery: Mastery;
	tags: string[];
	createdDate?: string;
	solvedDate?: string;
	reviewDate?: string;
	reviewCount: number;
}

// ─── Batch Import Types ─────────────────────────────────────────────────────

export type BatchItemStatus = "imported" | "skipped" | "failed";

export interface BatchImportResult {
	input: string;
	status: BatchItemStatus;
	problemId?: string;
	problemTitle?: string;
	error?: string;
}

export interface BatchImportSummary {
	total: number;
	imported: number;
	skipped: number;
	failed: number;
	results: BatchImportResult[];
}

// ─── API Error Types ────────────────────────────────────────────────────────

export class LeetCodeApiError extends Error {
	constructor(
		message: string,
		public readonly statusCode?: number,
		public readonly isRetryable: boolean = false
	) {
		super(message);
		this.name = "LeetCodeApiError";
	}
}

// ─── Settings Types ─────────────────────────────────────────────────────────

export interface LeetTrackSettings {
	settingsVersion: number;
	leetcodeFolder: string;
	autoRefreshHub: boolean;
	defaultMasteryEasy: Mastery;
	defaultMasteryMediumHard: Mastery;
	dashboardFileName: string;
	template: string;
	includeDescription: boolean;
	useLeetCodeCN: boolean;
	customTopicMappings: Record<TagSlug, TopicName>;
	reviewIntervals: Record<Mastery, number>; // days until next review
}
