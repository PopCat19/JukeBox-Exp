// audio.ts
//
// Purpose: Audio stubs for shiggy SFX and BGM
// - Caches SFX Audio objects for low-latency playback
// - Manages BGM loop lifecycle
// - All play calls are fire-and-forget (swallow errors)

const SFX_PATHS: Record<string, string> = {
    "shiggy-pet":       "assets/audio/shiggy-pet.ogg",
    "shiggy-summon":    "assets/audio/shiggy-summon.ogg",
    "shiggy-dismiss":   "assets/audio/shiggy-dismiss.ogg",
    "shiggy-blessing":  "assets/audio/shiggy-blessing.ogg",
    "shiggy-pop":       "assets/audio/shiggy-pop.ogg",
    "shiggy-ascend":    "assets/audio/shiggy-ascend.ogg",
};
const BGM_PATH = "assets/audio/shiggy-theme.ogg";

export class ShiggyAudio {
    private _sfxCache: Map<string, HTMLAudioElement> = new Map();
    private _bgm: HTMLAudioElement | null = null;

    public playSfx(name: string): void {
        const path = SFX_PATHS[name];
        if (!path) return;
        let audio = this._sfxCache.get(name);
        if (!audio) {
            audio = new Audio(path);
            audio.preload = "auto";
            this._sfxCache.set(name, audio);
        }
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }

    public playBgm(): void {
        this.stopBgm();
        this._bgm = new Audio(BGM_PATH);
        this._bgm.loop = true;
        this._bgm.volume = 0.4;
        this._bgm.play().catch(() => {});
    }

    public stopBgm(): void {
        if (this._bgm) {
            this._bgm.pause();
            this._bgm.currentTime = 0;
            this._bgm = null;
        }
    }
}
