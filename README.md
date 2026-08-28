# Obsidian LeetTrack

Create organized LeetCode problem notes with auto-fetched metadata, smart topic categorization, and spaced repetition review tracking — all inside your Obsidian vault.

![Obsidian](https://img.shields.io/badge/Obsidian-%23483699.svg?logo=obsidian&logoColor=white)
![License](https://img.shields.io/github/license/Chillaxhson/obsidian-leet-track)
![GitHub release](https://img.shields.io/github/v/release/Chillaxhson/obsidian-leet-track)

---

## Features

### One-Click Problem Note Creation

Enter a LeetCode URL, Problem ID, or title slug — the plugin fetches all metadata (title, difficulty, topic tags) from the LeetCode GraphQL API and creates a fully structured note.

**Accepts any input format:**
- Full URL: `https://leetcode.com/problems/trapping-rain-water/`
- Problem ID: `42`
- Title slug: `two-sum`, `3Sum`

### Smart Topic Categorization

Notes are automatically filed into topic folders matching the **LeetCode Top Interview 150** roadmap:

| Folder | Topics |
|---|---|
| `01 - Array & String` | Arrays, strings, in-place operations |
| `02 - Two Pointers` | Two-pointer techniques |
| `03 - Sliding Window` | Window-based problems |
| `04 - Matrix` | 2D grid problems |
| `05 - Hashmap` | Hash table lookups |
| `06 - Linked List` | Singly/doubly linked lists |
| `07 - Stack` | Stack, monotonic stack |
| `08 - Intervals` | Interval merging/insertion |
| `09 - Binary Tree` | Tree traversal, BST |
| `10 - Graph` | BFS, DFS, graph theory |
| `11 - Trie & Search` | Trie data structure |
| `12 - Backtracking` | Combinatorial search |
| `13 - Binary Search` | Search algorithms |
| `14 - Heap` | Priority queue problems |
| `15 - Dynamic Programming` | DP, memoization |
| `16 - Math & Bit` | Math tricks, bit manipulation |

Problems not in the Top 150 are categorized by their LeetCode tags. You can also define **custom topic mappings** in settings.

### Mastery & Spaced Repetition System

Track your learning progress with a three-level mastery system:

| Mastery | Meaning | Default Review Interval |
|---|---|---|
| 🔴 **Red** | Missed pattern or forgot logic | 1 day |
| 🟡 **Yellow** | Understood pattern but stumbled on code | 3 days |
| 🟢 **Green** | Solved quickly with clear understanding | 7 days |

The plugin manages the full learning lifecycle:

```
Import Problem → Study / Solve → Set Mastery
       ↑                              ↓
  Reschedule  ←  Update Mastery  ←  Review
```

**Review scheduling** is automatic — when you update mastery, the next review date is calculated and stored in the note's frontmatter. The **"Show Problems Due for Review"** command lists all overdue problems.

### Batch Import

Import multiple problems at once. Paste a list of IDs, URLs, or slugs — one per line — and the plugin creates all notes with progress tracking and a summary showing imported/skipped/failed counts.

### Auto-Updating Hub Dashboard

A living `00 - LeetCode Hub.md` dashboard with:
- **Due for Review** — problems requiring immediate attention
- **Progress Overview** — mastery distribution (Red/Yellow/Green)
- **Statistics** — study streak, solve counts, difficulty distribution
- **Review Queue** — all Red and Yellow problems
- **Mastered Problems** — your Green list
- **Topic Breakdown** — categorized problem lists

### LeetCode CN Support

Toggle between `leetcode.com` and `leetcode.cn` in settings for users in China.

---

## Installation

### Community Plugins (Recommended)

1. Open **Settings** → **Community plugins** → **Browse**
2. Search for **"LeetTrack"**
3. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Chillaxhson/obsidian-leet-track/releases)
2. Create a folder `<your-vault>/.obsidian/plugins/obsidian-leet-track/`
3. Copy the three files into that folder
4. Restart Obsidian and enable the plugin in **Settings** → **Community plugins**

### BRAT (Beta Testing)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Add beta plugin: `Chillaxhson/obsidian-leet-track`

---

## Usage

### Commands

All commands are accessible via the Command Palette (`Cmd/Ctrl + P`):

| Command | Description |
|---|---|
| **Create new problem note** | Open the input modal to create a single problem note |
| **Batch import problem notes** | Import multiple problems at once |
| **Refresh hub dashboard** | Regenerate the dashboard from current vault state |
| **Update problem mastery** | Set mastery level (Red/Yellow/Green) for the active note |
| **Show problems due for review** | List all problems past their review date |

The ribbon icon (code icon in the left sidebar) opens the **Create new problem note** modal.

### Frontmatter

Each problem note includes structured YAML frontmatter:

```yaml
---
difficulty: Medium
mastery: red
tags:
  - leetcode-interview-150
  - array
  - two-pointers
created-date: 2026-08-28
review-date: 2026-08-29
review-count: 0
---
```

| Field | Description |
|---|---|
| `difficulty` | Easy, Medium, or Hard |
| `mastery` | `red`, `yellow`, or `green` |
| `tags` | LeetCode topic tags + `leetcode-interview-150` if applicable |
| `created-date` | When the note was generated |
| `solved-date` | When you first marked mastery (set automatically) |
| `review-date` | Next scheduled review date |
| `review-count` | Number of times you've reviewed this problem |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| **LeetCode root folder** | `LeetCode` | Relative path to your LeetCode notes directory |
| **Dashboard filename** | `00 - LeetCode Hub.md` | Name of the hub dashboard file |
| **Auto-update hub dashboard** | `true` | Refresh dashboard when notes are created/updated |
| **Include problem description** | `false` | Fetch and embed the problem description (HTML → Markdown) |
| **Use LeetCode CN** | `false` | Switch to `leetcode.cn` API and URLs |
| **Default mastery (Easy)** | `green` | Initial mastery for Easy problems |
| **Default mastery (Med/Hard)** | `red` | Initial mastery for Medium and Hard problems |
| **Red interval** | `1 day` | Days until next review when mastery is Red |
| **Yellow interval** | `3 days` | Days until next review when mastery is Yellow |
| **Green interval** | `7 days` | Days until next review when mastery is Green |
| **Custom topic mappings** | `{}` | Override tag → topic folder mappings |

---

## FAQ

### The LeetCode API request failed

The plugin uses the public LeetCode GraphQL API. If you get rate-limited (HTTP 429), the plugin will automatically retry with exponential backoff (up to 3 retries). If it still fails, wait a few minutes and try again.

### Can I customize the note template?

Yes — the template is stored in the plugin settings (accessible via `data.json` in your vault's plugin folder). Available template variables:

```
{{id}}, {{title}}, {{difficulty}}, {{mastery}}, {{tags}},
{{url}}, {{topicFolder}}, {{created-date}}, {{review-date}},
{{description}}, {{#description}}...{{/description}}
```

### Does it work on mobile?

Yes. The plugin uses only Obsidian's built-in `requestUrl` API (no Node.js/Electron dependencies) and is marked `isDesktopOnly: false`.

### I already have notes from the old LeetCode Helper plugin

The plugin automatically migrates legacy settings and reads both the old `status` field and the new `mastery` field from frontmatter.

---

## Contributing

### Development Setup

```bash
git clone https://github.com/Chillaxhson/obsidian-leet-track.git
cd obsidian-leet-track
npm install
npm run dev    # Watch mode — rebuilds on every save
```

### Building for Production

```bash
npm run build  # Type-check + minified production build
```

### Project Structure

```
src/
├── main.ts              # Plugin entry point
├── types.ts             # All TypeScript interfaces
├── constants.ts         # Top 150 map, topic logic
├── api/
│   └── leetcode.ts      # GraphQL client with retry
├── services/
│   ├── problem-service.ts    # Note creation
│   ├── review-service.ts     # Mastery lifecycle
│   └── dashboard-service.ts  # Hub dashboard
├── modals/
│   ├── input-modal.ts        # Single problem input
│   ├── batch-import-modal.ts # Batch import
│   └── review-modal.ts       # Mastery update
├── settings.ts          # Settings tab + migration
└── utils/
    ├── parser.ts        # HTML → Markdown
    └── date.ts          # Review date calculations
```

---

## License

[MIT](LICENSE) © Chillaxhson
