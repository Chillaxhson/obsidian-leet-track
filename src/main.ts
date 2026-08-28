import { Plugin, TFile, Notice } from "obsidian";
import type { LeetTrackSettings, Mastery } from "./types";
import { LeetCodeClient } from "./api/leetcode";
import { ProblemService } from "./services/problem-service";
import { ReviewService } from "./services/review-service";
import { DashboardService } from "./services/dashboard-service";
import { LeetTrackSettingTab, DEFAULT_SETTINGS, migrateSettings } from "./settings";
import { InputModal } from "./modals/input-modal";
import { BatchImportModal } from "./modals/batch-import-modal";
import { UpdateMasteryModal, DueReviewsModal } from "./modals/review-modal";

export default class LeetTrackPlugin extends Plugin {
	settings!: LeetTrackSettings;

	private client!: LeetCodeClient;
	private problemService!: ProblemService;
	private reviewService!: ReviewService;
	private dashboardService!: DashboardService;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.client = new LeetCodeClient(this.settings.useLeetCodeCN);

		this.problemService = new ProblemService(
			this.app,
			() => this.settings,
			() => this.saveSettings()
		);

		this.reviewService = new ReviewService(
			this.app,
			() => this.settings,
			() => this.saveSettings(),
			() => this.problemService.getLeetCodeFolder()
		);

		this.dashboardService = new DashboardService(
			this.app,
			() => this.settings,
			this.reviewService,
			() => this.problemService.getLeetCodeFolder()
		);

		// ── Ribbon Icon ──────────────────────────────────────────────────

		this.addRibbonIcon("code-2", "LeetTrack: Create New Problem Note", () => {
			this.openInputModal();
		});

		// ── Commands ─────────────────────────────────────────────────────

		this.addCommand({
			id: "create-problem-note",
			name: "Create new problem note",
			callback: () => {
				this.openInputModal();
			},
		});

		this.addCommand({
			id: "batch-import",
			name: "Batch import problem notes",
			callback: () => {
				this.openBatchImportModal();
			},
		});

		this.addCommand({
			id: "refresh-dashboard",
			name: "Refresh hub dashboard",
			callback: async () => {
				await this.dashboardService.refreshDashboard();
				new Notice("✅ LeetTrack Hub Dashboard refreshed!");
			},
		});

		this.addCommand({
			id: "update-mastery",
			name: "Update problem mastery",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;

				// Only show command if the active file is in the LeetCode folder
				const leetFolder = this.problemService.getLeetCodeFolder();
				if (!file.path.startsWith(leetFolder)) return false;

				if (!checking) {
					this.openUpdateMasteryModal(file);
				}
				return true;
			},
		});

		this.addCommand({
			id: "show-due-reviews",
			name: "Show problems due for review",
			callback: () => {
				this.openDueReviewsModal();
			},
		});

		// ── Settings Tab ─────────────────────────────────────────────────

		this.addSettingTab(new LeetTrackSettingTab(this.app, this));
	}

	// ─── Settings Lifecycle ─────────────────────────────────────────────

	async loadSettings(): Promise<void> {
		const loaded = (await this.loadData()) ?? {};
		this.settings = migrateSettings(loaded);

		// Save migrated settings if version was bumped
		if (!loaded.settingsVersion || loaded.settingsVersion < this.settings.settingsVersion) {
			await this.saveSettings();
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);

		// Recreate client if CN setting changed
		this.client = new LeetCodeClient(this.settings.useLeetCodeCN);
	}

	// ─── Modal Openers ──────────────────────────────────────────────────

	private openInputModal(): void {
		new InputModal(this.app, async (input, mastery) => {
			const problemData = await this.client.resolve(input, this.settings);
			await this.problemService.createProblemNote(problemData, mastery ?? undefined);

			if (this.settings.autoRefreshHub) {
				await this.dashboardService.refreshDashboard();
			}
		}).open();
	}

	private openBatchImportModal(): void {
		new BatchImportModal(
			this.app,
			this.settings,
			this.client,
			this.problemService
		).open();
	}

	private openUpdateMasteryModal(file: TFile): void {
		new UpdateMasteryModal(
			this.app,
			file,
			this.reviewService,
			async () => {
				if (this.settings.autoRefreshHub) {
					await this.dashboardService.refreshDashboard();
				}
			}
		).open();
	}

	private openDueReviewsModal(): void {
		new DueReviewsModal(
			this.app,
			this.reviewService,
			async () => {
				await this.dashboardService.refreshDashboard();
			}
		).open();
	}
}
