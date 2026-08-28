import { requestUrl } from "obsidian";
import type {
	LeetCodeQuestion,
	LeetCodeSearchQuestion,
	LeetCodeGraphQLResponse,
	QuestionDataResponse,
	QuestionListResponse,
	LeetCodeApiError as LeetCodeApiErrorType,
	ProblemData,
} from "../types";
import { LeetCodeApiError } from "../types";
import { TOP_150_MAP, determineTopicFolder } from "../constants";
import { htmlToMarkdown } from "../utils/parser";
import type { LeetTrackSettings } from "../types";

// ─── GraphQL Queries ────────────────────────────────────────────────────────

const QUESTION_DATA_QUERY = `
query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId
    title
    titleSlug
    difficulty
    topicTags { name slug }
  }
}`;

const QUESTION_DATA_WITH_CONTENT_QUERY = `
query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId
    title
    titleSlug
    difficulty
    content
    topicTags { name slug }
  }
}`;

const QUESTION_SEARCH_QUERY = `
query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(
    categorySlug: $categorySlug
    limit: $limit
    skip: $skip
    filters: $filters
  ) {
    totalNum
    data {
      frontendQuestionId
      title
      titleSlug
      difficulty
      topicTags { name slug }
    }
  }
}`;

// ─── API Endpoints ──────────────────────────────────────────────────────────

const ENDPOINTS = {
	com: "https://leetcode.com/graphql",
	cn: "https://leetcode.cn/graphql",
} as const;

const PROBLEM_URL_BASE = {
	com: "https://leetcode.com/problems",
	cn: "https://leetcode.cn/problems",
} as const;

// ─── Retry Configuration ───────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// ─── LeetCode API Client ───────────────────────────────────────────────────

export class LeetCodeClient {
	private endpoint: string;
	private urlBase: string;

	constructor(useCN: boolean = false) {
		const region = useCN ? "cn" : "com";
		this.endpoint = ENDPOINTS[region];
		this.urlBase = PROBLEM_URL_BASE[region];
	}

	/**
	 * Executes a GraphQL query with exponential backoff retry.
	 *
	 * Retry strategy:
	 * - 429 / 5xx / network error → exponential backoff (1s → 2s → 4s)
	 * - 4xx (other) / invalid data → fail immediately
	 */
	private async graphql<T>(
		query: string,
		variables: Record<string, unknown>
	): Promise<T> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			try {
				const resp = await requestUrl({
					url: this.endpoint,
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ query, variables }),
				});

				// Check HTTP status (requestUrl throws on non-2xx, but just in case)
				if (resp.status >= 400) {
					const isRetryable = resp.status === 429 || resp.status >= 500;
					if (isRetryable && attempt < MAX_RETRIES) {
						await this.delay(attempt);
						continue;
					}
					throw new LeetCodeApiError(
						`HTTP ${resp.status}`,
						resp.status,
						isRetryable
					);
				}

				// Parse GraphQL response — HTTP 200 doesn't mean success
				const body = resp.json as LeetCodeGraphQLResponse<T>;
				if (body.errors && body.errors.length > 0) {
					const messages = body.errors.map(e => e.message).join("; ");
					throw new LeetCodeApiError(
						`GraphQL error: ${messages}`,
						200,
						false
					);
				}

				if (!body.data) {
					throw new LeetCodeApiError(
						"Empty response from LeetCode API",
						200,
						false
					);
				}

				return body.data;
			} catch (error) {
				lastError = error as Error;

				// Don't retry non-retryable errors
				if (error instanceof LeetCodeApiError && !error.isRetryable) {
					throw error;
				}

				// Retry on network errors and retryable HTTP errors
				if (attempt < MAX_RETRIES) {
					await this.delay(attempt);
					continue;
				}
			}
		}

		throw lastError ?? new LeetCodeApiError("Unknown error", undefined, false);
	}

	private async delay(attempt: number): Promise<void> {
		const ms = BASE_DELAY_MS * Math.pow(2, attempt);
		await new Promise(resolve => setTimeout(resolve, ms));
	}

	// ─── Public Methods ───────────────────────────────────────────────────

	/**
	 * Fetches a problem by its title slug.
	 */
	async fetchBySlug(
		titleSlug: string,
		includeContent: boolean = false
	): Promise<LeetCodeQuestion> {
		const query = includeContent
			? QUESTION_DATA_WITH_CONTENT_QUERY
			: QUESTION_DATA_QUERY;

		const data = await this.graphql<QuestionDataResponse>(query, { titleSlug });

		if (!data.question) {
			throw new LeetCodeApiError(
				`Problem not found: ${titleSlug}`,
				404,
				false
			);
		}

		return data.question;
	}

	/**
	 * Searches for problems by keyword (title, ID, or slug).
	 */
	async search(keyword: string, limit: number = 10): Promise<LeetCodeSearchQuestion[]> {
		const data = await this.graphql<QuestionListResponse>(
			QUESTION_SEARCH_QUERY,
			{
				categorySlug: "",
				skip: 0,
				limit,
				filters: { searchKeywords: keyword },
			}
		);

		return data.problemsetQuestionList?.data ?? [];
	}

	/**
	 * Resolves any user input (URL, ID, slug, title) into a ProblemData object.
	 */
	async resolve(
		input: string,
		settings: LeetTrackSettings
	): Promise<ProblemData> {
		const trimmed = input.trim();
		if (!trimmed) {
			throw new LeetCodeApiError("Please enter a LeetCode URL, Problem ID, or Title.", undefined, false);
		}

		// Try to extract slug from URL
		const urlMatch = trimmed.match(/leetcode\.(?:com|cn)\/problems\/([^/?#]+)/i);
		let titleSlug = urlMatch ? urlMatch[1] : null;

		// If it looks like a slug (lowercase with hyphens, not a number)
		if (!titleSlug && /^[a-z0-9-]+$/i.test(trimmed) && !/^\d+$/.test(trimmed)) {
			titleSlug = trimmed.toLowerCase();
		}

		let question: LeetCodeQuestion | null = null;

		if (titleSlug) {
			question = await this.fetchBySlug(titleSlug, settings.includeDescription);
		} else {
			// Search by keyword (ID or title)
			const results = await this.search(trimmed);
			if (results.length === 0) {
				throw new LeetCodeApiError(
					`No problem found matching: "${trimmed}"`,
					404,
					false
				);
			}

			// Try exact ID match first
			let matched: LeetCodeSearchQuestion | null = null;
			if (/^\d+$/.test(trimmed)) {
				matched = results.find(q => q.frontendQuestionId === trimmed) ?? null;
			}

			// Try exact title/slug match, then fall back to first result
			if (!matched) {
				matched = results.find(
					q =>
						q.title.toLowerCase() === trimmed.toLowerCase() ||
						q.titleSlug === trimmed.toLowerCase()
				) ?? results[0] ?? null;
			}

			if (!matched) {
				throw new LeetCodeApiError(
					`No problem found matching: "${trimmed}"`,
					404,
					false
				);
			}

			// If we need the description, re-fetch by slug
			if (settings.includeDescription) {
				question = await this.fetchBySlug(matched.titleSlug, true);
			} else {
				// Convert SearchQuestion to Question shape
				question = {
					questionFrontendId: matched.frontendQuestionId,
					title: matched.title,
					titleSlug: matched.titleSlug,
					difficulty: matched.difficulty,
					topicTags: matched.topicTags,
				};
			}
		}

		return this.toProblemData(question, settings);
	}

	// ─── Private Helpers ──────────────────────────────────────────────────

	private toProblemData(
		q: LeetCodeQuestion,
		settings: LeetTrackSettings
	): ProblemData {
		const id = q.questionFrontendId;
		const numId = parseInt(id, 10);
		const isInterview150 = Boolean(TOP_150_MAP[numId]);

		const rawTags = q.topicTags.map(t =>
			t.slug || t.name.toLowerCase().replace(/\s+/g, "-")
		);

		const tags: string[] = [];
		if (isInterview150) tags.push("leetcode-interview-150");
		for (const t of rawTags) {
			if (!tags.includes(t)) tags.push(t);
		}

		const topicFolder = determineTopicFolder(id, tags, settings.customTopicMappings);

		let description: string | undefined;
		if (q.content && settings.includeDescription) {
			description = htmlToMarkdown(q.content);
		}

		return {
			id,
			title: q.title,
			slug: q.titleSlug,
			difficulty: q.difficulty,
			tags,
			isInterview150,
			topicFolder,
			description,
		};
	}

	/**
	 * Returns the full URL for a problem on the configured LeetCode domain.
	 */
	problemUrl(slug: string): string {
		return `${this.urlBase}/${slug}/`;
	}
}
