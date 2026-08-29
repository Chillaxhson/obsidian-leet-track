import { PluginSettingTab, Setting, App, Plugin } from "obsidian";
import type { LeetTrackSettings, Mastery } from "./types";
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
- **Time Complexity**: $\\mathcal{O}()$
- **Space Complexity**: $\\mathcal{O}()$

## 💻 Implementation & Code Notes

\`\`\`

\`\`\`

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
	const settings: LeetTrackSettings = { ...DEFAULT_SETTINGS };

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
	};
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

export interface LeetTrackPluginHost {
	settings: LeetTrackSettings;
	saveSettings(): Promise<void>;
}

// ─── Settings Tab ───────────────────────────────────────────────────────────

export class LeetTrackSettingTab extends PluginSettingTab {
	private pluginHost: LeetTrackPluginHost;

	constructor(app: App, plugin: Plugin & LeetTrackPluginHost) {
		super(app, plugin);
		this.pluginHost = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ── General ──────────────────────────────────────────────────────

		new Setting(containerEl)
			.setName("LeetCode root folder")
			.setDesc("Relative path to your LeetCode notes directory (e.g. LeetCode or 200 - Projects/200.2 - LeetCode)")
			.addText(text => text
				.setPlaceholder("LeetCode")
				.setValue(this.pluginHost.settings.leetcodeFolder)
				.onChange(async (value) => {
					this.pluginHost.settings.leetcodeFolder = value;
					await this.pluginHost.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Dashboard filename")
			.setDesc("Name of the hub dashboard markdown file")
			.addText(text => text
				.setPlaceholder("00 - LeetCode Hub.md")
				.setValue(this.pluginHost.settings.dashboardFileName)
				.onChange(async (value) => {
					this.pluginHost.settings.dashboardFileName = value;
					await this.pluginHost.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Auto-update hub dashboard")
			.setDesc("Automatically refresh the dashboard when a new note is created or mastery is updated")
			.addToggle(toggle => toggle
				.setValue(this.pluginHost.settings.autoRefreshHub)
				.onChange(async (value) => {
					this.pluginHost.settings.autoRefreshHub = value;
					await this.pluginHost.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Include problem description")
			.setDesc("Fetch and include the problem description (converted to Markdown) in the note template")
			.addToggle(toggle => toggle
				.setValue(this.pluginHost.settings.includeDescription)
				.onChange(async (value) => {
					this.pluginHost.settings.includeDescription = value;
					await this.pluginHost.saveSettings();
				}));

		// ── LeetCode Region ─────────────────────────────────────────────

		new Setting(containerEl)
			.setName("LeetCode region")
			.setHeading();

		new Setting(containerEl)
			.setName("Use LeetCode CN")
			.setDesc("Switch API endpoint and generated links to leetcode.cn (for users in China)")
			.addToggle(toggle => toggle
				.setValue(this.pluginHost.settings.useLeetCodeCN)
				.onChange(async (value) => {
					this.pluginHost.settings.useLeetCodeCN = value;
					await this.pluginHost.saveSettings();
				}));

		// ── Default Mastery ─────────────────────────────────────────────

		new Setting(containerEl)
			.setName("Default mastery")
			.setHeading();

		new Setting(containerEl)
			.setName("Default mastery for easy problems")
			.setDesc("Initial mastery level assigned when creating a note for an easy problem")
			.addDropdown(drop => drop
				.addOption("green", MASTERY_LABELS.green)
				.addOption("yellow", MASTERY_LABELS.yellow)
				.addOption("red", MASTERY_LABELS.red)
				.setValue(this.pluginHost.settings.defaultMasteryEasy)
				.onChange(async (value) => {
					this.pluginHost.settings.defaultMasteryEasy = value as Mastery;
					await this.pluginHost.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Default mastery for medium & hard problems")
			.setDesc("Initial mastery level assigned when creating a note for medium or hard problems")
			.addDropdown(drop => drop
				.addOption("red", MASTERY_LABELS.red)
				.addOption("yellow", MASTERY_LABELS.yellow)
				.addOption("green", MASTERY_LABELS.green)
				.setValue(this.pluginHost.settings.defaultMasteryMediumHard)
				.onChange(async (value) => {
					this.pluginHost.settings.defaultMasteryMediumHard = value as Mastery;
					await this.pluginHost.saveSettings();
				}));

		// ── Review Intervals ────────────────────────────────────────────

		new Setting(containerEl)
			.setName("Review intervals")
			.setHeading();

		new Setting(containerEl)
			.setName("Red interval (days)")
			.setDesc("Days until next review when mastery is red")
			.addText(text => text
				.setPlaceholder("1")
				.setValue(String(this.pluginHost.settings.reviewIntervals.red))
				.onChange(async (value) => {
					const num = parseInt(value, 10);
					if (!isNaN(num) && num > 0) {
						this.pluginHost.settings.reviewIntervals.red = num;
						await this.pluginHost.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName("Yellow interval (days)")
			.setDesc("Days until next review when mastery is yellow")
			.addText(text => text
				.setPlaceholder("3")
				.setValue(String(this.pluginHost.settings.reviewIntervals.yellow))
				.onChange(async (value) => {
					const num = parseInt(value, 10);
					if (!isNaN(num) && num > 0) {
						this.pluginHost.settings.reviewIntervals.yellow = num;
						await this.pluginHost.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName("Green interval (days)")
			.setDesc("Days until next review when mastery is green")
			.addText(text => text
				.setPlaceholder("7")
				.setValue(String(this.pluginHost.settings.reviewIntervals.green))
				.onChange(async (value) => {
					const num = parseInt(value, 10);
					if (!isNaN(num) && num > 0) {
						this.pluginHost.settings.reviewIntervals.green = num;
						await this.pluginHost.saveSettings();
					}
				}));

		// ── Custom Topic Mappings ───────────────────────────────────────

		new Setting(containerEl)
			.setName("Custom topic mappings")
			.setDesc("Override which topic folder a LeetCode tag maps to. These take priority over the built-in defaults.")
			.setHeading();

		const mappingsContainer = containerEl.createDiv({ cls: "leet-track-mappings" });
		this.renderMappings(mappingsContainer);
	}

	private renderMappings(container: HTMLElement): void {
		container.empty();

		const mappings = this.pluginHost.settings.customTopicMappings;

		// Existing mappings
		for (const [tag, folder] of Object.entries(mappings)) {
			new Setting(container)
				.setName(tag)
				.setDesc(`→ ${folder}`)
				.addButton(btn => {
					btn.setButtonText("Remove");
					if ("setDestructive" in btn && typeof (btn as { setDestructive?: unknown }).setDestructive === "function") {
						(btn as unknown as { setDestructive: () => void }).setDestructive();
					} else {
						btn.setWarning();
					}
					btn.onClick(async () => {
						delete this.pluginHost.settings.customTopicMappings[tag];
						await this.pluginHost.saveSettings();
						this.renderMappings(container);
					});
				});
		}

		// Add new mapping
		let newTag = "";
		let newFolder = "";

		new Setting(container)
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
						this.pluginHost.settings.customTopicMappings[newTag] = newFolder;
						await this.pluginHost.saveSettings();
						this.renderMappings(container);
					}
				}));
	}
}

