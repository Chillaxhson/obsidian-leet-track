import type { ProblemTopicMap, TagTopicMap, TopicName, Mastery } from "./types";

// ─── Top Interview 150: Problem ID → Topic Folder ───────────────────────────

export const TOP_150_MAP: ProblemTopicMap = {
	// 01 - Array & String
	88: "01 - Array & String", 27: "01 - Array & String", 26: "01 - Array & String",
	80: "01 - Array & String", 169: "01 - Array & String", 189: "01 - Array & String",
	121: "01 - Array & String", 122: "01 - Array & String", 55: "01 - Array & String",
	45: "01 - Array & String", 274: "01 - Array & String", 380: "01 - Array & String",
	238: "01 - Array & String", 134: "01 - Array & String", 13: "01 - Array & String",
	12: "01 - Array & String", 58: "01 - Array & String", 151: "01 - Array & String",
	6: "01 - Array & String", 28: "01 - Array & String", 68: "01 - Array & String",
	// 02 - Two Pointers
	125: "02 - Two Pointers", 392: "02 - Two Pointers", 167: "02 - Two Pointers",
	11: "02 - Two Pointers", 15: "02 - Two Pointers",
	// 03 - Sliding Window
	209: "03 - Sliding Window", 3: "03 - Sliding Window", 30: "03 - Sliding Window",
	76: "03 - Sliding Window",
	// 04 - Matrix
	36: "04 - Matrix", 54: "04 - Matrix", 48: "04 - Matrix", 73: "04 - Matrix",
	289: "04 - Matrix",
	// 05 - Hashmap
	383: "05 - Hashmap", 205: "05 - Hashmap", 290: "05 - Hashmap", 242: "05 - Hashmap",
	49: "05 - Hashmap", 1: "05 - Hashmap", 202: "05 - Hashmap", 219: "05 - Hashmap",
	128: "05 - Hashmap",
	// 06 - Linked List
	141: "06 - Linked List", 2: "06 - Linked List", 21: "06 - Linked List",
	138: "06 - Linked List", 92: "06 - Linked List", 25: "06 - Linked List",
	19: "06 - Linked List", 82: "06 - Linked List", 61: "06 - Linked List",
	86: "06 - Linked List", 146: "06 - Linked List",
	// 07 - Stack
	20: "07 - Stack", 71: "07 - Stack", 155: "07 - Stack", 150: "07 - Stack",
	224: "07 - Stack", 42: "07 - Stack",
	// 08 - Intervals
	228: "08 - Intervals", 56: "08 - Intervals", 57: "08 - Intervals",
	452: "08 - Intervals",
	// 09 - Binary Tree
	104: "09 - Binary Tree", 100: "09 - Binary Tree", 226: "09 - Binary Tree",
	101: "09 - Binary Tree", 105: "09 - Binary Tree", 106: "09 - Binary Tree",
	117: "09 - Binary Tree", 114: "09 - Binary Tree", 112: "09 - Binary Tree",
	129: "09 - Binary Tree", 124: "09 - Binary Tree", 173: "09 - Binary Tree",
	236: "09 - Binary Tree", 222: "09 - Binary Tree", 199: "09 - Binary Tree",
	637: "09 - Binary Tree", 102: "09 - Binary Tree", 103: "09 - Binary Tree",
	530: "09 - Binary Tree", 230: "09 - Binary Tree", 98: "09 - Binary Tree",
	// 10 - Graph
	200: "10 - Graph", 130: "10 - Graph", 133: "10 - Graph", 399: "10 - Graph",
	207: "10 - Graph", 210: "10 - Graph", 909: "10 - Graph", 433: "10 - Graph",
	127: "10 - Graph",
	// 11 - Trie & Search
	208: "11 - Trie & Search", 211: "11 - Trie & Search", 212: "11 - Trie & Search",
	// 12 - Backtracking
	17: "12 - Backtracking", 77: "12 - Backtracking", 46: "12 - Backtracking",
	39: "12 - Backtracking", 52: "12 - Backtracking", 22: "12 - Backtracking",
	// 13 - Binary Search
	35: "13 - Binary Search", 74: "13 - Binary Search", 162: "13 - Binary Search",
	33: "13 - Binary Search", 34: "13 - Binary Search", 153: "13 - Binary Search",
	4: "13 - Binary Search",
	// 14 - Heap
	215: "14 - Heap", 373: "14 - Heap", 295: "14 - Heap", 502: "14 - Heap",
	// 15 - Dynamic Programming
	70: "15 - Dynamic Programming", 198: "15 - Dynamic Programming",
	139: "15 - Dynamic Programming", 322: "15 - Dynamic Programming",
	300: "15 - Dynamic Programming", 120: "15 - Dynamic Programming",
	64: "15 - Dynamic Programming", 63: "15 - Dynamic Programming",
	221: "15 - Dynamic Programming", 5: "15 - Dynamic Programming",
	97: "15 - Dynamic Programming", 72: "15 - Dynamic Programming",
	123: "15 - Dynamic Programming", 188: "15 - Dynamic Programming",
	// 16 - Math & Bit
	67: "16 - Math & Bit", 190: "16 - Math & Bit", 191: "16 - Math & Bit",
	136: "16 - Math & Bit", 137: "16 - Math & Bit", 201: "16 - Math & Bit",
	9: "16 - Math & Bit", 66: "16 - Math & Bit", 172: "16 - Math & Bit",
	69: "16 - Math & Bit", 50: "16 - Math & Bit", 149: "16 - Math & Bit",
	53: "16 - Math & Bit", 918: "16 - Math & Bit", 108: "16 - Math & Bit",
	148: "16 - Math & Bit", 427: "16 - Math & Bit", 23: "16 - Math & Bit",
};

// ─── Built-in Tag → Topic Fallback ──────────────────────────────────────────

export const DEFAULT_TAG_TOPIC_MAP: TagTopicMap = {
	"matrix": "04 - Matrix",
	"linked-list": "06 - Linked List",
	"sliding-window": "03 - Sliding Window",
	"two-pointers": "02 - Two Pointers",
	"stack": "07 - Stack",
	"monotonic-stack": "07 - Stack",
	"bracket-sequences": "07 - Stack",
	"hash-table": "05 - Hashmap",
	"tree": "09 - Binary Tree",
	"binary-tree": "09 - Binary Tree",
	"graph": "10 - Graph",
	"breadth-first-search": "10 - Graph",
	"depth-first-search": "10 - Graph",
	"dynamic-programming": "15 - Dynamic Programming",
	"binary-search": "13 - Binary Search",
	"heap-priority-queue": "14 - Heap",
	"math": "16 - Math & Bit",
	"bit-manipulation": "16 - Math & Bit",
	"trie": "11 - Trie & Search",
	"backtracking": "12 - Backtracking",
	"interval": "08 - Intervals",
};

export const DEFAULT_TOPIC: TopicName = "01 - Array & String";

// ─── Default Review Intervals (days) ────────────────────────────────────────

export const DEFAULT_REVIEW_INTERVALS: Record<Mastery, number> = {
	red: 1,
	yellow: 3,
	green: 7,
};

// ─── Topic Folder Resolution ────────────────────────────────────────────────

/**
 * Determines the topic folder for a problem using a layered resolution:
 * 1. TOP_150_MAP exact match by problem ID
 * 2. Custom user-defined tag → topic mappings
 * 3. Built-in tag → topic fallback
 * 4. Default catch-all ("01 - Array & String")
 */
export function determineTopicFolder(
	id: string,
	tags: string[],
	customMappings: Record<string, TopicName> = {}
): TopicName {
	// Layer 1: Exact problem ID match from Top 150
	const numId = parseInt(id, 10);
	if (TOP_150_MAP[numId]) {
		return TOP_150_MAP[numId];
	}

	const tagList = tags.map(t => t.toLowerCase());

	// Layer 2: Custom user-defined tag mappings
	for (const tag of tagList) {
		if (customMappings[tag]) {
			return customMappings[tag];
		}
	}

	// Layer 3: Built-in tag fallback
	for (const tag of tagList) {
		if (DEFAULT_TAG_TOPIC_MAP[tag]) {
			return DEFAULT_TAG_TOPIC_MAP[tag];
		}
	}

	// Layer 4: Default catch-all
	return DEFAULT_TOPIC;
}
