import { PluginSettingTab, Setting, App, Plugin } from "obsidian";
import type { LeetTrackSettings, Mastery, TagSlug, TopicName } from "./types";
import { DEFAULT_REVIEW_INTERVALS } from "./constants";

// ─── Default Settings ───────────────────────────────────────────────────────

export const DEFAULT_TEMPLATE = `---
difficulty: {{difficulty}}
mastery: {{mastery}}
tags:
{{tags}}
created-date: {{created-date}}
review-date: {{review-date}}
review-count: 0
---

🔗 **LeetCode Link**: [{{title}}]({{url}})
{{#description}}

## 📋 Problem Description

{{description}}
{{/description}}

## 💡 Intuition & Idea


## 🛠️ Approach & Step-by-Step


## 🧠 Complexity Analysis
- **Time Complexity**: $\\\\mathcal{O}()$
- **Space Complexity**: $\\\\mathcal{O}()$

## 💻 Implementation & Code Notes

\\\`\\\`\\\`

\\\`\\\`\\\`

## ⚠️ Edge Cases & Pitfalls
- 
`;

export const DEFAULT_SETTINGS: LeetTrackSettings = {
	settingsVersion: 1,
	leetcodeFolder: "LeetCode",
	autoRefreshHub: true,
	defaultMasteryEasy: "green",
	defaultMasteryMediumHard: "red",
	dashboardFileName: "00 - LeetCode Hub.md",
	template: DEFAULT_TEMPLATE,
	includeDescription: false,
	useLeetCodeCN: false,
	customTopicMappings: {},
	reviewIntervals: { ...DEFAULT_REVIEW_INTERVALS },
};

// ─── Settings Migration ─────────────────────────────────────────────────────

/**
 * Migrates settings from older versions to the current schema.
 * Handles both completely fresh installs and upgrades from the
 * pre-LeetTrack "LeetCode Helper" version.
 */
export function migrateSettings(loaded: Record<string, unknown>): LeetTrackSettings {
	const settings = { ...DEFAULT_SETTINGS };

	// No settingsVersion = legacy "LeetCode Helper" plugin
	if (!loaded.settingsVersion) {
		// Migrate old field names
		if (typeof loaded.leetcodeFolder === "string") {
			settings.leetcodeFolder = loaded.leetcodeFolder;
		}
		if (typeof loaded.autoRefreshHub === "boolean") {
			settings.autoRefreshHub = loaded.autoRefreshHub;
		}
		if (typeof loaded.dashboardFileName === "string") {
			settings.dashboardFileName = loaded.dashboardFileName;
		}
		if (typeof loaded.template === "string") {
			settings.template = loaded.template;
		}

		// Map old status fields to new mastery fields
		if (typeof loaded.defaultStatusEasy === "string") {
			settings.defaultMasteryEasy = statusToMastery(loaded.defaultStatusEasy);
		}
		if (typeof loaded.defaultStatusMediumHard === "string") {
			settings.defaultMasteryMediumHard = statusToMastery(loaded.defaultStatusMediumHard);
		}

		settings.settingsVersion = 1;
		return settings;
	}

	// Version 1 → current: direct assignment with defaults for missing fields
	return {
		...DEFAULT_SETTINGS,
		...loaded,
		settingsVersion: 1,
	} as LeetTrackSettings;
}

/**
 * Converts old status emoji strings to mastery values.
 */
function statusToMastery(status: string): Mastery {
	const lower = status.toLowerCase();
	if (lower.includes("green") || lower.includes("🟢")) return "green";
	if (lower.includes("yellow") || lower.includes("🟡")) return "yellow";
	return "red";
}

// ─── Mastery Display Helpers ────────────────────────────────────────────────

export const MASTERY_DISPLAY: Record<Mastery, string> = {
	red: "🔴 Red",
	yellow: "🟡 Yellow",
	green: "🟢 Green",
};

export const MASTERY_LABELS: Record<Mastery, string> = {
	red: "🔴 Red (Needs Review / Missed Pattern)",
	yellow: "🟡 Yellow (Stumbled on Code)",
	green: "🟢 Green (Mastered / Solved Fast)",
};

// ─── Settings Tab ───────────────────────────────────────────────────────────

export class LeetTrackSettingTab extends PluginSettingTab {
	private plugin: Plugin & {
		settings: LeetTrackSettings;
		saveSettings: () => Promise<void>;
	};

	constructor(
		app: App,
		plugin: Plugin & { settings: LeetTrackSettings; saveSettings: () => Promise<void> }
	) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Obsidian LeetTrack Settings" });

		// ── General ──────────────────────────────────────────────────────

		containerEl.createEl("h3", { text: "General" });

		new Setting(containerEl)
			.setName("LeetCode root folder")
			.setDesc("Relative path to your LeetCode notes directory (e.g. LeetCode or 200 - Projects/200.2 - LeetCode)")
			.addText(text => text
				.setPlaceholder("LeetCode")
				.setValue(this.plugin.settings.leetcodeFolder)
				.onChange(async (value) => {
					this.plugin.settings.leetcodeFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Dashboard filename")
			.setDesc("Name of the hub dashboard markdown file")
			.addText(text => text
				.setPlaceholder("00 - LeetCode Hub.md")
				.setValue(this.plugin.settings.dashboardFileName)
				.onChange(async (value) => {
					this.plugin.settings.dashboardFileName = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Auto-update hub dashboard")
			.setDesc("Automatically refresh the dashboard when a new note is created or mastery is updated")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoRefreshHub)
				.onChange(async (value) => {
					this.plugin.settings.autoRefreshHub = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Include problem description")
			.setDesc("Fetch and include the problem description (converted to Markdown) in the note template")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeDescription)
				.onChange(async (value) => {
					this.plugin.settings.includeDescription = value;
					await this.plugin.saveSettings();
				}));

		// ── LeetCode Region ─────────────────────────────────────────────

		containerEl.createEl("h3", { text: "LeetCode Region" });

		new Setting(containerEl)
			.setName("Use LeetCode CN")
			.setDesc("Switch API endpoint and generated links to leetcode.cn (for users in China)")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useLeetCodeCN)
				.onChange(async (value) => {
					this.plugin.settings.useLeetCodeCN = value;
					await this.plugin.saveSettings();
				}));

		// ── Default Mastery ─────────────────────────────────────────────

		containerEl.createEl("h3", { text: "Default Mastery" });

		new Setting(containerEl)
			.setName("Default mastery for Easy problems")
			.setDesc("Initial mastery level assigned when creating a note for an Easy problem")
			.addDropdown(drop => drop
				.addOption("green", MASTERY_LABELS.green)
				.addOption("yellow", MASTERY_LABELS.yellow)
				.addOption("red", MASTERY_LABELS.red)
				.setValue(this.plugin.settings.defaultMasteryEasy)
				.onChange(async (value) => {
					this.plugin.settings.defaultMasteryEasy = value as Mastery;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Default mastery for Medium & Hard problems")
			.setDesc("Initial mastery level assigned when creating a note for Medium or Hard problems")
			.addDropdown(drop => drop
				.addOption("red", MASTERY_LABELS.red)
				.addOption("yellow", MASTERY_LABELS.yellow)
				.addOption("green", MASTERY_LABELS.green)
				.setValue(this.plugin.settings.defaultMasteryMediumHard)
				.onChange(async (value) => {
					this.plugin.settings.defaultMasteryMediumHard = value as Mastery;
					await this.plugin.saveSettings();
				}));

		// ── Review Intervals ────────────────────────────────────────────

		containerEl.createEl("h3", { text: "Review Intervals" });

		new Setting(containerEl)
			.setName("Red interval (days)")
			.setDesc("Days until next review when mastery is Red")
			.addText(text => text
				.setPlaceholder("1")
				.setValue(String(this.plugin.settings.reviewIntervals.red))
				.onChange(async (value) => {
					const num = parseInt(value, 10);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.reviewIntervals.red = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName("Yellow interval (days)")
			.setDesc("Days until next review when mastery is Yellow")
			.addText(text => text
				.setPlaceholder("3")
				.setValue(String(this.plugin.settings.reviewIntervals.yellow))
				.onChange(async (value) => {
					const num = parseInt(value, 10);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.reviewIntervals.yellow = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName("Green interval (days)")
			.setDesc("Days until next review when mastery is Green")
			.addText(text => text
				.setPlaceholder("7")
				.setValue(String(this.plugin.settings.reviewIntervals.green))
				.onChange(async (value) => {
					const num = parseInt(value, 10);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.reviewIntervals.green = num;
						await this.plugin.saveSettings();
					}
				}));

		// ── Custom Topic Mappings ───────────────────────────────────────

		containerEl.createEl("h3", { text: "Custom Topic Mappings" });
		containerEl.createEl("p", {
			text: "Override which topic folder a LeetCode tag maps to. These take priority over the built-in defaults.",
			cls: "setting-item-description",
		});

		const mappingsContainer = containerEl.createDiv({ cls: "leet-track-mappings" });
		this.renderMappings(mappingsContainer);
	}

	private renderMappings(container: HTMLElement): void {
		container.empty();

		const mappings = this.plugin.settings.customTopicMappings;

		// Existing mappings
		for (const [tag, folder] of Object.entries(mappings)) {
			new Setting(container)
				.setName(tag)
				.setDesc(`→ ${folder}`)
				.addButton(btn => btn
					.setButtonText("Remove")
					.setWarning()
					.onClick(async () => {
						delete this.plugin.settings.customTopicMappings[tag];
						await this.plugin.saveSettings();
						this.renderMappings(container);
					}));
		}

		// Add new mapping
		let newTag = "";
		let newFolder = "";

		const addSetting = new Setting(container)
			.setName("Add new mapping")
			.addText(text => text
				.setPlaceholder("tag-slug (e.g. greedy)")
				.onChange(value => { newTag = value.trim().toLowerCase(); }))
			.addText(text => text
				.setPlaceholder("Folder name (e.g. 17 - Greedy)")
				.onChange(value => { newFolder = value.trim(); }))
			.addButton(btn => btn
				.setButtonText("Add")
				.setCta()
				.onClick(async () => {
					if (newTag && newFolder) {
						this.plugin.settings.customTopicMappings[newTag] = newFolder;
						await this.plugin.saveSettings();
						this.renderMappings(container);
					}
				}));
	}
}
