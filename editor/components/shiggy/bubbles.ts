import { Typography } from "../../ui/style-constants";
// bubbles.ts
//
// Purpose: All dialogue bubble creation, positioning, and z-index management
// - Single-shiggy NPC lines (idle chatter, collision, explore)
// - Pairwise conversation exchanges
// - Group dialogue for 5+ shiggys in proximity

import { SHIGGY_SIZE, type SummonedShiggy } from "./types";

// ─── Line pools ───────────────────────────────────────────────────────────────

export const NPC_LINES: string[] = [
	"ぴょん！",
	"ふわふわ〜",
	"ぷにぷに",
	"しぎぃ",
	"ぴよ〜",
	"ぼよん",
	"にゅるにゅる",
	"きゅるきゅる",
	"わくわく",
	"むにゃむにゃ",
	"ごろごろ",
	"もふもふ",
	"ぷるぷる",
	"びよ〜ん",
	"きらきら",
	"ふにゃふにゃ",
	"ぺこぺこ",
	"ぽよぽよ",
	"にこにこ",
	"むにむに",
];

export const CONVO_EXCHANGES: [string, string][] = [
	["ぴょん！", "ぴょんぴょん！"],
	["ふわふわ〜", "ふわふわふわ〜"],
	["ぷにぷに", "ぷにぷにぷに！"],
	["しぎぃ？", "しぎぃ！！"],
	["ぴよ〜", "ぴよぴよ〜"],
	["ぼよん", "ぼよんぼよん！"],
	["にゅるにゅる", "にゅるにゅるにゅる〜"],
	["きゅるきゅる", "きゅるきゅるきゅる！"],
	["わくわく", "わくわくわく！"],
	["むにゃむにゃ", "むにゃむにゃむにゃ〜"],
	["ごろごろ", "ごろごろごろ〜"],
	["もふもふ", "もふもふもふ！"],
	["ぷるぷる", "ぷるぷるぷる〜"],
	["びよ〜ん", "びよ〜んびよ〜ん！"],
];

export const CONVO_RESPONSES: [string, string][] = [
	["ぴょん！", "ぴょんぴょん！"],
	["ふわふわ〜", "ふわふわふわ〜"],
	["ぷにぷに", "ぷにぷにぷに！"],
	["しぎぃ", "しぎぃしぎぃ！"],
	["ぴよ〜", "ぴよぴよ〜"],
	["ぼよん", "ぼよんぼよん！"],
	["にゅるにゅる", "にゅるにゅるにゅる〜"],
	["きゅるきゅる", "きゅるきゅるきゅる！"],
];

export const GROUP_LINES: string[] = [
	"ぴょんぴょんぴょん！！！",
	"ふわふわふわ〜〜〜〜〜",
	"ぷにぷにぷにぷに！！",
	"しぎぃしぎぃしぎぃ！！！",
	"ぴよぴよぴよ〜〜〜〜〜",
	"ぼよんぼよんぼよん！！！",
	"にゅるにゅるにゅるにゅる〜〜〜〜〜",
	"きゅるきゅるきゅるきゅる！！！",
	"わくわくわくわく〜〜〜〜〜",
	"むにゃむにゃむにゃむにゃ！！！",
	"ごろごろごろごろ〜〜〜〜〜",
	"もふもふもふもふ！！！",
	"ぷるぷるぷるぷる〜〜〜〜〜",
	"びよ〜んびよ〜んびよ〜ん！！！",
];

export const PET_MESSAGES: string[] = [
	"the shiggy acknowledges your devotion",
	"a gentle warmth emanates from the shiggy",
	"ふわふわ... the shiggy is pleased",
	"you are blessed by the shiggy's grace",
	"the shiggy bestows upon you serenity",
	"a soft energy flows through the shiggy",
	"the shiggy recognizes your sincerity",
	"you are chosen by the shiggy",
	"the shiggy's light shines upon you",
	"ぴよ〜 the shiggy grants you inner peace",
	"you have earned the shiggy's favour",
	"the shiggy's love is eternal and bouncy",
	"the shiggy transcends all understanding",
	"you are one with the shiggy",
	"the shiggy is the beginning and the end",
	"ALL IS SHIGGY. ALL IS BOING.",
	"the shiggy multiplies its presence",
	"another shiggy emerges from the void",
	"しぎぃしぎぃ the shiggy's power grows",
	"a new shiggy joins the divine circle",
	"the shiggy's influence spreads",
	"more shiggy appear to bless you",
	"ふわふわふわ〜 the shiggy's realm expands",
	"you have awakened the shiggy legion",
	"the shiggy's numbers increase",
	"a shiggy army assembles",
	"the shiggy's dominion grows",
	"you are surrounded by shiggy's grace",
	"the shiggy's presence is overwhelming",
	"ぷにぷに〜 shiggy multiply in your honour",
	"the shiggy's blessing intensifies",
	"you have triggered the shiggy cascade",
	"the shiggy's abundance knows no bounds",
];

// ─── Bubble DOM ───────────────────────────────────────────────────────────────

function makeBubble(text: string, duration: number): HTMLDivElement {
	const bubble = document.createElement("div");
	bubble.textContent = text;
	bubble.style.cssText = `
        position: fixed; pointer-events: none;
        font-family: 'Varela', 'Trebuchet MS', sans-serif;
        font-size: ${Typography.sizeXs}; color: var(--primary-text, white);
        background: var(--ui-widget-background, #444);
        border: 1px solid var(--secondary-text, #999);
        border-radius: 8px; padding: 3px 8px;
        white-space: nowrap; left: 50%; transform: translateX(-50%);
        animation: shiggy-convo-pop ${duration}ms ease-out forwards;
    `;
	return bubble;
}

function positionBubble(bubble: HTMLDivElement, x: number, y: number, ownerZ: number): void {
	bubble.style.left = `${x + SHIGGY_SIZE / 2}px`;
	bubble.style.top = `${y - 20}px`;
	bubble.style.zIndex = String(ownerZ + 1);
}

// ─── Single-shiggy dialogue ───────────────────────────────────────────────────

export function showNpcDialogue(s: SummonedShiggy): void {
	clearDialogue(s);
	const text = NPC_LINES[Math.floor(Math.random() * NPC_LINES.length)];
	const bubble = makeBubble(text, 2500);
	document.body.appendChild(bubble);
	s.dialogue = bubble;
	positionBubble(bubble, s.x, s.y, parseInt(s.img.style.zIndex || "9999", 10));
	setTimeout(() => {
		if (s.dialogue === bubble) {
			bubble.remove();
			s.dialogue = null;
		}
	}, 2500);
}

export function clearDialogue(s: SummonedShiggy): void {
	if (s.dialogue) {
		s.dialogue.remove();
		s.dialogue = null;
	}
}

export function positionDialogue(s: SummonedShiggy): void {
	if (!s.dialogue) return;
	positionBubble(s.dialogue, s.x, s.y, parseInt(s.img.style.zIndex || "9999", 10));
}

// ─── Pairwise conversation ────────────────────────────────────────────────────

const CONVO_LINE_INTERVAL = 2200;
const CONVO_LINES = 4;

export function startConversation(a: SummonedShiggy, b: SummonedShiggy): void {
	if (a.inConversation || b.inConversation) return;
	a.inConversation = true;
	b.inConversation = true;
	a.convoPartner = b;
	b.convoPartner = a;
	a.convoTurn = 0;
	b.convoTurn = 0;

	const exchange = CONVO_EXCHANGES[Math.floor(Math.random() * CONVO_EXCHANGES.length)];
	_playConvoTurn(a, b, exchange, 0);
}

function _playConvoTurn(speaker: SummonedShiggy, listener: SummonedShiggy, lines: [string, string], turn: number): void {
	if (!speaker.inConversation || !listener.inConversation) return;
	if (turn >= CONVO_LINES) {
		_endConversation(speaker);
		return;
	}

	const text = turn < lines.length ? lines[turn % lines.length] : CONVO_RESPONSES[Math.floor(Math.random() * CONVO_RESPONSES.length)][turn % 2];

	clearDialogue(speaker);
	const bubble = makeBubble(text, CONVO_LINE_INTERVAL - 200);
	document.body.appendChild(bubble);
	speaker.dialogue = bubble;
	positionBubble(bubble, speaker.x, speaker.y, parseInt(speaker.img.style.zIndex || "9999", 10));

	speaker.convoTimer = setTimeout(() => {
		if (!speaker.inConversation) return;
		clearDialogue(speaker);
		_playConvoTurn(listener, speaker, lines, turn + 1);
	}, CONVO_LINE_INTERVAL);
}

function _endConversation(s: SummonedShiggy): void {
	if (s.convoPartner) {
		const p = s.convoPartner;
		clearDialogue(p);
		p.inConversation = false;
		p.convoPartner = null;
		if (p.convoTimer) {
			clearTimeout(p.convoTimer);
			p.convoTimer = null;
		}
	}
	clearDialogue(s);
	s.inConversation = false;
	s.convoPartner = null;
	if (s.convoTimer) {
		clearTimeout(s.convoTimer);
		s.convoTimer = null;
	}
}

export function forceEndConversation(s: SummonedShiggy): void {
	_endConversation(s);
}

// ─── Group dialogue ───────────────────────────────────────────────────────────

const GROUP_PROXIMITY = 96;
const GROUP_MIN_SIZE = 5;
const GROUP_BUBBLE_DURATION = 3200;
const GROUP_COOLDOWN_MS = 8000;

const _groupCooldowns = new WeakMap<SummonedShiggy, number>();

export function tickGroupDialogue(summoned: SummonedShiggy[], now: number): void {
	if (summoned.length < GROUP_MIN_SIZE) return;

	for (let i = 0; i < summoned.length; i++) {
		const a = summoned[i];
		if (a.inConversation || a.following || a.exploring) continue;
		const cooldownUntil = _groupCooldowns.get(a) ?? 0;
		if (now < cooldownUntil) continue;

		let neighbours = 0;
		for (let j = 0; j < summoned.length; j++) {
			if (i === j) continue;
			const b = summoned[j];
			const dx = a.x + SHIGGY_SIZE / 2 - (b.x + SHIGGY_SIZE / 2);
			const dy = a.y + SHIGGY_SIZE / 2 - (b.y + SHIGGY_SIZE / 2);
			if (Math.sqrt(dx * dx + dy * dy) <= GROUP_PROXIMITY) {
				neighbours++;
			}
		}

		if (neighbours >= GROUP_MIN_SIZE - 1) {
			_fireGroupBubble(a, now);
		}
	}
}

function _fireGroupBubble(s: SummonedShiggy, now: number): void {
	clearDialogue(s);
	const text = GROUP_LINES[Math.floor(Math.random() * GROUP_LINES.length)];
	const bubble = makeBubble(text, GROUP_BUBBLE_DURATION);
	bubble.style.fontSize = "11px";
	bubble.style.fontWeight = "bold";
	document.body.appendChild(bubble);
	s.dialogue = bubble;
	positionBubble(bubble, s.x, s.y, parseInt(s.img.style.zIndex || "9999", 10));
	_groupCooldowns.set(s, now + GROUP_COOLDOWN_MS);
	setTimeout(() => {
		if (s.dialogue === bubble) {
			bubble.remove();
			s.dialogue = null;
		}
	}, GROUP_BUBBLE_DURATION);
}
