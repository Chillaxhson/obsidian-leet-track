import { App, TFile, TFolder, normalizePath, Notice } from "obsidian";
import type { LeetTrackSettings, Mastery, DashboardProblem } from "../types";
import { MASTERY_DISPLAY } from "../settings";
import { todayString, calculateNextReviewDate, isReviewDue } from "../utils/date";

/**
 * Manages the mastery lifecycle: updating mastery, scheduling reviews,
 * and finding problems due for review.
 */
export class ReviewService {
	constructor(
		private app: App,
		private getSettings: () => LeetTrackSettings,
		private saveSettings: () => Promise<void>,
		private getLeetCodeFolder: () => string
	) {}

	// ─── Mastery Update ─────────────────────────────────────────────────

	/**
	 * Updates the mastery level for the currently active note.
	 * Also sets solved-date (if first time), recalculates review-date,
	 * and increments review-count.
	 */
	async updateMastery(file: TFile, newMastery: Mastery): Promise<void> {
		const settings = this.getSettings();

		await this.app.fileManager.processFrontMatter(file, (fm) => {
			const oldMastery = fm.mastery;

			fm.mastery = newMastery;

			// Set solved-date on first mastery update (indicates actual solving)
			if (!fm["solved-date"]) {
				fm["solved-date"] = todayString();
			}

			// Update review scheduling
			fm["review-date"] = calculateNextReviewDate(newMastery, settings.reviewIntervals);
			fm["review-count"] = (fm["review-count"] || 0) + 1;
		});

		const display = MASTERY_DISPLAY[newMastery];
		const interval = settings.reviewIntervals[newMastery];
		new Notice(`✅ ${file.basename} → ${display} (review in ${interval} days)`);
	}

	// ─── Due Reviews ────────────────────────────────────────────────────

	/**
	 * Scans all problem notes and returns those with a review-date
	 * that is today or in the past, sorted by most overdue first.
	 */
	async getDueProblems(): Promise<DashboardProblem[]> {
		const problems = await this.scanAllProblems();

		return problems
			.filter(p => p.reviewDate && isReviewDue(p.reviewDate))
			.sort((a, b) => {
				// Most overdue first
				if (!a.reviewDate || !b.reviewDate) return 0;
				return a.reviewDate.localeCompare(b.reviewDate);
			});
	}

	// ─── Problem Scanning ───────────────────────────────────────────────

	/**
	 * Scans all markdown files in the Problems folder and extracts
	 * frontmatter data into DashboardProblem objects.
	 */
	async scanAllProblems(): Promise<DashboardProblem[]> {
		const rootFolder = this.getLeetCodeFolder();
		const problemsFolderPath = normalizePath(`${rootFolder}/Problems`);
		const problemsFolder = this.app.vault.getAbstractFileByPath(problemsFolderPath);

		if (!problemsFolder || !(problemsFolder instanceof TFolder)) {
			return [];
		}

		const files: TFile[] = [];
		this.collectMarkdownFiles(problemsFolder, files);

		const problems: DashboardProblem[] = [];

		for (const file of files) {
			const problem = await this.extractProblemData(file);
			if (problem) {
				problems.push(problem);
			}
		}

		return problems.sort((a, b) => a.num - b.num);
	}

	private collectMarkdownFiles(folder: TFolder, result: TFile[]): void {
		for (const child of folder.children) {
			if (child instanceof TFolder) {
				this.collectMarkdownFiles(child, result);
			} else if (child instanceof TFile && child.extension === "md") {
				result.push(child);
			}
		}
	}

	private async extractProblemData(file: TFile): Promise<DashboardProblem | null> {
		const cache = this.app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;

		// Extract mastery — support both new 'mastery' field and legacy 'status' field
		let mastery: Mastery = "red";
		if (fm) {
			if (fm.mastery) {
				const m = String(fm.mastery).toLowerCase();
				if (m === "red" || m === "yellow" || m === "green") {
					mastery = m;
				}
			} else if (fm.status) {
				// Legacy migration: parse emoji status
				const status = String(fm.status).toLowerCase();
				if (status.includes("green") || status.includes("🟢")) mastery = "green";
				else if (status.includes("yellow") || status.includes("🟡")) mastery = "yellow";
				else mastery = "red";
			}
		}

		// Extract tags
		let tags: string[] = [];
		if (fm) {
			if (Array.isArray(fm.tags)) {
				tags = fm.tags.map((t: unknown) => String(t).trim());
			} else if (typeof fm.tags === "string") {
				tags = fm.tags.split(",").map((t: string) => t.trim());
			}
		}

		// Extract difficulty
		let difficulty = "Medium";
		if (fm?.difficulty) {
			difficulty = String(fm.difficulty).trim();
		}

		// Extract problem number from filename
		const numMatch = file.name.match(/^(\d+)/);
		const num = numMatch ? parseInt(numMatch[1]!, 10) : 99999;

		const folderName = file.parent ? file.parent.name : "Problems";

		return {
			num,
			name: file.basename,
			path: file.path,
			folderName,
			difficulty,
			mastery,
			tags,
			createdDate: fm?.["created-date"] ? String(fm["created-date"]) : undefined,
			solvedDate: fm?.["solved-date"] ? String(fm["solved-date"]) : undefined,
			reviewDate: fm?.["review-date"] ? String(fm["review-date"]) : undefined,
			reviewCount: fm?.["review-count"] ? Number(fm["review-count"]) : 0,
		};
	}
}
