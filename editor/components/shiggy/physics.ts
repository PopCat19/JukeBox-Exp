// physics.ts
//
// Purpose: Physics engine for shiggy system
// - Owns all mutable physics state (positions, velocities)
// - Computes rope, collision, idle nav each frame
// - Returns flat array of results for DOM applier

import {
	CONVO_CHANCE,
	CONVO_PROXIMITY,
	CURSOR_HOTSPOT_RADIUS,
	CURSOR_MASS_TRANSFER,
	CURSOR_RADIUS,
	DWELL_TIME_MS,
	EXPLORE_CHANCE,
	EXPLORE_DURATION_MS,
	EXPLORE_MIN_FOLLOW_MS,
	FOLLOW_PROXIMITY_PX,
	MAX_FOLLOW_SPEED,
	MAX_FOLLOWERS,
	MAX_VEL,
	NPC_BOUNCE_ENERGY,
	NPC_FRICTION,
	NPC_IDLE_PAUSE_MIN_MS,
	NPC_IDLE_PAUSE_RAND_MS,
	NPC_IDLE_SPEED,
	NPC_WAYPOINT_DIST_MIN,
	NPC_WAYPOINT_MIN_MS,
	NPC_WAYPOINT_RAND_MS,
	OFFSET_RADIUS,
	PROXIMITY_PX,
	ROPE_AXIAL_DAMPING,
	ROPE_DAMPING,
	ROPE_K,
	ROPE_SLACK,
	SHIGGY_HITBOX_RADIUS,
	SHIGGY_SIZE,
	UNFOLLOW_BUFFER_MS,
	UNFOLLOW_YANK_PX_S,
} from "./types";

export interface PhysState {
	x: number;
	y: number;
	vx: number;
	vy: number;
	smoothVx: number;
	smoothVy: number;
	following: boolean;
	followingSince: number;
	unfollowAt: number;
	exploring: boolean;
	exploreUntil: number;
	waypointX: number;
	waypointY: number;
	waypointTimer: number;
	pauseUntil: number;
	cursorBias: number;
	facingRight: boolean;
	inConversation: boolean;
	tension: number;
	approaching: boolean;
	offsetAngle: number;
	offsetDist: number;
}

export interface PhysEvent {
	type: "explore" | "collision" | "conversation";
	index: number;
	partner?: number;
}

export interface FrameResult {
	x: number;
	y: number;
	facingRight: boolean;
	tension: number;
	following: boolean;
	exploring: boolean;
	stressed: boolean;
	approaching: boolean;
}

export class PhysicsEngine {
	private _states: PhysState[] = [];
	private _cursorX = 0;
	private _cursorY = 0;
	private _cursorVx = 0;
	private _cursorVy = 0;
	private _prevCursorX = 0;
	private _prevCursorY = 0;
	private _mouseSpeed = 0;
	private _dwellX = 0;
	private _dwellY = 0;
	private _dwellStart = 0;
	private _viewW = 800;
	private _viewH = 600;
	private _events: PhysEvent[] = [];

	public getEvents(): PhysEvent[] {
		return this._events.splice(0);
	}

	public resize(w: number, h: number): void {
		this._viewW = w;
		this._viewH = h;
	}

	public addShiggy(x: number, y: number): void {
		this._states.push({
			x,
			y,
			vx: 0,
			vy: 0,
			smoothVx: 0,
			smoothVy: 0,
			following: false,
			followingSince: 0,
			unfollowAt: 0,
			exploring: false,
			exploreUntil: 0,
			waypointX: Math.random() * this._viewW,
			waypointY: Math.random() * this._viewH,
			waypointTimer: 0,
			pauseUntil: 0,
			cursorBias: (Math.random() - 0.5) * 2,
			facingRight: true,
			inConversation: false,
			tension: 0,
			approaching: false,
			offsetAngle: Math.random() * Math.PI * 2,
			offsetDist: OFFSET_RADIUS * (0.4 + Math.random() * 0.6),
		});
	}

	public removeShiggy(index: number): void {
		this._states.splice(index, 1);
	}

	public clearAll(): void {
		this._states.length = 0;
	}

	public setCursor(x: number, y: number, speed: number, now: number): void {
		this._cursorVx = x - this._prevCursorX;
		this._cursorVy = y - this._prevCursorY;
		this._prevCursorX = this._cursorX;
		this._prevCursorY = this._cursorY;
		this._cursorX = x;
		this._cursorY = y;
		this._mouseSpeed = speed;
		const ddx = x - this._dwellX;
		const ddy = y - this._dwellY;
		if (Math.sqrt(ddx * ddx + ddy * ddy) > PROXIMITY_PX * 0.5) {
			this._dwellX = x;
			this._dwellY = y;
			this._dwellStart = now;
		}
	}

	public setConversation(index: number, value: boolean): void {
		if (this._states[index]) this._states[index].inConversation = value;
	}

	public tick(now: number): FrameResult[] {
		this._events.length = 0;
		// Store cursor position at start of tick for continuous collision detection
		const tickStartCursorX = this._cursorX;
		const tickStartCursorY = this._cursorY;

		const startPositions: { x: number; y: number }[] = [];
		for (let i = 0; i < this._states.length; i++) {
			startPositions.push({ x: this._states[i].x, y: this._states[i].y });
			this._tickOne(this._states[i], i, now);
		}
		this._collideAll();
		this._collideCursor(tickStartCursorX, tickStartCursorY, startPositions);
		for (const s of this._states) {
			this._collideViewport(s);
		}

		// NPC-to-NPC conversations
		for (let i = 0; i < this._states.length; i++) {
			const a = this._states[i];
			if (a.inConversation || a.following || a.exploring) continue;
			if (Math.random() > CONVO_CHANCE) continue;
			for (let j = i + 1; j < this._states.length; j++) {
				const b = this._states[j];
				if (b.inConversation || b.following || b.exploring) continue;
				const dx = a.x - b.x;
				const dy = a.y - b.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < CONVO_PROXIMITY) {
					a.vx += dx > 0 ? -0.15 : 0.15;
					a.vy += dy > 0 ? -0.15 : 0.15;
					b.vx += dx > 0 ? 0.15 : -0.15;
					b.vy += dy > 0 ? 0.15 : -0.15;
					a.inConversation = true;
					b.inConversation = true;
					this._events.push({ type: "conversation", index: i, partner: j });
					break;
				}
			}
		}

		const results: FrameResult[] = [];
		for (const s of this._states) {
			results.push({
				x: s.x,
				y: s.y,
				facingRight: s.facingRight,
				tension: s.tension,
				following: s.following,
				exploring: s.exploring,
				stressed: s.unfollowAt > 0,
				approaching: s.approaching,
			});
		}
		return results;
	}

	private _clampVel(s: PhysState): void {
		const spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
		if (spd > MAX_VEL) {
			s.vx = (s.vx / spd) * MAX_VEL;
			s.vy = (s.vy / spd) * MAX_VEL;
		}
	}

	private _collideViewport(s: PhysState): void {
		const maxX = this._viewW - SHIGGY_SIZE;
		const maxY = this._viewH - SHIGGY_SIZE;
		if (s.x < 0) {
			s.x = 0;
			if (s.vx < 0) s.vx = Math.abs(s.vx) * NPC_BOUNCE_ENERGY;
		}
		if (s.x > maxX) {
			s.x = maxX;
			if (s.vx > 0) s.vx = -Math.abs(s.vx) * NPC_BOUNCE_ENERGY;
		}
		if (s.y < 0) {
			s.y = 0;
			if (s.vy < 0) s.vy = Math.abs(s.vy) * NPC_BOUNCE_ENERGY;
		}
		if (s.y > maxY) {
			s.y = maxY;
			if (s.vy > 0) s.vy = -Math.abs(s.vy) * NPC_BOUNCE_ENERGY;
		}
	}

	private _pickWaypoint(s: PhysState, now: number): void {
		const margin = SHIGGY_SIZE * 3;
		const safeW = this._viewW - margin * 2;
		const safeH = this._viewH - margin * 2;
		const wx = margin + Math.random() * safeW;
		const wy = margin + Math.random() * safeH;
		s.waypointX = wx;
		s.waypointY = wy;
		s.waypointTimer = now + NPC_WAYPOINT_MIN_MS + Math.random() * NPC_WAYPOINT_RAND_MS;
		s.pauseUntil = now + NPC_IDLE_PAUSE_MIN_MS + Math.random() * NPC_IDLE_PAUSE_RAND_MS;
	}

	private _tickIdle(s: PhysState, now: number): void {
		s.vx *= NPC_FRICTION;
		s.vy *= NPC_FRICTION;
		if (now < s.pauseUntil) {
			s.x += s.vx;
			s.y += s.vy;
			this._collideViewport(s);
		} else {
			const cx = s.x + SHIGGY_SIZE / 2;
			const cy = s.y + SHIGGY_SIZE / 2;
			const dx = s.waypointX - cx;
			const dy = s.waypointY - cy;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > NPC_WAYPOINT_DIST_MIN) {
				s.vx += (dx / dist) * NPC_IDLE_SPEED * 0.02;
				s.vy += (dy / dist) * NPC_IDLE_SPEED * 0.02;
			} else if (now > s.waypointTimer) {
				this._pickWaypoint(s, now);
			}
			s.x += s.vx;
			s.y += s.vy;
			this._collideViewport(s);
		}

		const alpha = 0.08;
		s.smoothVx += alpha * (s.vx - s.smoothVx);
		s.smoothVy += alpha * (s.vy - s.smoothVy);
		if (Math.abs(s.smoothVx) > 0.04) {
			s.facingRight = s.smoothVx > 0;
		}

		const fdx = this._cursorX - (s.x + SHIGGY_SIZE / 2);
		const fdy = this._cursorY - (s.y + SHIGGY_SIZE / 2);
		const fdist = Math.sqrt(fdx * fdx + fdy * fdy);
		const dwelling = now - this._dwellStart > DWELL_TIME_MS;
		const tooFast = this._mouseSpeed > MAX_FOLLOW_SPEED;
		let followerCount = 0;
		for (const st of this._states) if (st.following) followerCount++;
		if (dwelling && !tooFast && followerCount < MAX_FOLLOWERS && fdist < FOLLOW_PROXIMITY_PX) {
			s.approaching = true;
		}
	}

	private _tickApproach(s: PhysState, now: number): void {
		if (this._mouseSpeed > MAX_FOLLOW_SPEED) {
			s.approaching = false;
			return;
		}

		const cx = s.x + SHIGGY_SIZE / 2;
		const cy = s.y + SHIGGY_SIZE / 2;
		const targetX = this._cursorX + Math.cos(s.offsetAngle) * s.offsetDist;
		const targetY = this._cursorY + Math.sin(s.offsetAngle) * s.offsetDist;
		const dx = targetX - cx;
		const dy = targetY - cy;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist <= ROPE_SLACK) {
			s.approaching = false;
			s.following = true;
			s.followingSince = now;
			s.unfollowAt = 0;
			return;
		}

		const nx = dx / dist;
		const ny = dy / dist;
		const targetSpeed = Math.min(dist * 0.06, 6);
		s.vx += (nx * targetSpeed - s.vx) * 0.12;
		s.vy += (ny * targetSpeed - s.vy) * 0.12;

		// Avoid cursor hotspot
		this._avoidCursorHotspot(s);

		this._clampVel(s);

		s.x += s.vx;
		s.y += s.vy;

		const alpha = 0.08;
		s.smoothVx += alpha * (s.vx - s.smoothVx);
		s.smoothVy += alpha * (s.vy - s.smoothVy);
		if (Math.abs(s.smoothVx) > 0.04) {
			s.facingRight = s.smoothVx > 0;
		}
		this._collideViewport(s);
	}

	private _tickFollower(s: PhysState, idx: number, now: number): void {
		s.tension = 0;
		const followDuration = now - s.followingSince;
		if (followDuration > EXPLORE_MIN_FOLLOW_MS && Math.random() < EXPLORE_CHANCE) {
			s.following = false;
			s.followingSince = 0;
			s.exploring = true;
			s.exploreUntil = now + EXPLORE_DURATION_MS * (0.5 + Math.random());
			s.vx += (Math.random() - 0.5) * 4;
			s.vy += (Math.random() - 0.5) * 4;
			this._events.push({ type: "explore", index: idx });
			return;
		}

		const yanked = this._mouseSpeed > UNFOLLOW_YANK_PX_S;
		if (yanked) {
			s.following = false;
			s.followingSince = 0;
			s.unfollowAt = 0;
			s.vx += this._cursorVx * 0.4;
			s.vy += this._cursorVy * 0.4;
			return;
		}

		const tooFast = this._mouseSpeed > MAX_FOLLOW_SPEED;
		if (tooFast) {
			if (s.unfollowAt === 0) {
				s.unfollowAt = now + UNFOLLOW_BUFFER_MS;
			} else if (now >= s.unfollowAt) {
				s.following = false;
				s.followingSince = 0;
				s.unfollowAt = 0;
				return;
			}
		} else {
			s.unfollowAt = 0;
		}

		const cx = s.x + SHIGGY_SIZE / 2;
		const cy = s.y + SHIGGY_SIZE / 2;
		const targetX = this._cursorX + Math.cos(s.offsetAngle) * s.offsetDist;
		const targetY = this._cursorY + Math.sin(s.offsetAngle) * s.offsetDist;
		const dx = targetX - cx;
		const dy = targetY - cy;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist > ROPE_SLACK) {
			const stretch = dist - ROPE_SLACK;
			s.tension = Math.min(stretch / 160, 1);
			const nx = dx / dist;
			const ny = dy / dist;
			const approachVel = s.vx * nx + s.vy * ny;
			const springScale = Math.max(0, 1 - approachVel / MAX_VEL);
			s.vx += nx * stretch * ROPE_K * springScale;
			s.vy += ny * stretch * ROPE_K * springScale;
			const vel = s.vx * nx + s.vy * ny;
			s.vx -= nx * vel * ROPE_AXIAL_DAMPING;
			s.vy -= ny * vel * ROPE_AXIAL_DAMPING;
		}

		if (dist > 0.01) {
			const nx = dx / dist;
			const ny = dy / dist;
			s.vx += nx * (s.cursorBias * 0.012);
			s.vy += ny * (s.cursorBias * 0.012);
		}

		// Avoid cursor hotspot
		this._avoidCursorHotspot(s);

		s.vx *= ROPE_DAMPING;
		s.vy *= ROPE_DAMPING;
		this._clampVel(s);

		s.x += s.vx;
		s.y += s.vy;

		const alpha = 0.08;
		s.smoothVx += alpha * (s.vx - s.smoothVx);
		s.smoothVy += alpha * (s.vy - s.smoothVy);
		if (Math.abs(s.smoothVx) > 0.04) {
			s.facingRight = s.smoothVx > 0;
		}
	}

	private _tickOne(s: PhysState, idx: number, now: number): void {
		if (s.inConversation) {
			s.vx *= NPC_FRICTION;
			s.vy *= NPC_FRICTION;
			s.x += s.vx;
			s.y += s.vy;
			this._collideViewport(s);
			return;
		}

		if (s.exploring) {
			if (now >= s.exploreUntil) {
				s.exploring = false;
				s.vx *= 0.3;
				s.vy *= 0.3;
			} else {
				s.vx *= NPC_FRICTION;
				s.vy *= NPC_FRICTION;
				s.vx += (Math.random() - 0.5) * 0.15;
				s.vy += (Math.random() - 0.5) * 0.15;
			}
			s.x += s.vx;
			s.y += s.vy;
			const alpha = 0.08;
			s.smoothVx += alpha * (s.vx - s.smoothVx);
			s.smoothVy += alpha * (s.vy - s.smoothVy);
			if (Math.abs(s.smoothVx) > 0.04) {
				s.facingRight = s.smoothVx > 0;
			}
			this._collideViewport(s);
			return;
		}

		if (s.approaching) {
			this._tickApproach(s, now);
			return;
		}

		if (s.following) {
			this._tickFollower(s, idx, now);
			return;
		}

		this._tickIdle(s, now);
	}

	private _collideAll(): void {
		for (let i = 0; i < this._states.length; i++) {
			for (let j = i + 1; j < this._states.length; j++) {
				const a = this._states[i],
					b = this._states[j];
				const ax = a.x + SHIGGY_SIZE / 2,
					ay = a.y + SHIGGY_SIZE / 2;
				const bx = b.x + SHIGGY_SIZE / 2,
					by = b.y + SHIGGY_SIZE / 2;
				const dx = bx - ax,
					dy = by - ay;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const minDist = SHIGGY_HITBOX_RADIUS * 2;

				if (dist < minDist && dist > 0.01) {
					const overlap = (minDist - dist) / 2;
					const nx = dx / dist,
						ny = dy / dist;
					a.x -= nx * overlap;
					a.y -= ny * overlap;
					b.x += nx * overlap;
					b.y += ny * overlap;
					const relVx = a.vx - b.vx,
						relVy = a.vy - b.vy;
					const dot = relVx * nx + relVy * ny;
					if (dot > 0) {
						a.vx -= dot * nx * 0.5;
						a.vy -= dot * ny * 0.5;
						b.vx += dot * nx * 0.5;
						b.vy += dot * ny * 0.5;
						if (dot > 1.5 && Math.random() < 0.4) {
							this._events.push({ type: "collision", index: Math.random() < 0.5 ? i : j });
						}
					}
				} else if (dist >= minDist) {
					// Continuous collision detection for high-speed collisions
					// Check if the relative motion path intersects
					const relVx = a.vx - b.vx,
						relVy = a.vy - b.vy;
					const relSpeedSq = relVx * relVx + relVy * relVy;

					if (relSpeedSq > 0.01) {
						// Vector from a to b
						const toBx = bx - ax,
							toBy = by - ay;

						// Project b onto relative velocity path
						const t = Math.max(0, Math.min(1, (toBx * relVx + toBy * relVy) / relSpeedSq));

						// Closest point on relative path to b
						const closestX = ax + relVx * t;
						const closestY = ay + relVy * t;

						// Distance from closest point to b
						const closestDx = bx - closestX;
						const closestDy = by - closestY;
						const closestDist = Math.sqrt(closestDx * closestDx + closestDy * closestDy);

						if (closestDist < minDist && closestDist > 0.01) {
							// Collision detected along the path
							const overlap = (minDist - closestDist) / 2;
							const nx = closestDx / closestDist;
							const ny = closestDy / closestDist;
							a.x -= nx * overlap;
							a.y -= ny * overlap;
							b.x += nx * overlap;
							b.y += ny * overlap;

							const dot = relVx * nx + relVy * ny;
							if (dot > 0) {
								a.vx -= dot * nx * 0.5;
								a.vy -= dot * ny * 0.5;
								b.vx += dot * nx * 0.5;
								b.vy += dot * ny * 0.5;
								if (dot > 1.5 && Math.random() < 0.4) {
									this._events.push({ type: "collision", index: Math.random() < 0.5 ? i : j });
								}
							}
						}
					}
				}
			}
		}
	}

	private _collideCursor(tickStartCursorX: number, tickStartCursorY: number, startPositions: { x: number; y: number }[]): void {
		for (let i = 0; i < this._states.length; i++) {
			const s = this._states[i];
			if (s.following || s.approaching) continue;

			const sx = s.x + SHIGGY_SIZE / 2,
				sy = s.y + SHIGGY_SIZE / 2;
			const s0x = startPositions[i].x + SHIGGY_SIZE / 2;
			const s0y = startPositions[i].y + SHIGGY_SIZE / 2;
			const minDist = SHIGGY_HITBOX_RADIUS + CURSOR_RADIUS;

			const dx = sx - this._cursorX,
				dy = sy - this._cursorY;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist < minDist && dist > 0.01) {
				const overlap = minDist - dist;
				const nx = dx / dist,
					ny = dy / dist;
				s.x += nx * overlap;
				s.y += ny * overlap;
				const cursorNormal = this._cursorVx * nx + this._cursorVy * ny;
				if (cursorNormal > 0) {
					s.vx += nx * cursorNormal * CURSOR_MASS_TRANSFER;
					s.vy += ny * cursorNormal * CURSOR_MASS_TRANSFER;
				}
			} else {
				// Relative motion CCD: sweep cursor path against shiggy start pos
				const relPathDx = this._cursorX - tickStartCursorX - (s0x - sx);
				const relPathDy = this._cursorY - tickStartCursorY - (s0y - sy);
				const relPathLenSq = relPathDx * relPathDx + relPathDy * relPathDy;

				// Also check combined displacement for safety margin
				const shiggyDisp = Math.sqrt((sx - s0x) ** 2 + (sy - s0y) ** 2);
				const cursorDisp = Math.sqrt((this._cursorX - tickStartCursorX) ** 2 + (this._cursorY - tickStartCursorY) ** 2);
				const speedMargin = Math.max(shiggyDisp, cursorDisp) * 0.5;
				const expandedMinDist = minDist + speedMargin;

				if (relPathLenSq > 0.01) {
					const toS0x = s0x - tickStartCursorX;
					const toS0y = s0y - tickStartCursorY;
					const t = Math.max(0, Math.min(1, (toS0x * relPathDx + toS0y * relPathDy) / relPathLenSq));
					const closestX = tickStartCursorX + relPathDx * t;
					const closestY = tickStartCursorY + relPathDy * t;
					const cdx = s0x - closestX;
					const cdy = s0y - closestY;
					const closestDist = Math.sqrt(cdx * cdx + cdy * cdy);

					if (closestDist < expandedMinDist && closestDist > 0.01) {
						const nx = cdx / closestDist;
						const ny = cdy / closestDist;
						s.x += nx * (expandedMinDist - closestDist);
						s.y += ny * (expandedMinDist - closestDist);
						const cursorNormal = this._cursorVx * nx + this._cursorVy * ny;
						if (cursorNormal > 0) {
							s.vx += nx * cursorNormal * CURSOR_MASS_TRANSFER;
							s.vy += ny * cursorNormal * CURSOR_MASS_TRANSFER;
						}
					}
				} else if (speedMargin > 0) {
					// No relative motion path but objects displaced significantly —
					// check expanded radius against shiggy start position
					const sdx = s0x - this._cursorX;
					const sdy = s0y - this._cursorY;
					const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
					if (sdist < expandedMinDist && sdist > 0.01) {
						const nx = sdx / sdist;
						const ny = sdy / sdist;
						s.x += nx * (expandedMinDist - sdist);
						s.y += ny * (expandedMinDist - sdist);
						const cursorNormal = this._cursorVx * nx + this._cursorVy * ny;
						if (cursorNormal > 0) {
							s.vx += nx * cursorNormal * CURSOR_MASS_TRANSFER;
							s.vy += ny * cursorNormal * CURSOR_MASS_TRANSFER;
						}
					}
				}
			}
		}
	}

	private _avoidCursorHotspot(s: PhysState): void {
		const cx = s.x + SHIGGY_SIZE / 2;
		const cy = s.y + SHIGGY_SIZE / 2;
		const dx = cx - this._cursorX;
		const dy = cy - this._cursorY;
		const dist = Math.sqrt(dx * dx + dy * dy);

		// Avoid cursor hotspot circle (radius 24)
		if (dist < CURSOR_HOTSPOT_RADIUS && dist > 0.01) {
			const overlap = CURSOR_HOTSPOT_RADIUS - dist;
			const nx = dx / dist;
			const ny = dy / dist;
			// Smooth avoidance force (not bouncing)
			s.vx += nx * overlap * 0.15;
			s.vy += ny * overlap * 0.15;
		}
	}
}
