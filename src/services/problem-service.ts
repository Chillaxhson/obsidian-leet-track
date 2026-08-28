import { App, normalizePath, TFile, TFolder, Notice } from "obsidian";
import type { LeetTrackSettings, ProblemData, Mastery } from "../types";
import { LeetCodeClient } from "../api/leetcode";
import { MASTERY_DISPLAY, DEFAULT_TEMPLATE } from "../settings";
import { todayString, calculateNextReviewDate } from "../utils/date";

/**
 * Handles creating problem notes and managing the LeetCode folder structure.
 */
export class ProblemService {
	constructor(
		private app: App,
		private getSettings: () => LeetTrackSettings,
		private saveSettings: () => Promise<void>
	) {}

	// ─── Folder Resolution ──────────────────────────────────────────────

	/**
	 * Returns the resolved root folder path for LeetCode notes.
	 * Handles vault-name prefixes, trailing slashes, and fallback matching.
	 */
	getLeetCodeFolder(): string {
		let folder = (this.getSettings().leetcodeFolder || "").trim();
		folder = folder.replace(/^\/+/, "").replace(/\/+$/, "");

		// Strip vault name prefix if accidentally included
		const vaultName = this.app.vault.getName();
		if (vaultName && folder.startsWith(vaultName + "/")) {
			folder = folder.slice(vaultName.length + 1);
		}

		// Try to find the folder in the vault
		const existing = this.app.vault.getAbstractFileByPath(folder);
		if (!existing) {
			// Fallback: search for a folder named "LeetCode" anywhere
			const allFiles = this.app.vault.getAllLoadedFiles();
			const match = allFiles.find(
				f => f instanceof TFolder && f.name === "LeetCode"
			);
			if (match) {
				folder = match.path;
			}
		}

		return normalizePath(folder || "LeetCode");
	}

	// ─── Note Creation ──────────────────────────────────────────────────

	/**
	 * Creates a problem note from fetched problem data.
	 * Returns the created (or existing) file.
	 */
	async createProblemNote(
		problemData: ProblemData,
		customMastery?: Mastery
	): Promise<TFile> {
		const settings = this.getSettings();
		const { id, title, difficulty, tags, topicFolder, slug, description } = problemData;

		const mastery = customMastery ??
			(difficulty === "Easy"
				? settings.defaultMasteryEasy
				: settings.defaultMasteryMediumHard);

		const safeTitle = title.replace(/[\\/:*?"<>|]/g, " ").trim();
		const filename = `${id} - ${safeTitle}.md`;

		const rootFolder = this.getLeetCodeFolder();
		const problemsFolderPath = normalizePath(`${rootFolder}/Problems`);
		const targetFolderPath = normalizePath(`${problemsFolderPath}/${topicFolder}`);
		const targetFilePath = normalizePath(`${targetFolderPath}/${filename}`);

		// Check if note already exists
		const existingFile = this.app.vault.getAbstractFileByPath(targetFilePath);
		if (existingFile instanceof TFile) {
			new Notice(`ℹ️ Note already exists: ${filename}`);
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(existingFile);
			return existingFile;
		}

		// Ensure folder structure exists
		await this.ensureFolderExists(targetFolderPath);

		// Render the template
		const client = new LeetCodeClient(settings.useLeetCodeCN);
		const content = this.renderTemplate(settings.template || DEFAULT_TEMPLATE, {
			id,
			title,
			difficulty,
			mastery,
			tags,
			url: client.problemUrl(slug),
			topicFolder,
			description,
		});

		// Create the file
		const createdFile = await this.app.vault.create(targetFilePath, content);
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(createdFile);

		new Notice(`✨ Created: ${filename} in [${topicFolder}]`);
		return createdFile;
	}

	// ─── Template Rendering ─────────────────────────────────────────────

	private renderTemplate(
		template: string,
		data: {
			id: string;
			title: string;
			difficulty: string;
			mastery: Mastery;
			tags: string[];
			url: string;
			topicFolder: string;
			description?: string;
		}
	): string {
		const tagsLines = data.tags.map(t => `  - ${t}`).join("\n");
		const today = todayString();
		const reviewDate = calculateNextReviewDate(
			data.mastery,
			this.getSettings().reviewIntervals
		);

		let content = template
			.replace(/{{id}}/g, data.id)
			.replace(/{{title}}/g, data.title)
			.replace(/{{difficulty}}/g, data.difficulty)
			.replace(/{{mastery}}/g, data.mastery)
			.replace(/{{status}}/g, MASTERY_DISPLAY[data.mastery]) // backward compat
			.replace(/{{tags}}/g, tagsLines)
			.replace(/{{url}}/g, data.url)
			.replace(/{{topicFolder}}/g, data.topicFolder)
			.replace(/{{created-date}}/g, today)
			.replace(/{{review-date}}/g, reviewDate);

		// Handle conditional description block {{#description}}...{{/description}}
		if (data.description) {
			content = content
				.replace(/{{#description}}/g, "")
				.replace(/{{\/description}}/g, "")
				.replace(/{{description}}/g, data.description);
		} else {
			// Remove the entire conditional block
			content = content.replace(/{{#description}}[\s\S]*?{{\/description}}/g, "");
			content = content.replace(/{{description}}/g, "");
		}

		return content;
	}

	// ─── Folder Utilities ───────────────────────────────────────────────

	async ensureFolderExists(folderPath: string): Promise<void> {
		const parts = folderPath.split("/").filter(p => p.length > 0);
		let current = "";

		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			const existing = this.app.vault.getAbstractFileByPath(current);
			if (!existing) {
				try {
					await this.app.vault.createFolder(current);
				} catch {
					// Folder may have been created by another concurrent operation
				}
			}
		}
	}
}
