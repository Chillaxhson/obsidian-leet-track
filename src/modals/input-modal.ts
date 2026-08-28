import { App, Modal, Setting, Notice } from "obsidian";
import type { LeetTrackSettings, Mastery } from "../types";
import { LeetCodeClient } from "../api/leetcode";
import { MASTERY_DISPLAY } from "../settings";

// ─── Single Problem Input Modal ─────────────────────────────────────────────

export class InputModal extends Modal {
	private masteryValue: Mastery | "AUTO" = "AUTO";
	private onSubmit: (input: string, mastery: Mastery | null) => Promise<void>;

	constructor(app: App, onSubmit: (input: string, mastery: Mastery | null) => Promise<void>) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("leet-track-modal");

		contentEl.createEl("h2", {
			text: "🧩 LeetTrack — Create Problem Note",
			cls: "leet-track-modal-title",
		});

		contentEl.createEl("p", {
			text: "Enter a LeetCode URL, Problem ID (e.g. 42), or Title/Slug (e.g. trapping-rain-water, 3Sum):",
			cls: "leet-track-modal-desc",
		});

		// Input field
		const inputContainer = contentEl.createDiv({ cls: "leet-track-input-container" });
		const inputEl = inputContainer.createEl("input", {
			type: "text",
			placeholder: "https://leetcode.com/problems/two-sum/ or 42",
			cls: "leet-track-input",
		});
		inputEl.focus();

		// Mastery selector
		new Setting(contentEl)
			.setName("Initial mastery")
			.setDesc("Auto: Easy → Green, Medium/Hard → Red")
			.addDropdown(drop => {
				drop.addOption("AUTO", "Auto (Easy=🟢 Green, Med/Hard=🔴 Red)");
				drop.addOption("red", MASTERY_DISPLAY.red + " (Needs Review)");
				drop.addOption("yellow", MASTERY_DISPLAY.yellow + " (Stumbled on Code)");
				drop.addOption("green", MASTERY_DISPLAY.green + " (Mastered / Solved Fast)");
				drop.setValue("AUTO");
				drop.onChange(val => {
					this.masteryValue = val as Mastery | "AUTO";
				});
			});

		// Status message
		const infoEl = contentEl.createDiv({ cls: "leet-track-info-msg" });

		// Submit button
		const btnContainer = contentEl.createDiv({ cls: "leet-track-btn-container" });
		const submitBtn = btnContainer.createEl("button", {
			text: "⚡ Create Note",
			cls: "mod-cta leet-track-submit-btn",
		});

		const handleCreate = async () => {
			const val = inputEl.value.trim();
			if (!val) {
				infoEl.setText("⚠️ Please enter a problem URL, ID, or title.");
				infoEl.style.color = "var(--text-error)";
				return;
			}

			submitBtn.disabled = true;
			submitBtn.setText("⏳ Fetching LeetCode data...");
			infoEl.setText("Connecting to LeetCode API...");
			infoEl.style.color = "var(--text-accent)";

			try {
				const mastery = this.masteryValue === "AUTO" ? null : this.masteryValue;
				await this.onSubmit(val, mastery);
				this.close();
			} catch (err) {
				submitBtn.disabled = false;
				submitBtn.setText("⚡ Create Note");
				infoEl.setText(`❌ Error: ${(err as Error).message}`);
				infoEl.style.color = "var(--text-error)";
			}
		};

		submitBtn.addEventListener("click", handleCreate);
		inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				handleCreate();
			}
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
