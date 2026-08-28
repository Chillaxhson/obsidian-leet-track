import { App, Modal, Notice } from "obsidian";
import type { LeetTrackSettings, BatchImportResult, BatchImportSummary } from "../types";
import { LeetCodeClient } from "../api/leetcode";
import { ProblemService } from "../services/problem-service";

const POLITE_DELAY_MS = 300;

// ─── Batch Import Modal ─────────────────────────────────────────────────────

export class BatchImportModal extends Modal {
	private settings: LeetTrackSettings;
	private client: LeetCodeClient;
	private problemService: ProblemService;

	constructor(
		app: App,
		settings: LeetTrackSettings,
		client: LeetCodeClient,
		problemService: ProblemService
	) {
		super(app);
		this.settings = settings;
		this.client = client;
		this.problemService = problemService;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("leet-track-modal", "leet-track-batch-modal");

		contentEl.createEl("h2", {
			text: "📦 LeetTrack — Batch Import",
			cls: "leet-track-modal-title",
		});

		contentEl.createEl("p", {
			text: "Paste problem IDs, URLs, or slugs — one per line:",
			cls: "leet-track-modal-desc",
		});

		// Textarea for batch input
		const textareaEl = contentEl.createEl("textarea", {
			cls: "leet-track-batch-textarea",
			attr: {
				placeholder: "1\ntwo-sum\nhttps://leetcode.com/problems/trapping-rain-water/\n42",
				rows: "8",
			},
		});
		textareaEl.focus();

		// Progress area (hidden initially)
		const progressContainer = contentEl.createDiv({ cls: "leet-track-progress-container" });
		progressContainer.style.display = "none";

		const progressText = progressContainer.createDiv({ cls: "leet-track-progress-text" });
		const progressBarOuter = progressContainer.createDiv({ cls: "leet-track-progress-bar-outer" });
		const progressBarInner = progressBarOuter.createDiv({ cls: "leet-track-progress-bar-inner" });

		// Results area (hidden initially)
		const resultsContainer = contentEl.createDiv({ cls: "leet-track-results-container" });
		resultsContainer.style.display = "none";

		// Buttons
		const btnContainer = contentEl.createDiv({ cls: "leet-track-btn-container" });
		const importBtn = btnContainer.createEl("button", {
			text: "⚡ Import All",
			cls: "mod-cta leet-track-submit-btn",
		});
		const closeBtn = btnContainer.createEl("button", {
			text: "Close",
			cls: "leet-track-cancel-btn",
		});

		closeBtn.addEventListener("click", () => this.close());

		importBtn.addEventListener("click", async () => {
			const raw = textareaEl.value.trim();
			if (!raw) {
				new Notice("⚠️ Please enter at least one problem.");
				return;
			}

			const lines = raw
				.split("\n")
				.map(l => l.trim())
				.filter(l => l.length > 0);

			if (lines.length === 0) {
				new Notice("⚠️ No valid inputs found.");
				return;
			}

			// Switch to progress mode
			importBtn.disabled = true;
			importBtn.setText("⏳ Importing...");
			textareaEl.disabled = true;
			progressContainer.style.display = "block";

			const summary = await this.runBatchImport(
				lines,
				progressText,
				progressBarInner,
				lines.length
			);

			// Show results
			progressContainer.style.display = "none";
			resultsContainer.style.display = "block";
			this.renderResults(resultsContainer, summary);

			importBtn.style.display = "none";
			closeBtn.setText("Done");
			closeBtn.addClass("mod-cta");
		});
	}

	private async runBatchImport(
		inputs: string[],
		progressText: HTMLElement,
		progressBar: HTMLElement,
		total: number
	): Promise<BatchImportSummary> {
		const results: BatchImportResult[] = [];
		let imported = 0;
		let skipped = 0;
		let failed = 0;

		for (let i = 0; i < inputs.length; i++) {
			const input = inputs[i]!;
			progressText.setText(`Processing ${i + 1}/${total}: ${input}`);
			progressBar.style.width = `${((i + 1) / total) * 100}%`;

			try {
				const problemData = await this.client.resolve(input, this.settings);

				// Check if already exists
				const rootFolder = this.problemService.getLeetCodeFolder();
				const safeTitle = problemData.title.replace(/[\\/:*?"<>|]/g, " ").trim();
				const filename = `${problemData.id} - ${safeTitle}.md`;
				const targetPath = `${rootFolder}/Problems/${problemData.topicFolder}/${filename}`;
				const existing = this.app.vault.getAbstractFileByPath(targetPath);

				if (existing) {
					skipped++;
					results.push({
						input,
						status: "skipped",
						problemId: problemData.id,
						problemTitle: problemData.title,
					});
				} else {
					await this.problemService.createProblemNote(problemData);
					imported++;
					results.push({
						input,
						status: "imported",
						problemId: problemData.id,
						problemTitle: problemData.title,
					});
				}
			} catch (err) {
				failed++;
				results.push({
					input,
					status: "failed",
					error: (err as Error).message,
				});
			}

			// Polite delay between requests
			if (i < inputs.length - 1) {
				await new Promise(resolve => setTimeout(resolve, POLITE_DELAY_MS));
			}
		}

		return { total: inputs.length, imported, skipped, failed, results };
	}

	private renderResults(container: HTMLElement, summary: BatchImportSummary): void {
		container.empty();

		// Summary counts
		const summaryEl = container.createDiv({ cls: "leet-track-batch-summary" });
		summaryEl.createEl("p", {
			text: `✅ Imported: ${summary.imported}  |  ⏭️ Skipped: ${summary.skipped}  |  ❌ Failed: ${summary.failed}`,
			cls: "leet-track-batch-summary-text",
		});

		// Detailed results
		if (summary.results.length > 0) {
			const detailsEl = container.createDiv({ cls: "leet-track-batch-details" });

			for (const result of summary.results) {
				const itemEl = detailsEl.createDiv({ cls: `leet-track-batch-item leet-track-batch-${result.status}` });
				const icon = result.status === "imported" ? "✅" : result.status === "skipped" ? "⏭️" : "❌";
				const label = result.problemId
					? `#${result.problemId} — ${result.problemTitle}`
					: result.input;
				const suffix = result.error ? `: ${result.error}` : "";
				itemEl.setText(`${icon} ${label}${suffix}`);
			}
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
