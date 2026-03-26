// dialogue.ts
//
// Purpose: NPC dialogue bubbles and conversations for shiggy system
// - Creates floating dialogue bubbles above shiggys
// - Handles NPC-to-NPC conversations (alternating lines)
// - Manages bubble positioning and cleanup

import {
    SummonedShiggy, NPC_LINES, SHIGGY_SIZE,
    CONVO_EXCHANGES, CONVO_RESPONSES, CONVO_LINES, CONVO_LINE_INTERVAL,
} from "./types";

export function showNpcDialogue(s: SummonedShiggy): void {
    clearDialogue(s);
    const text = NPC_LINES[Math.floor(Math.random() * NPC_LINES.length)];
    const bubble = makeBubble(text, 2500);
    document.body.appendChild(bubble);
    s.dialogue = bubble;
    positionBubble(bubble, s.x, s.y);
    setTimeout(() => {
        if (s.dialogue === bubble) {
            bubble.remove();
            s.dialogue = null;
        }
    }, 2500);
}

export function startConversation(a: SummonedShiggy, b: SummonedShiggy): void {
    if (a.inConversation || b.inConversation) return;
    a.inConversation = true;
    b.inConversation = true;
    a.convoPartner = b;
    b.convoPartner = a;
    a.convoTurn = 0;
    b.convoTurn = 0;

    const exchange = CONVO_EXCHANGES[Math.floor(Math.random() * CONVO_EXCHANGES.length)];
    playConvoTurn(a, b, exchange, 0);
}

function playConvoTurn(
    speaker: SummonedShiggy,
    listener: SummonedShiggy,
    lines: [string, string],
    turn: number,
): void {
    if (!speaker.inConversation || !listener.inConversation) return;
    if (turn >= CONVO_LINES) {
        endConversation(speaker);
        return;
    }

    let text: string;
    if (turn < lines.length) {
        text = lines[turn % lines.length];
    } else {
        const extra = CONVO_RESPONSES[Math.floor(Math.random() * CONVO_RESPONSES.length)];
        text = extra[turn % 2];
    }

    clearDialogue(speaker);
    const bubble = makeBubble(text, CONVO_LINE_INTERVAL - 200);
    document.body.appendChild(bubble);
    speaker.dialogue = bubble;
    positionBubble(bubble, speaker.x, speaker.y);

    speaker.convoTimer = setTimeout(() => {
        if (!speaker.inConversation) return;
        clearDialogue(speaker);
        playConvoTurn(listener, speaker, lines, turn + 1);
    }, CONVO_LINE_INTERVAL);
}

function endConversation(s: SummonedShiggy): void {
    if (s.convoPartner) {
        const partner = s.convoPartner;
        clearDialogue(partner);
        partner.inConversation = false;
        partner.convoPartner = null;
        if (partner.convoTimer) {
            clearTimeout(partner.convoTimer);
            partner.convoTimer = null;
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
    endConversation(s);
}

function makeBubble(text: string, duration: number): HTMLDivElement {
    const bubble = document.createElement("div");
    bubble.textContent = text;
    bubble.style.cssText = `
        position: fixed; z-index: 10001; pointer-events: none;
        font-family: 'Varela', 'Trebuchet MS', sans-serif;
        font-size: 10px; color: var(--primary-text, white);
        background: var(--ui-widget-background, #444);
        border: 1px solid var(--secondary-text, #999);
        border-radius: 8px; padding: 3px 8px;
        white-space: nowrap; left: 50%; transform: translateX(-50%);
        animation: shiggy-convo-pop ${duration}ms ease-out forwards;
    `;
    return bubble;
}

function positionBubble(bubble: HTMLDivElement, x: number, y: number): void {
    bubble.style.left = `${x + SHIGGY_SIZE / 2}px`;
    bubble.style.top = `${y - 20}px`;
}

export function positionDialogue(s: SummonedShiggy): void {
    if (!s.dialogue) return;
    positionBubble(s.dialogue, s.x, s.y);
}

export function clearDialogue(s: SummonedShiggy): void {
    if (s.dialogue) {
        s.dialogue.remove();
        s.dialogue = null;
    }
}
