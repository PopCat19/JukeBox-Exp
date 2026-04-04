// Player Controls
//
// Purpose: Manages playback, volume, loop, zoom state and event handling
//
// This module:
// - Encapsulates all mutable player state (playback, volume, zoom, timeline)
// - Handles play/pause, loop, volume, and zoom toggle logic
// - Manages timeline mouse/touch interaction for seeking
// - Processes URL hash for song loading and sharing

import { ColorConfig } from "../shared/color-config";
import { SampleLoadedEvent, sampleLoadEvents } from "../synth/synth-config";
import { renderPlayhead, renderTimeline } from "./player-timeline";
import { getLocalStorage, PlayerUI, setLocalStorage } from "./player-ui";

export class PlayerControls {
	private animationRequest: number | null = null;
	private pauseButtonDisplayed: boolean = false;
	public zoomEnabled: boolean = true; // slarmoo's: false
	private outVolumeHistoricTimer: number = 0;
	private outVolumeHistoricCap: number = 0;
	private draggingPlayhead: boolean = false;
	private readonly id: string = ((Math.random() * 0xffffffff) >>> 0).toString(16);
	private prevHash: string | null = null;
	private pauseIfAnotherPlayerStartsHandle: ReturnType<typeof setInterval> | null = null;

	constructor(private readonly ui: PlayerUI) {}

	get synth() {
		return this.ui.synth;
	}

	private removeFromUnorderedArray<T>(array: T[], index: number): void {
		if (array.length < 1) {
			// Don't need to do anything when `array` is empty.
			return;
		}
		if (index === array.length - 1) {
			// Trivial case.
			array.pop();
		} else if (index >= 0 && index < array.length - 1) {
			// The idea here is that we want to remove an element from the array
			// quickly, and the fastest way to do that is to use `array.pop()`. As
			// the name of this function says, we assume `array` to be unordered,
			// so this trick is okay to do.
			const lastElement: T = array.pop()!;
			array[index] = lastElement;
		}
	}

	private loadSong(songString: string, reuseParams: boolean): void {
		this.ui.synth.setSong(songString);
		this.ui.synth.snapToStart();
		const updatedSongString: string = this.ui.synth.song!.toBase64String();
		this.ui.editLink.href = "../" + (OFFLINE ? "index.html" : "") + "#" + updatedSongString;
	}

	public hashUpdatedExternally(): void {
		let myHash: string = location.hash;
		if (this.prevHash === myHash || myHash === "") return;

		this.prevHash = myHash;

		if (myHash.charAt(0) === "#") {
			myHash = myHash.substring(1);
		}

		this.ui.fullscreenLink.href = location.href;

		// @TODO: This can be moved back into splitting merely on & once samples
		// are reworked so that the URLs don't clash with the overall URL syntax
		// that's assumed to be respected here (and probably elsewhere...)
		for (const parameter of myHash.split(/&(?=[a-z]+=)/g)) {
			const equalsIndex: number = parameter.indexOf("=");
			if (equalsIndex !== -1) {
				const paramName: string = parameter.substring(0, equalsIndex);
				const value: string = parameter.substring(equalsIndex + 1);
				switch (paramName) {
					case "song":
						this.loadSong(value, true);
						if (this.ui.synth.song) {
							this.ui.titleText.textContent = this.ui.synth.song.title;
						}
						break;
					case "loop":
						this.ui.synth.loopRepeatCount = value !== "1" ? 0 : -1;
						this.renderLoopIcon();
						break;
				}
			} else {
				this.loadSong(myHash, false);
			}
		}

		this.renderTimeline();
	}

	private onWindowResize(): void {
		this.renderTimeline();
	}

	private pauseIfAnotherPlayerStarts(): void {
		if (!this.ui.synth.playing) {
			clearInterval(this.pauseIfAnotherPlayerStartsHandle!);
			return;
		}

		const storedPlayerId: string | null = getLocalStorage("playerId");
		if (storedPlayerId != null && storedPlayerId !== this.id) {
			this.onTogglePlay();
			this.renderPlayhead();
			clearInterval(this.pauseIfAnotherPlayerStartsHandle!);
		}
	}

	private animate(): void {
		if (this.ui.synth.playing) {
			this.animationRequest = requestAnimationFrame(() => this.animate());
			this.renderPlayhead();

			this.volumeUpdate();
		}
		if (this.pauseButtonDisplayed !== this.ui.synth.playing) {
			this.renderPlayButton();
		}
	}

	private volumeUpdate(): void {
		if (this.ui.synth.song == null) {
			this.ui.outVolumeCap.setAttribute("x", "5%");
			this.ui.outVolumeBar.setAttribute("width", "0%");
			return;
		}
		this.outVolumeHistoricTimer--;
		if (this.outVolumeHistoricTimer <= 0) {
			this.outVolumeHistoricCap -= 0.03;
		}
		if (this.ui.synth.song.outVolumeCap > this.outVolumeHistoricCap) {
			this.outVolumeHistoricCap = this.ui.synth.song.outVolumeCap;
			this.outVolumeHistoricTimer = 50;
		}

		this.animateVolume(this.ui.synth.song.outVolumeCap, this.outVolumeHistoricCap);

		if (!this.ui.synth.playing) {
			this.ui.outVolumeCap.setAttribute("x", "5%");
			this.ui.outVolumeBar.setAttribute("width", "0%");
		}
	}

	private animateVolume(useOutVolumeCap: number, historicOutCap: number): void {
		this.ui.outVolumeBar.setAttribute("width", "" + Math.min(144, useOutVolumeCap * 144));
		this.ui.outVolumeCap.setAttribute("x", "" + (8 + Math.min(144, historicOutCap * 144)));
	}

	public async onTogglePlay(): Promise<void> {
		if (this.ui.synth.song != null) {
			if (this.animationRequest != null) cancelAnimationFrame(this.animationRequest);
			this.animationRequest = null;
			if (this.ui.synth.playing) {
				this.ui.synth.pause();
				this.volumeUpdate();
			} else {
				await this.ui.synth.play();
				setLocalStorage("playerId", this.id);
				this.animate();
				clearInterval(this.pauseIfAnotherPlayerStartsHandle!);
				this.pauseIfAnotherPlayerStartsHandle = setInterval(() => this.pauseIfAnotherPlayerStarts(), 100);
			}
		}
		this.renderPlayButton();
	}

	public onToggleLoop(): void {
		if (this.ui.synth.loopRepeatCount === -1) {
			this.ui.synth.loopRepeatCount = 0;
		} else {
			this.ui.synth.loopRepeatCount = -1;
		}
		this.renderLoopIcon();
	}

	private onVolumeChange(): void {
		setLocalStorage("volume", this.ui.volumeSlider.value);
		this.setSynthVolume();
	}

	public onToggleZoom(): void {
		this.zoomEnabled = !this.zoomEnabled;
		this.renderZoomIcon();
		this.renderTimeline();
	}

	private onTimelineMouseDown(event: MouseEvent): void {
		this.draggingPlayhead = true;
		this.onTimelineMouseMove(event);
	}

	private onTimelineMouseMove(event: MouseEvent): void {
		if (!this.draggingPlayhead) return;
		event.preventDefault();
		this.onTimelineCursorMove(event.clientX || event.pageX);
	}

	private onTimelineTouchDown(event: TouchEvent): void {
		this.draggingPlayhead = true;
		this.onTimelineTouchMove(event);
	}

	private onTimelineTouchMove(event: TouchEvent): void {
		this.onTimelineCursorMove(event.touches[0].clientX);
	}

	private onTimelineCursorMove(mouseX: number): void {
		if (this.draggingPlayhead && this.ui.synth.song != null) {
			const boundingRect: ClientRect = this.ui.visualizationContainer.getBoundingClientRect();
			this.ui.synth.playhead = (this.ui.synth.song.barCount * (mouseX - boundingRect.left)) / (boundingRect.right - boundingRect.left);
			this.ui.synth.computeLatestModValues();
			this.renderPlayhead();
		}
	}

	private onTimelineCursorUp(): void {
		this.draggingPlayhead = false;
	}

	private setSynthVolume(): void {
		const volume: number = +this.ui.volumeSlider.value;
		this.ui.synth.volume = Math.min(1.0, Math.pow(volume / 50.0, 0.5)) * Math.pow(2.0, (volume - 75.0) / 25.0);
	}

	public renderPlayhead(): void {
		renderPlayhead(this.ui, this.removeFromUnorderedArray.bind(this));
	}

	private renderTimeline(): void {
		renderTimeline(this.ui, this.zoomEnabled, this.removeFromUnorderedArray.bind(this));
	}

	private renderPlayButton(): void {
		if (this.ui.synth.playing) {
			this.ui.playButton.classList.remove("playButton");
			this.ui.playButton.classList.add("pauseButton");
			this.ui.playButton.title = "Pause (Space)";
			this.ui.playButton.textContent = "Pause";
		} else {
			this.ui.playButton.classList.remove("pauseButton");
			this.ui.playButton.classList.add("playButton");
			this.ui.playButton.title = "Play (Space)";
			this.ui.playButton.textContent = "Play";
		}
		this.pauseButtonDisplayed = this.ui.synth.playing;
	}

	private renderLoopIcon(): void {
		this.ui.loopIcon.setAttribute("fill", this.ui.synth.loopRepeatCount === -1 ? ColorConfig.linkAccent : ColorConfig.uiWidgetBackground);
	}

	private renderZoomIcon(): void {
		this.ui.zoomIcon.style.color = this.zoomEnabled ? ColorConfig.linkAccent : ColorConfig.uiWidgetBackground;
	}

	public shortenUrl() {
		this.hashUpdatedExternally();
		let shortenerStrategy: string = "https://tinyurl.com/api-create.php?url=";
		const localShortenerStrategy: string | null = window.localStorage.getItem("shortenerStrategySelect");

		// if (localShortenerStrategy == "beepboxnet") shortenerStrategy = "https://www.beepbox.net/api-create.php?url=";
		if (localShortenerStrategy === "isgd") shortenerStrategy = "https://is.gd/create.php?format=simple&url=";

		window.open(shortenerStrategy + encodeURIComponent(new URL("#" + this.ui.synth.song!.toBase64String(), location.href).href));
	}

	public onCopyClicked(): void {
		// Set as any to allow compilation without clipboard types (since, uh, I didn't write this bit and don't know the proper types library) -jummbus
		let nav: any;
		nav = navigator;

		if (nav.clipboard && nav.clipboard.writeText) {
			nav.clipboard.writeText(location.href).catch(() => {
				window.prompt("Copy to clipboard:", location.href);
			});
			return;
		}
		const textField: HTMLTextAreaElement = document.createElement("textarea");
		textField.textContent = location.href;
		document.body.appendChild(textField);
		textField.select();
		const succeeded: boolean = document.execCommand("copy");
		textField.remove();
		if (!succeeded) window.prompt("Copy this:", location.href);
	}

	public onShareClicked(): void {
		(<any>navigator).share({ url: location.href });
	}

	private updateSampleLoadingBar(e: SampleLoadedEvent): void {
		const percent: number = e.totalSamples === 0 ? 0 : Math.floor((e.samplesLoaded / e.totalSamples) * 100);
		this.ui.sampleLoadingBarContainer.title = "Total Samples: " + String(e.totalSamples) + "; Loaded Samples: " + String(e.samplesLoaded) + "; ";
		this.ui.sampleLoadingBar.style.width = `${percent}%`;
		if (e.totalSamples !== 0) {
			this.ui.sampleLoadingBarContainer.style.backgroundColor = "var(--indicator-secondary)";
		} else {
			this.ui.sampleLoadingBarContainer.style.backgroundColor = "var(--empty-sample-bar, var(--indicator-secondary))";
		}
	}

	public init(): void {
		if (top !== self) {
			// In an iframe.
			this.ui.copyLink.style.display = "none";
			this.ui.shareLink.style.display = "none";
		} else {
			// Fullscreen.
			this.ui.fullscreenLink.style.display = "none";
			if (!("share" in navigator)) this.ui.shareLink.style.display = "none";
		}

		if (getLocalStorage("volume") != null) {
			this.ui.volumeSlider.value = getLocalStorage("volume")!;
		}
		this.setSynthVolume();

		window.addEventListener("resize", () => this.onWindowResize());

		this.ui.timeline.addEventListener("mousedown", (e) => this.onTimelineMouseDown(e));
		window.addEventListener("mousemove", (e) => this.onTimelineMouseMove(e));
		window.addEventListener("mouseup", () => this.onTimelineCursorUp());
		this.ui.timeline.addEventListener("touchstart", (e) => this.onTimelineTouchDown(e));
		this.ui.timeline.addEventListener("touchmove", (e) => this.onTimelineTouchMove(e));
		this.ui.timeline.addEventListener("touchend", () => this.onTimelineCursorUp());
		this.ui.timeline.addEventListener("touchcancel", () => this.onTimelineCursorUp());

		this.ui.playButton.addEventListener("click", () => this.onTogglePlay());
		this.ui.loopButton.addEventListener("click", () => this.onToggleLoop());
		this.ui.volumeSlider.addEventListener("input", () => this.onVolumeChange());
		this.ui.zoomButton.addEventListener("click", () => this.onToggleZoom());
		this.ui.copyLink.addEventListener("click", (e) => {
			e.preventDefault();
			this.onCopyClicked();
		});
		this.ui.shareLink.addEventListener("click", (e) => {
			e.preventDefault();
			this.onShareClicked();
		});
		window.addEventListener("hashchange", () => this.hashUpdatedExternally());
		sampleLoadEvents.addEventListener("sampleloaded", (e) => this.updateSampleLoadingBar(e as SampleLoadedEvent));

		this.hashUpdatedExternally();
		this.renderLoopIcon();
		this.renderZoomIcon();
		this.renderPlayButton();
	}
}
