import { App, Modal, TFile } from "obsidian";
import type { Mastery, DashboardProblem } from "../types";
import { MASTERY_DISPLAY } from "../settings";
import { ReviewService } from "../services/review-service";
import { daysOverdue } from "../utils/date";

// ─── Update Mastery Modal ───────────────────────────────────────────────────

/**
 * A modal that lets the user set mastery level for the active note.
 * Three large buttons: 🔴 Red / 🟡 Yellow / 🟢 Green
 */
export class UpdateMasteryModal extends Modal {
	private file: TFile;
	private reviewService: ReviewService;
	private onComplete: () => Promise<void>;

	constructor(
		app: App,
		file: TFile,
		reviewService: ReviewService,
		onComplete: () => Promise<void>
	) {
		super(app);
		this.file = file;
		this.reviewService = reviewService;
		this.onComplete = onComplete;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("leet-track-modal", "leet-track-mastery-modal");

		contentEl.createEl("h2", {
			text: "🎯 Update Problem Mastery",
			cls: "leet-track-modal-title",
		});

		contentEl.createEl("p", {
			text: this.file.basename,
			cls: "leet-track-modal-desc leet-track-mastery-filename",
		});

		contentEl.createEl("p", {
			text: "How well did you solve this problem?",
			cls: "leet-track-modal-desc",
		});

		const btnContainer = contentEl.createDiv({ cls: "leet-track-mastery-buttons" });

		this.createMasteryButton(btnContainer, "red", "🔴 Red", "Missed pattern / forgot logic → review tomorrow");
		this.createMasteryButton(btnContainer, "yellow", "🟡 Yellow", "Understood pattern but stumbled → review in a few days");
		this.createMasteryButton(btnContainer, "green", "🟢 Green", "Solved quickly with clarity → review next week");
	}

	private createMasteryButton(
		container: HTMLElement,
		mastery: Mastery,
		label: string,
		description: string
	): void {
		const btn = container.createDiv({ cls: `leet-track-mastery-btn leet-track-mastery-${mastery}` });
		btn.createEl("span", { text: label, cls: "leet-track-mastery-btn-label" });
		btn.createEl("span", { text: description, cls: "leet-track-mastery-btn-desc" });

		btn.addEventListener("click", async () => {
			await this.reviewService.updateMastery(this.file, mastery);
			await this.onComplete();
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

// ─── Due Reviews Modal ──────────────────────────────────────────────────────

/**
 * Shows a list of problems due for review, sorted by urgency.
 * Each item can be clicked to open the note or quick-update mastery.
 */
export class DueReviewsModal extends Modal {
	private reviewService: ReviewService;
	private onRefreshDashboard: () => Promise<void>;

	constructor(
		app: App,
		reviewService: ReviewService,
		onRefreshDashboard: () => Promise<void>
	) {
		super(app);
		this.reviewService = reviewService;
		this.onRefreshDashboard = onRefreshDashboard;
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("leet-track-modal", "leet-track-due-modal");

		contentEl.createEl("h2", {
			text: "📅 Problems Due for Review",
			cls: "leet-track-modal-title",
		});

		const loadingEl = contentEl.createDiv({ cls: "leet-track-info-msg" });
		loadingEl.setText("Scanning vault...");

		const dueProblems = await this.reviewService.getDueProblems();

		loadingEl.remove();

		if (dueProblems.length === 0) {
			contentEl.createEl("p", {
				text: "✅ No problems due for review! Great work!",
				cls: "leet-track-modal-desc",
			});
			return;
		}

		contentEl.createEl("p", {
			text: `${dueProblems.length} problem${dueProblems.length > 1 ? "s" : ""} due for review:`,
			cls: "leet-track-modal-desc",
		});

		const listEl = contentEl.createDiv({ cls: "leet-track-due-list" });

		for (const problem of dueProblems) {
			const overdue = problem.reviewDate ? daysOverdue(problem.reviewDate) : 0;
			const itemEl = listEl.createDiv({ cls: `leet-track-due-item leet-track-mastery-${problem.mastery}` });

			// Problem info
			const infoEl = itemEl.createDiv({ cls: "leet-track-due-item-info" });
			infoEl.createEl("span", {
				text: `${MASTERY_DISPLAY[problem.mastery]} #${problem.num} — ${problem.name}`,
				cls: "leet-track-due-item-name",
			});
			infoEl.createEl("span", {
				text: `${overdue} day${overdue !== 1 ? "s" : ""} overdue`,
				cls: "leet-track-due-item-overdue",
			});

			// Open button
			const openBtn = itemEl.createEl("button", {
				text: "Open",
				cls: "leet-track-due-item-btn",
			});
			openBtn.addEventListener("click", () => {
				const file = this.app.vault.getAbstractFileByPath(problem.path);
				if (file instanceof TFile) {
					const leaf = this.app.workspace.getLeaf(false);
					leaf.openFile(file);
					this.close();
				}
			});

			// Quick mastery buttons
			const masteryBtns = itemEl.createDiv({ cls: "leet-track-due-item-mastery" });

			// ✅ Mark reviewed (keep current mastery, bump review date)
			const reviewedBtn = masteryBtns.createEl("button", {
				text: "✅",
				cls: "leet-track-due-mastery-btn leet-track-mastery-reviewed",
				attr: { title: "Mark as reviewed (keep current mastery)" },
			});
			reviewedBtn.addEventListener("click", async () => {
				const file = this.app.vault.getAbstractFileByPath(problem.path);
				if (file instanceof TFile) {
					await this.reviewService.markReviewed(file);
					itemEl.remove();
					await this.onRefreshDashboard();
				}
			});

			for (const m of ["red", "yellow", "green"] as Mastery[]) {
				const btn = masteryBtns.createEl("button", {
					text: [...MASTERY_DISPLAY[m]][0], // Just the emoji
					cls: `leet-track-due-mastery-btn leet-track-mastery-${m}`,
					attr: { title: `Set to ${MASTERY_DISPLAY[m]}` },
				});
				btn.addEventListener("click", async () => {
					const file = this.app.vault.getAbstractFileByPath(problem.path);
					if (file instanceof TFile) {
						await this.reviewService.updateMastery(file, m);
						// Remove the item from the list
						itemEl.remove();
						// Refresh dashboard
						await this.onRefreshDashboard();
					}
				});
			}
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
