import { App, normalizePath, TFile } from "obsidian";
import type { LeetTrackSettings, DashboardProblem, Mastery } from "../types";
import { ReviewService } from "./review-service";
import { MASTERY_DISPLAY } from "../settings";
import { isReviewDue, daysOverdue, calculateStreak, todayString, parseDate } from "../utils/date";

/**
 * Generates and updates the Hub Dashboard markdown file.
 */
export class DashboardService {
	constructor(
		private app: App,
		private getSettings: () => LeetTrackSettings,
		private reviewService: ReviewService,
		private getLeetCodeFolder: () => string
	) {}

	/**
	 * Regenerates the entire hub dashboard from the current vault state.
	 */
	async refreshDashboard(): Promise<void> {
		const settings = this.getSettings();
		const rootFolder = this.getLeetCodeFolder();
		const problems = await this.reviewService.scanAllProblems();

		const markdown = this.generateDashboard(problems);

		const hubFileName = settings.dashboardFileName || "00 - LeetCode Hub.md";
		const hubPath = normalizePath(`${rootFolder}/${hubFileName}`);
		const hubFile = this.app.vault.getAbstractFileByPath(hubPath);

		if (hubFile instanceof TFile) {
			await this.app.vault.modify(hubFile, markdown);
		} else {
			// Ensure parent folder exists
			const parts = hubPath.split("/");
			parts.pop();
			if (parts.length > 0) {
				const parentPath = parts.join("/");
				const parentExists = this.app.vault.getAbstractFileByPath(parentPath);
				if (!parentExists) {
					await this.app.vault.createFolder(parentPath);
				}
			}
			await this.app.vault.create(hubPath, markdown);
		}
	}

	// ─── Dashboard Generation ───────────────────────────────────────────

	private generateDashboard(problems: DashboardProblem[]): string {
		const sections: string[] = [];

		sections.push(this.generateHeader());
		sections.push(this.generateDueForReview(problems));
		sections.push(this.generateProgressOverview(problems));
		sections.push(this.generateStatistics(problems));
		sections.push(this.generateReviewQueue(problems));
		sections.push(this.generateMasteredProblems(problems));
		sections.push(this.generateTopicBreakdown(problems));
		sections.push(this.generateFooter());

		return sections.join("\n");
	}

	private generateHeader(): string {
		return `# 🧩 LeetCode Mastery Hub

> [!TIP] **Spaced Repetition Review System**
> - 🟢 **Green**: Solved quickly with clear understanding → Minimal review needed.
> - 🟡 **Yellow**: Understood the pattern but implementation stumbled → Review in a few days.
> - 🔴 **Red**: Missed the pattern or forgot logic → Frequent review + practice similar problems.

---
`;
	}

	private generateDueForReview(problems: DashboardProblem[]): string {
		const today = todayString();
		const due = problems.filter(p => p.reviewDate && isReviewDue(p.reviewDate));

		if (due.length === 0) {
			return `## 📅 Due for Review

> ✅ No problems due for review today! Keep up the great work.

---
`;
		}

		// Sort by most overdue first
		due.sort((a, b) => (a.reviewDate ?? "").localeCompare(b.reviewDate ?? ""));

		let md = `## 📅 Due for Review (${due.length} problems)

> High priority — these problems need your attention:

| # | Problem | Mastery | Due Since | Days Overdue |
|---|---|:---:|:---:|:---:|
`;

		for (const p of due) {
			const overdue = p.reviewDate ? daysOverdue(p.reviewDate) : 0;
			const masteryIcon = MASTERY_DISPLAY[p.mastery];
			md += `| ${p.num} | [[${p.name}]] | ${masteryIcon} | ${p.reviewDate ?? "—"} | ${overdue} |\n`;
		}

		md += "\n---\n";
		return md;
	}

	private generateProgressOverview(problems: DashboardProblem[]): string {
		const total = problems.length;
		const red = problems.filter(p => p.mastery === "red");
		const yellow = problems.filter(p => p.mastery === "yellow");
		const green = problems.filter(p => p.mastery === "green");

		const pct = (n: number) => total > 0 ? ((n / total) * 100).toFixed(1) : "0.0";

		return `## 📊 Progress Overview

| Review Status | Count | Percentage | Action Plan |
|---|:---:|:---:|---|
| 🔴 **Red (Review Needed)** | ${red.length} | ${pct(red.length)}% | Re-solve problems, analyze core patterns |
| 🟡 **Yellow (Reinforce Code)** | ${yellow.length} | ${pct(yellow.length)}% | Review in 3-5 days to promote to Green |
| 🟢 **Green (Mastered)** | ${green.length} | ${pct(green.length)}% | Maintain momentum, continue solving |
| **Total Problems** | **${total}** | **100%** | Expand roadmap mastery |

---
`;
	}

	private generateStatistics(problems: DashboardProblem[]): string {
		// Collect solved dates for streak calculation
		const solvedDates = problems
			.map(p => p.solvedDate)
			.filter((d): d is string => d !== undefined && d !== null);

		const streak = calculateStreak(solvedDates);

		// Count solved (has solved-date)
		const totalSolved = solvedDates.length;

		// This week / this month
		const today = new Date();
		const weekAgo = new Date(today);
		weekAgo.setDate(weekAgo.getDate() - 7);
		const monthAgo = new Date(today);
		monthAgo.setMonth(monthAgo.getMonth() - 1);

		const solvedThisWeek = solvedDates.filter(d => {
			const date = parseDate(d);
			return date && date >= weekAgo;
		}).length;

		const solvedThisMonth = solvedDates.filter(d => {
			const date = parseDate(d);
			return date && date >= monthAgo;
		}).length;

		// Difficulty distribution
		const easy = problems.filter(p => p.difficulty === "Easy").length;
		const medium = problems.filter(p => p.difficulty === "Medium").length;
		const hard = problems.filter(p => p.difficulty === "Hard").length;
		const total = problems.length || 1; // avoid division by zero

		const bar = (count: number, max: number) => {
			const filled = Math.round((count / max) * 16);
			return "█".repeat(filled) + "░".repeat(16 - filled);
		};

		return `## 📈 Statistics

| Metric | Value |
|---|---|
| Study Streak | ${streak > 0 ? `🔥 ${streak} days` : "—"} |
| Solved This Week | ${solvedThisWeek} |
| Solved This Month | ${solvedThisMonth} |
| Total Solved | ${totalSolved} |

### Difficulty Distribution
\`\`\`
Easy   ${bar(easy, total)} ${easy} (${((easy / total) * 100).toFixed(0)}%)
Medium ${bar(medium, total)} ${medium} (${((medium / total) * 100).toFixed(0)}%)
Hard   ${bar(hard, total)} ${hard} (${((hard / total) * 100).toFixed(0)}%)
\`\`\`

---
`;
	}

	private generateReviewQueue(problems: DashboardProblem[]): string {
		const reviewQueue = problems.filter(
			p => p.mastery === "red" || p.mastery === "yellow"
		);

		if (reviewQueue.length === 0) {
			return `## 🔴 Review Queue

> All problems mastered! 🎉

---
`;
		}

		let md = `## 🔴 Review Queue

> Problems requiring revision and reinforcement:

| # | Problem | Difficulty | Mastery | Pattern / Tags |
|---|---|:---:|:---:|---|
`;

		for (const p of reviewQueue) {
			const tagDisplay = p.tags
				.filter(t => t !== "leetcode-interview-150")
				.slice(0, 4)
				.join(", ");
			const masteryIcon = MASTERY_DISPLAY[p.mastery];
			md += `| ${p.num} | [[${p.name}]] | \`${p.difficulty}\` | ${masteryIcon} | \`${tagDisplay}\` |\n`;
		}

		md += "\n---\n";
		return md;
	}

	private generateMasteredProblems(problems: DashboardProblem[]): string {
		const mastered = problems.filter(p => p.mastery === "green");

		if (mastered.length === 0) {
			return `## 🟢 Mastered Problems

> No mastered problems yet. Keep practicing!

---
`;
		}

		let md = `## 🟢 Mastered Problems

> Completed problems with full mastery:

`;

		for (const p of mastered) {
			const tagDisplay = p.tags
				.filter(t => t !== "leetcode-interview-150")
				.slice(0, 3)
				.join(", ");
			md += `- [[${p.name}]] (\`${p.difficulty}\` - \`${tagDisplay}\`)\n`;
		}

		md += "\n---\n";
		return md;
	}

	private generateTopicBreakdown(problems: DashboardProblem[]): string {
		const topicsMap: Record<string, DashboardProblem[]> = {};

		for (const p of problems) {
			if (!topicsMap[p.folderName]) {
				topicsMap[p.folderName] = [];
			}
			topicsMap[p.folderName]!.push(p);
		}

		let md = `## 📂 Topic Breakdown

`;

		const sortedTopics = Object.keys(topicsMap).sort();
		for (const topic of sortedTopics) {
			const items = topicsMap[topic] ?? [];
			md += `### ${topic} (${items.length} problems)\n`;

			for (const p of items) {
				const icon = MASTERY_DISPLAY[p.mastery].charAt(0); // Just the emoji
				md += `- ${icon} [[${p.name}]]\n`;
			}
			md += "\n";
		}

		md += "---\n";
		return md;
	}

	private generateFooter(): string {
		return `
*Dashboard auto-generated by [Obsidian LeetTrack](https://github.com/Chillaxhson/obsidian-leet-track)*
`;
	}
}
